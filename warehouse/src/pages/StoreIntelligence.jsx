import React, { useState, useEffect, useCallback } from 'react';
import { 
  Store as StoreIcon, Building2, Package, ArrowRightLeft, 
  Search, Eye, X, CheckCircle2, Clock, MapPin, Filter,
  LayoutGrid, List, ArrowLeft, Plus, Minus, Send
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

  // Store profile detail states
  const [activeStoreProfile, setActiveStoreProfile] = useState(null);
  const [storeInventory, setStoreInventory] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [activeSubTab, setActiveSubTab] = useState("overview");

  // Inward/outward adjustments states
  const [adjustType, setAdjustType] = useState("inward");
  const [selectedProdId, setSelectedProdId] = useState("");
  const [adjustQty, setAdjustQty] = useState("");

  // Store transfer states
  const [transferProdId, setTransferProdId] = useState("");
  const [transferDestStoreId, setTransferDestStoreId] = useState("");
  const [transferQty, setTransferQty] = useState("");

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

  const fetchProductsCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .order('name');
      if (error) throw error;
      setProductsCatalog(data || []);
    } catch (err) {
      console.error("Error loading products catalog:", err.message);
    }
  };

  const fetchStoreInventory = async (storeId) => {
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('store_inventory')
        .select(`
          id,
          stock_quantity,
          unit_price,
          product:products (
            id,
            name,
            sku,
            brand,
            base_price,
            description,
            category:categories (
              name
            )
          )
        `)
        .eq('store_id', storeId);
      
      if (error) throw error;
      setStoreInventory(data || []);
    } catch (err) {
      console.error("Error fetching store inventory:", err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProductsCatalog();
  }, []);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!activeStoreProfile || !selectedProdId || !adjustQty) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from('store_inventory')
        .select('id, stock_quantity')
        .eq('store_id', activeStoreProfile.id)
        .eq('product_id', selectedProdId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (adjustType === "outward") {
        if (!existing || existing.stock_quantity < qty) {
          alert(`Cannot perform outward adjustment: current stock is only ${existing?.stock_quantity || 0} units.`);
          return;
        }
        
        const { error } = await supabase
          .from('store_inventory')
          .update({ stock_quantity: existing.stock_quantity - qty })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        if (existing) {
          const { error } = await supabase
            .from('store_inventory')
            .update({ stock_quantity: existing.stock_quantity + qty })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('store_inventory')
            .insert([{
              store_id: activeStoreProfile.id,
              product_id: selectedProdId,
              stock_quantity: qty,
              low_stock_threshold: 10
            }]);
          if (error) throw error;
        }
      }

      alert("Stock adjusted successfully.");
      setSelectedProdId("");
      setAdjustQty("");
      fetchStoreInventory(activeStoreProfile.id);
      fetchStoresData();
    } catch (err) {
      alert("Adjustment failed: " + err.message);
    }
  };

  const handleTransferStock = async (e) => {
    e.preventDefault();
    if (!activeStoreProfile || !transferProdId || !transferDestStoreId || !transferQty) return;
    const qty = Number(transferQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid transfer quantity.");
      return;
    }

    if (transferDestStoreId === activeStoreProfile.id) {
      alert("Destination store must be different from source store.");
      return;
    }

    try {
      const { data: sourceInv, error: srcError } = await supabase
        .from('store_inventory')
        .select('id, stock_quantity')
        .eq('store_id', activeStoreProfile.id)
        .eq('product_id', transferProdId)
        .maybeSingle();

      if (srcError) throw srcError;
      if (!sourceInv || sourceInv.stock_quantity < qty) {
        alert(`Insufficient stock. Current stock is ${sourceInv?.stock_quantity || 0} units.`);
        return;
      }

      const { data: destInv, error: destError } = await supabase
        .from('store_inventory')
        .select('id, stock_quantity')
        .eq('store_id', transferDestStoreId)
        .eq('product_id', transferProdId)
        .maybeSingle();

      if (destError) throw destError;

      const { error: decError } = await supabase
        .from('store_inventory')
        .update({ stock_quantity: sourceInv.stock_quantity - qty })
        .eq('id', sourceInv.id);
      if (decError) throw decError;

      if (destInv) {
        const { error: incError } = await supabase
          .from('store_inventory')
          .update({ stock_quantity: destInv.stock_quantity + qty })
          .eq('id', destInv.id);
        if (incError) throw incError;
      } else {
        const { error: insError } = await supabase
          .from('store_inventory')
          .insert([{
            store_id: transferDestStoreId,
            product_id: transferProdId,
            stock_quantity: qty,
            low_stock_threshold: 10
          }]);
        if (insError) throw insError;
      }

      alert("Stock transferred successfully.");
      setTransferProdId("");
      setTransferDestStoreId("");
      setTransferQty("");
      fetchStoreInventory(activeStoreProfile.id);
      fetchStoresData();
    } catch (err) {
      alert("Transfer failed: " + err.message);
    }
  };

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
    <div className="space-y-6 pb-20 animate-fast-slide">
      {activeStoreProfile ? (
        <div className="space-y-8 animate-fast-slide">
          {/* Header */}
          <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setActiveStoreProfile(null);
                  setStoreInventory([]);
                }}
                className="p-3 bg-gray-50 border border-gray-100 text-gray-700 hover:bg-black hover:text-white rounded-xl transition-all"
              >
                <ArrowLeft size={16} strokeWidth={3} />
              </button>
              <div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Retail Unit Stock Management</span>
                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">{activeStoreProfile.name}</h2>
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-widest leading-relaxed">
                  Ref: {activeStoreProfile.id} • {activeStoreProfile.address || "Global Location"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-neutral-50 px-5 py-3.5 border border-neutral-100 rounded-2xl text-center">
                <span className="block text-[8px] font-black text-neutral-400 uppercase tracking-widest">Total Inventory</span>
                <span className="text-xl font-mono font-black text-black">{storeInventory.reduce((sum, i) => sum + i.stock_quantity, 0)} Units</span>
              </div>
            </div>
          </div>          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Inner Sidebar Navigation */}
            <div className="lg:col-span-3 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-2">
              <button
                type="button"
                onClick={() => setActiveSubTab("overview")}
                className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === "overview" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black hover:bg-gray-50"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("inventory")}
                className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === "inventory" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black hover:bg-gray-50"
                }`}
              >
                Inventory List
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("adjust")}
                className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === "adjust" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black hover:bg-gray-50"
                }`}
              >
                Stock Adjustments
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("transfer")}
                className={`w-full text-left px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === "transfer" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black hover:bg-gray-50"
                }`}
              >
                Store Transfer
              </button>
            </div>

            {/* Right Sub-Tab Content Area */}
            <div className="lg:col-span-9">
              {activeSubTab === "overview" && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8 animate-fast-slide">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest mb-1">Store Overview</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Key performance indicators & metrics</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-2">
                      <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Stock Quantity</span>
                      <p className="text-3xl font-black text-black tracking-tighter">
                        {storeInventory.reduce((sum, i) => sum + i.stock_quantity, 0)}
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-2">
                      <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Unique SKUs</span>
                      <p className="text-3xl font-black text-black tracking-tighter">
                        {storeInventory.length}
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 space-y-2">
                      <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Pending Requests</span>
                      <p className="text-3xl font-black text-black tracking-tighter">
                        {activeStoreProfile.pendingRequests || 0}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-6 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] border-b border-gray-200 pb-3">Retail Unit Meta Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] font-bold uppercase tracking-widest">
                      <div className="space-y-1">
                        <span className="block text-[8px] font-black text-gray-400">Unit Name</span>
                        <span className="text-black">{activeStoreProfile.name}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[8px] font-black text-gray-400">Reference ID</span>
                        <span className="text-black font-mono text-[9px] font-bold">{activeStoreProfile.id}</span>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="block text-[8px] font-black text-gray-400">Physical Address</span>
                        <span className="text-black normal-case font-semibold">{activeStoreProfile.address || "No address specified for this unit."}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "inventory" && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-6 animate-fast-slide">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-sm font-black text-black uppercase tracking-widest mb-1">Inventory List</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage store products catalog and stock levels</p>
                    </div>
                    <div className="relative w-full sm:w-60">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" strokeWidth={3} />
                      <input
                        type="text"
                        placeholder="Search stock..."
                        value={profileSearchQuery}
                        onChange={e => setProfileSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-155 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-black uppercase tracking-wider outline-none focus:border-black focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {loadingProfile ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading inventory...</span>
                    </div>
                  ) : storeInventory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black text-gray-450 uppercase tracking-widest border-b border-gray-100">
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3 text-right">In Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-[11px] font-bold">
                          {storeInventory
                            .filter(item => 
                              item.product?.name?.toLowerCase().includes(profileSearchQuery.toLowerCase()) ||
                              item.product?.sku?.toLowerCase().includes(profileSearchQuery.toLowerCase())
                            )
                            .map(item => (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3.5">
                                  <span className="block text-black uppercase font-black">{item.product?.name}</span>
                                  <span className="block text-[8px] text-gray-400 font-mono mt-0.5">{item.product?.brand}</span>
                                </td>
                                <td className="px-4 py-3.5 font-mono text-gray-500">{item.product?.sku}</td>
                                <td className="px-4 py-3.5 text-right font-mono text-[12px] font-black text-black">
                                  {item.stock_quantity}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-20 text-center text-xs font-bold text-gray-400 uppercase tracking-wider italic">
                      No stock profile recorded for this store.
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === "adjust" && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6 animate-fast-slide">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest mb-1">Stock Adjustment</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inward or Outward quantity modifications</p>
                  </div>
                  
                  <form onSubmit={handleAdjustStock} className="space-y-6 max-w-xl">
                    <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setAdjustType("inward")}
                        className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${adjustType === "inward" ? "bg-black text-white shadow-sm" : "text-gray-450 hover:text-black"}`}
                      >
                        Inward (Receive)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType("outward")}
                        className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${adjustType === "outward" ? "bg-black text-white shadow-sm" : "text-gray-450 hover:text-black"}`}
                      >
                        Outward (Reduce)
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Product</label>
                      <select
                        required
                        value={selectedProdId}
                        onChange={e => setSelectedProdId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-150 focus:border-black focus:bg-white rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="">— Choose Product —</option>
                        {productsCatalog.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="Enter quantity"
                        value={adjustQty}
                        onChange={e => setAdjustQty(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-150 focus:border-black focus:bg-white rounded-xl text-xs font-black outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-black hover:bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      Apply Stock Adjustment
                    </button>
                  </form>
                </div>
              )}

              {activeSubTab === "transfer" && (
                <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6 animate-fast-slide">
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest mb-1">Store-to-Store Stock Transfer</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Relocate stock directly between different retail units</p>
                  </div>
                  
                  <form onSubmit={handleTransferStock} className="space-y-6 max-w-xl">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Source Product (Current Stock)</label>
                      <select
                        required
                        value={transferProdId}
                        onChange={e => setTransferProdId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-155 focus:border-black focus:bg-white rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="">— Choose Product —</option>
                        {storeInventory
                          .filter(item => item.stock_quantity > 0)
                          .map(item => (
                            <option key={item.product?.id} value={item.product?.id}>
                              {item.product?.name} (Stock: {item.stock_quantity})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination Store / Unit</label>
                      <select
                        required
                        value={transferDestStoreId}
                        onChange={e => setTransferDestStoreId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-155 focus:border-black focus:bg-white rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="">— Select Destination —</option>
                        {stores
                          .filter(s => s.id !== activeStoreProfile.id)
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Transfer Quantity</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="Enter quantity"
                        value={transferQty}
                        onChange={e => setTransferQty(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-155 focus:border-black focus:bg-white rounded-xl text-xs font-black outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-black hover:bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Send size={12} /> Execute Stock Transfer
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header & Search */}
          <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tighter uppercase mb-1">Store Intelligence</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monitor and manage connected retail unit inventories</p>
            </div>
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
                  title="Grid View"
                >
                  <LayoutGrid size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
                  title="List View"
                >
                  <List size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="relative group w-full lg:w-80">
                <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
                <input
                  type="text"
                  placeholder="Lookup Retail Unit..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Network View */}
          {viewMode === "grid" ? (
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
                <div className="p-4 bg-white mt-auto border-t border-gray-50">
                  <button
                    onClick={() => {
                      setActiveStoreProfile(store);
                      fetchStoreInventory(store.id);
                    }}
                    className="w-full py-3.5 bg-black hover:bg-neutral-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center"
                  >
                    View
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
                          <button
                            onClick={() => {
                              setActiveStoreProfile(store);
                              fetchStoreInventory(store.id);
                            }}
                            className="px-6 py-2.5 bg-black hover:bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                          >
                            View
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
      }
      </>
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
