import React from 'react';
import { Link } from 'react-router-dom';
import { openCookieSettings } from '../utils/consent';

const UPDATED = '26 September 2026';

const Section = ({ n, title, children }) => (
  <section className="space-y-3">
    <div className="flex items-baseline gap-3 border-b border-cefi-green/15 pb-2">
      <span className="font-serif font-bold text-sm text-cefi-gold">{n}</span>
      <h2 className="font-serif font-bold text-xl sm:text-2xl text-cefi-earth">{title}</h2>
    </div>
    <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-cefi-earth/80">{children}</div>
  </section>
);

const List = ({ items }) => (
  <ul className="list-disc pl-5 space-y-2 marker:text-cefi-gold">
    {items.map(([label, text]) => (
      <li key={label}><strong className="text-cefi-earth">{label}</strong> {text}</li>
    ))}
  </ul>
);

export default function PrivacyPage() {
  return (
    <div className="pb-20">
      <section className="bg-cefi-green text-white py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-3">
          <span className="text-xs uppercase tracking-widest font-bold text-cefi-gold">Legal</span>
          <h1 className="font-serif font-extrabold text-4xl sm:text-5xl">Privacy Policy</h1>
          <p className="text-sm text-emerald-100">Last updated {UPDATED}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 space-y-10">
        <p className="text-sm sm:text-[15px] leading-relaxed text-cefi-earth/80">
          This policy explains what information Ceylon Eco Fresh Infinity collects through this website, how we use
          it, and the choices you have.
        </p>

        <Section n="01" title="Who we are">
          <p>
            Ceylon Eco Fresh Infinity (Pvt) Ltd (“CEFI”, “we”, “us”, “our”) is a Sri Lankan company that
            manufactures, trades and exports Ceylon tea, spices, herbs, fruit and vegetable products. We operate this
            website, including its product catalogue, quote requests, orders, customer accounts and contact forms. This
            policy applies to information we collect through them.
          </p>
          <p>
            Ceylon Eco Fresh Infinity (Pvt) Ltd, No. 278/1/A, Meegasmulla, Dedigamuwa, Sri Lanka ·{' '}
            <a className="text-cefi-green underline" href="mailto:ceylonecofreshinfinity@gmail.com">ceylonecofreshinfinity@gmail.com</a> ·{' '}
            <a className="text-cefi-green underline" href="tel:+94714634485">+94 714 634 485</a>
          </p>
        </Section>

        <Section n="02" title="Information we collect">
          <List items={[
            ['Account information.', 'When you register, we collect your email address and a password. If you sign in with Google or Facebook, we receive the basic profile details they share with us (name, email address and profile picture).'],
            ['Orders.', 'Your name, phone number, delivery address, city, postal code and country, the products you order (with the type, size and quantity you chose) and the payment method you select. Your contact and delivery details are stored encrypted.'],
            ['Quote requests.', 'Your name, company, email address, phone number, the product, estimated quantity, destination and any notes you write.'],
            ['Messages.', 'Your name, email address, phone number, subject and message when you use the contact form.'],
            ['Newsletter.', 'Your email address when you join our list.'],
            ['Technical data.', 'Our hosting provider records standard request logs, such as your IP address, browser and the pages requested, to run and secure the site. We also use your IP address briefly to count requests and block abuse. To lock an account after repeated failed sign-ins we keep a scrambled (hashed) form of the email address, not the address itself. Actions taken by our staff in the admin area are recorded in an audit log (who, what, when, IP address and browser).'],
          ]} />
          <p>We do not ask you for card numbers on this website.</p>
        </Section>

        <Section n="03" title="How we use information">
          <ul className="list-disc pl-5 space-y-2 marker:text-cefi-gold">
            <li>To create and manage your account and keep you signed in.</li>
            <li>To handle your orders and quote requests, agree pricing, shipping and payment with you by email, and arrange delivery.</li>
            <li>To send you order emails, such as “Order Received” and “Order Confirmed”, and to reply to your messages.</li>
            <li>To send you news about harvest arrivals, export offers and new products, if you joined our list. You can ask us to stop at any time.</li>
            <li>To protect the website, our customers and our staff against fraud, abuse and security threats.</li>
            <li>To understand how the site is used and improve it, but only if you accept analytics cookies (see section 05).</li>
            <li>To keep the records we need to comply with the law, and to deal with disputes.</li>
          </ul>
        </Section>

        <Section n="04" title="Payments and third parties">
          <p>
            Payment is not taken on this website. After you place an order or request a quote, we agree the price and
            payment arrangements with you directly.
          </p>
          <p>The services that process information on our behalf are:</p>
          <List items={[
            ['Supabase', '(accounts, database and product images). Passwords are handled by Supabase and stored only as a secure hash.'],
            ['Vercel', '(website hosting and request logs).'],
            ['Resend', '(delivery of the emails we send: order emails and notifications of your messages to our team).'],
            ['Upstash', '(short-lived counters that limit repeated requests).'],
            ['Google and Facebook', '(sign-in, only if you choose it). We never see your Google or Facebook password.'],
            ['Google', '(fonts and the map on our Contact page, which your browser loads directly, and Google Analytics, only if you accept it).'],
          ]} />
          <p>
            Some images, including product and blog pictures, are fetched by your browser directly from the service
            that hosts them, such as Supabase Storage or Unsplash. That service can see your IP address and browser.
            Our service providers may process information in countries outside Sri Lanka. We do not sell your personal
            information.
          </p>
        </Section>

        <Section n="05" title="Cookies and local storage">
          <p>We use these essential cookies to keep you signed in securely. They are needed for the site to work:</p>
          <List items={[
            ['cefi_at', 'keeps you signed in (15 minutes, renewed automatically).'],
            ['cefi_rt', 'renews your session (up to 7 days).'],
            ['cefi_fp', 'ties your session to the browser you signed in from, as a safeguard against session theft.'],
            ['cefi_pkce', 'exists for about 10 minutes while you sign in with Google or Facebook.'],
          ]} />
          <p>
            On secure connections these names start with <code className="text-xs bg-cefi-green-soft px-1 rounded">__Host-</code>. They are
            HttpOnly, so scripts on the page cannot read them. We also use one cookie, <strong className="text-cefi-earth">cefi_consent</strong>,
            to remember your cookie choice for 180 days, and your browser’s local storage to keep the contents of your
            shopping basket. None of this is used for advertising.
          </p>
          <p>
            <strong className="text-cefi-earth">Analytics are off until you accept them.</strong> If you accept, we load Google Analytics,
            which sets cookies (<code className="text-xs bg-cefi-green-soft px-1 rounded">_ga</code> and{' '}
            <code className="text-xs bg-cefi-green-soft px-1 rounded">_ga_…</code>, lasting up to two years) and measures which pages are viewed and
            which products are viewed, added to the basket or requested as a quote, along with the approximate location,
            device and browser of visitors. Google Analytics 4 does not log or store individual IP addresses. If you
            decline, no analytics cookies are set and Google’s analytics script is not loaded.
          </p>
          <p>
            You can change your choice at any time:{' '}
            <button type="button" onClick={openCookieSettings} className="text-cefi-green underline font-semibold">
              Cookie settings
            </button>
            . Declining, or changing to “Decline”, also removes the analytics cookies from this site.
          </p>
        </Section>

        <Section n="06" title="Data retention">
          <p>
            We keep account information while your account is active. Orders, quote requests, messages and email
            records are kept for as long as reasonably necessary to respond to you, provide what you asked for, keep
            business and accounting records, maintain security and resolve disputes. Newsletter addresses are kept until
            you ask us to remove them. Encrypted backups of our database are kept for disaster recovery.
          </p>
        </Section>

        <Section n="07" title="Your rights">
          <p>
            You can ask us to give you a copy of your personal information, correct it, delete it, or stop using it,
            and you can withdraw your consent (for example to analytics or the newsletter) at any time. To do so, email{' '}
            <a className="text-cefi-green underline" href="mailto:ceylonecofreshinfinity@gmail.com">ceylonecofreshinfinity@gmail.com</a>{' '}
            from the address on your account. If you ask us to delete your account, we will delete your profile and
            personal information, except records we are required or entitled to keep, such as completed orders needed
            for accounting. You may also complain to your local data protection authority.
          </p>
        </Section>

        <Section n="08" title="Security">
          <p>
            We use encrypted connections (HTTPS), store your contact and delivery details on orders in encrypted form,
            keep your sign-in cookies out of reach of page scripts, and limit access to personal information to the
            staff who need it. No system is completely secure, so we cannot guarantee absolute security.
          </p>
        </Section>

        <Section n="09" title="Children">
          <p>
            This website is for businesses and adults and is not directed to children under 16. If you believe a
            child has given us personal information, contact us and we will delete it.
          </p>
        </Section>

        <Section n="10" title="Policy updates">
          <p>
            We may update this policy from time to time. We will change the date at the top of this page and, for
            material changes, give notice on the website.
          </p>
        </Section>

        <Section n="11" title="Contact information">
          <p>
            Questions about this policy? Email{' '}
            <a className="text-cefi-green underline" href="mailto:ceylonecofreshinfinity@gmail.com">ceylonecofreshinfinity@gmail.com</a>, call{' '}
            <a className="text-cefi-green underline" href="tel:+94714634485">+94 714 634 485</a>, or use our{' '}
            <Link to="/contact" className="text-cefi-green underline">contact form</Link>.
          </p>
        </Section>
      </div>
    </div>
  );
}
