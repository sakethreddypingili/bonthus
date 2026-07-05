import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus, LayoutGrid, List, X, MoreVertical, ChevronDown, Check, Tags, Database, FolderSync, Trash2, CheckCircle2, ChevronRight, AlertCircle, FilePlus, Layers, PackagePlus, ClipboardList } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";

// Auto-generate a unique SKU like AST-782341
const generateSKU = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `AST-${rand}`;
};

export default function ProductList({ userProfile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabParam = new URLSearchParams(location.search).get("tab") || "stock";
  const activeTab = ["stock", "quick-add", "batch-load", "review-queue"].includes(tabParam) ? tabParam : "stock";

  const setActiveTab = (tabName) => {
    navigate(`/products?tab=${tabName}`, { replace: true });
  };
  
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [categories, setCategories] = useState([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Single product state (for Quick Add)
  const [productData, setProductData] = useState({
    name: '', sku: generateSKU(), brand: '', base_price: '', category_id: '', description: '',
    stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
  });

  const [editingItem, setEditingItem] = useState(null);
  const [cascadePath, setCascadePath] = useState([]);

  // Pending Queue state
  const [pendingItems, setPendingItems] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedPendingIds, setSelectedPendingIds] = useState(new Set());
  
  // Batch Load state
  const [bulkCheckpointName, setBulkCheckpointName] = useState("");
  const [bulkRows, setBulkRows] = useState([
    { name: '', brand: '', base_price: '', sku: generateSKU(), category_id: '', stock_quantity: '1', low_stock_threshold: '5' }
  ]);

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

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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

  const categoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

  const buildCascadePathForCategory = useCallback((categoryId) => {
    if (!categoryId) {
      setCascadePath([]);
      return;
    }
    const catMap = {};
    categories.forEach(c => {
      catMap[c.id] = c;
    });
    
    const path = [];
    let current = catMap[categoryId];
    while (current) {
      path.unshift(current.id);
      current = current.parent_id ? catMap[current.parent_id] : null;
    }
    setCascadePath(path);
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

  const fetchInventory = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_inventory")
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
            base_price,
            description,
            category:categories (
              id,
              name,
              parent_id
            )
          )
        `)
        .eq('store_id', selectedStore);

      if (error) throw error;

      const mapped = data.map(item => ({
        id: item.product?.id,
        inventory_id: item.id,
        name: item.product?.name,
        sku: item.product?.sku,
        brand: item.product?.brand,
        description: item.product?.description,
        category: item.product?.category ? categoryPaths[item.product.category.id] || item.product.category.name : "",
        category_id: item.product?.category?.id,
        price: item.unit_price || item.product?.base_price || 0,
        stock: item.stock_quantity,
        minStock: item.low_stock_threshold,
        status: item.stock_quantity === 0 ? "Out of Stock" : item.stock_quantity <= item.low_stock_threshold ? "Low Stock" : "Active"
      }));

      setInventory(mapped);
    } catch (err) {
      console.error("Error fetching inventory:", err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStore, categoryPaths]);

  const fetchPendingQueue = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from("pending_products")
        .select(`
          *,
          category:categories (
            id,
            name
          ),
          store:stores (
            id,
            name
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingItems(data || []);
    } catch (err) {
      console.error("Error fetching pending queue:", err.message);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchPendingQueue();
  }, [fetchInventory, fetchPendingQueue]);

  const pendingByCheckpoint = useMemo(() => {
    const groups = {};
    pendingItems.forEach(item => {
      const cp = item.checkpoint_name || "Uncategorized Batch";
      if (!groups[cp]) groups[cp] = [];
      groups[cp].push(item);
    });
    return groups;
  }, [pendingItems]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    try {
      if (editingItem) {
        // 1. Update Product
        const { error: pError } = await supabase
          .from('products')
          .update({
            name: productData.name,
            sku: productData.sku,
            brand: productData.brand,
            base_price: Number(productData.base_price),
            category_id: productData.category_id || null,
            description: productData.description
          })
          .eq('id', editingItem.id);
        
        if (pError) throw pError;

        // 2. Update Store Inventory
        const { error: iError } = await supabase
          .from('store_inventory')
          .upsert({
            id: editingItem.inventory_id,
            store_id: selectedStore,
            product_id: editingItem.id,
            stock_quantity: Number(productData.stock_quantity),
            unit_price: Number(productData.unit_price || productData.base_price),
            low_stock_threshold: Number(productData.low_stock_threshold)
          });
        
        if (iError) throw iError;
        
        setSuccessMessage("Product updated in catalog successfully!");
        setShowEditModal(false);
        setEditingItem(null);
        setCascadePath([]);
        await fetchInventory();
        setActiveTab("stock");
      } else {
        // Quick Add logic (always saves to pending queue under 'Quick Intake')
        const { error } = await supabase
          .from("pending_products")
          .insert([{
            checkpoint_name: "Quick Intake",
            name: productData.name,
            sku: productData.sku,
            brand: productData.brand || null,
            base_price: Number(productData.base_price || 0),
            category_id: productData.category_id || null,
            description: productData.description || null,
            stock_quantity: Number(productData.stock_quantity || 0),
            low_stock_threshold: Number(productData.low_stock_threshold || 5),
            unit_price: Number(productData.unit_price || productData.base_price || 0),
            store_id: selectedStore,
            status: 'pending'
          }]);

        if (error) throw error;
        
        setSuccessMessage(`Product added to Review Queue under checkpoint: Quick Intake`);
        await fetchPendingQueue();
        setActiveTab("review-queue");

        // Reset Add Form
        setCascadePath([]);
        setProductData({
          name: '', sku: generateSKU(), brand: '', base_price: '', category_id: '', description: '',
          stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
        });
      }
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setProductData({
      name: item.name,
      sku: item.sku,
      brand: item.brand,
      base_price: item.price,
      category_id: item.category_id,
      description: item.description,
      stock_quantity: item.stock,
      low_stock_threshold: item.minStock,
      unit_price: item.price
    });
    buildCascadePathForCategory(item.category_id);
    setShowEditModal(true);
  };

  // Bulk Load Row utilities
  const handleAddBulkRow = () => {
    setBulkRows(prev => [...prev, { name: '', brand: '', base_price: '', sku: generateSKU(), category_id: '', stock_quantity: '1', low_stock_threshold: '5' }]);
  };

  const handleRemoveBulkRow = (index) => {
    if (bulkRows.length === 1) return;
    setBulkRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleBulkRowChange = (index, field, value) => {
    setBulkRows(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: value } : row));
  };

  const handleSaveBulk = async (e) => {
    e.preventDefault();
    if (!bulkCheckpointName.trim()) {
      alert("Please provide a checkpoint name.");
      return;
    }
    setSaving(true);
    setSuccessMessage("");
    try {
      const records = bulkRows.map(row => ({
        checkpoint_name: bulkCheckpointName.trim(),
        name: row.name,
        sku: row.sku || generateSKU(),
        brand: row.brand || null,
        base_price: Number(row.base_price || 0),
        category_id: row.category_id || null,
        description: row.description || null,
        stock_quantity: Number(row.stock_quantity || 1),
        low_stock_threshold: Number(row.low_stock_threshold || 5),
        unit_price: Number(row.base_price || 0),
        store_id: selectedStore,
        status: 'pending'
      }));

      const { error } = await supabase.from("pending_products").insert(records);
      if (error) throw error;

      setSuccessMessage(`Bulk batch containing ${bulkRows.length} items added to Review Queue!`);
      setBulkCheckpointName("");
      setBulkRows([{ name: '', brand: '', base_price: '', sku: generateSKU(), category_id: '', stock_quantity: '1', low_stock_threshold: '5' }]);
      await fetchPendingQueue();
      setActiveTab("review-queue");
    } catch (err) {
      alert("Failed to insert bulk batch: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Confirm pending products
  const handleConfirmSelected = async () => {
    if (selectedPendingIds.size === 0) return;
    setSaving(true);
    try {
      const toConfirm = pendingItems.filter(item => selectedPendingIds.has(item.id));
      
      for (const item of toConfirm) {
        // 1. Insert into products
        const { data: pData, error: pError } = await supabase
          .from("products")
          .insert([{
            name: item.name,
            sku: item.sku,
            brand: item.brand,
            base_price: Number(item.base_price),
            category_id: item.category_id,
            description: item.description
          }])
          .select()
          .single();

        if (pError) throw pError;

        // 2. Insert into store_inventory
        const { error: iError } = await supabase
          .from("store_inventory")
          .insert([{
            store_id: item.store_id || selectedStore,
            product_id: pData.id,
            stock_quantity: Number(item.stock_quantity),
            unit_price: Number(item.unit_price || item.base_price),
            low_stock_threshold: Number(item.low_stock_threshold)
          }]);

        if (iError) throw iError;

        // 3. Mark pending as confirmed
        const { error: uError } = await supabase
          .from("pending_products")
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', item.id);

        if (uError) throw uError;
      }

      setSelectedPendingIds(new Set());
      setSuccessMessage(`Successfully confirmed and updated catalog with ${toConfirm.length} items.`);
      await fetchInventory();
      await fetchPendingQueue();
      setActiveTab("stock");
    } catch (err) {
      alert("Confirmation failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete pending items
  const handleDeleteSelectedPending = async () => {
    if (selectedPendingIds.size === 0) return;
    if (!window.confirm("Are you sure you want to discard selected pending entities?")) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedPendingIds);
      const { error } = await supabase.from("pending_products").delete().in("id", ids);
      if (error) throw error;

      setSelectedPendingIds(new Set());
      await fetchPendingQueue();
    } catch (err) {
      alert("Failed to discard pending items: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectPending = (id) => {
    const next = new Set(selectedPendingIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPendingIds(next);
  };

  const toggleSelectCheckpoint = (checkpointItems, selectAll) => {
    const next = new Set(selectedPendingIds);
    checkpointItems.forEach(item => {
      if (selectAll) {
        next.add(item.id);
      } else {
        next.delete(item.id);
      }
    });
    setSelectedPendingIds(next);
  };

  const filteredCatalog = inventory.filter(p => {
    const matchesSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || String(p.category_id) === String(selectedCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  const statusBadge = (item) => {
    const map = {
      "Active": "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Low Stock": "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Out of Stock": "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[item.status]}>{item.status}</span>;
  };

  const headerDetails = {
    "stock": { title: "Stock Catalog", subtitle: "Master Product Catalog & Unit Stock" },
    "quick-add": { title: "Quick Intake", subtitle: "Register single product entity to active stock or queue" },
    "batch-load": { title: "Batch Intake", subtitle: "Ingest multiple product entities under checkpoint batches" },
    "review-queue": { title: "Review Queue", subtitle: "Verify and confirm checkpoint ingestion batches to live catalog" }
  }[activeTab] || { title: "Inventory Matrix", subtitle: "Manage catalog stock levels and ingestion channels" };

  return (
    <div className="space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">{headerDetails.title}</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{headerDetails.subtitle}</p>
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

      {/* Status Toasts/Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-black text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fast-zoom">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="ml-auto text-emerald-600 hover:text-black font-black uppercase text-[10px]">Dismiss</button>
        </div>
      )}

      {/* -------------------- 1. STOCK TAB -------------------- */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Showing Active Catalog Products</span>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <Tags size={14} className="text-gray-400" />
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="appearance-none bg-transparent text-[11px] font-bold text-black uppercase focus:outline-none cursor-pointer pr-6 py-0.5"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{categoryPaths[c.id] || c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search Stock registry…"
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

          {loading && inventory.length === 0 ? (
            <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Master Registry...</div>
          ) : view === "list" ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Identify</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Brand</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCatalog.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black text-black uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate max-w-xs">{item.description}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{item.sku}</td>
                        <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-widest">{item.brand || "Generic"}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{item.category || "Unassigned"}</td>
                        <td className="px-6 py-4 text-xs font-black text-black">₹{item.price.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-xs font-black text-black">{item.stock} Units</td>
                        <td className="px-6 py-4">{statusBadge(item)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleEditClick(item)} className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:text-black hover:bg-gray-50 transition-all">
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCatalog.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                          No stock records matched search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredCatalog.map(item => (
                <div key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.sku}</span>
                      {statusBadge(item)}
                    </div>
                    <h3 className="text-sm font-black text-black uppercase tracking-tight mt-4">{item.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider leading-relaxed line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 mt-6 pt-4">
                    <div>
                      <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Stock / Price</p>
                      <p className="text-xs font-black text-black uppercase mt-0.5">{item.stock} Units — ₹{item.price}</p>
                    </div>
                    <button onClick={() => handleEditClick(item)} className="p-2.5 border border-gray-100 rounded-xl text-gray-400 hover:text-black hover:bg-gray-50 transition-all">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- 2. QUICK ADD TAB -------------------- */}
      {activeTab === "quick-add" && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-fast-zoom">
          <div className="mb-6">
            <h3 className="text-lg font-black text-black uppercase tracking-wider">Quick Ingestion Form</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Register a single product entity to active stock or queue</p>
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-6">
            {/* Target selection */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="text-black" />
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-relaxed">
                Note: All new product entries will be saved to the Review Queue first as draft for verification.
              </p>
            </div>

            {/* Identifiers */}
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <h4 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-1.5"><Tags size={12} /> Product Identifiers</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title *</label>
                  <input required value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Name</label>
                    <input value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU Code *</label>
                    <input required value={productData.sku} onChange={e => setProductData({...productData, sku: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                  </div>
                </div>
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

            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
              <textarea value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} className="w-full min-h-[80px] p-4 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none resize-none" />
            </div>

            {/* Stock details */}
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Warehouse Stock levels</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Stock</label>
                  <input required value={productData.stock_quantity} onChange={e => setProductData({...productData, stock_quantity: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Threshold</label>
                  <input required value={productData.low_stock_threshold} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Price</label>
                  <input required value={productData.base_price} onChange={e => setProductData({...productData, base_price: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" placeholder="₹" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full py-4.5 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 h-[56px] flex justify-center items-center">
              {saving ? "Ingesting Product..." : "Commit Entity"}
            </button>
          </form>
        </div>
      )}

      {/* -------------------- 3. BATCH LOAD TAB -------------------- */}
      {activeTab === "batch-load" && (
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-fast-zoom">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-black uppercase tracking-wider">Batch Ingest load</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Ingest multiple product entities under a single checkpoint batch</p>
            </div>
            <button 
              type="button" 
              onClick={handleAddBulkRow}
              className="text-[10px] font-black bg-black text-white px-4 py-2.5 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-md"
            >
              + Add Row
            </button>
          </div>

          <form onSubmit={handleSaveBulk} className="space-y-6">
            {/* Checkpoint Name */}
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Checkpoint / Batch Tag *</label>
              <input 
                required 
                value={bulkCheckpointName} 
                onChange={e => setBulkCheckpointName(e.target.value)} 
                type="text" 
                placeholder="e.g. CONTAINER SHIPMENT JULY-A" 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none placeholder:text-gray-200" 
              />
            </div>

            {/* Bulk items rows */}
            <div className="space-y-4">
              {bulkRows.map((row, idx) => (
                <div key={idx} className="p-5 border-2 border-black rounded-2xl relative bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  {bulkRows.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveBulkRow(idx)}
                      className="absolute top-4 right-4 text-red-500 hover:scale-110 transition-transform"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest block mb-3">Ingest Row #{idx + 1}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Name *</label>
                      <input 
                        required 
                        value={row.name} 
                        onChange={e => handleBulkRowChange(idx, 'name', e.target.value)} 
                        type="text" 
                        placeholder="Product Name" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand</label>
                      <input 
                        value={row.brand} 
                        onChange={e => handleBulkRowChange(idx, 'brand', e.target.value)} 
                        type="text" 
                        placeholder="Brand Name" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU *</label>
                      <input 
                        required 
                        value={row.sku} 
                        onChange={e => handleBulkRowChange(idx, 'sku', e.target.value)} 
                        type="text" 
                        placeholder="SKU" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Category (Classification)</label>
                      <select 
                        value={row.category_id} 
                        onChange={e => handleBulkRowChange(idx, 'category_id', e.target.value)} 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none bg-white cursor-pointer"
                      >
                        <option value="">— Select —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{categoryPaths[c.id] || c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Stock Qty *</label>
                      <input 
                        required 
                        value={row.stock_quantity} 
                        onChange={e => handleBulkRowChange(idx, 'stock_quantity', e.target.value)} 
                        type="number" 
                        min="1"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Base Price (₹) *</label>
                      <input 
                        required 
                        value={row.base_price} 
                        onChange={e => handleBulkRowChange(idx, 'base_price', e.target.value)} 
                        type="number" 
                        placeholder="₹" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" disabled={saving} className="w-full py-4.5 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 h-[56px] flex justify-center items-center">
              {saving ? "Commiting Batch..." : "Commit Batch Drafts to Queue"}
            </button>
          </form>
        </div>
      )}

      {/* -------------------- 4. REVIEW QUEUE TAB -------------------- */}
      {activeTab === "review-queue" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select and Confirm Ingested checkpoint batches</span>
            {selectedPendingIds.size > 0 && (
              <div className="flex items-center gap-2 animate-fast-zoom">
                <button 
                  onClick={handleConfirmSelected}
                  disabled={saving}
                  className="text-[10px] font-black bg-black text-white uppercase tracking-widest px-4 py-2.5 rounded-xl hover:scale-105 transition-all flex items-center gap-1.5 shadow-md animate-pulse"
                >
                  <CheckCircle2 size={12} /> Confirm Selected ({selectedPendingIds.size})
                </button>
                <button 
                  onClick={handleDeleteSelectedPending}
                  disabled={saving}
                  className="text-[10px] font-black border-2 border-black text-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-50 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 size={12} /> Discard
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {Object.entries(pendingByCheckpoint).map(([checkpoint, items]) => {
              const hasCheckedAll = items.every(i => selectedPendingIds.has(i.id));
              const hasCheckedSome = items.some(i => selectedPendingIds.has(i.id)) && !hasCheckedAll;

              return (
                <div key={checkpoint} className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {/* Accordion Header */}
                  <div className="bg-gray-50 border-b-2 border-black px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={hasCheckedAll}
                        ref={el => {
                          if (el) el.indeterminate = hasCheckedSome;
                        }}
                        onChange={e => toggleSelectCheckpoint(items, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                      />
                      <div>
                        <h3 className="text-sm font-black text-black uppercase tracking-wider">{checkpoint}</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {items.length} Pending entities in queue
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black bg-white border border-gray-200 text-gray-400 px-3 py-1 rounded-full uppercase tracking-wider">
                      Batch Pending
                    </span>
                  </div>

                  {/* Batch Items List */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="w-12 px-6 py-3"></th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Brand</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Destination Store</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-3">
                              <input 
                                type="checkbox"
                                checked={selectedPendingIds.has(item.id)}
                                onChange={() => toggleSelectPending(item.id)}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-3 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                            <td className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{item.sku}</td>
                            <td className="px-6 py-3 text-xs font-bold text-black uppercase tracking-widest">{item.brand || "Generic"}</td>
                            <td className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {item.category?.name || "Unassigned"}
                            </td>
                            <td className="px-6 py-3 text-xs font-bold text-black">₹{item.base_price}</td>
                            <td className="px-6 py-3 text-xs font-black text-black">{item.stock_quantity} units</td>
                            <td className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              {item.store?.name || "Global / Warehouse"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            
            {pendingItems.length === 0 && (
              <div className="p-20 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-neutral-50 flex flex-col items-center justify-center gap-4">
                <FolderSync size={32} className="text-gray-300 animate-pulse" />
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Ingestion queue empty</p>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mt-1">No pending checkpoint batches saved currently</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Drawer (for existing catalog items) */}
      <SlideDrawer isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingItem(null); setCascadePath([]); }} title="Edit Product Matrix">
        <div className="h-full flex flex-col">
            <form onSubmit={handleSaveProduct} className="space-y-8 flex-1 overflow-y-auto pr-1 no-scrollbar pb-10">
                {/* Identity Block */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-1.5"><Tags size={12} /> Entity Identifiers</h4>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title *</label>
                            <input required value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Name</label>
                                <input value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU Code *</label>
                                <input required value={productData.sku} onChange={e => setProductData({...productData, sku: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories classification */}
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

                {/* Detail Description */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Matrix Description</label>
                    <textarea value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} className="w-full min-h-[80px] p-4 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none resize-none" />
                </div>

                {/* Stock Level Ingestion */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Warehouse Stock levels</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Stock</label>
                            <input required value={productData.stock_quantity} onChange={e => setProductData({...productData, stock_quantity: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Threshold</label>
                            <input required value={productData.low_stock_threshold} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Price</label>
                            <input required value={productData.base_price} onChange={e => setProductData({...productData, base_price: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" placeholder="₹" />
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
                    <button type="button" onClick={() => { setShowEditModal(false); setEditingItem(null); setCascadePath([]); }} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Abort</button>
                    <button type="submit" disabled={saving} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                        {saving ? "Syncing..." : "Update Matrix"}
                    </button>
                </div>
            </form>
        </div>
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
