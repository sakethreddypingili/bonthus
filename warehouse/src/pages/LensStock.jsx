import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Loader2, Plus, QrCode, ClipboardList, CheckCircle2, ChevronRight, Tags, Package } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

export default function LensStock({ userProfile }) {
  const [pendingLenses, setPendingLenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  
  // Dialog / Intake details state
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [selectedLens, setSelectedLens] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("500");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: sData } = await supabase.from('stores').select('id, name').order('name');
      setStores(sData || []);
      
      const mainWarehouse = sData?.find(s => s.name === 'Main Warehouse');
      const defaultStore = mainWarehouse?.id || sData?.[0]?.id;
      setSelectedStore(defaultStore || "");

      const { data: cData } = await supabase.from('categories').select('id, name, parent_id').order('name');
      setCategories(cData || []);
    } catch (err) {
      console.error("Error fetching stores/categories:", err.message);
    }
  }, []);

  const fetchPendingLenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pending_products")
        .select(`
          id,
          checkpoint_name,
          name,
          sku,
          brand,
          base_price,
          description,
          category_id,
          stock_quantity,
          low_stock_threshold,
          unit_price,
          store_id,
          status,
          created_at,
          category:categories (
            id,
            name
          ),
          pending_product_barcodes (
            barcode
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter only products that belong to categories containing 'lens'
      const lensOnly = (data || []).filter(item => {
        const catName = item.category?.name?.toLowerCase() || "";
        const descStr = item.description?.toLowerCase() || "";
        return catName.includes("lens") || descStr.includes("lens");
      });

      setPendingLenses(lensOnly);
    } catch (err) {
      console.error("Error fetching pending lenses:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchPendingLenses();
  }, [fetchInitialData, fetchPendingLenses]);

  const filteredLenses = useMemo(() => {
    return pendingLenses.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        p.name?.toLowerCase().includes(q) || 
        p.sku?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q);
      const matchesCategory = !selectedCategoryFilter || String(p.category_id) === String(selectedCategoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [pendingLenses, searchQuery, selectedCategoryFilter]);

  const handleOpenIntake = (lens) => {
    setSelectedLens(lens);
    setStockQuantity(String(lens.stock_quantity || 1));
    setUnitPrice(String(lens.unit_price || lens.base_price || 500));
    setLowStockThreshold(String(lens.low_stock_threshold || 5));
    setShowIntakeModal(true);
  };

  const handleSaveIntake = async (e) => {
    e.preventDefault();
    if (!selectedLens) return;
    setSaving(true);

    try {
      // 1. Move to live catalog `products`
      const { data: pData, error: pError } = await supabase
        .from("products")
        .insert([{
          name: selectedLens.name,
          sku: selectedLens.sku,
          brand: selectedLens.brand,
          base_price: Number(unitPrice),
          category_id: selectedLens.category_id,
          description: selectedLens.description
        }])
        .select()
        .single();

      if (pError) throw pError;

      // 1b. Check if pending barcode exists
      const pendingBarcode = selectedLens.pending_product_barcodes?.[0]?.barcode;
      if (pendingBarcode) {
        const { error: pbError } = await supabase
          .from("product_barcodes")
          .insert([{
            product_id: pData.id,
            barcode: pendingBarcode,
            status: 'active'
          }]);
        if (pbError) console.error("Error inserting product_barcode:", pbError);
      }

      // 2. Add to store_inventory
      const { error: iError } = await supabase
        .from("store_inventory")
        .insert([{
          store_id: selectedStore,
          product_id: pData.id,
          stock_quantity: Number(stockQuantity),
          unit_price: Number(unitPrice),
          low_stock_threshold: Number(lowStockThreshold)
        }]);

      if (iError) throw iError;

      // 3. Remove from pending queue
      const { error: dError } = await supabase
        .from("pending_products")
        .delete()
        .eq('id', selectedLens.id);

      if (dError) throw dError;

      setShowIntakeModal(false);
      setSelectedLens(null);
      await fetchPendingLenses();
      alert("Lens stock committed successfully to store inventory!");
    } catch (err) {
      alert("Intake failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border border-gray-150 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-black uppercase tracking-wider flex items-center gap-2">
            <Package className="text-black" size={22} />
            Lens Ingestion & Stock Intake
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
            Accept pending lens assets, adjust power specifications, and commit items to inventory
          </p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search pending lenses by name, brand, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:border-black focus:ring-0 outline-none"
          />
        </div>
        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="w-full sm:w-60 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-bold text-black bg-white outline-none cursor-pointer focus:border-black"
        >
          <option value="">All Category Filters</option>
          {categories.filter(c => c.name.toLowerCase().includes("lens")).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Data display */}
      <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
            <span className="text-[10px] font-black uppercase tracking-widest">Scanning queue...</span>
          </div>
        ) : filteredLenses.length === 0 ? (
          <div className="p-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
            No pending lens records found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Barcode</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Checkpoint Batch</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Base Price</th>
                  <th className="px-6 py-4 text-right">Intake Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredLenses.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                      {item.pending_product_barcodes?.[0]?.barcode || "-"}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-widest">{item.brand || "Generic"}</td>
                    <td className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">{item.checkpoint_name || "Quick Intake"}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{item.category?.name}</td>
                    <td className="px-6 py-4 text-xs font-black text-black">{item.stock_quantity} units</td>
                    <td className="px-6 py-4 text-xs font-black text-black">₹{item.base_price}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenIntake(item)}
                        className="text-[9px] font-black bg-black text-white px-4 py-2 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-sm"
                      >
                        Accept Intake
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intake Dialog Modal */}
      {showIntakeModal && selectedLens && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIntakeModal(false)} />
          <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-lg w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-base font-black text-black uppercase tracking-tight">Add Live Lens Stock</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Commit item to catalog with adjusted parameters</p>
            </div>
            <form onSubmit={handleSaveIntake} className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Item Details</span>
                <span className="text-xs font-black text-black block uppercase">{selectedLens.name}</span>
                <span className="text-[9px] font-bold text-neutral-500 uppercase">SKU: {selectedLens.sku} | Brand: {selectedLens.brand || 'Generic'}</span>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination Store *</label>
                <select
                  required
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold text-black bg-white outline-none cursor-pointer focus:border-black"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Stock Qty</label>
                  <input
                    required
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Low Threshold</label>
                  <input
                    required
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Price (₹)</label>
                  <input
                    required
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="flex-1 py-3 text-[10px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-55"
                >
                  {saving ? "Syncing..." : "Commit Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
