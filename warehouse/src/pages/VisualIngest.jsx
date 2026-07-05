import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Database, CheckCircle2, ChevronRight, LayoutGrid, List, ChevronDown } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";

export default function VisualIngest({ userProfile }) {
  const [unassignedBarcodes, setUnassignedBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedBarcode, setSelectedBarcode] = useState(null);

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [categories, setCategories] = useState([]);
  const [cascadePath, setCascadePath] = useState([]);

  const [productData, setProductData] = useState({
    name: '', brand: '', base_price: '', category_id: '', description: '',
    stock_quantity: 1, low_stock_threshold: 5
  });

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: sData } = await supabase.from('stores').select('id, name').order('name');
      setStores(sData || []);
      
      const mainWarehouse = sData?.find(s => s.name === 'Main Warehouse');
      const defaultStore = isSuperAdmin ? (mainWarehouse?.id || sData?.[0]?.id) : userProfile?.store_id;
      setSelectedStore(defaultStore || "");

      const { data: cData } = await supabase.from('categories').select('id, name, parent_id').order('name');
      setCategories(cData || []);
    } catch (err) {
      console.error("Error fetching initial data:", err.message);
    }
  }, [isSuperAdmin, userProfile?.store_id]);

  const fetchUnassignedBarcodes = useCallback(async () => {
    setLoading(true);
    try {
      // Find the placeholder product ID first
      let { data: dummyProd } = await supabase
        .from("products")
        .select("id")
        .eq("sku", "BLANK-VECTOR")
        .maybeSingle();

      if (!dummyProd) {
        // Auto-create dummy product if not exists
        const { data: newDummy, error: dummyErr } = await supabase
          .from("products")
          .insert([{
            name: "Unassigned Barcode Vector",
            sku: "BLANK-VECTOR",
            brand: "System",
            base_price: 0,
            description: "System placeholder for pre-printed blank barcode labels"
          }])
          .select()
          .single();

        if (dummyErr) throw dummyErr;
        dummyProd = newDummy;
      }

      // Fetch barcodes linked to the dummy product
      const { data, error } = await supabase
        .from("product_barcodes")
        .select("*")
        .eq("product_id", dummyProd.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUnassignedBarcodes(data || []);
    } catch (err) {
      console.error("Error fetching unassigned barcodes:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchUnassignedBarcodes();
  }, [fetchInitialData, fetchUnassignedBarcodes]);

  const categoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

  const handleCategoryLevelSelect = (depth, selectedId) => {
    if (!selectedId) {
      const newPath = cascadePath.slice(0, depth);
      setCascadePath(newPath);
      setProductData(prev => ({ ...prev, category_id: newPath[newPath.length - 1] || '' }));
      return;
    }
    const newPath = [...cascadePath.slice(0, depth), selectedId];
    setCascadePath(newPath);
    setProductData(prev => ({ ...prev, category_id: selectedId }));
  };

  const handleBarcodeClick = (barcodeItem) => {
    setSelectedBarcode(barcodeItem);
    setProductData({
      name: '', brand: '', base_price: '', category_id: '', description: '',
      stock_quantity: 1, low_stock_threshold: 5
    });
    setCascadePath([]);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!selectedBarcode) return;
    setSaving(true);
    setSuccessMessage("");
    try {
      // 1. Create the real product in the catalog
      const { data: pData, error: pError } = await supabase
        .from("products")
        .insert([{
          name: productData.name,
          sku: selectedBarcode.barcode, // Bound directly to this issued SKU
          brand: productData.brand || null,
          base_price: Number(productData.base_price || 0),
          category_id: productData.category_id || null,
          description: productData.description || null
        }])
        .select()
        .single();

      if (pError) throw pError;

      // 2. Link this specific barcode to the new product
      const { error: uError } = await supabase
        .from("product_barcodes")
        .update({ product_id: pData.id })
        .eq("id", selectedBarcode.id);

      if (uError) throw uError;

      // 3. Register inventory stock
      const { error: iError } = await supabase
        .from("store_inventory")
        .insert([{
          store_id: selectedStore,
          product_id: pData.id,
          stock_quantity: Number(productData.stock_quantity || 1),
          unit_price: Number(productData.base_price || 0),
          low_stock_threshold: Number(productData.low_stock_threshold || 5)
        }]);

      if (iError) throw iError;

      setSuccessMessage(`Barcode tag ${selectedBarcode.barcode} successfully configured and added to live products!`);
      setSelectedBarcode(null);
      await fetchUnassignedBarcodes();
    } catch (err) {
      alert("Verification failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredBarcodes = unassignedBarcodes.filter(item => {
    return !search || item.barcode.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Visual Ingest</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Select active unassigned barcode tags to intake product details</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
            <Database size={14} className="text-black" />
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              disabled={!isSuperAdmin}
              className="appearance-none bg-transparent text-xs font-black text-black uppercase focus:outline-none cursor-pointer pr-8 py-1 disabled:opacity-50"
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {isSuperAdmin && <ChevronDown size={14} className="text-black -ml-6" />}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-black text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fast-zoom">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="ml-auto text-emerald-600 hover:text-black font-black uppercase text-[10px]">Dismiss</button>
        </div>
      )}

      {/* Barcode Search & Toggle Bar */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
          {unassignedBarcodes.length} Unassigned active tags in circulation
        </span>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search barcode number…"
              className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-56 placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-1">
            <button onClick={() => setView("list")} className={`p-2 rounded-lg ${view === "list" ? "bg-black text-white shadow-sm" : "text-gray-400 hover:text-black"}`}>
              <List size={16} />
            </button>
            <button onClick={() => setView("grid")} className={`p-2 rounded-lg ${view === "grid" ? "bg-black text-white shadow-sm" : "text-gray-400 hover:text-black"}`}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List View of Unassigned Barcode tags */}
      {loading ? (
        <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing active blank labels...</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {filteredBarcodes.map(item => (
            <div 
              key={item.id} 
              onClick={() => handleBarcodeClick(item)}
              className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-150 cursor-pointer flex flex-col items-center justify-center space-y-4 group"
            >
              {/* Fake graphical barcode rendering */}
              <div className="h-10 w-full flex items-center justify-center gap-0.5 opacity-80 group-hover:opacity-100 mix-blend-multiply">
                <div className="w-1 h-full bg-black"></div>
                <div className="w-1.5 h-full bg-black"></div>
                <div className="w-0.5 h-full bg-black"></div>
                <div className="w-2 h-full bg-black"></div>
                <div className="w-1 h-full bg-black"></div>
                <div className="w-0.5 h-full bg-black"></div>
              </div>
              <span className="font-mono text-xs font-black tracking-widest text-black">{item.barcode}</span>
              <span className="text-[8px] font-black bg-neutral-100 text-gray-400 px-2 py-0.5 rounded-full uppercase">
                Active Ingest
              </span>
            </div>
          ))}
          {filteredBarcodes.length === 0 && (
            <div className="col-span-full py-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
              No unassigned barcode tags found
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Barcode Label</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Issued At</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBarcodes.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-black text-black tracking-widest">{item.barcode}</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-400">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ready
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleBarcodeClick(item)}
                      className="px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-wider rounded-xl hover:scale-105 transition-all shadow-sm"
                    >
                      Intake Product
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBarcodes.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    No unassigned barcode tags found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Intake Drawer */}
      <SlideDrawer 
        isOpen={!!selectedBarcode} 
        onClose={() => { setSelectedBarcode(null); }} 
        title="Intake Pre-Barcoded Product"
      >
        {selectedBarcode && (
          <form onSubmit={handleSaveProduct} className="space-y-6 pb-12">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-center">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Binding Tag</span>
              <p className="font-mono text-lg font-black tracking-widest text-black">{selectedBarcode.barcode}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title *</label>
              <input 
                required 
                value={productData.name} 
                onChange={e => setProductData({...productData, name: e.target.value})} 
                type="text" 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Name *</label>
                <input 
                  required 
                  value={productData.brand} 
                  onChange={e => setProductData({...productData, brand: e.target.value})} 
                  type="text" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Base Price (₹) *</label>
                <input 
                  required 
                  value={productData.base_price} 
                  onChange={e => setProductData({...productData, base_price: e.target.value})} 
                  type="number" 
                  placeholder="₹" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" 
                />
              </div>
            </div>

            {/* Classification */}
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Classification Hierarchy</h4>
              <div className="space-y-4">
                <ProductCascadeLevel
                  depth={0}
                  options={categoryChildMap['__root__'] || []}
                  selectedId={cascadePath[0] || ''}
                  onSelect={id => handleCategoryLevelSelect(0, id)}
                />
                {cascadePath.map((selectedId, idx) => {
                  const children = categoryChildMap[selectedId] || [];
                  if (children.length === 0) return null;
                  return (
                    <ProductCascadeLevel
                      key={selectedId}
                      depth={idx + 1}
                      options={children}
                      selectedId={cascadePath[idx + 1] || ''}
                      onSelect={id => handleCategoryLevelSelect(idx + 1, id)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
              <textarea 
                value={productData.description} 
                onChange={e => setProductData({...productData, description: e.target.value})} 
                className="w-full min-h-[80px] p-4 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none resize-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Intake Stock *</label>
                <input 
                  required 
                  value={productData.stock_quantity} 
                  onChange={e => setProductData({...productData, stock_quantity: e.target.value})} 
                  type="number" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Low stock threshold *</label>
                <input 
                  required 
                  value={productData.low_stock_threshold} 
                  onChange={e => setProductData({...productData, low_stock_threshold: e.target.value})} 
                  type="number" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" 
                />
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setSelectedBarcode(null)} 
                className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black"
              >
                Abort
              </button>
              <button 
                type="submit" 
                disabled={saving} 
                className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? "Confirming..." : "Confirm & Add Product"}
              </button>
            </div>
          </form>
        )}
      </SlideDrawer>
    </div>
  );
}

// Cascade level box sub-component
function ProductCascadeLevel({ depth, options, selectedId, onSelect }) {
  const levelLabels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
  const label = levelLabels[depth] || `Level ${depth + 1}`;

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute -top-3 left-3 flex items-center gap-1">
          <div className="w-px h-3 bg-gray-200" />
          <ChevronRight size={10} className="text-gray-300 -ml-0.5" />
        </div>
      )}
      <div className={`rounded-xl overflow-hidden border transition-all ${
        selectedId ? 'border-black bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center px-4 py-0.5 border-b border-gray-50">
          <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">{label}</span>
        </div>
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer text-black appearance-none"
        >
          <option value="">— Select —</option>
          {options.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
