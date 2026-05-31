
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, LayoutGrid, List, X, Tags, MoreVertical, ChevronDown, Check } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";
import SlideDrawer from "../components/common/SlideDrawer";

const DEFAULT_CATEGORIES = ["All"];

export default function Products({ userProfile }) {
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category_id: '', price: '', stock: '' });
  const [newCategory, setNewCategory] = useState({ name: '', store_id: '' });
  const [adding, setAdding] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [, setShowCategoryMenu] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [savingProduct, setSavingProduct] = useState(false);

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [productStoreId, setProductStoreId] = useState("");
  const [browseCategories, setBrowseCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  
  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.store_name === "All";
  const canManageProducts = isSuperAdmin || userProfile?.role === 'store_manager';

  const getCategoryLabel = (item) => item?.name || item?.category_name || item?.label || "Uncategorized";

  const handleEditCategory = (catName) => {
    const catObj = browseCategories.find(c => getCategoryLabel(c) === catName);
    if (!catObj) return;
    setEditingCategory(catObj);
    setEditCategoryName(getCategoryLabel(catObj));
    const initialIds = dbProducts.filter(p => p.category_id === catObj.id).map(p => p.id);
    setSelectedProductIds(initialIds);
    setShowCategoryMenu(null);
  };

  const handleSaveRename = async () => {
    if (!editCategoryName.trim()) {
      setEditingCategory(null);
      setEditCategoryName("");
      return;
    }
    
    const catObj = editingCategory;
    try {
      const { error: catError } = await supabase
        .from('products_category')
        .update({ name: editCategoryName.trim() })
        .eq('id', catObj.id);
      
      if (catError) throw catError;

      const productsToRemove = dbProducts.filter(p => p.category_id === catObj.id && !selectedProductIds.includes(p.id)).map(p => p.id);
      if (productsToRemove.length > 0) {
        await supabase.from('products_list').update({ category_id: null }).in('id', productsToRemove);
      }

      if (selectedProductIds.length > 0) {
        await supabase.from('products_list').update({ category_id: catObj.id }).in('id', selectedProductIds);
      }

      fetchProducts();
      fetchCategories(selectedStore, setBrowseCategories);
      setEditingCategory(null);
      setEditCategoryName("");
      setSelectedProductIds([]);
    } catch (err) {
      alert('Error updating category: ' + err.message);
    }
  };

  const getDefaultStoreId = useCallback(() => {
    if (selectedStore && selectedStore !== "All") return selectedStore;
    return userProfile?.store_id || stores[0]?.id || "";
  }, [selectedStore, userProfile?.store_id, stores]);

  const fetchCategories = useCallback(async (storeId, setter) => {
    let query = supabase.from('products_category').select('*').order('id', { ascending: true });
    if (storeId && storeId !== 'All') {
      query = query.eq('store_id', storeId);
    }
    const { data, error } = await query;
    if (error) throw error;
    setter(data || []);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      supabase.from('store').select('*').order('name').then(({ data }) => setStores(data || []));
    } else if (userProfile?.store_id) {
      setSelectedStore(userProfile.store_id);
    }
  }, [isSuperAdmin, userProfile]);

  useEffect(() => {
    if (showAddModal && !productStoreId) {
      setProductStoreId(getDefaultStoreId());
    }
  }, [showAddModal, productStoreId, getDefaultStoreId]);

  useEffect(() => {
    if (showCategoryModal && !newCategory.store_id) {
      const defId = getDefaultStoreId();
      if (defId) setNewCategory(prev => ({ ...prev, store_id: defId }));
    }
  }, [showCategoryModal, newCategory.store_id, getDefaultStoreId]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("products_list")
        .select('*, products_category(*), store(name)')
        .order('name', { ascending: true });

      if (!isSuperAdmin && userProfile?.store_id) {
        query = query.eq('store_id', userProfile.store_id);
      } else if (isSuperAdmin && selectedStore && selectedStore !== 'All' && selectedStore !== "") {
        query = query.eq('store_id', selectedStore);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = data.map(p => ({
        ...p,
        category_id: p.category_id || p.products_category?.id || '',
        category: getCategoryLabel(p.products_category),
        store_name: p.store?.name || '',
        status: p.stock === 0 ? "Out of Stock" : p.stock < 20 ? "Low Stock" : "Active"
      }));

      setDbProducts(mapped);
    } catch (err) {
      console.error("Error fetching products:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedStore, userProfile?.store_id]);

  useEffect(() => {
    fetchProducts();
    fetchCategories(selectedStore, setBrowseCategories).catch(err => {
      console.error("Error fetching categories:", err.message);
      setBrowseCategories([]);
    });
  }, [selectedStore, userProfile, fetchProducts, fetchCategories]);

  useEffect(() => {
    if (!showAddModal || !productStoreId) return;
    fetchCategories(productStoreId, setProductCategories).catch(err => {
      console.error("Error fetching product categories:", err.message);
      setProductCategories([]);
    });
  }, [showAddModal, productStoreId, fetchCategories]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      if (!productStoreId) throw new Error("Store is required");
      if (!newProduct.category_id) throw new Error("Category is required");

      const newId = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);
      const { error } = await supabase.from("products_list").insert([{
        id: newId,
        name: newProduct.name,
        category_id: newProduct.category_id,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        store_id: productStoreId,
        sales: 0
      }]);
      if (error) throw error;
      setShowAddModal(false);
      setNewProduct({ name: '', category_id: '', price: '', stock: '' });
      setProductStoreId("");
      fetchProducts();
    } catch (err) {
      alert('Failed to add product: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const filtered = dbProducts.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || p.category === category;
    return matchSearch && matchCategory;
  });

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filtered.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filtered.map(p => p.id));
    }
  };

  const toggleSelectProduct = (id) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleEditProduct = (p) => {
    setEditingProduct({ ...p });
    setShowCategoryMenu(null);
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const { error } = await supabase
        .from('products_list')
        .update({
          name: editingProduct.name,
          category_id: editingProduct.category_id,
          price: Number(editingProduct.price),
          stock: Number(editingProduct.stock)
        })
        .eq('id', editingProduct.id);
      
      if (error) throw error;
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      alert('Failed to update product: ' + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const dynamicCategories = [
    ...DEFAULT_CATEGORIES,
    ...new Set(browseCategories.map(getCategoryLabel).filter(c => c && !DEFAULT_CATEGORIES.includes(c)))
  ];

  const openAddProduct = () => {
    setProductStoreId(getDefaultStoreId());
    setNewProduct({ name: '', category_id: '', price: '', stock: '' });
    setShowAddModal(true);
  };

  const openAddCategory = () => {
    setNewCategory({ name: '', store_id: getDefaultStoreId() });
    setShowCategoryModal(true);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setCreatingCategory(true);
    try {
      const targetStoreId = newCategory.store_id || getDefaultStoreId();
      if (!targetStoreId) throw new Error("Store is required for a category");

      const categoryName = newCategory.name.trim();
      if (!categoryName) throw new Error("Category name is required");

      const { error } = await supabase.from('products_category').insert([
        { name: categoryName, store_id: targetStoreId }
      ]);
      if (error) throw error;

      setShowCategoryModal(false);
      setNewCategory({ name: '', store_id: getDefaultStoreId() });
      fetchCategories(selectedStore, setBrowseCategories).catch(err => console.error("Error refreshing categories:", err.message));
      if (showAddModal && productStoreId) {
        fetchCategories(productStoreId, setProductCategories).catch(err => console.error("Error refreshing product categories:", err.message));
      }
    } catch (err) {
      alert('Failed to add category: ' + err.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const statusBadge = (stock) => {
    const status = stock === 0 ? "Out of Stock" : stock < 20 ? "Low Stock" : "Active";
    const map = {
      "Active": "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Low Stock": "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Out of Stock": "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[status]}>{status}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Products</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Manage inventory and product catalog</p>
        </div>

        <div className="flex items-center gap-4">
          {isSuperAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="appearance-none bg-transparent text-xs font-black text-black uppercase focus:outline-none cursor-pointer pr-8 py-1"
              >
                <option value="All">All Locations</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={14} className="text-black -ml-6" />
            </div>
          )}
          {canManageProducts && (
            <div className="flex items-center gap-2">
              <button onClick={openAddCategory} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                <Tags size={14} /> Category
              </button>
              <button onClick={openAddProduct} className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all">
                <Plus size={14} /> Product
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSelectAll} 
            className="text-[10px] font-black text-black uppercase tracking-widest px-4 py-2 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            {selectedProductIds.length === filtered.length && filtered.length > 0 ? <X size={12} /> : <Check size={12} />}
            {selectedProductIds.length === filtered.length && filtered.length > 0 ? "Deselect All" : "Select All"}
          </button>
          {selectedProductIds.length > 0 && (
            <span className="text-[10px] font-black text-white bg-black px-3 py-2 rounded-xl uppercase tracking-widest animate-in zoom-in">
              {selectedProductIds.length} Selected
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-52 transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-1">
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-black text-white shadow-sm" : "text-gray-400 hover:text-black"}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition-all ${view === "grid" ? "bg-black text-white shadow-sm" : "text-gray-400 hover:text-black"}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Categories */}
        <div className="w-full lg:w-1/3 space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Categories</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Count</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dynamicCategories.filter(c => c !== "All").map(c => {
                    const catProds = dbProducts.filter(p => p.category === c);
                    return (
                      <tr
                        key={c}
                        onClick={() => setCategory(c === category ? "All" : c)}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${category === c ? "bg-gray-50" : ""}`}
                      >
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-black uppercase tracking-tight ${category === c ? "text-black" : "text-gray-600"}`}>{c}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-[11px] font-black text-black">{catProds.length}</td>
                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                          {isSuperAdmin && (
                            <button onClick={() => handleEditCategory(c)} className="p-2 rounded-lg hover:bg-black hover:text-white transition-all text-gray-400">
                              <MoreVertical size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Products */}
        <div className="w-full lg:w-2/3">
          {view === "list" ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase font-mono">#{p.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.category || "—"}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-[11px] font-black text-black tracking-tight">₹{p.price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[11px] font-black ${p.stock === 0 ? "text-gray-400 line-through" : "text-black"}`}>{p.stock}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {statusBadge(p.stock)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isSuperAdmin && (
                            <button onClick={() => handleEditProduct(p)} className="p-2 rounded-lg hover:bg-black hover:text-white transition-all text-gray-400">
                              <MoreVertical size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtered.map(p => (
                <div key={p.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-xl hover:border-black/5 transition-all duration-300 group cursor-pointer" onClick={() => isSuperAdmin && handleEditProduct(p)}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-black text-black uppercase tracking-tight group-hover:text-black transition-colors">{p.name}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">{p.category || "Uncategorized"}</p>
                    </div>
                    {isSuperAdmin && <button className="p-1 rounded-lg hover:bg-black hover:text-white text-gray-300 transition-all"><MoreVertical size={14} /></button>}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Price</span>
                      <span className="text-[12px] font-black text-black tracking-tight">₹{p.price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      {statusBadge(p.stock)}
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Stock: {p.stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Product Drawer */}
      <SlideDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Product"
      >
        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Product Name</label>
              <input required type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="Product Name" />
            </div>

            {isSuperAdmin && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Store</label>
                <select value={productStoreId} onChange={e => setProductStoreId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight">
                  <option value="" disabled>Select Store</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Category</label>
              <select value={newProduct.category_id} onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" disabled={!productStoreId}>
                <option value="">Select Category</option>
                {productCategories.map(c => <option key={c.id} value={c.id}>{getCategoryLabel(c)}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                <input required type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Stock</label>
                <input required type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" placeholder="0" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Cancel</button>
            <button type="submit" disabled={adding || !productStoreId || !newProduct.category_id} className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all disabled:opacity-50">
              {adding ? 'Processing...' : 'Add Product'}
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Add Category Drawer */}
      <SlideDrawer
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Add Category"
      >
        <form onSubmit={handleCreateCategory} className="space-y-6">
          <div className="space-y-4">
            {isSuperAdmin && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Store</label>
                <select value={newCategory.store_id} onChange={e => setNewCategory({ ...newCategory, store_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight">
                  <option value="" disabled>Select Store</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Category Name</label>
              <input required type="text" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="e.g. Sunglasses" />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Cancel</button>
            <button type="submit" disabled={creatingCategory || (isSuperAdmin && !newCategory.store_id)} className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all disabled:opacity-50">
              {creatingCategory ? 'Processing...' : 'Create Category'}
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Edit Product Drawer */}
      <SlideDrawer
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
      >
        {editingProduct && (
          <form onSubmit={handleSaveProductEdit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Product Name</label>
                <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Category</label>
                <select value={editingProduct.category_id} onChange={e => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight">
                  {browseCategories.map(c => <option key={c.id} value={c.id}>{getCategoryLabel(c)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                  <input required type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Stock</label>
                  <input required type="number" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Cancel</button>
              <button type="submit" disabled={savingProduct} className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all disabled:opacity-50">
                {savingProduct ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        )}
      </SlideDrawer>

      {/* Edit Category Drawer */}
      <SlideDrawer
        isOpen={!!editingCategory}
        onClose={() => { setEditingCategory(null); setEditCategoryName(""); }}
        title="Edit Category"
      >
        {editingCategory && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Category Name</label>
                <input type="text" value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="Category Name" />
              </div>

              <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 flex flex-col h-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-black uppercase tracking-widest">Assign Products</p>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedProductIds(dbProducts.filter(p => p.store_id === editingCategory.store_id).map(p => p.id))} className="text-[9px] font-black text-black uppercase tracking-widest hover:underline">Select All</button>
                    <button onClick={() => setSelectedProductIds([])} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:underline">Clear</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {dbProducts.filter(p => p.store_id === editingCategory.store_id).map(p => (
                    <label key={p.id} className="flex items-center gap-3 py-3 px-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:border-black transition-all group">
                      <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => toggleSelectProduct(p.id)} className="w-4 h-4 rounded-lg accent-black" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-black uppercase tracking-tight truncate">{p.name}</p>
                        <p className="text-[9px] font-black text-gray-400 font-mono italic">#{p.id.slice(0, 8)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={() => { setEditingCategory(null); setEditCategoryName(""); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Cancel</button>
              <button type="button" onClick={handleSaveRename} className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all">Save Changes</button>
            </div>
          </div>
        )}
      </SlideDrawer>
    </div>
  );
}
