import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, History, TrendingUp, ShieldCheck, Tag, Info, AlertCircle } from 'lucide-react';
import { supabase } from '../server/supabase/supabase';

export default function EntityDetails({ userProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntity() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('store_inventory')
          .select(`
            id,
            stock_quantity,
            unit_price,
            low_stock_threshold,
            product:products (
              id,
              name,
              sku,
              brand,
              description,
              category:categories(name)
            ),
            store:stores(name)
          `)
          .eq('product_id', id)
          .limit(1)
          .single();
        
        if (error) throw error;
        setEntity(data);
      } catch (err) {
        console.error("Error fetching entity details:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEntity();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Entity Matrix...</div>;
  }

  if (!entity) {
    return (
      <div className="p-8 space-y-4">
        <button onClick={() => navigate(-1)} className="p-2 border border-gray-100 rounded-xl text-black hover:bg-black hover:text-white transition-all">
          <ArrowLeft size={20} strokeWidth={3} />
        </button>
        <div className="bg-black text-white p-10 rounded-[32px] text-center uppercase tracking-tighter">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-black">Entity Not Found</h2>
        </div>
      </div>
    );
  }

  const p = entity.product;

  return (
    <div className="space-y-10 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-gray-100">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-4 border border-gray-100 rounded-[24px] text-black hover:bg-black hover:text-white transition-all shadow-sm">
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-1">{p?.name}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">SKU: <span className="font-mono text-black">{p?.sku}</span> | Brand: <span className="text-black">{p?.brand}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
            entity.stock_quantity === 0 ? "bg-gray-100 text-gray-400 line-through" : "bg-black text-white shadow-lg"
          }`}>
            {entity.stock_quantity === 0 ? "Zero Volume" : entity.stock_quantity <= entity.low_stock_threshold ? "Low Stock" : "Operational"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-10">
        <div className="space-y-10">
          {/* Base Specs */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm space-y-10">
            <div>
              <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-1">Entity Analytics</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base inventory specifications</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Current Volume</p>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <span className="text-4xl font-black text-black tracking-tighter">{entity.stock_quantity}</span>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Units in storage (Min: {entity.low_stock_threshold})</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Unit Valuation</p>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <span className="text-4xl font-black text-black tracking-tighter">₹{(entity.unit_price || 0).toLocaleString()}</span>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Per operational unit</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Deployment</p>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <span className="text-xl font-black text-black uppercase tracking-tight">{entity.store?.name}</span>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Node location</p>
                </div>
              </div>
            </div>
            
            {p?.description && (
              <div className="pt-10 border-t border-gray-50">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed uppercase tracking-tight font-medium">{p.description}</p>
              </div>
            )}
          </div>

          {/* Activity Placeholder */}
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-6">
              <div>
                <h3 className="text-xl font-black text-black uppercase tracking-tighter">Log History</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Audit trail of entity movements</p>
              </div>
              <History size={20} className="text-gray-200" strokeWidth={3} />
            </div>
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <TrendingUp size={24} className="text-gray-200" strokeWidth={3} />
              </div>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Awaiting movement vectors</p>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="space-y-8">
          <div className="bg-black text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Security Check</h3>
                <div className="space-y-6">
                   <div className="flex items-start gap-4">
                      <ShieldCheck size={20} className="text-gray-400 shrink-0" strokeWidth={3} />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Authentic Entity</p>
                        <p className="text-[9px] text-gray-500 uppercase mt-1 leading-relaxed">Verified and registered in master catalog.</p>
                      </div>
                   </div>
                </div>
             </div>
             <Package size={120} className="absolute -bottom-10 -right-10 opacity-10" />
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 ml-2">Quick Identifiers</p>
            <div className="space-y-4">
               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Tag size={16} className="text-black" strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Category: {p?.category?.name || "General"}</span>
               </div>
               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <Info size={16} className="text-black" strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Status: Operational</span>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
