/**
 * lib/orders-repo.js
 * ---------------------------------------------------------------------------
 * Durable order storage (audit L-04; Master-Vault items 36, 41, 42).
 *
 * - One row per order with the line items as JSONB, so an order is written in
 *   a single atomic INSERT — no half-saved order/items pairs.
 * - Customer PII (name, email, phone, address) is AES-256-GCM encrypted with
 *   ORDER_DATA_KEY before it leaves the server; the database only ever sees
 *   ciphertext in customer_enc.
 * - Written with the service-role key; RLS on the table blocks the anon key
 *   entirely and lets a signed-in buyer read only rows where user_id = auth.uid().
 *
 * Until the migration has been run AND ORDER_DATA_KEY is set, orders fall back
 * to the previous in-memory list (and a warning is logged) — plaintext PII is
 * never written to the database.
 */
const supabase = require('../supabaseClient');
const { encryptJson, decryptJson, hasKey } = require('./crypto-box');

const MAX_LOCAL = 500;
const localOrders = [];
let tableMissing = false;

const orderKey = () => process.env.ORDER_DATA_KEY;
const persistent = () => Boolean(supabase && !tableMissing && hasKey(orderKey()));

function markMissingIfSchemaError(error) {
  if (error && /orders|schema cache|does not exist/i.test(error.message)) {
    tableMissing = true;
    console.warn('⚠️  orders table not found — orders are kept in memory until the migration is run.');
    return true;
  }
  return false;
}

async function saveOrder(order) {
  if (!persistent()) {
    if (supabase && !hasKey(orderKey())) console.warn('⚠️  ORDER_DATA_KEY not set — order kept in memory only (PII is never stored unencrypted).');
    localOrders.unshift(order);
    if (localOrders.length > MAX_LOCAL) localOrders.pop();
    return { stored: 'memory' };
  }

  const row = {
    order_id: order.orderId,
    user_id: order.userId,
    customer_enc: encryptJson(order.customer, orderKey()),
    items: order.items,
    subtotal: order.subtotal,
    shipping_cost: order.shippingCost,
    total_amount: order.totalAmount,
    payment_method: order.paymentMethod,
    status: order.status,
    created_at: order.createdAt,
  };
  const { error } = await supabase.from('orders').insert(row);
  if (error) {
    if (markMissingIfSchemaError(error)) return saveOrder(order);
    throw new Error(`Could not save order: ${error.message}`);
  }
  return { stored: 'database' };
}

async function listOrders(limit = 200) {
  if (!persistent()) return localOrders.slice(0, limit);

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, user_id, customer_enc, items, subtotal, shipping_cost, total_amount, payment_method, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (markMissingIfSchemaError(error)) return localOrders.slice(0, limit);
    throw new Error(`Could not load orders: ${error.message}`);
  }

  return data.map((r) => {
    let customer;
    try { customer = decryptJson(r.customer_enc, orderKey()); } catch { customer = { name: '(could not decrypt — check ORDER_DATA_KEY)' }; }
    return {
      orderId: r.order_id,
      userId: r.user_id,
      customer,
      items: r.items,
      subtotal: Number(r.subtotal),
      shippingCost: Number(r.shipping_cost),
      totalAmount: Number(r.total_amount),
      paymentMethod: r.payment_method,
      status: r.status,
      createdAt: r.created_at,
    };
  });
}

/** Single order by its app-level ID, or null. Same shape as listOrders(). */
async function findOrder(orderId) {
  if (!persistent()) return localOrders.find((o) => o.orderId === orderId) || null;

  const { data, error } = await supabase
    .from('orders')
    .select('order_id, user_id, customer_enc, items, subtotal, shipping_cost, total_amount, payment_method, status, created_at')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) {
    if (markMissingIfSchemaError(error)) return localOrders.find((o) => o.orderId === orderId) || null;
    throw new Error(`Could not load order: ${error.message}`);
  }
  if (!data) return null;

  let customer;
  try { customer = decryptJson(data.customer_enc, orderKey()); } catch { customer = { name: '(could not decrypt — check ORDER_DATA_KEY)' }; }
  return {
    orderId: data.order_id,
    userId: data.user_id,
    customer,
    items: data.items,
    subtotal: Number(data.subtotal),
    shippingCost: Number(data.shipping_cost),
    totalAmount: Number(data.total_amount),
    paymentMethod: data.payment_method,
    status: data.status,
    createdAt: data.created_at,
  };
}

module.exports = { saveOrder, listOrders, findOrder };
