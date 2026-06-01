import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, LayoutGrid, List, X, MoreVertical, ChevronDown, Check } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";
import SlideDrawer from "../components/common/SlideDrawer";

export default function InventoryEntities({ userProfile }) {
  const navigate = useNavigate();
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', unit_price: '', stock: '' });
  const [adding, setAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [savingProduct, setSavingProduct] = useState(false);

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [productStoreId, setProductStoreId] = useState("");
  
  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.store_name ==="All";
  const canManageProducts = isSuperAdmin || userProfile?.role === 'store_manager';

  const getDefaultStoreId = useCallback(() => {
    if (selectedStore && selectedStore !=="All") return selectedStore;
    return userProfile?.store_id || stores[0]?.id ||"";
  }, [selectedStore, userProfile?.store_id, stores]);

  useEffect(() => {
    if (isSuperAdmin) {
      supabase.from('stores').select('*').order('name').then(({ data }) => setStores(data || []));
    } else if (userProfile?.store_id) {
      setSelectedStore(userProfile.store_id);
    }
  }, [isSuperAdmin, userProfile]);

  useEffect(() => {
    if (showAddModal && !productStoreId) {
      setProductStoreId(getDefaultStoreId());
    }
  }, [showAddModal, productStoreId, getDefaultStoreId]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("store_inventory")
        .select('*, products(*), stores(name)')
        .order('products(name)', { ascending: true });

      if (!isSuperAdmin && userProfile?.store_id && userProfile.store_id !== 'All') {
        query = query.eq('store_id', userProfile.store_id);
      } else if (isSuperAdmin && selectedStore && selectedStore !== 'All' && selectedStore !== "") {
        query = query.eq('store_id', selectedStore);
      } else if (!isSuperAdmin && !userProfile?.store_id) {
        // If no store_id and not super admin, we probably shouldn't fetch yet or fetch all?
        // Let's assume we fetch nothing to be safe, or just skip filter
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = data.map(p => ({
        ...p,
        id: p.product_id,
        name: p.products?.name || '',
        unit_price: p.unit_price,
        stock: p.stock_quantity,
        store_name: p.stores?.name || '',
        status: p.stock_quantity === 0 ?"Out of Stock" : p.stock_quantity < 20 ?"Low Stock" :"Active"
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
  }, [selectedStore, userProfile, fetchProducts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      if (!productStoreId) throw new Error("Store is required");

      const customSku = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);
      
      // 1. Insert into global catalog (products)
      const { data: prodData, error: prodError } = await supabase.from("products").insert([{
        sku: customSku,
        name: newProduct.name,
        base_price: Number(newProduct.price)
      }]).select('id').single();
      
      if (prodError) throw prodError;
      const internalId = prodData.id;

      // 2. Insert into store inventory
      const { error: invError } = await supabase.from("store_inventory").insert([{
        store_id: productStoreId,
        product_id: internalId,
        stock_quantity: Number(newProduct.stock),
        unit_price: Number(newProduct.price)
      }]);
      if (invError) throw invError;

      setShowAddModal(false);
      setNewProduct({ name: '', unit_price: '', stock: '' });
      setProductStoreId("");
      fetchProducts();
    } catch (err) {
      alert('Failed to add product: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const filtered = dbProducts.filter(p => {
    return !search || p.name.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filtered.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filtered.map(p => p.id));
    }
  };



  const handleEditProduct = (p) => {
    setEditingProduct({ ...p });
  };

  const handleSaveProductEdit = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      // 1. Update global catalog (products)
      const { error: prodError } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          base_price: Number(editingProduct.price)
        })
        .eq('id', editingProduct.id);
      if (prodError) throw prodError;

      // 2. Update store inventory
      const { error: invError } = await supabase
        .from('store_inventory')
        .update({
          stock_quantity: Number(editingProduct.stock),
          unit_price: Number(editingProduct.price)
        })
        .eq('product_id', editingProduct.id)
        .eq('store_id', editingProduct.store_id);
      
      if (invError) throw invError;
      
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      alert('Failed to update product: ' + err.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const openAddProduct = () => {
    setProductStoreId(getDefaultStoreId());
    setNewProduct({ name: '', unit_price: '', stock: '' });
    setShowAddModal(true);
  };

  const statusBadge = (stock) => {
    const status = stock === 0 ?"Out of Stock" : stock < 20 ?"Low Stock" :"Active";
    const map = {
"Active":"bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
"Low Stock":"border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
"Out of Stock":"bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[status]}>{status}</span>;
  };

  if (loading && dbProducts.length === 0) {
    return <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Entities...</div>;
  }

  return (
    <div className="space-y-8 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Inventory Entities</h1>
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
              <button onClick={openAddProduct} className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg">
                <Plus size={14} /> Product
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSelectAll} 
            className="text-[10px] font-black text-black uppercase tracking-widest px-4 py-2 border border-gray-100 rounded-xl hover:bg-gray-50  flex items-center gap-2"
          >
            {selectedProductIds.length === filtered.length && filtered.length > 0 ? <X size={12} /> : <Check size={12} />}
            {selectedProductIds.length === filtered.length && filtered.length > 0 ?"Deselect All" :"Select All"}
          </button>
          {selectedProductIds.length > 0 && (
            <span className="text-[10px] font-black text-white bg-black px-3 py-2 rounded-xl uppercase tracking-widest">
              {selectedProductIds.length} Selected
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-52  placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-1">
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg  ${view ==="list" ?"bg-black text-white shadow-sm" :"text-gray-400 hover:text-black"}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg  ${view ==="grid" ?"bg-black text-white shadow-sm" :"text-gray-400 hover:text-black"}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {view ==="list" ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase font-mono">#{p.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-black tracking-tight">₹{p.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-[11px] font-black ${p.stock === 0 ?"text-gray-400 line-through" :"text-black"}`}>{p.stock}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusBadge(p.stock)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => navigate(`/inventory-entities/${p.id}`)} className="p-2 rounded-lg hover:bg-black hover:text-white  text-gray-400">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-xl hover:border-black/5   group cursor-pointer" onClick={() => isSuperAdmin && handleEditProduct(p)}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[11px] font-black text-black uppercase tracking-tight group-hover:text-black">{p.name}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">#{p.id.slice(0, 8)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/inventory-entities/${p.id}`); }} className="p-1 rounded-lg hover:bg-black hover:text-white text-gray-300"><MoreVertical size={14} /></button>
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

      <SlideDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Product"
        subtitle="Create new inventory entity"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleAddProduct} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Product Name</label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black uppercase tracking-tight" placeholder="Product Name" />
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Store</label>
                  <select value={productStoreId} onChange={e => setProductStoreId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black uppercase tracking-tight">
                    <option value="" disabled>Select Store</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                  <input required type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, unit_price: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black tracking-tight" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Stock</label>
                  <input required type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black tracking-tight" placeholder="0" />
                </div>
              </div>
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Cancel</button>
              <button type="submit" disabled={adding || !productStoreId} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                {adding ? 'Processing...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>

      <SlideDrawer
        isOpen={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
        subtitle="Modify inventory entity"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleSaveProductEdit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Product Name</label>
                <input required type="text" value={editingProduct?.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black uppercase tracking-tight" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                  <input required type="number" value={editingProduct?.price || ''} onChange={e => setEditingProduct({ ...editingProduct, unit_price: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black tracking-tight" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Stock</label>
                  <input required type="number" value={editingProduct?.stock || ''} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black  text-[11px] font-black tracking-tight" />
                </div>
              </div>
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Cancel</button>
              <button type="submit" disabled={savingProduct} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                {savingProduct ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>
    </div>
  );
}

