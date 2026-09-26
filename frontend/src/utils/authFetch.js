/**
 * fetch() for API calls that need the signed-in user.
 *
 * The session lives in HttpOnly cookies set by the backend, so there is no
 * token to attach: the browser sends the cookies itself. This wrapper only
 * makes that explicit (credentials: 'same-origin' is the browser default for
 * our same-origin /api calls, stated here so it can't silently change).
 */
export async function authFetch(url, options = {}) {
  return fetch(url, { credentials: 'same-origin', ...options });
}

export default authFetch;
