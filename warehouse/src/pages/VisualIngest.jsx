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

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'warehouse';

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

  const categoryPaths = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.id] = c;
    });
    
    const paths = {};
    const getPath = (id) => {
      if (paths[id]) return paths[id];
      const cat = map[id];
      if (!cat) return '';
      if (!cat.parent_id) {
        paths[id] = cat.name;
        return cat.name;
      }
      const parentPath = getPath(cat.parent_id);
      paths[id] = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      return paths[id];
    };
    
    categories.forEach(c => {
      getPath(c.id);
    });
    return paths;
  }, [categories]);

  const [frameFields, setFrameFields] = useState({
    modelNo: '',
    color: '',
    frameType: '',
    frameShape: '',
    sizeA: '',
    sizeB: '',
    templeLength: '',
    dbl: ''
  });

  const [lensFields, setLensFields] = useState({
    lensType: '',
    index: '',
    material: '',
    coating: '',
    sph: '',
    cyl: '',
    axis: '',
    add: ''
  });

  const getCategoryType = useCallback((categoryId) => {
    if (!categoryId) return null;
    const path = (categoryPaths[categoryId] || "").toLowerCase();
    if (path.includes("frame")) return "frame";
    if (path.includes("lens")) return "lens";
    return null;
  }, [categoryPaths]);

  const renderProductDescription = useCallback((desc) => {
    if (!desc) return "";
    if (desc.startsWith("{")) {
      try {
        const data = JSON.parse(desc);
        if (data.type === 'frame') {
          return `Frame: Model: ${data.modelNo || 'N/A'} | Color: ${data.color || 'N/A'} | Type: ${data.frameType || 'N/A'} | Shape: ${data.frameShape || 'N/A'} | Size: ${data.sizeA || 'N/A'}-${data.sizeB || 'N/A'}-${data.templeLength || 'N/A'}-${data.dbl || 'N/A'}`;
        } else if (data.type === 'lens') {
          return `Lens: Type: ${data.lensType || 'N/A'} | Index: ${data.index || 'N/A'} | Material: ${data.material || 'N/A'} | Coating: ${data.coating || 'N/A'} | SPH: ${data.sph || 'N/A'} | CYL: ${data.cyl || 'N/A'} | Axis: ${data.axis || 'N/A'} | ADD: ${data.add || 'N/A'}`;
        }
        return data.rawDescription || desc;
      } catch (e) {
        return desc;
      }
    }
    return desc;
  }, []);

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
      const catType = getCategoryType(productData.category_id);
      let finalDesc = productData.description;
      if (catType === 'frame') {
        finalDesc = JSON.stringify({
          type: 'frame',
          modelNo: frameFields.modelNo,
          color: frameFields.color,
          frameType: frameFields.frameType,
          frameShape: frameFields.frameShape,
          sizeA: frameFields.sizeA,
          sizeB: frameFields.sizeB,
          templeLength: frameFields.templeLength,
          dbl: frameFields.dbl,
          rawDescription: productData.description
        });
      } else if (catType === 'lens') {
        finalDesc = JSON.stringify({
          type: 'lens',
          lensType: lensFields.lensType,
          index: lensFields.index,
          material: lensFields.material,
          coating: lensFields.coating,
          sph: lensFields.sph,
          cyl: lensFields.cyl,
          axis: lensFields.axis,
          add: lensFields.add,
          rawDescription: productData.description
        });
      }

      // 1. Create the real product in the catalog
      const { data: pData, error: pError } = await supabase
        .from("products")
        .insert([{
          name: productData.name,
          sku: selectedBarcode.barcode, // Bound directly to this issued SKU
          brand: productData.brand || null,
          base_price: Number(productData.base_price || 0),
          category_id: productData.category_id || null,
          description: finalDesc || null
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
    <div className="space-y-6 animate-fast-slide pb-20">

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
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Store Selection Dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
            <Database size={14} className="text-gray-400" />
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              disabled={!isSuperAdmin}
              className="appearance-none bg-transparent text-[11px] font-bold text-black uppercase focus:outline-none cursor-pointer pr-6 py-0.5 disabled:opacity-50"
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
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

            {/* Conditional Custom Fields for Frame */}
            {getCategoryType(productData.category_id) === 'frame' && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Frame Specifications</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Model No *</label>
                    <input required type="text" value={frameFields.modelNo} onChange={e => setFrameFields({...frameFields, modelNo: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 78005" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Color *</label>
                    <input required type="text" value={frameFields.color} onChange={e => setFrameFields({...frameFields, color: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. Black" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Type *</label>
                    <select required value={frameFields.frameType} onChange={e => setFrameFields({...frameFields, frameType: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                      <option value="">— Select —</option>
                      <option value="Full Rim">Full Rim</option>
                      <option value="Half Rim">Half Rim</option>
                      <option value="Rimless">Rimless</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Shape *</label>
                    <select required value={frameFields.frameShape} onChange={e => setFrameFields({...frameFields, frameShape: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                      <option value="">— Select —</option>
                      <option value="Square">Square</option>
                      <option value="Rectangle">Rectangle</option>
                      <option value="Round">Round</option>
                      <option value="Oval">Oval</option>
                      <option value="Aviator">Aviator</option>
                      <option value="Wayfarer">Wayfarer</option>
                      <option value="Clubmaster">Clubmaster</option>
                      <option value="Cat Eye">Cat Eye</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">A Size</label>
                    <input type="text" value={frameFields.sizeA} onChange={e => setFrameFields({...frameFields, sizeA: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 52" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">B Size</label>
                    <input type="text" value={frameFields.sizeB} onChange={e => setFrameFields({...frameFields, sizeB: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 38" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Temple</label>
                    <input type="text" value={frameFields.templeLength} onChange={e => setFrameFields({...frameFields, templeLength: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 140" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">DBL</label>
                    <input type="text" value={frameFields.dbl} onChange={e => setFrameFields({...frameFields, dbl: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 18" />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Custom Fields for Lens */}
            {getCategoryType(productData.category_id) === 'lens' && (
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Lens Specifications</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Type *</label>
                    <select required value={lensFields.lensType} onChange={e => setLensFields({...lensFields, lensType: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                      <option value="">— Select —</option>
                      <option value="Single Vision">Single Vision</option>
                      <option value="Bifocal">Bifocal</option>
                      <option value="Progressive">Progressive</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Index *</label>
                    <input required type="text" value={lensFields.index} onChange={e => setLensFields({...lensFields, index: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 1.56, 1.61" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Material *</label>
                    <input required type="text" value={lensFields.material} onChange={e => setLensFields({...lensFields, material: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. CR-39, Poly" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Coating *</label>
                    <input required type="text" value={lensFields.coating} onChange={e => setLensFields({...lensFields, coating: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. ARC, Blue Cut" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH Power</label>
                    <input type="text" value={lensFields.sph} onChange={e => setLensFields({...lensFields, sph: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. -2.00" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL Power</label>
                    <input type="text" value={lensFields.cyl} onChange={e => setLensFields({...lensFields, cyl: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. -0.50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                    <input type="text" value={lensFields.axis} onChange={e => setLensFields({...lensFields, axis: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 180" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">ADD Power</label>
                    <input type="text" value={lensFields.add} onChange={e => setLensFields({...lensFields, add: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. +2.00" />
                  </div>
                </div>
              </div>
            )}

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
