import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, LayoutGrid, List, X, MoreVertical, ChevronDown, Check, Tags, Database, ChevronRight } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";
import { usePopup } from "../components/common/PopupProvider";

// Auto-generate a unique SKU like AST-782341
const generateSKU = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `AST-${rand}`;
};

export default function Products({ userProfile }) {
  const navigate = useNavigate();
  const { showAlert } = usePopup();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [categories, setCategories] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [productData, setProductData] = useState({
    name: '', sku: '', brand: '', base_price: '', category_id: '', description: '',
    stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
  });

  const [editingItem, setEditingItem] = useState(null);
  const [cascadePath, setCascadePath] = useState([]);

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: sData } = await supabase.from('stores').select('id, name').order('name');
      setStores(sData || []);
      
      // Default to Main Warehouse or user's store
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

  // Build a map: parentId (or null) -> [child categories]
  const categoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

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
            category:categories(id, name)
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
        category: categoryPaths[item.product?.category?.id] || item.product?.category?.name,
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
  }, [selectedStore]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let productId;
      
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
        productId = editingItem.id;

        // 2. Update/Insert Store Inventory
        const { error: iError } = await supabase
          .from('store_inventory')
          .upsert({
            id: editingItem.inventory_id,
            store_id: selectedStore,
            product_id: productId,
            stock_quantity: Number(productData.stock_quantity),
            unit_price: Number(productData.unit_price || productData.base_price),
            low_stock_threshold: Number(productData.low_stock_threshold)
          });
        
        if (iError) throw iError;

      } else {
        // 1. Create Product
        const { data: pData, error: pError } = await supabase
          .from('products')
          .insert([{
            name: productData.name,
            sku: productData.sku,
            brand: productData.brand,
            base_price: Number(productData.base_price),
            category_id: productData.category_id || null,
            description: productData.description
          }])
          .select()
          .single();
        
        if (pError) throw pError;
        productId = pData.id;

        // 2. Create Store Inventory
        const { error: iError } = await supabase
          .from('store_inventory')
          .insert([{
            store_id: selectedStore,
            product_id: productId,
            stock_quantity: Number(productData.stock_quantity),
            unit_price: Number(productData.unit_price || productData.base_price),
            low_stock_threshold: Number(productData.low_stock_threshold)
          }]);
        
        if (iError) throw iError;
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setEditingItem(null);
      setProductData({
        name: '', sku: '', brand: '', base_price: '', category_id: '', description: '',
        stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
      });
      fetchInventory();
    } catch (err) {
      showAlert("Failed to save: " + err.message);
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

  const handleOpenAdd = () => {
    setEditingItem(null);
    setCascadePath([]);
    setProductData({
      name: '', sku: generateSKU(), brand: '', base_price: '', category_id: '', description: '',
      stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
    });
    setShowAddModal(true);
  };

  const filtered = inventory.filter(p => {
    return !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.toLowerCase().includes(search.toLowerCase());
  });

  const statusBadge = (item) => {
    const map = {
      "Active": "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Low Stock": "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Out of Stock": "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[item.status]}>{item.status}</span>;
  };

  if (loading && inventory.length === 0) {
    return <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Master Registry...</div>;
  }

  return (
    <div className="space-y-8 animate-fast-slide pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">{isSuperAdmin ? "Inventory Registry" : "Product Catalogue"}</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{isSuperAdmin ? "Master Product Catalog & Unit Stock" : "Product Catalogue and related actions"}</p>
        </div>

        <div className="flex items-center gap-4">
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
          {isSuperAdmin && (
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={14} strokeWidth={3} /> New Product
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <button className="text-[10px] font-black text-black uppercase tracking-widest px-4 py-2 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center gap-2">
              <Check size={12} /> Bulk Action
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search registry…"
              className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-52 placeholder:text-gray-300"
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

      <div className="w-full">
        {view === "list" ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">{isSuperAdmin ? "Brand" : "Category"}</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Value</th>
                    {isSuperAdmin && <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock</th>}
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    {isSuperAdmin && <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.inventory_id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase font-mono">{p.sku}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isSuperAdmin ? (p.brand || 'N/A') : (p.category || 'N/A')}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-black tracking-tight">₹{p.price.toLocaleString()}</td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[11px] font-black ${p.stock === 0 ? "text-gray-400 line-through" : "text-black"}`}>{p.stock}</span>
                          <span className="text-[9px] text-gray-400 ml-1">/ {p.minStock}</span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        {statusBadge(p)}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(p)} className="p-2 rounded-lg hover:bg-black hover:text-white text-gray-400" title="Edit">
                                  <Plus size={16} />
                              </button>
                              <button onClick={() => navigate(`/inventory-entities/${p.id}`)} className="p-2 rounded-lg hover:bg-black hover:text-white text-gray-400" title="View details">
                                  <MoreVertical size={16} />
                              </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(p => (
              <div key={p.inventory_id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-xl hover:border-black/5 group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div onClick={() => navigate(`/inventory-entities/${p.id}`)}>
                    <p className="text-[11px] font-black text-black uppercase tracking-tight group-hover:text-black">{p.name}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{p.sku}</p>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={() => handleEditClick(p)} className="p-1 rounded-lg hover:bg-black hover:text-white text-gray-300" title="Edit">
                        <Plus size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-3" onClick={() => navigate(`/inventory-entities/${p.id}`)}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Cost Basis</span>
                    <span className="text-[12px] font-black text-black tracking-tight">₹{p.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    {statusBadge(p)}
                    {isSuperAdmin && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Stock: {p.stock}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideDrawer
        isOpen={showAddModal || showEditModal}
        onClose={() => { setShowAddModal(false); setShowEditModal(false); setEditingItem(null); setCascadePath([]); }}
        title={editingItem ? "Refine Product" : "Register Product"}
        subtitle={editingItem ? "Update global and unit specifics" : "Add entity to master catalog"}
      >
        <div className="flex flex-col h-full">
            <form onSubmit={handleSaveProduct} className="space-y-8">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Entity Name</label>
                            <input required value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none" placeholder="Product Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Auto SKU</label>
                            <div className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 select-all font-mono">
                              {productData.sku || '—'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand</label>
                            <input value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none" placeholder="Brand Name" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                            <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest">(Pick below)</div>
                        </div>
                    </div>

                    {/* Category cascade */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Category Path</p>

                      {/* Level 0: root */}
                      {(categoryChildMap['__root__'] || []).length > 0 && (
                        <ProductCascadeLevel
                          depth={0}
                          options={categoryChildMap['__root__'] || []}
                          selectedId={cascadePath[0] || ''}
                          onSelect={id => handleCategoryLevelSelect(0, id)}
                        />
                      )}

                      {/* Deeper levels */}
                      {cascadePath.map((selectedId, depth) => {
                        const children = categoryChildMap[selectedId] || [];
                        if (children.length === 0) return null;
                        return (
                          <ProductCascadeLevel
                            key={selectedId}
                            depth={depth + 1}
                            options={children}
                            selectedId={cascadePath[depth + 1] || ''}
                            onSelect={id => handleCategoryLevelSelect(depth + 1, id)}
                          />
                        );
                      })}

                      {/* Breadcrumb confirmation pill */}
                      {productData.category_id && cascadePath.length > 0 && (() => {
                        const lastId = cascadePath[cascadePath.length - 1];
                        const hasChildren = (categoryChildMap[lastId] || []).length > 0;
                        const breadcrumb = cascadePath
                          .map(id => categories.find(c => c.id === id)?.name)
                          .filter(Boolean)
                          .join(' › ');
                        return (
                          <div className="space-y-2 mt-1">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-black rounded-xl">
                              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                              <span className="text-[9px] font-black text-white uppercase tracking-widest truncate flex-1">
                                ✓ Parent: {breadcrumb}
                              </span>
                            </div>
                            {hasChildren && (
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                ↳ You can pick a deeper sub-level above, or submit as-is to place under "{categories.find(c => c.id === lastId)?.name}"
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                        <textarea value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} rows={3} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none resize-none" placeholder="Technical specifications..." />
                    </div>

                    <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 space-y-6">
                        <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em] border-b border-gray-200 pb-3 flex items-center gap-2">
                            <Database size={14} /> Unit Specifications ({stores.find(s => s.id === selectedStore)?.name})
                        </h4>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Stock</label>
                                <input required value={productData.stock_quantity} onChange={e => setProductData({...productData, stock_quantity: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-black text-black outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Threshold</label>
                                <input required value={productData.low_stock_threshold} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-black text-black outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Price</label>
                                <input required value={productData.base_price} onChange={e => setProductData({...productData, base_price: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-black text-black outline-none" placeholder="₹" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
                    <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingItem(null); setCascadePath([]); }} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Abort</button>
                    <button type="submit" disabled={saving} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                        {saving ? "Syncing..." : (editingItem ? "Update Matrix" : "Commit Entity")}
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
