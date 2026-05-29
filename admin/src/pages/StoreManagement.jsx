import { useState, useEffect, useCallback } from "react";
import { UserPlus, Edit2, X, Save, CheckCircle2, AlertCircle, Info, ArrowRightLeft, Search, Loader2, Plus, Building2, Percent, ChevronDown } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { supabaseAdmin } from "../server/supabase/supabaseAdmin";
import { ROLES_FOR_SUPER_ADMIN, ROLES_FOR_ADMIN } from "../server/database/mocks/constants";

import { generateId, ID_RULES } from "../server/supabase/idGenerator";

export default function StoreManagement({ userProfile }) {
    const isSuperAdmin = userProfile?.role === 'super_admin';
    const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;

    // Define which roles can be created by the current user
    const availableRoles = isSuperAdmin
        ? ROLES_FOR_SUPER_ADMIN
        : isAdmin
            ? ROLES_FOR_ADMIN
            : [];

    const [users, setUsers] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [editingStore, setEditingStore] = useState(null);
    const [activeDrawer, setActiveDrawer] = useState('transfer');

    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({
        emailPrefix: '',
        domain: '@lenscare.in',
        password: 'Welcome@123',
        useDefaultPassword: true,
        role: 'store_manager',
        store_id: ''
    });

    const [stores, setStores] = useState([]);
    const [productStocks, setProductStocks] = useState([]);
    const [selectedStockStore, setSelectedStockStore] = useState('');

    const [newStore, setNewStore] = useState({ name: '', address: '', gst_no: '', phone_no: '' });
    const [creatingNewUser, setCreatingNewUser] = useState(false);
    const [transferringStock, setTransferringStock] = useState(false);
    const [creatingStore, setCreatingStore] = useState(false);
    const [newVoucher, setNewVoucher] = useState({ voucher_no: '' });
    const [creatingVoucher, setCreatingVoucher] = useState(false);
    const [transferring, setTransferring] = useState(false);
    const [transferData, setTransferData] = useState({
        sourceStore: 'All',
        destStore: '',
        destCategoryId: '',
        productId: '',
        productName: '',
        qty: 1
    });
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [destCategories, setDestCategories] = useState([]);

    // Tax Settings state
    const [taxCategories, setTaxCategories] = useState([]);
    const [taxSearch, setTaxSearch] = useState("");
    const [editingTaxCat, setEditingTaxCat] = useState(null);
    const [taxForm, setTaxForm] = useState({ cgst: 0, sgst: 0, igst: 0 });
    const [savingTax, setSavingTax] = useState(false);
    const [taxStoreId, setTaxStoreId] = useState("");

    const [notification, setNotification] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 1000);
    };

    const closeDrawer = () => {
        setEditingUser(null);
        setEditingStore(null);
        setNewStore({ name: '', address: '', gst_no: '', phone_no: '' });
    };

    useEffect(() => {
        fetchStores();
        fetchUsers();
        fetchVouchers();
        fetchProductStocks();
    }, []);

    const fetchTaxCategories = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("products_category")
                .select("*")
                .eq("store_id", taxStoreId)
                .order("name");
            if (error) throw error;
            setTaxCategories(data || []);
        } catch (err) {
            console.error("Error fetching tax categories:", err.message);
        }
    }, [taxStoreId]);

    useEffect(() => {
        if (activeDrawer === 'tax' && taxStoreId) {
            fetchTaxCategories();
        }
    }, [activeDrawer, taxStoreId, fetchTaxCategories]);

    const handleEditTaxClick = (cat) => {
        setEditingTaxCat(cat);
        setTaxForm({
            cgst: cat.cgst || 0,
            sgst: cat.sgst || 0,
            igst: cat.igst || 0
        });
    };

    const handleSaveTax = async (e) => {
        e.preventDefault();
        setSavingTax(true);
        try {
            const { error } = await supabase
                .from("products_category")
                .update({
                    cgst: Number(taxForm.cgst),
                    sgst: Number(taxForm.sgst),
                    igst: Number(taxForm.igst)
                })
                .eq("id", editingTaxCat.id);

            if (error) throw error;
            showNotification("Tax rates updated successfully!", "success");
            setEditingTaxCat(null);
            fetchTaxCategories();
        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setSavingTax(false);
        }
    };

    async function fetchProductStocks() {
        try {
            const { data, error } = await supabase
                .from('products_list')
                .select('id, name, stock, store_id, store(name)')
                .order('name', { ascending: true });
            if (!error && data) {
                setProductStocks(data);
            }
        } catch (err) {
            console.error("Error fetching stocks:", err);
        }
    }

    async function fetchVouchers() {
        try {
            const { data, error } = await supabase.from('voucher').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                setVouchers(data);
            }
        } catch (err) {
            console.error("Error fetching vouchers:", err);
        }
    }

    async function fetchStores() {
        try {
            const { data, error } = await supabase.from('store').select('*, store_tax_rates(sgst, cgst, igst)').order('name');
            if (!error && data) {
                setStores(data);
                if (data.length > 0) {
                   setNewUser(prev => ({ ...prev, store_id: data[0].id }));
                   setTransferData(prev => ({ ...prev, sourceStore: data[0].id }));
                   setTaxStoreId(data[0].id);
                   setSelectedStockStore(data[0].id);
                }
            }
        } catch (err) {
            console.error("Error fetching stores:", err);
        }
    }

    async function fetchUsers() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('auth_users')
                .select('*, store(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error("Error fetching users:", err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateUser(e) {
        e.preventDefault();
        try {
            const { error } = await supabaseAdmin
                .from('auth_users')
                .update({
                    role: editingUser.role,
                    store_id: editingUser.store_id || null,
                    status: editingUser.status
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            closeDrawer();
            fetchUsers();
            showNotification("User updated successfully!", "success");
        } catch (err) {
            console.error(err);
            showNotification(err.message || "Failed to update user.", "error");
        }
    }

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const finalEmail = `${newUser.emailPrefix}${newUser.domain}`.toLowerCase();
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: finalEmail,
                password: newUser.password,
                email_confirm: true
            });

            if (authError) throw authError;

            setTimeout(async () => {
                const { error: updateError } = await supabaseAdmin
                    .from('auth_users')
                    .update({
                        role: newUser.role,
                        store_id: newUser.store_id || null,
                        must_reset_password: true
                    })
                    .eq('id', authData.user.id);

                if (updateError) {
                    console.error("Could not set final role:", updateError.message);
                    showNotification("Account created, but updating role failed. Please edit manually.", "warning");
                } else {
                    showNotification(`User ${finalEmail} successfully created!`, "success");
                    setCreatingNewUser(false);
                    fetchUsers();
                }

                setCreating(false);
                setNewUser({ 
                    emailPrefix: '', 
                    domain: '@lenscare.in',
                    password: 'Welcome@123', 
                    useDefaultPassword: true, 
                    role: 'store_manager', 
                    store_id: stores[0]?.id || '' 
                });
            }, 1500);

        } catch (err) {
            console.error(err);
            showNotification(err.message || "Failed to create user.", "error");
            setCreating(false);
        }
    };

    const handleCancelEdit = () => {
        closeDrawer();
        showNotification("Edit canceled", "info");
    };

    const handleSaveStore = async (e) => {
        e.preventDefault();
        setCreatingStore(true);
        try {
            if (editingStore) {
                const { error } = await supabase
                    .from('store')
                    .update({
                        name: newStore.name,
                        address: newStore.address?.trim() || null,
                        gst_no: newStore.gst_no?.trim() || null,
                        phone_no: newStore.phone_no?.trim() || null
                    })
                    .eq('id', editingStore.id);
                if (error) throw error;
                showNotification("Store updated successfully!", "success");
            } else {
                const { data, error } = await supabase.from('store').insert([{
                    name: newStore.name,
                    address: newStore.address?.trim() || null,
                    gst_no: newStore.gst_no?.trim() || null,
                    phone_no: newStore.phone_no?.trim() || null
                }]).select('id').single();
                if (error) throw error;
                showNotification(`Store created successfully! ID: ${data.id}`, "success");
            }
            closeDrawer();
            setNewStore({ name: '', address: '', gst_no: '', phone_no: '' });
            fetchStores();
        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setCreatingStore(false);
            setEditingStore(null);
        }
    };

    const handleOpenEditStore = (store) => {
        setEditingStore(store);
        setNewStore({ 
            name: store.name || '', 
            address: store.address || '', 
            gst_no: store.gst_no || '',
            phone_no: store.phone_no || ''
        });
    };

    const handleProductSearch = async (query) => {
        setProductSearch(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setSearchingProducts(true);
        try {
            const { data, error } = await supabase
                .from('products_list')
                .select('id, name, stock')
                .ilike('name', `%${query}%`)
                .limit(10);
            if (error) throw error;
            setSearchResults(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingProducts(false);
        }
    };

    const handleDestStoreChange = async (storeId) => {
        setTransferData({ ...transferData, destStore: storeId, destCategoryId: '' });
        try {
            const { data } = await supabase
                .from('products_category')
                .select('id, name')
                .eq('store_id', storeId)
                .order('name');
            setDestCategories(data || []);
        } catch (err) {
            console.error("Error fetching destination categories:", err);
            setDestCategories([]);
        }
    };

    const handleTransferStock = async (e) => {
        e.preventDefault();
        if (!transferData.productId) {
            showNotification("Please select a valid product.", "error");
            return;
        }
        if (!transferData.destCategoryId) {
            showNotification("Please select a destination category.", "error");
            return;
        }
        if (transferData.sourceStore === transferData.destStore) {
            showNotification("Source and destination stores must be different.", "error");
            return;
        }
        setTransferring(true);
        try {
            // 1. Fetch Source Product Details
            const { data: srcProd, error: srcErr } = await supabase.from('products_list')
                .select('*, products_category(*)')
                .eq('id', transferData.productId)
                .single();

            if (srcErr || !srcProd) throw new Error("Could not fetch source product details");
            if (srcProd.stock < transferData.qty) throw new Error(`Insufficient stock in source store. Available: ${srcProd.stock}`);

            // 2. Check if Product exists in Destination Store
            const { data: destProd } = await supabase.from('products_list')
                .select('id, stock')
                .ilike('name', srcProd.name)
                .eq('store_id', transferData.destStore)
                .maybeSingle();

            if (destProd) {
                // Update existing product stock
                const { error: updateDestErr } = await supabase.from('products_list')
                    .update({ stock: destProd.stock + transferData.qty })
                    .eq('id', destProd.id);
                if (updateDestErr) throw new Error("Failed to update destination product stock");
            } else {
                // Create new product in selected category
                const newId = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);
                const { error: insertDestErr } = await supabase.from('products_list')
                    .insert([{
                        id: newId,
                        name: srcProd.name,
                        category_id: transferData.destCategoryId,
                        price: srcProd.price || 0,
                        stock: transferData.qty,
                        store_id: transferData.destStore,
                        sales: 0,
                        hsn_code: srcProd.hsn_code || "",
                        item_detail: srcProd.item_detail || ""
                    }]);
                if (insertDestErr) throw new Error("Failed to create product in destination store: " + insertDestErr.message);
            }

            // 3. Deduct Stock from Source
            const { error: updateSrcErr } = await supabase.from('products_list')
                .update({ stock: srcProd.stock - transferData.qty })
                .eq('id', srcProd.id);
            if (updateSrcErr) throw new Error("Failed to deduct stock from source product");

            // Success
            const destStoreName = stores.find(s => s.id === transferData.destStore)?.name || "Destination Store";
            const srcStoreName = stores.find(s => s.id === transferData.sourceStore)?.name || "Source Store";

            showNotification(`Successfully transferred ${transferData.qty} ${transferData.productName}(s) from ${srcStoreName} to ${destStoreName}!`, "success");
            setTransferringStock(false);
            setTransferData({ sourceStore: stores[0]?.id || 'All', destStore: '', destCategoryId: '', productId: '', productName: '', qty: 1 });
            setProductSearch('');
            setSearchResults([]);
            setDestCategories([]);
            
            // Optionally fetch products again to update the stock table in background
            fetchProductStocks();
        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setTransferring(false);
        }
    };

    const drawerActions = [
        { key: 'transfer', label: 'Stock', icon: ArrowRightLeft },
        { key: 'user', label: "User's", icon: UserPlus },
        { key: 'store', label: "Store's", icon: Building2 },
        { key: 'tax', label: "Tax Settings", icon: Percent },
        { key: 'voucher', label: "Voucher's", icon: Plus },
    ];

    const drawerTitle =
        activeDrawer === 'transfer' ? 'Stock Management' :
        activeDrawer === 'user' ? "User Management" :
        activeDrawer === 'store' ? "Store Management" :
        activeDrawer === 'tax' ? "Tax Settings" :
        activeDrawer === 'voucher' ? "Voucher Management" :
        'Select Action';

    const drawerDescription =
        activeDrawer === 'transfer' ? 'View current stock, manage inventory, and transfer products.' :
        activeDrawer === 'user' ? 'View users, update access, and manage the team.' :
        activeDrawer === 'store' ? 'View, create, and edit store locations from one place.' :
        activeDrawer === 'tax' ? 'Manage GST rates for product categories across stores.' :
        activeDrawer === 'voucher' ? 'View, create, and manage voucher codes.' :
        '';

    const handleDrawerActionSelect = (drawerKey) => {
        if (drawerKey === 'user') {
            setEditingUser(null);
        }
        if (drawerKey === 'store') {
            setEditingStore(null);
        }
        if (drawerKey === 'voucher') {
            setNewVoucher({ voucher_no: '' });
        }
        if (drawerKey === 'transfer') {
            setProductSearch('');
            setSearchResults([]);
        }
        setActiveDrawer(drawerKey);
    };

    return (
        <div className="space-y-10 relative animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col gap-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
                    <div>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Store</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Infrastructure & Administrative Control</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
                        <Building2 size={16} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isSuperAdmin ? "Global Master" : "Regional Command"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 items-start">
                    <aside className="bg-white rounded-[32px] border border-gray-100 p-4 lg:sticky lg:top-0 shadow-sm">
                        <div className="px-4 py-4 mb-4 border-b border-gray-50">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Control Plane</p>
                            <p className="text-sm font-black text-black mt-1 uppercase tracking-tight">Select Workspace</p>
                        </div>
                        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                            {drawerActions.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => handleDrawerActionSelect(key)}
                                    className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeDrawer === key
                                        ? 'bg-black text-white shadow-xl scale-[1.02]'
                                        : 'bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-black hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon size={16} strokeWidth={3} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <section className="bg-white rounded-[40px] border border-gray-100 p-8 md:p-10 min-h-[600px] shadow-sm flex flex-col relative overflow-hidden">
                        <div className="flex items-start justify-between gap-4 mb-10 pb-6 border-b border-gray-50">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Active Operation</p>
                                <h2 className="text-3xl font-black text-black mt-2 uppercase tracking-tighter">{drawerTitle}</h2>
                                <p className="text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-widest opacity-80">{drawerDescription}</p>
                            </div>
                        </div>

                        {activeDrawer === 'transfer' && (
                            <div className="space-y-6 flex-1 flex flex-col">
                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-2xl bg-black text-white shadow-lg">
                                            <Building2 size={20} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Location</p>
                                            <div className="relative group">
                                                <select
                                                    value={selectedStockStore}
                                                    onChange={(e) => setSelectedStockStore(e.target.value)}
                                                    className="appearance-none bg-transparent text-lg font-black text-black uppercase focus:outline-none cursor-pointer pr-10 mt-1 tracking-tight"
                                                >
                                                    {stores.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setTransferringStock(true);
                                            setTransferData({
                                                sourceStore: selectedStockStore,
                                                destStore: '',
                                                destCategoryId: '',
                                                productId: '',
                                                productName: '',
                                                qty: 1
                                            });
                                            setProductSearch('');
                                            setSearchResults([]);
                                        }}
                                        className="flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        <ArrowRightLeft size={16} strokeWidth={3} /> Transfer Inventory
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto border border-gray-50 rounded-[32px]">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                                            <tr>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Inventory Entity</th>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Location Link</th>
                                                <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Available Volume</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {productStocks.filter(p => p.store_id === selectedStockStore).map((p) => (
                                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <p className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</p>
                                                        <p className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase tracking-tighter">ID: {p.id.slice(0,12)}</p>
                                                    </td>
                                                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{p.store?.name || 'Central Archive'}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${p.stock === 0 ? "bg-gray-100 text-gray-300 line-through" : p.stock < 10 ? "border border-black text-black" : "bg-black text-white shadow-sm"}`}>
                                                            {p.stock} Units
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {productStocks.filter(p => p.store_id === selectedStockStore).length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-8 py-20 text-center">
                                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Zero Inventory Presence</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeDrawer === 'user' && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center px-2">
                                    <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Access Manifest</h3>
                                    <button
                                        onClick={() => {
                                            setCreatingNewUser(true);
                                            setNewUser({ email: '', password: '', role: 'store_manager', store_id: stores[0]?.id || '' });
                                        }}
                                        className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                                    >
                                        <Plus size={14} strokeWidth={3} /> Register Operator
                                    </button>
                                </div>
                                <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Operator Identity</th>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Clearance / Status</th>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Location Assignment</th>
                                                <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {loading ? (
                                                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Authenticating Manifest...</td></tr>
                                            ) : users.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="text-[11px] font-black text-black uppercase tracking-tight">{u.email}</div>
                                                        <div className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase tracking-tighter">ID: {u.id.slice(0,12)}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[10px] font-black text-black uppercase tracking-widest">{u.role.replace('_', ' ')}</span>
                                                        <div className={`flex items-center gap-1.5 text-[9px] mt-1 font-bold uppercase tracking-wider ${u.status === 'inactive' ? 'text-gray-300 line-through' : 'text-gray-400'}`}>
                                                            <div className={`w-1 h-1 rounded-full ${u.status === 'inactive' ? 'bg-gray-200' : 'bg-black animate-pulse'}`} />
                                                            {u.status || 'Active'}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        {u.store_id ? stores.find(s => s.id === u.store_id)?.name || 'Store Not Found' : 'Global Access'}
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button
                                                            onClick={() => setEditingUser(u)}
                                                            className="p-2.5 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit2 size={16} strokeWidth={3} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeDrawer === 'store' && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center px-2">
                                    <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Operational Units</h3>
                                    <button
                                        onClick={() => {
                                            setEditingStore({});
                                            setNewStore({ name: '', address: '', gst_no: '', phone_no: '' });
                                        }}
                                        className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                                    >
                                        <Plus size={14} strokeWidth={3} /> Register Location
                                    </button>
                                </div>
                                <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity / GSTIN</th>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Communications / Address</th>
                                                <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stores.map((store) => (
                                                <tr key={store.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="text-[11px] font-black text-black uppercase tracking-tight">{store.name}</div>
                                                        <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest">{store.gst_no || 'Non-Taxable Entity'}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-[10px] font-black text-black tracking-widest uppercase">{store.phone_no || 'No Contact Link'}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight truncate max-w-xs">{store.address || 'Location Hidden'}</div>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button
                                                            onClick={() => handleOpenEditStore(store)}
                                                            className="p-2.5 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit2 size={16} strokeWidth={3} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeDrawer === 'voucher' && (
                            <div className="space-y-10">
                                <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Promotional Vector</th>
                                                <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Generation Timeline</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {vouchers.map((v) => (
                                                <tr key={v.id || v.voucher_no} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-8 py-6 font-mono font-black text-black text-xs tracking-widest uppercase">{v.voucher_no}</td>
                                                    <td className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(v.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                            {vouchers.length === 0 && (
                                                <tr><td colSpan={2} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">No Active Vectors</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-gray-50 rounded-[32px] p-10 border border-gray-100">
                                    <div className="mb-8">
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">Generate Vector</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Append New Promotional Identity</p>
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setCreatingVoucher(true);
                                        try {
                                            const { error } = await supabase.from('voucher').insert([newVoucher]);
                                            if (error) throw error;
                                            showNotification("Voucher created successfully!", "success");
                                            closeDrawer();
                                            setNewVoucher({ voucher_no: '' });
                                            fetchVouchers();
                                        } catch (err) {
                                            showNotification(err.message, "error");
                                        } finally {
                                            setCreatingVoucher(false);
                                        }
                                    }} className="space-y-6 max-w-md">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Voucher Designation</label>
                                            <input required type="text" value={newVoucher.voucher_no} onChange={e => setNewVoucher({ ...newVoucher, voucher_no: e.target.value })} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[11px] font-mono font-black tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all uppercase" placeholder="VCR-ALPHA-X" />
                                        </div>
                                        <div className="pt-4 flex items-center gap-3">
                                            <button type="button" onClick={closeDrawer} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
                                            <button type="submit" disabled={creatingVoucher} className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                                                {creatingVoucher ? 'Syncing...' : 'Commit Code'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeDrawer === 'tax' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[#000000]/5 text-[#000000]">
                                            <Building2 size={18} />
                                        </div>
                                        <select
                                            value={taxStoreId}
                                            onChange={(e) => setTaxStoreId(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-[#000000] focus:outline-none cursor-pointer min-w-[150px]"
                                        >
                                            {stores.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={taxSearch}
                                            onChange={e => setTaxSearch(e.target.value)}
                                            placeholder="Search categories..."
                                            className="input-field pl-9 text-xs py-2 w-48"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100">
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">CGST %</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">SGST %</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">IGST %</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {taxCategories.filter(c => c.name.toLowerCase().includes(taxSearch.toLowerCase())).map((cat) => (
                                                <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                                                    <td className="px-6 py-4 font-bold text-[#000000]">{cat.name}</td>
                                                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{cat.cgst ?? 0}%</td>
                                                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{cat.sgst ?? 0}%</td>
                                                    <td className="px-6 py-4 text-center text-gray-600 font-medium">{cat.igst ?? 0}%</td>
                                                    <td className="px-6 py-4 text-center">
                                                        {(cat.cgst !== null && cat.sgst !== null) ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wider">
                                                                <CheckCircle2 size={10} /> Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                                                <AlertCircle size={10} /> Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleEditTaxClick(cat)}
                                                            className="p-1.5 text-gray-400 hover:text-[#333333] hover:bg-[#333333]/10 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {taxCategories.length === 0 && (
                                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400 text-sm italic">No categories found for this store.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {(editingUser || editingTaxCat || editingStore !== null) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300 border border-white/20">
                        {editingUser && (
                            <>
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Modify Access</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{editingUser.email}</p>
                                    </div>
                                    <button onClick={handleCancelEdit} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                                        <X size={24} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleUpdateUser} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Clearance Level</label>
                                            <div className="relative group">
                                                <select
                                                    value={editingUser.role}
                                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                                    className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                                >
                                                    {availableRoles.map(r => (
                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                    ))}
                                                    {isSuperAdmin && (
                                                        <option value="super_admin">Super Admin</option>
                                                    )}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Deployment Zone</label>
                                            <div className="relative group">
                                                <select
                                                    value={editingUser.store_id || ''}
                                                    onChange={e => setEditingUser({ ...editingUser, store_id: e.target.value })}
                                                    className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                                >
                                                    <option value="">Global Command</option>
                                                    {stores.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Operational State</label>
                                            <div className="relative group">
                                                <select
                                                    value={editingUser.status || 'active'}
                                                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                                                    className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                                >
                                                    <option value="active">Active Entity</option>
                                                    <option value="inactive">Suspended State</option>
                                                </select>
                                                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                            </div>
                                        </div>
                                        <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                                            <button type="button" onClick={handleCancelEdit} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
                                            <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                                                Commit Specs
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}

                        {editingStore !== null && (
                            <>
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="text-2xl font-black text-black uppercase tracking-tighter">{editingStore.id ? 'Edit Unit' : 'Initialize Unit'}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Infrastructure Configuration</p>
                                    </div>
                                    <button onClick={() => { setEditingStore(null); setNewStore({ name: '', address: '', gst_no: '', phone_no: '' }); }} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                                        <X size={24} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleSaveStore} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Entity Name</label>
                                            <input required type="text" value={newStore.name} onChange={e => setNewStore({ ...newStore, name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all" placeholder="Store Identification..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">GST Identification</label>
                                                <input type="text" value={newStore.gst_no} onChange={e => setNewStore({ ...newStore, gst_no: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all uppercase" placeholder="36AANCB..." />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Contact Link</label>
                                                <input type="text" value={newStore.phone_no} onChange={e => setNewStore({ ...newStore, phone_no: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all" placeholder="+91 ..." />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Operational Address</label>
                                            <input required type="text" value={newStore.address} onChange={e => setNewStore({ ...newStore, address: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all" placeholder="Physical location Link..." />
                                        </div>
                                        <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                                            <button type="button" onClick={() => { setEditingStore(null); setNewStore({ name: '', address: '', gst_no: '', phone_no: '' }); }} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
                                            <button type="submit" disabled={creatingStore} className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                                                {creatingStore ? 'Syncing...' : (editingStore.id ? 'Update Unit' : 'Deploy Unit')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}

                        {editingTaxCat && (
                            <>
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Tax Protocol</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Classification: {editingTaxCat.name}</p>
                                    </div>
                                    <button onClick={() => setEditingTaxCat(null)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                                        <X size={24} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleSaveTax} className="space-y-8">
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">CGST Coefficient (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={taxForm.cgst}
                                                    onChange={e => setTaxForm({ ...taxForm, cgst: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[18px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SGST Coefficient (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={taxForm.sgst}
                                                    onChange={e => setTaxForm({ ...taxForm, sgst: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[18px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">IGST Coefficient (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={taxForm.igst}
                                                    onChange={e => setTaxForm({ ...taxForm, igst: e.target.value })}
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[18px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                                            <button type="button" onClick={() => setEditingTaxCat(null)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Discard</button>
                                            <button type="submit" disabled={savingTax} className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                                                {savingTax ? "Syncing..." : "Update Vector"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {creatingNewUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300 border border-white/20 max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">New Operator</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Access Credential Generation</p>
                            </div>
                            <button onClick={() => { setCreatingNewUser(false); setNewUser({ emailPrefix: '', domain: '@lenscare.in', password: 'Welcome@123', useDefaultPassword: true, role: 'store_manager', store_id: stores[0]?.id || '' }); }} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleCreateUser} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email Designation</label>
                                    <div className="flex bg-gray-50 border border-gray-100 rounded-2xl focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black focus-within:bg-white transition-all overflow-hidden">
                                        <input
                                            type="text"
                                            required
                                            value={newUser.emailPrefix}
                                            onChange={e => setNewUser({ ...newUser, emailPrefix: e.target.value })}
                                            placeholder="operator"
                                            className="w-full px-6 py-4 bg-transparent text-[11px] font-bold tracking-widest outline-none"
                                        />
                                        <div className="bg-gray-100 px-4 py-4 flex items-center justify-center border-l border-gray-200">
                                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                                {newUser.domain}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Domain</label>
                                    <select
                                        value={newUser.domain}
                                        onChange={e => setNewUser({ ...newUser, domain: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="@lenscare.in">@lenscare.in</option>
                                        <option value="@warehouse.lenscare.in">@warehouse.lenscare.in</option>
                                    </select>
                                </div>
                                <div className="space-y-6 p-6 bg-gray-50 rounded-[32px] border border-gray-100 shadow-inner">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Security Vector</label>
                                        <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => setNewUser({ ...newUser, useDefaultPassword: true, password: 'Welcome@123' })}
                                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${newUser.useDefaultPassword ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                                            >
                                                Standard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNewUser({ ...newUser, useDefaultPassword: false, password: '' })}
                                                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${!newUser.useDefaultPassword ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                    </div>

                                    {newUser.useDefaultPassword ? (
                                        <div className="flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-dashed border-gray-200">
                                            <span className="text-[11px] font-mono font-black text-black uppercase tracking-widest">Welcome@123</span>
                                            <span className="text-[8px] font-black text-white bg-black px-2 py-0.5 rounded-full uppercase tracking-tighter">System Standard</span>
                                        </div>
                                    ) : (
                                        <input
                                            required
                                            type="password"
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Assign private vector..."
                                            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                                        />
                                    )}
                                    <p className="text-[9px] text-gray-400 italic font-bold uppercase tracking-tight text-center">Protocol: Reset required on initial access.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assigned Clearance</label>
                                    <div className="relative group">
                                        <select
                                            value={newUser.role}
                                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                        >
                                            <option value="" disabled>Select Clearance</option>
                                            {availableRoles.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assigned Unit</label>
                                    <div className="relative group">
                                        <select
                                            value={newUser.store_id || ''}
                                            onChange={e => setNewUser({ ...newUser, store_id: e.target.value })}
                                            className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                        >
                                            <option value="">No Unit Assigned</option>
                                            {stores.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="pt-8 flex flex-col gap-3 border-t border-gray-50">
                                    <button
                                        type="submit"
                                        disabled={creating || availableRoles.length === 0}
                                        className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                                    >
                                        {creating ? "Syncing..." : "Initialize Account"}
                                    </button>
                                    <button type="button" onClick={() => { setCreatingNewUser(false); setNewUser({ email: '', password: '', role: 'store_manager', store_id: stores[0]?.id || '' }); }} className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors">Discard Operation</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {transferringStock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300 border border-white/20 max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Inventory Vector</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cross-Unit Stock Transfer</p>
                            </div>
                            <button onClick={() => { setTransferringStock(false); setTransferData({ sourceStore: stores[0]?.id || 'All', destStore: '', destCategoryId: '', productId: '', productName: '', qty: 1 }); setProductSearch(''); setSearchResults([]); }} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleTransferStock} className="space-y-8">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Origin Entity</label>
                                        <div className="relative group">
                                            <select
                                                value={transferData.sourceStore}
                                                onChange={e => setTransferData({ ...transferData, sourceStore: e.target.value })}
                                                className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                                required
                                            >
                                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Destination Entity</label>
                                        <div className="relative group">
                                            <select
                                                value={transferData.destStore}
                                                onChange={e => handleDestStoreChange(e.target.value)}
                                                className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                                required
                                            >
                                                <option value="" disabled>Select Target</option>
                                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                                {transferData.destStore && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Target Classification</label>
                                        <div className="relative group">
                                            <select
                                                value={transferData.destCategoryId}
                                                onChange={e => setTransferData({ ...transferData, destCategoryId: e.target.value })}
                                                className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12 disabled:opacity-20"
                                                disabled={destCategories.length === 0}
                                                required
                                            >
                                                <option value="">Select Classification</option>
                                                {destCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                        </div>
                                        {destCategories.length === 0 && (
                                            <p className="text-[9px] text-black font-black uppercase tracking-widest mt-2 px-2 italic">Infrastructure Error: No Categories Linked.</p>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Entity Selection</label>
                                    <div className="relative group">
                                        <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" strokeWidth={3} />
                                        <input
                                            type="text"
                                            value={productSearch}
                                            onChange={e => handleProductSearch(e.target.value)}
                                            placeholder="Identify Entity..."
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                        />
                                        {searchingProducts && <Loader2 size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-black animate-spin" strokeWidth={3} />}
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-20 w-full mt-3 bg-white border border-gray-100 rounded-3xl shadow-2xl max-h-60 overflow-y-auto p-2 animate-in fade-in zoom-in-95 duration-200">
                                            {searchResults.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setTransferData({ ...transferData, productId: p.id, productName: p.name });
                                                        setProductSearch(p.name);
                                                        setSearchResults([]);
                                                    }}
                                                    className="px-5 py-4 hover:bg-black hover:text-white rounded-2xl cursor-pointer transition-all flex justify-between items-center group"
                                                >
                                                    <span className="text-[11px] font-black uppercase tracking-tight">{p.name}</span>
                                                    <span className="text-[9px] font-bold uppercase opacity-60 group-hover:opacity-100">Stock: {p.stock}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {transferData.productId && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full">
                                            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Locked: {transferData.productName}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Transfer Volume</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={transferData.qty}
                                        onChange={e => setTransferData({ ...transferData, qty: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[18px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                    />
                                </div>
                                <div className="pt-8 flex flex-col gap-3 border-t border-gray-50">
                                    <button
                                        type="submit"
                                        disabled={transferring}
                                        className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                                    >
                                        {transferring ? "Syncing..." : "Commit Vector Transfer"}
                                    </button>
                                    <button type="button" onClick={() => { setTransferringStock(false); setTransferData({ sourceStore: stores[0]?.id || 'All', destStore: '', destCategoryId: '', productId: '', productName: '', qty: 1 }); setProductSearch(''); setSearchResults([]); }} className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors">Abort Operation</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-[70] pointer-events-none">
                    <style>{`
                        @keyframes progress-shrink {
                            from { width: 100%; }
                            to { width: 0%; }
                        }
                    `}</style>
                    <div className="bg-white rounded-3xl shadow-2xl flex flex-col w-[400px] border border-gray-100 overflow-hidden relative pointer-events-auto animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center p-6 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                {notification.type === 'success' ? (
                                    <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-lg">
                                        <CheckCircle2 size={16} className="text-white" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                                        <AlertCircle size={16} className="text-black" />
                                    </div>
                                )}
                                <span className="font-black text-black text-[11px] uppercase tracking-widest capitalize">{notification.type} Event</span>
                            </div>
                            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-black transition-colors">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="p-6 text-black text-xs font-bold uppercase tracking-wide opacity-80 leading-relaxed">
                            {notification.message}
                        </div>
                        <div className="h-1 bg-gray-50 w-full">
                            <div
                                className="h-full bg-black"
                                style={{ animation: "progress-shrink 1s linear forwards" }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
