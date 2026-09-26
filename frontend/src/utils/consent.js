/**
 * Cookie consent.
 *
 * The visitor's choice is kept in one first-party cookie (`cefi_consent`,
 * 180 days). Analytics (Google Analytics 4) is OFF until the visitor accepts:
 * the Google script is not even downloaded before that, and declining
 * afterwards removes the analytics cookies again.
 *
 * Essential cookies (sign-in session) are not affected by this choice.
 *
 * Set VITE_GA_MEASUREMENT_ID (your real "G-XXXXXXXXXX" id) in the build
 * environment to switch analytics on. Without it nothing is ever loaded,
 * whatever the visitor chooses.
 */

const COOKIE_NAME = 'cefi_consent';
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();

export const CONSENT_EVENT = 'cefi:consent';
export const OPEN_SETTINGS_EVENT = 'cefi:open-cookie-settings';

/** @returns {'accepted' | 'declined' | null} null = the visitor hasn't chosen yet */
export function getConsent() {
  try {
    const match = document.cookie.split('; ').find((c) => c.startsWith(COOKIE_NAME + '='));
    const value = match ? match.split('=')[1] : null;
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export const analyticsAllowed = () => getConsent() === 'accepted' && Boolean(GA_ID);

function writeCookie(value) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

let analyticsLoaded = false;

function loadAnalytics() {
  if (!GA_ID || analyticsLoaded) return;
  analyticsLoaded = true;
  window[`ga-disable-${GA_ID}`] = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

/** Removes Google Analytics cookies set by this site (on this host and its parent domain). */
function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = [undefined, host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
  document.cookie.split('; ').map((c) => c.split('=')[0]).filter((n) => /^_ga(_|$)|^_gid$/.test(n)).forEach((name) => {
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${d ? `; Domain=${d}` : ''}`;
    }
  });
}

/**
 * Call once at start-up. Restores an earlier "accepted" choice; otherwise
 * removes any analytics cookies left over from before consent existed (the
 * site used to load Google Analytics for everyone).
 */
export function initConsent() {
  if (getConsent() === 'accepted') loadAnalytics();
  else clearAnalyticsCookies();
}

/** @param {'accepted' | 'declined'} choice */
export function setConsent(choice) {
  writeCookie(choice);
  if (choice === 'accepted') {
    loadAnalytics();
    // Count the page the visitor is on right now.
    window.gtag?.('event', 'page_view', { page_path: window.location.pathname, page_title: document.title });
  } else {
    if (GA_ID) window[`ga-disable-${GA_ID}`] = true;
    clearAnalyticsCookies();
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/** Lets any link/button (e.g. the footer) re-open the banner. */
export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
