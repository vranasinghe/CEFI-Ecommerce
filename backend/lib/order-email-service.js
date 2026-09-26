/**
 * order-email-service.js
 * ---------------------------------------------------------------------------
 * Reusable transactional email service built on the Resend SDK.
 *
 * Design rules:
 *  1. NEVER throw at the caller. Checkout must succeed even if email fails —
 *     every path resolves to a result object describing what happened.
 *  2. Client init is lazy + guarded. A missing RESEND_API_KEY or an SDK load
 *     error degrades to a "skipped" result instead of crashing the serverless
 *     function at import time (the failure mode that bit us with jsdom).
 *  3. Both emails are dispatched concurrently with Promise.all so the customer
 *     and admin sends overlap rather than queue.
 *  4. Resend is the only delivery channel. There is intentionally no SMTP or
 *     form-service fallback: failures are reported to the caller instead of
 *     being hidden behind a different, admin-only route.
 *
 * Required environment variables:
 *   RESEND_API_KEY     — Resend API key (required for sending)
 *   ADMIN_EMAIL        — internal inbox that receives the sales alert
 *   RESEND_FROM_EMAIL  — "CEFI Orders <orders@ceylonecofreshinfinity.com>".
 *                        Must be on a Resend-verified domain. If unset it
 *                        defaults to onboarding@resend.dev, which Resend only
 *                        delivers to the account owner — customers get nothing.
 */

const { buildCustomerEmail, buildAdminEmail, buildOrderConfirmedEmail } = require('./email-templates');

// The owner's inbox always gets the order alert, even if ADMIN_EMAIL isn't
// set in this environment. Same fallback address server.js already uses for
// every other admin notification (test email, contact form, etc.) — order
// alerts must not be the one path that silently drops it.
const OWNER_EMAIL = 'ceylonecofreshinfinity@gmail.com';

// Config is read per call, never at import time. If this module is required
// before dotenv has loaded .env, import-time constants would silently freeze as
// empty — dropping the admin email and falling back to the sandbox sender.
function getConfig() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || OWNER_EMAIL;
  return {
    from: process.env.RESEND_FROM_EMAIL || 'CEFI Orders <onboarding@resend.dev>',
    adminEmail,
    replyTo: process.env.RESEND_REPLY_TO || adminEmail || undefined,
  };
}

// ── Lazy, crash-proof Resend client ─────────────────────────────────────────
// Initialised on first use and memoised. Any failure is remembered as `null`
// so we don't retry a broken import on every request.
let cachedClient;
function getResendClient() {
  if (cachedClient !== undefined) return cachedClient;

  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY is not set — order emails will be skipped.');
    cachedClient = null;
    return cachedClient;
  }

  try {
    const { Resend } = require('resend');
    cachedClient = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend client initialised for order emails.');
  } catch (err) {
    console.error('❌ Could not initialise Resend client:', err.message);
    cachedClient = null;
  }
  return cachedClient;
}

// ── Input normalisation ─────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and normalises the caller's orderData into the exact shape the
 * templates expect. Throws only on structurally unusable input — callers
 * inside sendOrderEmails() catch this and convert it to a failed result.
 */
function normaliseOrder(orderData) {
  if (!orderData || typeof orderData !== 'object') {
    throw new Error('orderData is required');
  }

  const {
    customerEmail,
    customerName,
    orderId,
    totalAmount,
    shippingCost,
    items,
    shipping,
    currency = process.env.DEFAULT_CURRENCY || 'USD',
    paymentMethod = 'Direct Export Order',
    placedAt,
  } = orderData;

  if (!orderId) throw new Error('orderData.orderId is required');
  if (!customerEmail || !EMAIL_RE.test(String(customerEmail))) {
    throw new Error(`orderData.customerEmail is missing or invalid: ${customerEmail}`);
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('orderData.items must be a non-empty array');
  }

  const normalisedItems = items.map((item) => ({
    name: item.name ?? item.title ?? 'Item',
    quantity: Number(item.quantity) || 1,
    // This storefront quotes by quantity, type and size — not a fixed listed
    // price — so these are what the templates actually display per line.
    type: item.type ?? item.variant ?? '',
    size: item.size ?? '',
    price: Number(item.price ?? item.unitPrice) || 0,
  }));

  // Subtotal always comes from the line items — it is the one figure we can
  // compute rather than trust.
  const subtotal = normalisedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const resolvedShipping = Number.isFinite(Number(shippingCost)) ? Number(shippingCost) : 0;

  // Trust the caller's total when present; otherwise derive it, so the email
  // never shows a blank or NaN amount.
  const resolvedTotal = Number.isFinite(Number(totalAmount))
    ? Number(totalAmount)
    : subtotal + resolvedShipping;

  return {
    customerEmail: String(customerEmail).trim(),
    customerName: customerName || 'Valued Customer',
    orderId: String(orderId),
    subtotal,
    shippingCost: resolvedShipping,
    totalAmount: resolvedTotal,
    items: normalisedItems,
    // { address, city, postalCode, country, phone } — all optional.
    shipping: shipping || null,
    currency,
    paymentMethod,
    placedAt: placedAt ? new Date(placedAt).toUTCString() : new Date().toUTCString(),
  };
}

// ── Single send, wrapped so it can never reject ─────────────────────────────
/**
 * Sends one email and resolves to a settled-style result.
 * Returning instead of throwing is what lets us use Promise.all below without
 * one failed recipient cancelling visibility into the other.
 *
 * @param {object} client  Resend client
 * @param {string} label   'customer' | 'admin' — used for logging only
 * @param {object} payload Resend send payload
 */
