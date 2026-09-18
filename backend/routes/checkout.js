/**
 * routes/checkout.js
 * ---------------------------------------------------------------------------
 * Checkout controller: validate → persist the order → fire the dual email
 * notification → respond.
 *
 * The golden rule here: a failed email must never fail a paid order. Email
 * dispatch is therefore isolated behind try/catch (and the service itself
 * never rejects), and the HTTP response reports email status as metadata
 * rather than as a failure.
 *
 * Wire it up in server.js:
 *     app.use('/api', require('./routes/checkout'));
 */

const express = require('express');
const crypto = require('crypto');
const { sendOrderEmails } = require('../lib/order-email-service');

const router = express.Router();

/**
 * MOCK PERSISTENCE LAYER — replace with your real data access.
 *
 * Mongoose equivalent:
 *     const Order = require('../models/Order');
 *     const saved = await Order.create({ ...orderDoc });
 *     return saved.toObject();
 *
 * Supabase equivalent (matches this repo's current stack):
 *     const { data, error } = await supabase.from('orders').insert(orderDoc).select().single();
 *     if (error) throw error;
 *     return data;
 */
async function saveOrderToDatabase(orderDoc) {
  // Simulated write latency so the async shape matches the real thing.
  await new Promise((resolve) => setTimeout(resolve, 10));
  return { ...orderDoc, _id: crypto.randomUUID() };
}

/** Server-side total. Never trust a client-supplied amount — it's chargeable data. */
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
}

router.post('/checkout', async (req, res) => {
  const { customerEmail, customerName, items, paymentMethod, shipping } = req.body || {};

  // ── 1. Validate the request ───────────────────────────────────────────────
  if (!customerEmail || !customerName) {
    return res.status(400).json({ success: false, message: 'customerName and customerEmail are required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Your cart is empty.' });
  }

  try {
    // ── 2. Persist the order — this is the step that may legitimately fail ──
    const orderId = `CEFI-ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const totalAmount = calculateTotal(items);

    const savedOrder = await saveOrderToDatabase({
      orderId,
      customerName,
      customerEmail,
      items,
      totalAmount,
      currency: process.env.DEFAULT_CURRENCY || 'USD',
      paymentMethod: paymentMethod || 'Direct Export Order',
      shipping: shipping || null,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });

    // ── 3. Dispatch both emails ───────────────────────────────────────────────
    // Awaited so the API response can report delivery status. The try/catch is
    // belt-and-braces: sendOrderEmails already resolves on every failure path,
    // but an unexpected throw here must still not undo a saved order.
    let emailStatus = { success: false, reason: 'not attempted' };
    try {
      emailStatus = await sendOrderEmails({
        customerEmail: savedOrder.customerEmail,
        customerName: savedOrder.customerName,
        orderId: savedOrder.orderId,
        totalAmount: savedOrder.totalAmount,
        items: savedOrder.items,
        currency: savedOrder.currency,
        paymentMethod: savedOrder.paymentMethod,
        placedAt: savedOrder.createdAt,
      });
    } catch (emailErr) {
      // Log loudly, keep going — the order is already safe in the database.
      console.error(`⚠️  [Checkout] Email dispatch failed for ${savedOrder.orderId}:`, emailErr.message);
      emailStatus = { success: false, reason: emailErr.message };
    }

    // ── 4. Always confirm the order to the buyer ──────────────────────────────
    return res.status(201).json({
      success: true,
      orderId: savedOrder.orderId,
      totalAmount: savedOrder.totalAmount,
      message: 'Order placed successfully.',
      notifications: {
        emailed: emailStatus.success,
        // Surfaced for admin dashboards/logs; the customer UI can ignore it.
        detail: emailStatus.success ? undefined : emailStatus.reason || 'One or more emails failed to send.',
      },
    });
  } catch (dbErr) {
    // Only a persistence failure is a real checkout failure.
    console.error('❌ [Checkout] Failed to save order:', dbErr);
    return res.status(500).json({
      success: false,
      message: 'We could not complete your order. No charge has been finalised — please try again.',
    });
  }
});

/**
 * Fire-and-forget variant: use this when you need the fastest possible
 * response and can accept not reporting email status to the client.
 * The .catch() is mandatory — an unhandled rejection can kill the process.
 *
 *   sendOrderEmails(payload).catch((err) =>
 *     console.error('[Checkout] async email error:', err.message)
 *   );
 */

module.exports = router;
