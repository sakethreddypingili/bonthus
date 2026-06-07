import React, { useState, useEffect, useCallback } from 'react';
import { 
  Store as StoreIcon, Building2, Package, ArrowRightLeft, 
  Search, Eye, X, CheckCircle2, Clock, MapPin, Filter,
  LayoutGrid, List
} from 'lucide-react';
import SlideDrawer from '../components/common/SlideDrawer';
import { supabase } from "../server/supabase/supabase";

export default function StoreIntelligence() {
  const [activeView, setActiveTab] = useState("network"); 
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [stores, setStores] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState(null);

  const fetchStoresData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get Warehouse ID
      const { data: wData } = await supabase.from('stores').select('id').eq('name', 'Main Warehouse').single();
      if (wData) setWarehouseId(wData.id);

      // 2. Fetch all stores
      const { data: sData } = await supabase.from('stores').select('*').order('name');
      
      // 3. For each store, get inventory count and pending requests
      const storesWithMetrics = await Promise.all((sData || []).map(async (s) => {
        const { data: invData } = await supabase.from('store_inventory').select('stock_quantity').eq('store_id', s.id);
        const invCount = invData?.reduce((sum, item) => sum + item.stock_quantity, 0) || 0;

        const { count: pendingCount } = await supabase
          .from('store_requisitions')
          .select('*', { count: 'exact', head: true })
          .eq('from_store_id', s.id)
          .eq('status', 'pending');

        return {
          ...s,
          inventoryCount: invCount,
          pendingRequests: pendingCount || 0
        };
      }));

      setStores(storesWithMetrics);
    } catch (err) {
      console.error("Error fetching stores data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequisitions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_requisitions')
        .select(`
          *,
          from_store:stores!requisitions_from_store_fkey(name),
          to_store:stores!requisitions_to_store_fkey(name),
          items:store_requisition_items(
            quantity,
            product:products(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequisitions(data || []);
    } catch (err) {
      console.error("Error fetching requisitions:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchStoresData();
    fetchRequisitions();
  }, [fetchStoresData, fetchRequisitions]);

  const handleAuthorizeFulfillment = async (reqId) => {
    try {
      const { error } = await supabase
        .from('store_requisitions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', reqId);
      
      if (error) throw error;
      alert("Requisition Approved for Fulfillment.");
      setShowDetailModal(false);
      fetchRequisitions();
    } catch (err) {
      alert("Failed to authorize: " + err.message);
    }
  };

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requisitions.filter(r => 
    r.request_number?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.from_store?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Store Intelligence</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Retail Logistics & Demand Management</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
          <StoreIcon size={16} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Hub</span>
        </div>
      </div>

      {/* View Switcher & Search */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1">
          <button 
            onClick={() => setActiveTab("network")}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeView ==="network" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
          >
            Unit Network
          </button>
          <button 
            onClick={() => setActiveTab("requisitions")}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeView ==="requisitions" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
          >
            Requisition Ledger
          </button>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          {activeView === "network" && (
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
                title="Grid View"
              >
                <LayoutGrid size={16} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
                title="List View"
              >
                <List size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}

          <div className="relative group w-full lg:w-80">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
            <input
              type="text"
              placeholder={activeView ==="network" ?"Lookup Retail Unit..." :"Lookup Manifest..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Network View */}
      {activeView ==="network" && (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-stretch">
            {filteredStores.map(store => (
              <div key={store.id} className="flex flex-col justify-between h-full bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-black/20 transition-all duration-300 overflow-hidden group">
                {/* Card Header */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all duration-300 shrink-0">
                      <Building2 size={20} strokeWidth={2.5} className="text-gray-700 group-hover:text-white transition-colors" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-black uppercase tracking-tighter truncate">{store.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-mono font-bold uppercase tracking-wider rounded-md border border-gray-200 shrink-0">
                          {store.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mt-1 line-clamp-2">
                        {store.address || 'Global Location'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Metrics Section */}
                <div className="px-6 py-5 bg-gray-50/50 border-y border-gray-100/80">
                  <div className="grid grid-cols-2 gap-4 divide-x divide-gray-200/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Package size={13} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Local Inventory</span>
                      </div>
                      <p className="text-2xl font-black text-black tracking-tighter">{store.inventoryCount}</p>
                    </div>
                    <div className="pl-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <ArrowRightLeft size={13} strokeWidth={2.5} className={store.pendingRequests > 0 ? "text-amber-500 animate-pulse" : "text-gray-400"} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Pending Requests</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <p className={`text-2xl font-black tracking-tighter ${store.pendingRequests > 0 ? 'text-amber-600' : 'text-black'}`}>
                          {store.pendingRequests}
                        </p>
                        {store.pendingRequests > 0 && (
                          <span className="mb-2.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions Section */}
                <div className="p-4 bg-white flex gap-2.5 mt-auto border-t border-gray-50">
                  <button className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                    Unit Profile
                  </button>
                  <button 
                    onClick={() => { setActiveTab("requisitions"); setSearchQuery(store.name); }}
                    className="flex-1 py-3.5 bg-black text-white hover:bg-black/90 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    Manage Requests
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Name</th>
                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                    <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Reference</th>
                    <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Local Inventory</th>
                    <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending Requests</th>
                    <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStores.map(store => (
                    <tr key={store.id} className="hover:bg-gray-50/40 group transition-colors duration-200">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white group-hover:border-black transition-all duration-300 shrink-0">
                            <Building2 size={14} className="text-gray-700 group-hover:text-white transition-colors" strokeWidth={2.5} />
                          </div>
                          <span className="text-[11px] font-black text-black uppercase tracking-tight">{store.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {store.address || 'Global Location'}
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 text-[9px] font-mono font-bold uppercase tracking-wider rounded-md border border-gray-200">
                          {store.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-50 border border-gray-100 text-black text-xs font-black rounded-lg min-w-[40px]">
                          {store.inventoryCount}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-flex items-center justify-center px-3 py-1 border text-xs font-black rounded-lg min-w-[40px] ${
                            store.pendingRequests > 0 
                              ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' 
                              : 'bg-gray-50 border-gray-100 text-black'
                          }`}>
                            {store.pendingRequests}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2.5">
                          <button className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all">
                            Profile
                          </button>
                          <button 
                            onClick={() => { setActiveTab("requisitions"); setSearchQuery(store.name); }}
                            className="px-4 py-2.5 bg-black text-white hover:bg-black/90 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-[0.98]"
                          >
                            Requests
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Requisitions View */}
      {activeView ==="requisitions" && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden    min-h-[600px]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Request Ref</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Origin Store</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Timeline</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50  group">
                    <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{req.request_number}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-gray-300" />
                          <span className="text-[11px] font-black text-black uppercase tracking-tight">{req.from_store?.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-center text-[12px] font-black text-black">{req.items?.length || 0}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        req.status === 'fulfilled' ? 'bg-black text-white shadow-lg' : 
                        req.status === 'approved' ? 'border border-black text-black' : 
                        'bg-gray-100 text-black border border-gray-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                        className="p-3 bg-black text-white rounded-xl shadow-lg hover:scale-110  opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={14} strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <SlideDrawer
        isOpen={showDetailModal && selectedRequest !== null}
        onClose={() => setShowDetailModal(false)}
        title="Requisition Detail"
        subtitle={`Ref: ${selectedRequest?.request_number}`}
      >
        <div className="flex flex-col h-full space-y-8">
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                  <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Origin Unit</span>
                  <p className="text-[14px] font-black text-black uppercase tracking-tight">{selectedRequest?.from_store?.name}</p>
              </div>
              <div>
                  <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Created At</span>
                  <p className="text-[14px] font-black text-black uppercase tracking-tight">{selectedRequest && new Date(selectedRequest.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
              <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] border-b border-gray-200 pb-3">Requested Inventory</p>
              <div className="space-y-3">
                  {selectedRequest?.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-gray-500">{item.product?.name}</span>
                        <span className="text-black font-black">{item.quantity} Units</span>
                    </div>
                  ))}
              </div>
            </div>
            
            {selectedRequest?.notes && (
              <div>
                 <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Notes</span>
                 <p className="text-[12px] text-gray-600 italic">{selectedRequest.notes}</p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-50 mt-auto flex items-center justify-end gap-4">
            <button onClick={() => setShowDetailModal(false)} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Close</button>
            {selectedRequest?.status === 'pending' && (
              <button 
                onClick={() => handleAuthorizeFulfillment(selectedRequest.id)}
                className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} strokeWidth={3} /> Authorize Fulfillment
              </button>
            )}
          </div>
        </div>
      </SlideDrawer>
    </div>
  );
}
