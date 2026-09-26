/**
 * email-templates.js
 * ---------------------------------------------------------------------------
 * Pure, dependency-free HTML/text builders for the two transactional order
 * emails. Kept separate from the transport layer so templates can be unit
 * tested (and previewed) without touching the Resend API.
 *
 * Every interpolated value passes through escapeHtml() — order data is
 * user-supplied, and an unescaped name like `<img onerror=...>` would be
 * injected straight into the recipient's inbox.
 */

const BRAND = {
  name: 'Ceylon Eco Fresh Infinity (Pvt) Ltd',
  short: 'CEFI',
  green: '#1F532E',
  gold: '#D4AF37',
  supportPhone: '+94 714 634 485',
  supportEmail: 'ceylonecofreshinfinity@gmail.com',
};

/** Minimal HTML entity escaping. No DOM/jsdom dependency — safe in serverless. */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a number as currency. Falls back to a plain prefix if the requested
 * currency code is unknown, so a bad code never throws inside an email send.
 */
function formatMoney(amount, currency = 'USD') {
  const numeric = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
}

/** Line total for an item, tolerating missing price/quantity. */
function lineTotal(item) {
  return (Number(item.price) || 0) * (Number(item.quantity) || 0);
}

/** Flattens the shipping object into a single readable address line. */
function addressLine(shipping) {
  if (!shipping) return '';
  return [shipping.address, shipping.city, shipping.postalCode, shipping.country]
    .filter(Boolean)
    .join(', ');
}

