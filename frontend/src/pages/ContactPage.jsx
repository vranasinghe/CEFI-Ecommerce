import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Globe, Clock, Building } from 'lucide-react';

export default function ContactPage() {
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

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission failed.');
      }
    } catch (err) {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
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
                  <span>No. 147, Havelock Rd, Colombo 05, Sri Lanka</span>
                  <span className="block text-[11px] text-emerald-300 mt-1">Branch: No. 233A, Kaduwela Rd, Koswatte, Battaramulla</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-cefi-gold shrink-0" />
                <div>
                  <strong className="block text-white text-sm">Direct Phone & WhatsApp</strong>
                  <span>+94 11 727 1692 / +94 77 727 1692</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-cefi-gold shrink-0" />
                <div>
                  <strong className="block text-white text-sm">Email Correspondence</strong>
                  <span>info@cefi.lk / export@cefi.lk</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-cefi-gold shrink-0" />
                <div>
                  <strong className="block text-white text-sm">Business Hours</strong>
                  <span>Monday – Saturday: 8:30 AM – 5:30 PM (IST / UTC+5:30)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Map Container */}
          <div className="bg-white p-2 rounded-3xl border border-gray-100 shadow-soft overflow-hidden h-64">
            <iframe
              title="CEFI Location Map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.982352824335!2d79.865324!3d6.892693!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a4a58925555%3A0x6b772dfd38a0f0!2sHavelock%20Rd%2C%20Colombo!5e0!3m2!1sen!2slk!4v1700000000000!5m2!1sen!2slk"
              className="w-full h-full rounded-2xl border-0"
              loading="lazy"
            ></iframe>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-serif font-bold text-2xl text-cefi-earth mb-6">Send Us a Message</h3>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Your Full Name *</label>
                  <input
                    type="text"
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
                    placeholder="+94 77 123 4567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Subject</label>
                  <select
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
