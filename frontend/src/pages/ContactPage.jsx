import React, { useState, useRef } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Globe, Clock, Building } from 'lucide-react';

export default function ContactPage() {
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let sent = false;

    // 1. Backend (Resend) — emails the admin AND sends the customer a confirmation.
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) sent = true;
      }
    } catch (err) {
      console.warn('Backend contact API failed, attempting fallback...', err);
    }

    // 2. Web3Forms fallback (admin inbox only) if the backend is unreachable
    if (!sent) {
      try {
        const w3Res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '2a8d834e-5677-4c4c-b610-6844fe2ba187',
            from_name: "CEFI Inquiries",
            subject: `📬 [Inquiry] ${formData.subject || 'General Inquiry'} - from ${formData.name}`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || 'N/A',
            inquiry_type: formData.subject || 'General Inquiry',
            message: formData.message,
          })
        });
        const w3Data = await w3Res.json();
        if (w3Data.success) sent = true;
      } catch (w3Err) {
        console.warn('Web3Forms failed, attempting fallback...', w3Err);
      }
    }

    // 3. FormSubmit fallback (admin inbox only)
    if (!sent) {
      try {
        const fsRes = await fetch('https://formsubmit.co/ajax/ceylonecofreshinfinity@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: `📬 [Inquiry] ${formData.subject || 'General Inquiry'} - from ${formData.name}`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || 'N/A',
            subject: formData.subject || 'General Inquiry',
            message: formData.message
          })
        });
        const fsData = await fsRes.json();
        if (fsData.success === 'true' || fsData.success === true) sent = true;
      } catch (fsErr) {
        console.warn('FormSubmit fallback failed', fsErr);
      }
    }


    if (sent) {
      setSubmitted(true);
    } else {
      setError('Could not send message. Please contact us directly at ceylonecofreshinfinity@gmail.com or +94 714 634 485');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">Get In Touch</span>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl text-cefi-earth">
          Contact Ceylon Eco Fresh Infinity
        </h1>
        <p className="text-sm text-gray-500 font-sans">
          Have a retail inquiry, export quotation request, or general trade question? Our Colombo headquarters team is here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-cefi-green text-white p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
            <h3 className="font-serif font-bold text-2xl">Colombo Headquarters</h3>
            
            <div className="space-y-4 text-xs text-emerald-100">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-cefi-gold shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white text-sm">Primary Address</strong>
                  <span>No. 278/1/A, Meegasmulla. Dedigamuwa.</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-cefi-gold shrink-0" />
                <div>
                  <strong className="block text-white text-sm">Direct Phone & WhatsApp</strong>
                  <span>+94714634485</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-cefi-gold shrink-0" />
                <div>
                  <strong className="block text-white text-sm">Email Correspondence</strong>
                  <span>ceylonecofreshinfinity@gmail.com</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-cefi-gold shrink-0" />
                <div>
                  <strong className="block text-white text-sm">Business Hours</strong>
                  <span>9.00 am - 8.30pm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Map Container */}
          <div className="bg-white p-3 rounded-3xl border border-gray-100 shadow-soft overflow-hidden space-y-2">
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-cefi-earth">
                <MapPin className="w-3.5 h-3.5 text-cefi-green" />
                <span>Meegasmulla, Dedigamuwa, Sri Lanka</span>
              </div>
              <a
                href="https://maps.google.com/?q=No.+278/1/A,+Meegasmulla,+Dedigamuwa,+Sri+Lanka"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-cefi-green hover:text-cefi-green-dark hover:underline inline-flex items-center space-x-1"
              >
                <span>Open in Maps</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
            <div className="h-64 rounded-2xl overflow-hidden border border-gray-100 relative">
              <iframe
                title="CEFI Headquarters - No. 278/1/A, Meegasmulla, Dedigamuwa"
                src="https://maps.google.com/maps?q=No.+278/1/A,+Meegasmulla,+Dedigamuwa,+Sri+Lanka&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="w-full h-full border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-soft">
          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-cefi-green rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-cefi-earth">Message Dispatched!</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Thank you for contacting Ceylon Eco Fresh Infinity. Your message has been routed to our customer relations desk. We will respond via email within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 bg-cefi-green text-white text-xs font-semibold rounded-full"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-serif font-bold text-2xl text-cefi-earth mb-6">Send Us a Message</h3>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+94 77 123 4567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Subject</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Export Quotation">Export Quotation Request</option>
                    <option value="Wholesale Distributorship">Wholesale Distributorship</option>
                    <option value="Custom OEM Packaging">Custom OEM Packaging</option>
                    <option value="Press & Media">Press & Media</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Message *</label>
                <textarea
                  rows="5"
                  name="message"
                  required
                  placeholder="How can CEFI assist your business or retail order today?"
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Sending Message...</span>
                ) : (
                  <>
                    <span>Send Message to CEFI</span>
                    <Send className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
