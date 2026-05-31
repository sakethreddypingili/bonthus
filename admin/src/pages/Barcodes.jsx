import React, { useEffect, useState } from 'react';
import { 
  QrCode, Search, ScanBarcode, CheckCircle2
} from 'lucide-react';
import { supabase } from '../server/supabase/supabase';

export default function Barcodes({ userProfile }) {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.store_name === 'All';

  useEffect(() => {
    let isMounted = true;
    const fetchBarcodes = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        let query = supabase
          .from("barcode_vectors")
          .select("id, barcode, entity_id, entity_name, status, created_at, store_id")
          .order("created_at", { ascending: false });

        if (!isSuperAdmin && userProfile?.store_id) {
          query = query.eq("store_id", userProfile.store_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!isMounted) return;
        setBarcodes((data || []).map((item) => ({
          ...item,
          entityId: item.entity_id,
          entityName: item.entity_name,
          date: item.created_at ? item.created_at.split("T")[0] : "-"
        })));
      } catch (err) {
        if (!isMounted) return;
        setErrorMsg(err.message || "Failed to fetch barcodes.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBarcodes();
    return () => { isMounted = false; };
  }, [isSuperAdmin, userProfile?.store_id]);

  const stats = {
    total: barcodes.length,
    assigned: barcodes.filter(b => b.status === "assigned").length,
    unassigned: barcodes.filter(b => b.status === "unassigned").length
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
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl   group">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Aggregate Created</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black tracking-tighter">{stats.total}</span>
            <QrCode size={24} className="text-gray-200 group-hover:text-black" strokeWidth={3} />
          </div>
        </div>
        <div className="bg-black rounded-[32px] p-8 border border-black shadow-2xl">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Entity Bound</p>
          <div className="flex items-end justify-between text-white">
            <span className="text-4xl font-black tracking-tighter">{stats.assigned}</span>
            <CheckCircle2 size={24} strokeWidth={3} />
          </div>
        </div>
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl   group">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Unassigned Vectors</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black tracking-tighter">{stats.unassigned}</span>
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
              {loading && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading vectors...</p>
                  </td>
                </tr>
              )}
              {!loading && errorMsg && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{errorMsg}</p>
                  </td>
                </tr>
              )}
              {!loading && !errorMsg && filtered.map(b => (
                <tr key={b.id} className="hover:bg-black hover:text-white   group text-black">
                  <td className="px-8 py-6 font-mono text-[11px] font-black">{b.id}</td>
                  <td className="px-8 py-6 font-mono text-[11px] font-black tracking-widest border-x border-transparent">
                    {b.barcode}
                  </td>
                  <td className="px-8 py-6">
                    {b.entityName ? (
                      <>
                        <p className="text-[11px] font-black uppercase tracking-tight">{b.entityName}</p>
                        <p className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest group-hover:text-gray-400">Ref: {b.entityId}</p>
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
              {!loading && !errorMsg && filtered.length === 0 && (
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
