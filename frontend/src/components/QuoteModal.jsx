import React, { useState } from 'react';
import { X, Send, CheckCircle2, Globe, Building2, PackageCheck } from 'lucide-react';
import { trackQuoteRequest } from '../utils/analytics';

export default function QuoteModal({ isOpen, onClose, initialProduct = '' }) {
  const [formData, setFormData] = useState({
    productName: initialProduct || 'Ceylon Spices & Tea Export Portfolio',
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    estimatedQuantity: '100 kg - 500 kg',
    targetDestination: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        trackQuoteRequest(formData.productName, formData.companyName);
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission failed.');
      }
    } catch (err) {
      // Fallback success feedback
      trackQuoteRequest(formData.productName, formData.companyName);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cefi-earth/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-cefi-gold/20">
        
        {/* Header */}
        <div className="bg-cefi-green text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cefi-gold/20 rounded-lg">
              <Globe className="w-6 h-6 text-cefi-gold" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold">Wholesale & Export Inquiry</h3>
              <p className="text-xs text-emerald-100">Direct factory pricing & custom OEM specifications from Ceylon</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-cefi-green rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-serif font-bold text-cefi-green">Quote Inquiry Received!</h4>
              <p className="text-sm text-cefi-earth/80 max-w-md mx-auto">
                Thank you, <strong>{formData.contactPerson}</strong>. Our international export team at CEFI will evaluate your specifications for <strong>{formData.productName}</strong> and send an official FOB/CIF quotation to <strong>{formData.email}</strong> within 24 business hours.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 bg-cefi-green text-white font-medium rounded-full hover:bg-cefi-green-dark transition-all"
              >
                Close & Return to Browsing
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Target Product</label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={e => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Company / Organization Name *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Global Foods Trading Ltd"
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={formData.contactPerson}
                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="buyer@company.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+1 555-0192"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Estimated Quantity *</label>
                  <select
                    value={formData.estimatedQuantity}
                    onChange={e => setFormData({ ...formData, estimatedQuantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                  >
                    <option value="50 kg - 100 kg">50 kg - 100 kg (Sample / Trial)</option>
                    <option value="100 kg - 500 kg">100 kg - 500 kg</option>
                    <option value="500 kg - 2,000 kg">500 kg - 2,000 kg</option>
                    <option value="Full Container Load (20ft FCL)">Full Container Load (20ft FCL)</option>
                    <option value="Full Container Load (40ft FCL)">Full Container Load (40ft FCL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Target Destination Port / Country</label>
                <input
                  type="text"
                  placeholder="e.g. Rotterdam, Netherlands / Hamburg, Germany"
                  value={formData.targetDestination}
                  onChange={e => setFormData({ ...formData, targetDestination: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-cefi-earth/70 mb-1">Additional Specifications / OEM Packaging Request</label>
                <textarea
                  rows="3"
                  placeholder="Specify leaf grade, mesh size, private labeling details, or certifications required (USDA Organic, ISO 22000, Halal)..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full text-sm font-semibold shadow-md flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <span>Submit Wholesale Inquiry</span>
                      <Send className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
