import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
    Building2, FlaskConical, ArrowRightLeft, Percent, Plus, 
    Search, Edit2, CheckCircle2, AlertCircle, 
    ChevronDown
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { supabaseAdmin } from "../server/supabase/supabaseAdmin";
import SlideDrawer from '../components/common/SlideDrawer';
import { isValidUUID } from "../utils/securityUtils";

export default function Infrastructure({ userProfile }) {
    const location = useLocation();
    const navigate = useNavigate();
    const searchParams = new URLSearchParams(location.search);

    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "stores");
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchingProducts, setSearchingProducts] = useState(false);

    // Common State
    const [stores, setStores] = useState([]);
    const [labs, setLabs] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Store State
    const [editingStore, setEditingStore] = useState(null);
    const [storeForm, setStoreForm] = useState({ name: '', address: '', gst_no: '', phone: '', email: '' });

    // Lab State
    const [editingLab, setEditingLab] = useState(null);
    const [labForm, setLabForm] = useState({ name: '', address: '', phone: '', email: '' });

    // Inventory State
    const [productStocks, setProductStocks] = useState([]);
    const [selectedStockStore, setSelectedStockStore] = useState('');
    const [transferringStock, setTransferringStock] = useState(false);
    const [transferData, setTransferData] = useState({
        sourceStore: '',
        destStore: '',
        productId: '',
        productName: '',
        quantity: 1
    });
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isTransferring, setIsTransferring] = useState(false);

    // Tax State
    const [taxCategories, setTaxCategories] = useState([]);
    const [editingTaxCat, setEditingTaxCat] = useState(null);
    const [taxForm, setTaxForm] = useState({ cgst: 0, sgst: 0, igst: 0 });
    const [savingTax, setSavingTax] = useState(false);

    // Voucher State
    const [vouchers, setVouchers] = useState([]);
    const [newVoucher, setNewVoucher] = useState({ voucher_no: '' });
    const [creatingVoucher, setCreatingVoucher] = useState(false);

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
    }, [location.search]);

    const setTab = (tab) => {
        navigate(`/infrastructure?tab=${tab}`);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        setLoading(true);
        try {
            const [{ data: sData }, { data: lData }] = await Promise.all([
                supabaseAdmin.from('stores').select('*').order('name'),
                supabaseAdmin.from('labs').select('*').order('name')
            ]);
            if (sData) {
                setStores(sData);
                if (sData.length > 0 && !selectedStockStore) {
                    setSelectedStockStore(sData[0].id);
                }
            }
            if (lData) setLabs(lData);
            
            fetchProductStocks();
            fetchVouchers();
            fetchTaxCategories();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchProductStocks() {
        try {
            const { data, error } = await supabaseAdmin
                .from('store_inventory')
                .select('stock_quantity, store_id, products(id, name)')
                .order('products(name)', { ascending: true });
            if (!error && data) {
                const mapped = data.map(d => ({
                    id: d.products?.id,
                    name: d.products?.name,
                    stock: d.stock_quantity,
                    store_id: d.store_id,
                }));
                setProductStocks(mapped);
            }
        } catch (err) {
            console.error("Error fetching stocks:", err);
        }
    }

    async function fetchVouchers() {
        try {
            const { data, error } = await supabase.from('voucher').select('*').order('created_at', { ascending: false });
            if (!error && data) setVouchers(data);
        } catch (err) {
            console.error("Error fetching vouchers:", err);
        }
    }

    const fetchTaxCategories = async () => {
        try {
            const { data, error } = await supabase.from('product_categories').select("*").order("name");
            if (!error) setTaxCategories(data || []);
        } catch (err) {
            console.error("Error fetching tax:", err);
        }
    };

    // Handlers
    const handleSaveStore = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...storeForm };
            if (editingStore?.id) {
                const { error } = await supabaseAdmin.from('stores').update(payload).eq('id', editingStore.id);
                if (error) throw error;
                showNotification("Store updated successfully!");
            } else {
                const { error } = await supabaseAdmin.from('stores').insert([payload]);
                if (error) throw error;
                showNotification("Store created successfully!");
            }
            setEditingStore(null);
            fetchInitialData();
        } catch (err) {
            showNotification(err.message, "error");
        }
    };

    const handleSaveLab = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...labForm };
            if (editingLab?.id) {
                const { error } = await supabaseAdmin.from('labs').update(payload).eq('id', editingLab.id);
                if (error) throw error;
                showNotification("Lab updated successfully!");
            } else {
                const { error } = await supabaseAdmin.from('labs').insert([payload]);
                if (error) throw error;
                showNotification("Lab registered successfully!");
            }
            setEditingLab(null);
            fetchInitialData();
        } catch (err) {
            showNotification(err.message, "error");
        }
    };

    const handleProductSearch = async (query) => {
        setProductSearch(query);
        if (!query.trim() || !isValidUUID(transferData.sourceStore)) {
            setSearchResults([]);
            return;
        }
        setSearchingProducts(true);
        try {
            const { data, error } = await supabase
                .from('store_inventory')
                .select('stock_quantity, products!inner(id, name)')
                .ilike('products.name', `%${query}%`)
                .eq('store_id', transferData.sourceStore)
                .limit(10);
            if (error) throw error;
            const mapped = data.map(d => ({
                id: d.products?.id,
                name: d.products?.name,
                stock: d.stock_quantity
            }));
            setSearchResults(mapped || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingProducts(false);
        }
    };

    const handleTransferStock = async (e) => {
        e.preventDefault();
        if (!transferData.productId || !transferData.destStore) {
            showNotification("Missing transfer details.", "error");
            return;
        }
        setIsTransferring(true);
        try {
            // 1. Source check
            const { data: srcInv, error: srcErr } = await supabase.from('store_inventory')
                .select('*')
                .eq('product_id', transferData.productId)
                .eq('store_id', transferData.sourceStore)
                .single();
            if (srcErr || srcInv.stock_quantity < transferData.quantity) throw new Error("Invalid source stock.");

            // 2. Dest update/insert
            const { data: destInv } = await supabase.from('store_inventory')
                .select('stock_quantity')
                .eq('product_id', transferData.productId)
                .eq('store_id', transferData.destStore)
                .maybeSingle();

            if (destInv) {
                await supabase.from('store_inventory').update({ stock_quantity: destInv.stock_quantity + transferData.quantity }).eq('product_id', transferData.productId).eq('store_id', transferData.destStore);
            } else {
                await supabase.from('store_inventory').insert([{ store_id: transferData.destStore, product_id: transferData.productId, stock_quantity: transferData.quantity, unit_price: srcInv.unit_price || 0 }]);
            }

            // 3. Source deduct
            await supabase.from('store_inventory').update({ stock_quantity: srcInv.stock_quantity - transferData.quantity }).eq('product_id', transferData.productId).eq('store_id', transferData.sourceStore);

            showNotification("Inventory vector shift complete.");
            setTransferringStock(false);
            fetchProductStocks();
        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setIsTransferring(false);
        }
    };

    const handleSaveTax = async (e) => {
        e.preventDefault();
        setSavingTax(true);
        try {
            const { error } = await supabase.from('product_categories').update({
                cgst: Number(taxForm.cgst),
                sgst: Number(taxForm.sgst),
                igst: Number(taxForm.igst)
            }).eq("id", editingTaxCat.id);
            if (error) throw error;
            showNotification("Tax rates synchronized.");
            setEditingTaxCat(null);
            fetchTaxCategories();
        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setSavingTax(false);
        }
    };

    const tabs = [
        { id: 'stores', label: 'Stores', icon: Building2 },
        { id: 'labs', label: 'Labs', icon: FlaskConical },
        { id: 'inventory', label: 'Inventory', icon: ArrowRightLeft },
        { id: 'tax', label: 'Taxation', icon: Percent },
        { id: 'vouchers', label: 'Vouchers', icon: Plus }
    ];

    return (
        <div className="space-y-10 animate-fast-slide pb-20">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Infrastructure</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Ecosystem & Resource Control</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 items-start">
                {/* Navigation Sidebar */}
                <aside className="bg-white rounded-[32px] border border-gray-100 p-4 lg:sticky lg:top-0 shadow-sm">
                    <div className="px-4 py-4 mb-4 border-b border-gray-50">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Master Plane</p>
                        <p className="text-sm font-black text-black mt-1 uppercase tracking-tight">System Navigation</p>
                    </div>
                    <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === id
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

                {/* Content Section */}
                <section className="bg-white rounded-[40px] border border-gray-100 p-8 md:p-10 min-h-[600px] shadow-sm flex flex-col relative overflow-hidden">
                    <div className="flex items-start justify-between gap-4 mb-10 pb-6 border-b border-gray-50">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">Active Sector</p>
                            <h2 className="text-3xl font-black text-black mt-2 uppercase tracking-tighter">
                                {tabs.find(t => t.id === activeTab)?.label} Management
                            </h2>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input 
                                type="text"
                                placeholder="Filter results..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Stores Tab */}
                    {activeTab === 'stores' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Retail Units</h3>
                                <button
                                    onClick={() => { setEditingStore({}); setStoreForm({ name: '', address: '', gst_no: '', phone: '', email: '' }); }}
                                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                                >
                                    <Plus size={14} strokeWidth={3} /> Register Store
                                </button>
                            </div>
                            <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity / GSTIN</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Communications</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {stores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((store) => (
                                            <tr key={store.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="text-[11px] font-black text-black uppercase tracking-tight">{store.name}</div>
                                                    <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest">{store.gst_no || 'N/A'}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] font-black text-black tracking-widest uppercase">{store.phone || 'N/A'}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight truncate max-w-xs">{store.address || 'N/A'}</div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={() => { setEditingStore(store); setStoreForm(store); }} className="p-2.5 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
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

                    {/* Labs Tab */}
                    {activeTab === 'labs' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Processing Units</h3>
                                <button
                                    onClick={() => { setEditingLab({}); setLabForm({ name: '', address: '', phone: '', email: '' }); }}
                                    className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                                >
                                    <Plus size={14} strokeWidth={3} /> Register Lab
                                </button>
                            </div>
                            <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Lab Identity</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Linkages</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {labs.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map((lab) => (
                                            <tr key={lab.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="text-[11px] font-black text-black uppercase tracking-tight">{lab.name}</div>
                                                    <div className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest">ID: {lab.id.slice(0,8)}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] font-black text-black tracking-widest uppercase">{lab.phone || 'N/A'}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight truncate max-w-xs">{lab.address || 'N/A'}</div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={() => { setEditingLab(lab); setLabForm(lab); }} className="p-2.5 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
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

                    {/* Inventory Tab */}
                    {activeTab === 'inventory' && (
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
                                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setTransferringStock(true);
                                        setTransferData({ sourceStore: selectedStockStore, destStore: '', productId: '', productName: '', quantity: 1 });
                                    }}
                                    className="flex items-center justify-center gap-3 bg-black text-white px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    <ArrowRightLeft size={16} strokeWidth={3} /> Shift Inventory Vector
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto border border-gray-50 rounded-[32px]">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                                        <tr>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Link</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {productStocks.filter(p => p.store_id === selectedStockStore && p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <p className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</p>
                                                    <p className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase tracking-tighter">REF: {p.id.slice(0,8)}</p>
                                                </td>
                                                <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stores.find(s => s.id === p.store_id)?.name}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${p.stock < 10 ? "border border-black text-black" : "bg-black text-white shadow-sm"}`}>
                                                        {p.stock} Units
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tax Tab */}
                    {activeTab === 'tax' && (
                        <div className="space-y-6">
                            <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">CGST %</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">SGST %</th>
                                            <th className="px-8 py-5 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">IGST %</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {taxCategories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((cat) => (
                                            <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">{cat.name}</td>
                                                <td className="px-8 py-6 text-center font-mono font-bold text-gray-600">{cat.cgst ?? 0}%</td>
                                                <td className="px-8 py-6 text-center font-mono font-bold text-gray-600">{cat.sgst ?? 0}%</td>
                                                <td className="px-8 py-6 text-center font-mono font-bold text-gray-600">{cat.igst ?? 0}%</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button onClick={() => { setEditingTaxCat(cat); setTaxForm(cat); }} className="p-2 text-gray-300 hover:text-black transition-all">
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

                    {/* Vouchers Tab */}
                    {activeTab === 'vouchers' && (
                        <div className="space-y-10">
                            <div className="bg-gray-50/50 rounded-[32px] p-10 border border-gray-100 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl">
                                    <Plus size={32} strokeWidth={3} />
                                </div>
                                <h3 className="text-xl font-black text-black uppercase tracking-tighter">Generate Vector</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 mb-8">Append New Promotional Identity</p>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    setCreatingVoucher(true);
                                    try {
                                        const { error } = await supabase.from('voucher').insert([newVoucher]);
                                        if (error) throw error;
                                        showNotification("Voucher code deployed.");
                                        setNewVoucher({ voucher_no: '' });
                                        fetchVouchers();
                                    } catch (err) {
                                        showNotification(err.message, "error");
                                    } finally {
                                        setCreatingVoucher(false);
                                    }
                                }} className="w-full max-w-sm space-y-4">
                                    <input required type="text" value={newVoucher.voucher_no} onChange={e => setNewVoucher({ ...newVoucher, voucher_no: e.target.value })} className="w-full px-6 py-5 bg-white border border-gray-200 rounded-[20px] text-[13px] font-mono font-black tracking-[0.2em] focus:ring-2 focus:ring-black/5 outline-none transition-all uppercase text-center" placeholder="CODE-2026-X" />
                                    <button type="submit" disabled={creatingVoucher} className="w-full py-5 bg-black text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                                        {creatingVoucher ? 'Syncing...' : 'Commit Code'}
                                    </button>
                                </form>
                            </div>
                            <div className="overflow-x-auto border border-gray-50 rounded-[32px]">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Vectors</th>
                                            <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Timeline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {vouchers.map((v) => (
                                            <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-6 font-mono font-black text-black tracking-widest">{v.voucher_no}</td>
                                                <td className="px-8 py-6 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(v.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Drawers */}
            <SlideDrawer isOpen={!!editingStore} onClose={() => setEditingStore(null)} title={editingStore?.id ? 'Modify Store' : 'New Store'}>
                <form onSubmit={handleSaveStore} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity</label>
                        <input required type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all" placeholder="Store Name..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">GSTIN</label>
                            <input type="text" value={storeForm.gst_no} onChange={e => setStoreForm({...storeForm, gst_no: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-mono font-black focus:ring-2 focus:ring-black/5 outline-none transition-all uppercase" placeholder="36AAN..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact</label>
                            <input type="text" value={storeForm.phone} onChange={e => setStoreForm({...storeForm, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all" placeholder="Phone..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
                        <textarea rows={3} required value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none" placeholder="Location..." />
                    </div>
                    <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-8">Commit Changes</button>
                </form>
            </SlideDrawer>

            <SlideDrawer isOpen={!!editingLab} onClose={() => setEditingLab(null)} title={editingLab?.id ? 'Modify Lab' : 'New Lab'}>
                <form onSubmit={handleSaveLab} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Lab Identity</label>
                        <input required type="text" value={labForm.name} onChange={e => setLabForm({...labForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all" placeholder="Lab Name..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact</label>
                        <input type="text" value={labForm.phone} onChange={e => setLabForm({...labForm, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all" placeholder="Phone..." />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
                        <textarea rows={3} required value={labForm.address} onChange={e => setLabForm({...labForm, address: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none" placeholder="Physical location..." />
                    </div>
                    <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-8">Deploy Unit</button>
                </form>
            </SlideDrawer>

            <SlideDrawer isOpen={transferringStock} onClose={() => setTransferringStock(false)} title="Inventory Vector" subtitle="Cross-Unit Stock Transfer">
                <form onSubmit={handleTransferStock} className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Origin</label>
                        <select value={transferData.sourceStore} onChange={e => setTransferData({ ...transferData, sourceStore: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all cursor-pointer">
                            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Destination</label>
                        <select value={transferData.destStore} onChange={e => setTransferData({ ...transferData, destStore: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all cursor-pointer">
                            <option value="">Select Target...</option>
                            {stores.filter(s => s.id !== transferData.sourceStore).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inventory Vector</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={3} />
                            <input type="text" placeholder="Search Product..." value={productSearch} onChange={(e) => handleProductSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all uppercase" />
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-50">
                                    {searchResults.map(p => (
                                        <button key={p.id} type="button" onClick={() => { setTransferData({ ...transferData, productId: p.id, productName: p.name }); setProductSearch(p.name); setSearchResults([]); }} className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                            <div className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Avail: {p.stock} Units</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Volume</label>
                        <input type="number" min="1" required value={transferData.quantity} onChange={e => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 1 })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xl font-mono font-black focus:ring-2 focus:ring-black/5 outline-none transition-all" />
                    </div>
                    <button type="submit" disabled={isTransferring} className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all mt-4">{isTransferring ? 'Syncing...' : 'Commit Shift'}</button>
                </form>
            </SlideDrawer>

            <SlideDrawer isOpen={!!editingTaxCat} onClose={() => setEditingTaxCat(null)} title="Tax Vector" subtitle={`Syncing: ${editingTaxCat?.name}`}>
                <form onSubmit={handleSaveTax} className="space-y-6">
                    {['cgst', 'sgst', 'igst'].map(t => (
                        <div key={t} className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.toUpperCase()} Coefficient (%)</label>
                            <input type="number" step="0.01" required value={taxForm[t]} onChange={e => setTaxForm({ ...taxForm, [t]: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xl font-mono font-black focus:ring-2 focus:ring-black/5 outline-none transition-all" />
                        </div>
                    ))}
                    <button type="submit" disabled={savingTax} className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-8">{savingTax ? 'Syncing...' : 'Synchronize Vector'}</button>
                </form>
            </SlideDrawer>

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
                    <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${notification.type === 'success' ? 'bg-black border-white/10 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}>
                        {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