async function dispatch(client, label, payload) {
  try {
    // Resend returns { data, error } rather than throwing on API-level errors.
    const { data, error } = await client.emails.send(payload);

    if (error) {
      console.error(`❌ [Resend:${label}] ${error.message || 'send rejected'}`);
      return { recipient: label, to: payload.to, sent: false, error: error.message || String(error) };
    }

    console.log(`✅ [Resend:${label}] delivered to ${payload.to} (id: ${data?.id || 'n/a'})`);
    return { recipient: label, to: payload.to, sent: true, id: data?.id || null, via: 'resend' };
  } catch (err) {
    // Network/timeout/SDK-level failures land here.
    console.error(`❌ [Resend:${label}] exception: ${err.message}`);
    return { recipient: label, to: payload.to, sent: false, error: err.message };
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
/**
 * Sends the customer confirmation and the admin alert concurrently.
 *
 * @param {object} orderData
 * @param {string} orderData.customerEmail
 * @param {string} orderData.customerName
 * @param {string} orderData.orderId
 * @param {number} orderData.totalAmount
 * @param {Array<{name:string, quantity:number, price:number}>} orderData.items
 * @param {string} [orderData.currency]      default 'USD'
 * @param {string} [orderData.paymentMethod]
 * @param {string|Date} [orderData.placedAt]
 *
 * @returns {Promise<{success:boolean, skipped?:boolean, reason?:string,
 *                    customer?:object, admin?:object, durationMs?:number}>}
 *          Always resolves — never rejects.
 */
async function sendOrderEmails(orderData) {
  const startedAt = Date.now();

  // 1. Validate before doing any I/O.
  let order;
  try {
    order = normaliseOrder(orderData);
  } catch (err) {
    console.error('❌ [OrderEmails] invalid orderData:', err.message);
    return { success: false, skipped: true, reason: err.message };
  }

  // 2. Bail out cleanly if email isn't configured — checkout still succeeds.
  const { from: FROM_ADDRESS, adminEmail: ADMIN_EMAIL, replyTo: REPLY_TO } = getConfig();
  const client = getResendClient();
  if (!client) {
    return { success: false, skipped: true, reason: 'Resend is not configured (RESEND_API_KEY missing)' };
  }
  if (!ADMIN_EMAIL) {
    console.warn('⚠️  ADMIN_EMAIL is not set — only the customer email will be sent.');
  }

  // 3. Render both templates.
  const customerTemplate = buildCustomerEmail(order);
  const adminTemplate = buildAdminEmail(order);

  // 4. Build the send tasks. Each is already failure-tolerant (see dispatch),
  //    so Promise.all gives us true parallelism with no all-or-nothing risk.
  const tasks = [
    dispatch(client, 'customer', {
      from: FROM_ADDRESS,
      to: order.customerEmail,
      replyTo: REPLY_TO, // customer replies reach the sales inbox
      subject: customerTemplate.subject,
      html: customerTemplate.html,
      text: customerTemplate.text,
      tags: [{ name: 'type', value: 'order_received' }],
    }),
  ];

  if (ADMIN_EMAIL) {
    tasks.push(
      dispatch(client, 'admin', {
        from: FROM_ADDRESS,
        to: ADMIN_EMAIL,
        replyTo: order.customerEmail, // reply goes straight back to the buyer
        subject: adminTemplate.subject,
        html: adminTemplate.html,
        text: adminTemplate.text,
        headers: { 'X-Priority': '1', Importance: 'High' },
        tags: [{ name: 'type', value: 'order_confirmed_admin' }],
      })
    );
  }

  // Both requests are in flight simultaneously: total latency ≈ the slower one.
  const [customerResult, adminResult] = await Promise.all(tasks);

  const durationMs = Date.now() - startedAt;
  const success = Boolean(customerResult?.sent && (!ADMIN_EMAIL || adminResult?.sent));

  console.log(
    `📧 [OrderEmails] ${order.orderId} → customer:${customerResult?.sent ? 'ok' : 'fail'} ` +
      `admin:${adminResult ? (adminResult.sent ? 'ok' : 'fail') : 'skipped'} (${durationMs}ms)`
  );

  return { success, customer: customerResult, admin: adminResult || null, durationMs };
}

/**
 * Sends the "Order Confirmed" notice to the customer only — triggered
 * manually by an admin from the dashboard, never by a client-supplied
 * address (the caller passes the order's own stored, verified customerEmail).
 *
 * @param {object} orderData same shape as sendOrderEmails()
 * @returns {Promise<{success:boolean, skipped?:boolean, reason?:string,
 *                    result?:object}>} Always resolves — never rejects.
 */
async function sendOrderConfirmedEmail(orderData) {
  let order;
  try {
    order = normaliseOrder(orderData);
  } catch (err) {
    console.error('❌ [OrderConfirmed] invalid orderData:', err.message);
    return { success: false, skipped: true, reason: err.message };
  }

  const { from: FROM_ADDRESS, replyTo: REPLY_TO } = getConfig();
  const client = getResendClient();
  if (!client) {
    return { success: false, skipped: true, reason: 'Resend is not configured (RESEND_API_KEY missing)' };
  }

  const template = buildOrderConfirmedEmail(order);
  const result = await dispatch(client, 'order-confirmed', {
    from: FROM_ADDRESS,
    to: order.customerEmail,
    replyTo: REPLY_TO,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: [{ name: 'type', value: 'order_confirmed_customer' }],
  });

  console.log(`📧 [OrderConfirmed] ${order.orderId} → customer:${result.sent ? 'ok' : 'fail'}`);
  return { success: Boolean(result.sent), result };
}

module.exports = { sendOrderEmails, sendOrderConfirmedEmail, normaliseOrder };