/** Shared <tbody> rows for the order line-items table. */
function itemRowsHtml(items, currency) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#1F532E;font-weight:600;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;color:#475569;">${escapeHtml(item.quantity)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;color:#475569;">${escapeHtml(formatMoney(item.price, currency))}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;color:#1F532E;font-weight:600;">${escapeHtml(formatMoney(lineTotal(item), currency))}</td>
      </tr>`
    )
    .join('');
}

/** Plain-text line items — the text/plain part every email should carry. */
function itemLinesText(items, currency) {
  return items
    .map(
      (item) =>
        `• ${item.name} — ${item.quantity} x ${formatMoney(item.price, currency)} = ${formatMoney(lineTotal(item), currency)}`
    )
    .join('\n');
}

/** Outer shell: header band, body slot, footer. Shared by both emails. */
function layout({ headline, subline, body }) {
  return `
  <div style="background-color:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background-color:${BRAND.green};padding:24px;text-align:center;">
        <h1 style="margin:0;color:${BRAND.gold};font-size:21px;">${escapeHtml(BRAND.name)}</h1>
        <p style="margin:6px 0 0;font-size:13px;color:#d1fae5;">${escapeHtml(subline)}</p>
      </div>
      <div style="padding:24px;color:#334155;">
        <h2 style="margin:0 0 16px;font-size:18px;color:${BRAND.green};">${escapeHtml(headline)}</h2>
        ${body}
      </div>
      <div style="background-color:#f8fafc;padding:14px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
        ${escapeHtml(BRAND.name)} · ${escapeHtml(BRAND.supportEmail)} · ${escapeHtml(BRAND.supportPhone)}
      </div>
    </div>
  </div>`;
}

/**
 * Customer-facing "Order Received" confirmation.
 * Tone: reassuring, summarises what they bought and what happens next.
 *
 * @param {object} orderData normalised order (see email-service.js)
 * @returns {{subject:string, html:string, text:string}}
 */
function buildCustomerEmail(orderData) {
  const { customerName, orderId, subtotal, shippingCost, totalAmount, items, currency, placedAt, shipping } = orderData;
  const destination = addressLine(shipping);

  const body = `
    <p style="font-size:15px;margin:0 0 6px;">Dear <strong>${escapeHtml(customerName)}</strong>,</p>
    <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px;">
      Thank you for your order. We have received it and our team will confirm stock
      availability and dispatch details within <strong>24 hours</strong>.
    </p>

    <div style="background-color:#f0fdf4;padding:12px 16px;border-radius:10px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;"><strong>Order Reference:</strong>
        <span style="font-family:monospace;color:${BRAND.green};font-weight:bold;">${escapeHtml(orderId)}</span>
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Placed: ${escapeHtml(placedAt)}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background-color:#f1f5f9;color:#475569;text-align:left;">
          <th style="padding:10px 14px;">Product</th>
          <th style="padding:10px 14px;text-align:center;">Qty</th>
          <th style="padding:10px 14px;text-align:right;">Unit</th>
          <th style="padding:10px 14px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml(items, currency)}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px 14px;text-align:right;color:#64748b;">Subtotal</td>
          <td style="padding:8px 14px;text-align:right;color:#475569;">${escapeHtml(formatMoney(subtotal, currency))}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:0 14px 8px;text-align:right;color:#64748b;">Shipping</td>
          <td style="padding:0 14px 8px;text-align:right;color:#475569;">
            ${shippingCost > 0 ? escapeHtml(formatMoney(shippingCost, currency)) : 'Free'}
          </td>
        </tr>
        <tr>
          <td colspan="3" style="padding:12px 14px;text-align:right;font-weight:bold;color:#475569;border-top:1px solid #e2e8f0;">Order Total</td>
          <td style="padding:12px 14px;text-align:right;font-weight:bold;color:${BRAND.green};font-size:15px;border-top:1px solid #e2e8f0;">
            ${escapeHtml(formatMoney(totalAmount, currency))}
          </td>
        </tr>
      </tfoot>
    </table>

    ${
      destination
        ? `<div style="background-color:#f8fafc;border-left:4px solid ${BRAND.gold};padding:12px 16px;border-radius:6px;font-size:13px;color:#475569;margin-top:20px;">
             <strong style="color:${BRAND.green};">Delivery destination</strong><br/>${escapeHtml(destination)}
           </div>`
        : ''
    }

    <p style="font-size:13px;color:#64748b;margin-top:20px;">
      Questions? Simply reply to this email — it reaches our export team directly.
    </p>`;

  return {
    subject: `✅ Order Received [${orderId}] — ${BRAND.short}`,
    html: layout({ headline: 'Your order has been received', subline: 'Order Confirmation', body }),
    text: [
      `Dear ${customerName},`,
      '',
      `Thank you for your order. Your order reference is ${orderId}.`,
      '',
      'Items:',
      itemLinesText(items, currency),
      '',
      `Subtotal: ${formatMoney(subtotal, currency)}`,
      `Shipping: ${shippingCost > 0 ? formatMoney(shippingCost, currency) : 'Free'}`,
      `Order total: ${formatMoney(totalAmount, currency)}`,
      '',
      destination ? `Delivery destination: ${destination}` : '',
      '',
      'Our team will confirm dispatch details within 24 hours.',
      '',
      BRAND.name,
    ].join('\n'),
  };
}

/**
 * Customer-facing "Order Confirmed" notice — sent manually by an admin
 * (Admin Dashboard → Orders → "Send Order Confirmed Email"), once stock and
 * payment have actually been checked. Deliberately a different message from
 * buildCustomerEmail()'s automatic "Order Received": that one fires the
 * instant checkout completes and promises a review; this one is the
 * follow-up once that review is done, so wording that read as "still
 * pending" at checkout now reads as final.
 *
 * @param {object} orderData normalised order (see email-service.js)
 * @returns {{subject:string, html:string, text:string}}
 */
function buildOrderConfirmedEmail(orderData) {
  const { customerName, orderId, subtotal, shippingCost, totalAmount, items, currency, placedAt, shipping } = orderData;
  const destination = addressLine(shipping);

  const body = `
    <p style="font-size:15px;margin:0 0 6px;">Dear <strong>${escapeHtml(customerName)}</strong>,</p>
    <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px;">
      Good news — <strong>your order is confirmed.</strong> Stock and payment have been
      checked, and our export team is preparing it for dispatch.
    </p>

    <div style="background-color:#f0fdf4;padding:12px 16px;border-radius:10px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;"><strong>Order Reference:</strong>
        <span style="font-family:monospace;color:${BRAND.green};font-weight:bold;">${escapeHtml(orderId)}</span>
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Placed: ${escapeHtml(placedAt)}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background-color:#f1f5f9;color:#475569;text-align:left;">
          <th style="padding:10px 14px;">Product</th>
          <th style="padding:10px 14px;text-align:center;">Qty</th>
          <th style="padding:10px 14px;text-align:right;">Unit</th>
          <th style="padding:10px 14px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml(items, currency)}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px 14px;text-align:right;color:#64748b;">Subtotal</td>
          <td style="padding:8px 14px;text-align:right;color:#475569;">${escapeHtml(formatMoney(subtotal, currency))}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:0 14px 8px;text-align:right;color:#64748b;">Shipping</td>
          <td style="padding:0 14px 8px;text-align:right;color:#475569;">
            ${shippingCost > 0 ? escapeHtml(formatMoney(shippingCost, currency)) : 'Free'}
          </td>
        </tr>
        <tr>
          <td colspan="3" style="padding:12px 14px;text-align:right;font-weight:bold;color:#475569;border-top:1px solid #e2e8f0;">Order Total</td>
          <td style="padding:12px 14px;text-align:right;font-weight:bold;color:${BRAND.green};font-size:15px;border-top:1px solid #e2e8f0;">
            ${escapeHtml(formatMoney(totalAmount, currency))}
          </td>
        </tr>
      </tfoot>
    </table>

    ${
      destination
        ? `<div style="background-color:#f8fafc;border-left:4px solid ${BRAND.gold};padding:12px 16px;border-radius:6px;font-size:13px;color:#475569;margin-top:20px;">
             <strong style="color:${BRAND.green};">Delivery destination</strong><br/>${escapeHtml(destination)}
           </div>`
        : ''
    }

    <p style="font-size:13px;color:#64748b;margin-top:20px;">
      Questions about dispatch or delivery? Simply reply to this email — it reaches our export team directly.
    </p>`;

  return {
    subject: `✅ Order Confirmed [${orderId}] — ${BRAND.short}`,
    html: layout({ headline: 'Your order is confirmed', subline: 'Order Confirmed', body }),
    text: [
      `Dear ${customerName},`,
      '',
      `Good news — your order is confirmed. Order reference: ${orderId}.`,
      'Stock and payment have been checked, and our export team is preparing it for dispatch.',
      '',
      'Items:',
      itemLinesText(items, currency),
      '',
      `Subtotal: ${formatMoney(subtotal, currency)}`,
      `Shipping: ${shippingCost > 0 ? formatMoney(shippingCost, currency) : 'Free'}`,
      `Order total: ${formatMoney(totalAmount, currency)}`,
      '',
      destination ? `Delivery destination: ${destination}` : '',
      '',
      BRAND.name,
    ].join('\n'),
  };
}

/**
 * Internal "Order Confirmed" alert for the admin inbox.
 * Tone: operational — leads with the action required, then the detail.
 */
function buildAdminEmail(orderData) {
  const { customerName, customerEmail, orderId, subtotal, shippingCost, totalAmount, items,
          currency, placedAt, paymentMethod, shipping } = orderData;

  const itemCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const destination = addressLine(shipping);
  const phone = shipping && shipping.phone ? shipping.phone : 'Not provided';

  const body = `
    <div style="background-color:#fff7ed;border-left:4px solid ${BRAND.gold};padding:12px 16px;border-radius:6px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>Action required:</strong> confirm stock, then send the proforma invoice to the customer within 24 hours.
      </p>
    </div>

    <table style="width:100%;font-size:13px;line-height:1.7;margin-bottom:20px;">
      <tr><td style="width:150px;color:#64748b;font-weight:bold;">Order ID</td>
          <td style="font-family:monospace;color:${BRAND.green};font-weight:bold;">${escapeHtml(orderId)}</td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Placed</td><td>${escapeHtml(placedAt)}</td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Customer</td><td><strong>${escapeHtml(customerName)}</strong></td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Email</td>
          <td><a href="mailto:${escapeHtml(customerEmail)}" style="color:${BRAND.green};font-weight:bold;">${escapeHtml(customerEmail)}</a></td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Phone / WhatsApp</td><td><strong>${escapeHtml(phone)}</strong></td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Deliver to</td><td>${escapeHtml(destination || 'Not provided')}</td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Payment</td><td>${escapeHtml(paymentMethod)}</td></tr>
      <tr><td style="color:#64748b;font-weight:bold;">Units</td><td>${escapeHtml(itemCount)} across ${escapeHtml(items.length)} line(s)</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background-color:#f1f5f9;color:#475569;text-align:left;">
          <th style="padding:10px 14px;">Product</th>
          <th style="padding:10px 14px;text-align:center;">Qty</th>
          <th style="padding:10px 14px;text-align:right;">Unit</th>
          <th style="padding:10px 14px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRowsHtml(items, currency)}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:8px 14px;text-align:right;color:#64748b;">Subtotal</td>
          <td style="padding:8px 14px;text-align:right;color:#475569;">${escapeHtml(formatMoney(subtotal, currency))}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:0 14px 8px;text-align:right;color:#64748b;">Shipping</td>
          <td style="padding:0 14px 8px;text-align:right;color:#475569;">
            ${shippingCost > 0 ? escapeHtml(formatMoney(shippingCost, currency)) : 'Free'}
          </td>
        </tr>
        <tr>
          <td colspan="3" style="padding:12px 14px;text-align:right;font-weight:bold;color:#475569;border-top:1px solid #e2e8f0;">Order Value</td>
          <td style="padding:12px 14px;text-align:right;font-weight:bold;color:${BRAND.green};font-size:15px;border-top:1px solid #e2e8f0;">
            ${escapeHtml(formatMoney(totalAmount, currency))}
          </td>
        </tr>
      </tfoot>
    </table>`;

  return {
    subject: `🛒 Order Confirmed [${orderId}] — ${customerName} · ${formatMoney(totalAmount, currency)}`,
    html: layout({ headline: 'New sale — order confirmed', subline: 'Internal Sales Alert', body }),
    text: [
      `New order ${orderId} (${placedAt})`,
      `Customer: ${customerName} <${customerEmail}>`,
      `Phone: ${phone}`,
      `Deliver to: ${destination || 'Not provided'}`,
      `Payment: ${paymentMethod}`,
      '',
      'Items:',
      itemLinesText(items, currency),
      '',
      `Order value: ${formatMoney(totalAmount, currency)}`,
      '',
      'Action required: confirm stock and send the proforma invoice.',
    ].join('\n'),
  };
}

module.exports = { buildCustomerEmail, buildAdminEmail, buildOrderConfirmedEmail, escapeHtml, formatMoney, BRAND };
