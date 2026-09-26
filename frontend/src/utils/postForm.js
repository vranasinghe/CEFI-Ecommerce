/**
 * Submits a public form (contact, newsletter, quote) to the API, which
 * delivers it to the owner's inbox through Resend.
 *
 * There is deliberately no browser-side fallback to a third-party form
 * service: a submission the server rejects (invalid input, rate limit) or
 * fails to send is reported to the visitor, instead of being silently
 * rerouted to another service that bypasses those checks.
 *
 * @returns {Promise<{ok: boolean, message: (string|null)}>} never rejects
 */
export async function postForm(path, body) {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true, message: null };
    // Validation, rate-limit and send errors carry `message`; the global
    // error handler nests it under `error`.
    return { ok: false, message: data.message || data.error?.message || null };
  } catch {
    return { ok: false, message: null };
  }
}
