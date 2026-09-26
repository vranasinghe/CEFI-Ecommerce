import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { getConsent, setConsent, OPEN_SETTINGS_EVENT } from '../utils/consent';

/**
 * Cookie consent banner. Shown until the visitor chooses; the footer's
 * "Cookie settings" link re-opens it so the choice can be changed any time.
 */
export default function CookieBanner() {
  const [open, setOpen] = useState(() => getConsent() === null);

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (choice) => {
    setConsent(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 sm:inset-x-6 sm:bottom-6 z-[60] flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-5xl bg-cefi-earth text-white border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-cefi-green border border-white/10 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-cefi-gold-light" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base">Cookies on CEFI</h2>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed mt-1">
              Essential cookies keep you signed in. Optional cookies let us count visits and measure how the
              site performs, using Google Analytics, but only if you accept. No advertising, and we never sell
              your data.{' '}
              <Link to="/privacy" className="underline text-cefi-gold-light hover:text-white">Privacy Policy</Link>
            </p>
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => choose('declined')}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-sm font-semibold transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-cefi-gold hover:bg-cefi-gold-light text-cefi-earth text-sm font-bold shadow-md transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
