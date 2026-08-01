import React from 'react';
import { Link } from 'react-router-dom';
import { Award, ShieldCheck, Globe, Target, Eye, Leaf, Heart, Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Banner */}
      <section className="bg-cefi-green text-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <span className="text-xs uppercase tracking-widest font-bold text-cefi-gold">Company Profile</span>
          <h1 className="font-serif font-extrabold text-4xl sm:text-5xl lg:text-6xl">
            Ceylon Eco Fresh Infinity
          </h1>
          <p className="font-serif italic text-xl text-emerald-100 max-w-2xl mx-auto">
            "Rooted in Ceylon, Grown for the World."
          </p>
        </div>
      </section>

      {/* 1. About Us Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-cefi-gold">Who We Are</span>
            <h2 className="font-serif font-bold text-3xl sm:text-4xl text-cefi-earth leading-tight">
              Sri Lankan Agriculture & Natural Products Masterclass
            </h2>
            <p className="text-sm text-cefi-earth/80 leading-relaxed font-sans">
              Ceylon Eco Fresh Infinity (Pvt) Ltd. (CEFI) is a premier Sri Lankan food & natural-products company that manufactures, trades, distributes, and exports fine teas, spices, coconut products, herbs, dried foods, and agricultural produce.
            </p>
            <p className="text-sm text-cefi-earth/80 leading-relaxed font-sans">
              Founded on principles of uncompromised purity, environmental stewardship, and direct agricultural trade, CEFI connects local farming communities in Sri Lanka directly with international buyers, wholesalers, and retail consumers globally.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/3]">
              <img
                src="https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=1000&q=80"
                alt="Ceylon Tea Estates"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 2. Vision, Mission & Core Values */}
      <section className="bg-cefi-cream py-16 border-y border-cefi-cream-dark/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Vision Card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-soft space-y-4">
              <div className="w-12 h-12 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-cefi-earth">Our Vision</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                To be the global gold standard for Sri Lankan natural products by delivering pure, sustainably grown Ceylon produce while enriching agricultural communities across our island home.
              </p>
            </div>

            {/* Mission Card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-soft space-y-4">
              <div className="w-12 h-12 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-cefi-earth">Our Mission</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cefi-green shrink-0 mt-0.5" />
                  <span>To cultivate, process, and export authentic Ceylon tea, true cinnamon, and spices.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cefi-green shrink-0 mt-0.5" />
                  <span>To guarantee 100% pure, unadulterated product quality with zero chemical additives.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-cefi-green shrink-0 mt-0.5" />
                  <span>To empower outgrower farm families through fair farmgate compensation and technology sharing.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Core Values */}
          <div className="space-y-6">
            <h3 className="font-serif font-bold text-2xl text-cefi-earth text-center">Core Values</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs text-center space-y-2">
                <Leaf className="w-8 h-8 text-cefi-green mx-auto" />
                <h4 className="font-serif font-bold text-base text-cefi-earth">Integrity & Purity</h4>
                <p className="text-xs text-gray-500">Unadulterated single-origin products without artificial dyes or additives.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs text-center space-y-2">
                <Heart className="w-8 h-8 text-cefi-green mx-auto" />
                <h4 className="font-serif font-bold text-base text-cefi-earth">Sustainability</h4>
                <p className="text-xs text-gray-500">Solar drying, organic soil conservation, and zero-waste processing.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs text-center space-y-2">
                <Award className="w-8 h-8 text-cefi-green mx-auto" />
                <h4 className="font-serif font-bold text-base text-cefi-earth">Excellence</h4>
                <p className="text-xs text-gray-500">Rigorous laboratory testing adhering to ISO 22000 & HACCP norms.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs text-center space-y-2">
                <Users className="w-8 h-8 text-cefi-green mx-auto" />
                <h4 className="font-serif font-bold text-base text-cefi-earth">Community First</h4>
                <p className="text-xs text-gray-500">Supporting over 300 Sri Lankan smallholder families.</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. Products Overview Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-cefi-gold">Agro Portfolio</span>
          <h2 className="font-serif font-bold text-3xl text-cefi-earth mt-1">Products We Export</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft space-y-3">
            <h3 className="font-serif font-bold text-xl text-cefi-green">Pure Ceylon Tea</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Black, Green, White, and Herbal blended teas sourced from Nuwara Eliya, Dimbula, and Uva highlands.
            </p>
            <Link to="/products/tea" className="text-xs font-bold text-cefi-gold hover:underline inline-block pt-1">
              Browse Tea Category →
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft space-y-3">
            <h3 className="font-serif font-bold text-xl text-cefi-green">Ceylon Spices</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Alba-grade True Cinnamon quills, Tellicherry black pepper, emerald cardamom, cloves, and nutmeg.
            </p>
            <Link to="/products/spices" className="text-xs font-bold text-cefi-gold hover:underline inline-block pt-1">
              Browse Spice Category →
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft space-y-3">
            <h3 className="font-serif font-bold text-xl text-cefi-green">Herbal & Dried Fruits</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Gotu Kola, Moringa leaf powder, solar-dehydrated mango, pineapple, and young jackfruit.
            </p>
            <Link to="/products/herbal" className="text-xs font-bold text-cefi-gold hover:underline inline-block pt-1">
              Browse Herbal Category →
            </Link>
          </div>

        </div>
      </section>

      {/* 4. Partner With Us CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-cefi-earth text-white rounded-3xl p-10 sm:p-14 text-center space-y-6 shadow-2xl">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">
            Partner With Ceylon Eco Fresh Infinity
          </h2>
          <p className="text-sm text-emerald-100/80 max-w-xl mx-auto font-sans leading-relaxed">
            Whether you are an international food importer, retail chain distributor, or wholesale buyer seeking OEM Ceylon produce, CEFI provides complete supply chain security.
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-cefi-gold hover:bg-cefi-gold-dark text-cefi-earth font-serif font-bold rounded-full text-base shadow-lg transition-all"
            >
              <span>Initiate Business Partnership</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
