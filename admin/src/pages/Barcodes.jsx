import React, { useState, useEffect, useCallback } from 'react';
import { 
  QrCode, Search, Download, Printer, Settings2, 
  Layers, ScanBarcode, CheckCircle2, AlertCircle, PieChart, BarChart
} from 'lucide-react';
import { supabase } from "../server/supabase/supabase";

export default function Barcodes() {
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBarcodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_barcodes')
        .select(`
          id,
          barcode,
          created_at,
          product:products (
            id,
            name,
            sku
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped = data.map(b => ({
        id: b.id,
        barcode: b.barcode,
        entityId: b.product?.id || null,
        entityName: b.product?.name || null,
        sku: b.product?.sku || null,
        status: b.product ? "assigned" : "unassigned",
        date: new Date(b.created_at).toLocaleDateString()
      }));

      setBarcodes(mapped);
    } catch (err) {
      console.error("Error fetching barcodes:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarcodes();
  }, [fetchBarcodes]);

  const stats = {
    total: barcodes.length,
    assigned: barcodes.filter(b => b.status ==="assigned").length,
    unassigned: barcodes.filter(b => b.status ==="unassigned").length
  };

  const filtered = barcodes.filter(b => {
    if (activeTab !=="all" && b.status !== activeTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.barcode.includes(q) || (b.entityName && b.entityName.toLowerCase().includes(q)) || b.id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Barcode Studio</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Vector Audit & Analytics</p>
        </div>
        <button onClick={fetchBarcodes} className="p-3 border border-gray-100 rounded-2xl hover:bg-black hover:text-white transition-all">
            <Settings2 size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl   group">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Aggregate Created</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black tracking-tighter">{loading ? "..." : stats.total}</span>
            <QrCode size={24} className="text-gray-200 group-hover:text-black" strokeWidth={3} />
          </div>
        </div>
        <div className="bg-black rounded-[32px] p-8 border border-black shadow-2xl">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-gray-400">Entity Bound</p>
          <div className="flex items-end justify-between text-white">
            <span className="text-4xl font-black tracking-tighter">{loading ? "..." : stats.assigned}</span>
            <CheckCircle2 size={24} strokeWidth={3} />
          </div>
        </div>
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl   group">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Unassigned Vectors</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black tracking-tighter">{loading ? "..." : stats.unassigned}</span>
            <ScanBarcode size={24} className="text-gray-200 group-hover:text-black" strokeWidth={3} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1">
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeTab ==="all" ?"bg-black text-white shadow-md" :"text-gray-400 hover:text-black"}`}
            >
              All Vectors
            </button>
            <button 
              onClick={() => setActiveTab("assigned")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeTab ==="assigned" ?"bg-black text-white shadow-md" :"text-gray-400 hover:text-black"}`}
            >
              Bound
            </button>
            <button 
              onClick={() => setActiveTab("unassigned")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeTab ==="unassigned" ?"bg-black text-white shadow-md" :"text-gray-400 hover:text-black"}`}
            >
              Available
            </button>
          </div>

          <div className="relative group w-full md:w-96">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
            <input
              type="text"
              placeholder="Audit Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Vector Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Barcode Content</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Linked Entity</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Creation Vector</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && barcodes.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Accessing Ledger...</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="hover:bg-black hover:text-white   group text-black transition-colors">
                  <td className="px-8 py-6 font-mono text-[11px] font-black">{b.id.slice(0, 8)}</td>
                  <td className="px-8 py-6 font-mono text-[11px] font-black tracking-widest border-x border-transparent">
                    {b.barcode}
                  </td>
                  <td className="px-8 py-6">
                    {b.entityName ? (
                      <>
                        <p className="text-[11px] font-black uppercase tracking-tight">{b.entityName}</p>
                        <p className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest group-hover:text-gray-400">SKU: {b.sku}</p>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic group-hover:text-gray-500">No Entity Bound</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400">{b.date}</td>
                  <td className="px-8 py-6 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest  ${
                      b.status === 'assigned' 
                        ?"bg-black text-white group-hover:bg-white group-hover:text-black" 
                        :"border border-gray-200 text-gray-400 group-hover:border-white/30 group-hover:text-white"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Zero vectors matched audit criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
