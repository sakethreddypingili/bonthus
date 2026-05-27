import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Save, Plus, Trash2, X, Loader2, Edit2, ChevronDown, Lock, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";

const pickBestEyePower = (eyePowerRows) => {
    if (!Array.isArray(eyePowerRows) || eyePowerRows.length === 0) return null;

    const isNonEmpty = (v) => {
        if (v == null) return false;
        const s = String(v).trim();
        return s !== "" && s !== "-" && s !== "—";
    };

    const scoreRow = (row) => {
        if (!row) return 0;
        const fields = [
            row.dv_right_sph,
            row.dv_right_cyl,
            row.dv_right_axis,
            row.nv_right_sph,
            row.nv_right_cyl,
            row.nv_right_axis,
            row.dv_left_sph,
            row.dv_left_cyl,
            row.dv_left_axis,
            row.nv_left_sph,
            row.nv_left_cyl,
            row.nv_left_axis,
        ];
        return fields.reduce((acc, v) => acc + (isNonEmpty(v) ? 1 : 0), 0);
    };

    const sorted = [...eyePowerRows].sort((a, b) => {
        const scoreDiff = scoreRow(b) - scoreRow(a);
        if (scoreDiff !== 0) return scoreDiff;
        const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
    });

    const best = sorted[0];
    return scoreRow(best) > 0 ? best : null;
};

export default function EditOrder({ userProfile }) {
    const { id: orderId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [customer, setCustomer] = useState({
        id: "",
        name: "",
        phone: "",
        street: "",
        town: "",
        district: "",
        state: "",
        email: ""
    });

    const [items, setItems] = useState([]);

    const [activeItemSearch, setActiveItemSearch] = useState(null);
    const [productSuggestions, setProductSuggestions] = useState({});
    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', category: '', category_id: '', price: '', stock: '10' });
    const [addingProduct, setAddingProduct] = useState(false);
    const [pendingItemIndex, setPendingItemIndex] = useState(null);

    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [activePrescriptionItem] = useState(null);
    const [tempPrescription, setTempPrescription] = useState({
        isSamePower: false,
        isCylindrical: false,
        re: { sph: '', cyl: '', axis: '' },
        le: { sph: '', cyl: '', axis: '' },
        adl_re: { sph: '', cyl: '', axis: '' },
        adl_le: { sph: '', cyl: '', axis: '' },
        add: '',
        hasAdditionalPower: false,
        notes: ''
    });

    const [, setSearchingItems] = useState({});
    const searchTimeoutRef = useRef({});
    const productInputRefs = useRef({});
    const [dropdownLayout, setDropdownLayout] = useState(null);
    const [highlightedRow, setHighlightedRow] = useState(null);

    const [payments, setPayments] = useState([{ id: Date.now(), mode: 'Cash', amount: '' }]);

    const [orderDisabled, setOrderDisabled] = useState(false);
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [disablingOrder, setDisablingOrder] = useState(false);
    const [showEyePowerModal, setShowEyePowerModal] = useState(false);
    const [eyePowerTargetItemId, setEyePowerTargetItemId] = useState(null);
    const [eyePowerData, setEyePowerData] = useState({
        isSamePower: false,
        isCylindrical: false,
        hasAdditionalPower: false,
        re: { sph: '', cyl: '', axis: '' },
        le: { sph: '', cyl: '', axis: '' },
        adl_re: { sph: '', cyl: '', axis: '' },
        adl_le: { sph: '', cyl: '', axis: '' },
        add: '',
        notes: ''
    });

    const [selectedSigns, setSelectedSigns] = useState({});
    const togglePowerSign = (fieldKey, isPositive) => {
        const currentSign = selectedSigns[fieldKey];
        const newSign = isPositive ? (currentSign === 'positive' ? null : 'positive') : (currentSign === 'negative' ? null : 'negative');
        setSelectedSigns(prev => ({ ...prev, [fieldKey]: newSign }));
        
        // Auto-prefix/remove sign in the actual value
        const fieldMap = {
            'dv-re-sph': ['re', 'sph'], 'dv-re-cyl': ['re', 'cyl'],
            'dv-le-sph': ['le', 'sph'], 'dv-le-cyl': ['le', 'cyl'],
            'nv-re-sph': ['adl_re', 'sph'], 'nv-re-cyl': ['adl_re', 'cyl'],
            'nv-le-sph': ['adl_le', 'sph'], 'nv-le-cyl': ['adl_le', 'cyl']
        };
        
        const path = fieldMap[fieldKey];
        if (path) {
            const [eye, key] = path;
            const currentVal = String(eyePowerData[eye][key] || '').replace(/^[+-]/, '');
            let prefixedVal = currentVal;
            if (newSign === 'positive') prefixedVal = '+' + currentVal;
            if (newSign === 'negative') prefixedVal = '-' + currentVal;
            setEyePowerData(prev => ({
                ...prev,
                [eye]: { ...prev[eye], [key]: prefixedVal }
            }));
        }
    };

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
    const [selectedStore, setSelectedStore] = useState("");
    const [, setStores] = useState([]);
    const [storeCategories, setStoreCategories] = useState([]);

    const currentStoreId = selectedStore || userProfile?.store_id || "";
    const [orderStatus, setOrderStatus] = useState("Processing");

    // Fetch Order Data
    useEffect(() => {
        const fetchOrderData = async () => {
            if (!orderId) return;
            setLoading(true);
            try {
                // Fetch Order & Customer
                const { data: order, error: orderErr } = await supabase
                    .from('orders')
                    .select('*, customers(*), eye_power(*), order_items(*, products_list(*, products_category(*)))')
                    .eq('id', orderId)
                    .single();

                if (orderErr) throw orderErr;

                setSelectedStore(order.store_id);
                setOrderStatus(order.status);
                setOrderDisabled(order.disabled || false);

                if (order.customers) {
                    setCustomer({
                        id: order.customers.id,
                        name: order.customers.name || "",
                        phone: order.customers.phone || "",
                        street: order.customers.street || "",
                        town: order.customers.town || "",
                        district: order.customers.district || "",
                        state: order.customers.state || "",
                        email: order.customers.email || ""
                    });
                }

                // Map Order Items
                const mappedItems = order.order_items.map(item => {
                    const prod = item.products_list || {};
                    const cat = prod.products_category || {};

                    // Load prescription from order_items if available (new way)
                    let prescription = null;
                    if (item.prescription) {
                        try {
                            prescription = typeof item.prescription === 'string' ? JSON.parse(item.prescription) : item.prescription;
                        } catch (e) {
                            console.error('Failed to parse prescription:', e);
                        }
                    }

                    return {
                        id: item.id,
                        db_id: item.id, // reference for existing items
                        name: prod.name || "Unknown Product",
                        type: cat.name || (item.product_id ? 'Product' : 'Custom'),
                        qty: item.qty,
                        price: item.price,
                        discount: item.discount_amt || 0,
                        product_id: item.product_id,
                        category_id: prod.category_id,
                        sgst: cat.sgst || 0,
                        cgst: cat.cgst || 0,
                        igst: cat.igst || 0,
                        prescription: prescription || null
                    };
                });

                // Fallback: Load prescription from eye_power table for old orders (order-level)
                // Assign it to the first Lens/Contact Lens item
                const ep = pickBestEyePower(order.eye_power);
                if (ep && !mappedItems.some(i => i.prescription)) {
                    const firstLensItem = mappedItems.find(i => i.type === 'Lens' || i.type === 'Contact Lens');
                    if (firstLensItem) {
                        mappedItems.find(i => i.id === firstLensItem.id).prescription = {
                            isSamePower: false,
                            isCylindrical: false,
                            re: { sph: ep.dv_right_sph || '', cyl: ep.dv_right_cyl || '', axis: ep.dv_right_axis || '' },
                            le: { sph: ep.dv_left_sph || '', cyl: ep.dv_left_cyl || '', axis: ep.dv_left_axis || '' },
                            adl_re: { sph: ep.nv_right_sph || '', cyl: ep.nv_right_cyl || '', axis: ep.nv_right_axis || '' },
                            adl_le: { sph: ep.nv_left_sph || '', cyl: ep.nv_left_cyl || '', axis: ep.nv_left_axis || '' },
                            hasAdditionalPower: !!(ep.nv_right_sph || ep.nv_left_sph),
                            notes: ep.notes || ''
                        };
                    }
                }
                setItems(mappedItems);

                // Fetch payments if needed, but the original logic doesn't store a payment log per order yet?
                // Actually, due_amount is stored. Let's assume for now we just show balance to pay.
                setPayments([{ id: Date.now(), mode: 'Cash', amount: (order.gross_amount - order.due_amount).toFixed(2) }]);

            } catch (err) {
                console.error("Error fetching order:", err);
                alert("Failed to load order: " + err.message);
                navigate('/orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderData();
    }, [orderId, navigate]);

    useEffect(() => {
        if (isAdmin) {
            supabase.from('store').select('*').order('name').then(({ data }) => setStores(data || []));
        }
    }, [isAdmin]);

    useEffect(() => {
        const fetchStoreCategories = async () => {
            if (!currentStoreId) {
                setStoreCategories([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('products_category')
                    .select('id, name')
                    .eq('store_id', currentStoreId)
                    .order('name', { ascending: true });

                if (error) throw error;
                setStoreCategories(data || []);
            } catch (err) {
                console.error('Error fetching store categories:', err);
                setStoreCategories([]);
            }
        };

        fetchStoreCategories();
    }, [currentStoreId]);

    const typeOptions = storeCategories.length > 0
        ? Array.from(new Set(storeCategories.map(c => c.name).filter(Boolean)))
        : ["Frame", "Lens", "Contact Lens", "Accessory"];
    const getDefaultItemType = () => typeOptions[0] || "Frame";

    const updateDropdownLayout = useCallback((itemId) => {
        if (!itemId) return;
        const inputEl = productInputRefs.current[itemId];
        if (!inputEl) return;
        const rect = inputEl.getBoundingClientRect();
        const viewportPadding = 12;
        const availableWidth = window.innerWidth - (viewportPadding * 2);
        const minWidth = Math.min(320, availableWidth);
        const width = Math.min(500, Math.max(rect.width, minWidth), availableWidth);
        const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(180, (placeAbove ? spaceAbove : spaceBelow) - 10);
        setDropdownLayout({ left, width, top: placeAbove ? rect.top - 8 : rect.bottom + 8, maxHeight, placeAbove });
    }, []);

    const closeProductSearch = useCallback(() => {
        setActiveItemSearch(null);
        setDropdownLayout(null);
    }, []);

    const openProductSearch = useCallback((itemId) => {
        setActiveItemSearch(itemId);
        requestAnimationFrame(() => updateDropdownLayout(itemId));
    }, [updateDropdownLayout]);

    const handleProductSearch = (id, value) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, name: value, product_id: null } : item));
        if (searchTimeoutRef.current[id]) clearTimeout(searchTimeoutRef.current[id]);
        if (!value.trim()) {
            closeProductSearch();
            setProductSuggestions(prev => ({ ...prev, [id]: [] }));
            setSearchingItems(prev => ({ ...prev, [id]: false }));
            return;
        }
        if (!currentStoreId) return;
        openProductSearch(id);
        setSearchingItems(prev => ({ ...prev, [id]: true }));
        searchTimeoutRef.current[id] = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('products_list')
                    .select('id, name, price, stock, category_id, products_category(*)')
                    .eq('store_id', currentStoreId)
                    .ilike('name', `%${value.trim()}%`)
                    .order('name', { ascending: true })
                    .limit(15);
                if (!error) setProductSuggestions(prev => ({ ...prev, [id]: data || [] }));
            } finally {
                setSearchingItems(prev => ({ ...prev, [id]: false }));
            }
        }, 350);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!currentStoreId) return;
        setAddingProduct(true);
        try {
            const newId = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);
            const { data, error } = await supabase.from('products_list').insert([{
                id: newId,
                name: newProduct.name,
                category_id: newProduct.category_id,
                store_id: currentStoreId,
                price: Number(newProduct.price),
                stock: Number(newProduct.stock),
                sales: 0
            }]).select('id').single();
            if (error) throw error;

            let categoryTaxes = { category_id: null, sgst: 0, cgst: 0, igst: 0 };
            if (newProduct.category_id) {
                const { data: catData } = await supabase.from('products_category').select('id, sgst, cgst, igst, name').eq('id', newProduct.category_id).maybeSingle();
                if (catData) {
                    categoryTaxes = {
                        category_id: catData.id,
                        sgst: catData.sgst || 0,
                        cgst: catData.cgst || 0,
                        igst: catData.igst || 0
                    };
                    const selectedType = catData.name;
                    const needsPrescription = selectedType === 'Lens' || selectedType === 'Contact Lens';

                    setItems(items.map(i => i.id === pendingItemIndex ? {
                        ...i,
                        name: newProduct.name,
                        price: newProduct.price,
                        product_id: data.id,
                        type: selectedType,
                        ...categoryTaxes,
                        prescription: needsPrescription ? (i.prescription || {
                            re: { sph: '', cyl: '', axis: '' }, le: { sph: '', cyl: '', axis: '' },
                            adl_re: { sph: '', cyl: '', axis: '' }, adl_le: { sph: '', cyl: '', axis: '' },
                            notes: ''
                        }) : null
                    } : i));
                }
            } else {
                setItems(items.map(i => i.id === pendingItemIndex ? {
                    ...i,
                    name: newProduct.name,
                    price: newProduct.price,
                    product_id: data.id,
                    type: newProduct.category,
                    category_id: newProduct.category_id
                } : i));
            }
            setShowAddProductModal(false);
        } catch (err) {
            alert('Failed to add product: ' + err.message);
        } finally {
            setAddingProduct(false);
        }
    };

    const selectProduct = async (item, product) => {
        let categoryTaxes = { category_id: null, sgst: 0, cgst: 0, igst: 0 };
        if (product.category_id) {
            const { data } = await supabase.from('products_category').select('id, sgst, cgst, igst').eq('id', product.category_id).maybeSingle();
            if (data) categoryTaxes = { category_id: data.id, sgst: data.sgst || 0, cgst: data.cgst || 0, igst: data.igst || 0 };
        }
        const selectedType = product.products_category?.name || item.type || getDefaultItemType();
        const needsPrescription = selectedType === 'Lens' || selectedType === 'Contact Lens';
        setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            name: product.name,
            price: product.price,
            product_id: product.id,
            type: selectedType,
            ...categoryTaxes,
            prescription: needsPrescription ? (i.prescription || {
                re: { sph: '', cyl: '', axis: '' }, le: { sph: '', cyl: '', axis: '' },
                adl_re: { sph: '', cyl: '', axis: '' }, adl_le: { sph: '', cyl: '', axis: '' },
                notes: ''
            }) : null
        } : i));
        closeProductSearch();
        setHighlightedRow(item.id);
        setTimeout(() => setHighlightedRow(null), 1000);
    };

    const handleUpdateOrder = async () => {
        setSaving(true);
        try {
            // 1. Update Customer info
            await supabase.from('customers').update({
                name: customer.name,
                phone: customer.phone,
                street: customer.street,
                town: customer.town,
                district: customer.district,
                state: customer.state,
                email: customer.email
            }).eq('id', customer.id);

            // 2. Inclusive Calculations
            const totalLineAmounts = items.map(item => {
                const lineTotal = (Number(item.price) * Number(item.qty)) - Number(item.discount);
                const taxRate = Number(item.sgst || 0) + Number(item.cgst || 0) + Number(item.igst || 0);

                const taxable = lineTotal / (1 + (taxRate / 100));
                const sgstAmt = (taxable * Number(item.sgst || 0)) / 100;
                const cgstAmt = (taxable * Number(item.cgst || 0)) / 100;

                return {
                    ...item,
                    lineTotal,
                    taxable,
                    sgstAmt,
                    cgstAmt
                };
            });

            const subtotal = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);
            const totalDiscount = items.reduce((sum, i) => sum + Number(i.discount), 0);

            // Total amount customer pays
            const grossTotal = subtotal - totalDiscount;

            const totalTaxable = totalLineAmounts.reduce((sum, item) => sum + item.taxable, 0);
            const totalSgst = totalLineAmounts.reduce((sum, item) => sum + item.sgstAmt, 0);
            const totalCgst = totalLineAmounts.reduce((sum, item) => sum + item.cgstAmt, 0);

            const paid = payments.filter(p => p.mode !== 'Advance').reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const due = Math.max(0, grossTotal - paid);

            // 3. Update Order record
            const { error: orderUpdateErr } = await supabase.from('orders').update({
                status: orderStatus,
                gross_amount: grossTotal,
                due_amount: due,
                subtotal: subtotal,
                total_discount: totalDiscount,
                taxable_amount: totalTaxable,
                sgst_amt: totalSgst,
                cgst_amt: totalCgst
            }).eq('id', orderId);
            if (orderUpdateErr) throw orderUpdateErr;

            // 4. Update Order Items (Clean & Replace)
            await supabase.from('order_items').delete().eq('order_id', orderId);
            const orderItemsPayload = totalLineAmounts.map(item => ({
                id: generateId(ID_RULES.ORDER_ITEMS.prefix, ID_RULES.ORDER_ITEMS.digits),
                order_id: orderId,
                product_id: item.product_id,
                qty: Number(item.qty),
                price: Number(item.price),
                discount_amt: Number(item.discount || 0),
                taxable_amount: item.taxable,
                sgst_amt: item.sgstAmt,
                cgst_amt: item.cgstAmt,
                total_price: item.lineTotal,
                prescription: item.prescription ? JSON.stringify(item.prescription) : null
            }));
            await supabase.from('order_items').insert(orderItemsPayload);

            // 5. Eye Power - Now stored per-item in order_items, no separate eye_power table needed
            alert("Order updated successfully!");
            navigate('/orders');
        } catch (err) {
            alert("Error updating order: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDisableOrder = async () => {
        if (!isAdmin) {
            alert("Only admins can disable orders");
            return;
        }
        setDisablingOrder(true);
        try {
            const newDisabledStatus = !orderDisabled;
            const { error } = await supabase
                .from('orders')
                .update({ disabled: newDisabledStatus })
                .eq('id', orderId);

            if (error) throw error;

            setOrderDisabled(newDisabledStatus);
            setShowDisableModal(false);
            alert(newDisabledStatus ? "Order disabled successfully" : "Order enabled successfully");
        } catch (err) {
            alert("Error disabling order: " + err.message);
        } finally {
            setDisablingOrder(false);
        }
    };

    const removeItem = (itemId) => {
        setItems(items.filter(item => item.id !== itemId));
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#000000]" /></div>;

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
    const totalDiscount = items.reduce((sum, item) => sum + Number(item.discount), 0);
    const grossTotal = subtotal - totalDiscount;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-gray-100">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/orders')} className="p-3 border border-gray-100 rounded-2xl text-black hover:bg-black hover:text-white transition-all shadow-sm">
                        <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-1">Modify Record</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Reference: <span className="font-mono text-black">#{orderId}</span></p>
                        {orderDisabled && (
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full">
                                <Lock size={12} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Archive State Active</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin ? (
                        <>
                            <div className="relative group">
                                <select 
                                    value={orderStatus} 
                                    onChange={e => setOrderStatus(e.target.value)} 
                                    className="appearance-none bg-gray-50 border border-gray-100 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all pr-12"
                                >
                                    <option value="Advance">Initial Advance</option>
                                    <option value="Processing">In Process</option>
                                    <option value="Delivered">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                            </div>
                            <button 
                                onClick={() => setShowDisableModal(true)} 
                                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${orderDisabled ? 'bg-gray-100 text-black hover:bg-black hover:text-white shadow-sm' : 'border-2 border-black text-black hover:bg-black hover:text-white shadow-lg'}`}
                            >
                                {orderDisabled ? 'Activate Entity' : 'Archive Order'}
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <Lock size={16} strokeWidth={3} /> Admin Locked
                        </div>
                    )}
                    <button 
                        onClick={handleUpdateOrder} 
                        disabled={saving || !isAdmin} 
                        className="bg-black text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center gap-2"
                    >
                        <Save size={18} strokeWidth={3} /> {saving ? "Syncing..." : "Commit Changes"}
                    </button>
                </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <div>
                        <h3 className="text-lg font-black text-black uppercase tracking-tight">Customer Identity</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Entity Information Profile</p>
                    </div>
                    {!isAdmin && <span className="text-[9px] font-black text-black uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-full border border-gray-100">Immutable State</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Legal Name</label>
                        <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} disabled={!isAdmin} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all disabled:opacity-50" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Contact Link</label>
                        <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} disabled={!isAdmin} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all disabled:opacity-50" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Primary Zone</label>
                        <input type="text" value={customer.town} onChange={e => setCustomer({ ...customer, town: e.target.value })} disabled={!isAdmin} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all disabled:opacity-50" />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Administrative District</label>
                        <input type="text" value={customer.district} onChange={e => setCustomer({ ...customer, district: e.target.value })} disabled={!isAdmin} className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all disabled:opacity-50" />
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-black text-white">
                            <th className="py-5 px-6 text-left text-[9px] font-black uppercase tracking-widest">#</th>
                            <th className="py-5 px-6 text-left text-[9px] font-black uppercase tracking-widest">Inventory Entity</th>
                            <th className="py-5 px-6 text-left text-[9px] font-black uppercase tracking-widest">Category</th>
                            <th className="py-5 px-6 text-center text-[9px] font-black uppercase tracking-widest">Qty</th>
                            <th className="py-5 px-6 text-right text-[9px] font-black uppercase tracking-widest">Unit Value</th>
                            <th className="py-5 px-6 text-right text-[9px] font-black uppercase tracking-widest">Discount</th>
                            <th className="py-5 px-6 text-right text-[9px] font-black uppercase tracking-widest">SGST%</th>
                            <th className="py-5 px-6 text-right text-[9px] font-black uppercase tracking-widest">CGST%</th>
                            <th className="py-5 px-6 text-right text-[9px] font-black uppercase tracking-widest">Total</th>
                            <th className="py-5 px-6 text-center w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                            <tr key={item.id} className={`${highlightedRow === item.id ? 'bg-gray-50' : 'hover:bg-gray-50/50'} transition-colors group`}>
                                <td className="py-5 px-6 text-[10px] font-black text-gray-300 uppercase">{idx + 1}</td>
                                <td className="py-5 px-6 relative">
                                    <input
                                        ref={el => productInputRefs.current[item.id] = el}
                                        type="text"
                                        value={item.name}
                                        onChange={e => isAdmin && handleProductSearch(item.id, e.target.value)}
                                        disabled={!isAdmin}
                                        placeholder="Lookup Item..."
                                        className="w-full bg-transparent text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-b-2 border-black transition-all disabled:opacity-50"
                                    />
                                    {activeItemSearch === item.id && dropdownLayout && createPortal(
                                        <div className="fixed z-[9999] bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ left: dropdownLayout.left, top: dropdownLayout.top, width: dropdownLayout.width, maxHeight: dropdownLayout.maxHeight }}>
                                            {productSuggestions[item.id]?.length > 0 ? (
                                                <div className="divide-y divide-gray-50">
                                                    {productSuggestions[item.id].map(p => (
                                                        <div key={p.id} onClick={() => selectProduct(item, p)} className="px-5 py-3 hover:bg-black hover:text-white cursor-pointer transition-colors">
                                                            <p className="text-[11px] font-black uppercase tracking-tight">{p.name}</p>
                                                            <div className="flex items-center gap-3 mt-1 opacity-60">
                                                                <span className="text-[9px] font-bold uppercase">₹{p.price.toLocaleString()}</span>
                                                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                                                <span className="text-[9px] font-bold uppercase">Stock: {p.stock}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : item.name.trim() && (
                                                <div className="p-6 text-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">No matching entity</p>
                                                    <button
                                                        onClick={() => {
                                                            setNewProduct({ ...newProduct, name: item.name });
                                                            setPendingItemIndex(item.id);
                                                            setShowAddProductModal(true);
                                                        }}
                                                        className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                                                    >
                                                        + Register New
                                                    </button>
                                                </div>
                                            )}
                                        </div>, document.body
                                    )}
                                </td>
                                <td className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                        <select 
                                            disabled={!isAdmin} 
                                            value={item.type} 
                                            onChange={e => isAdmin && setItems(items.map(i => i.id === item.id ? { ...i, type: e.target.value } : i))} 
                                            className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50"
                                        >
                                            {typeOptions.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        {(item.type === 'Lens' || item.type === 'Contact Lens') && isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setEyePowerTargetItemId(item.id);
                                                    setEyePowerData(item.prescription || {
                                                        isSamePower: false,
                                                        isCylindrical: false,
                                                        hasAdditionalPower: false,
                                                        re: { sph: '', cyl: '', axis: '' },
                                                        le: { sph: '', cyl: '', axis: '' },
                                                        adl_re: { sph: '', cyl: '', axis: '' },
                                                        adl_le: { sph: '', cyl: '', axis: '' },
                                                        add: '',
                                                        notes: ''
                                                    });
                                                    setSelectedSigns({
                                                        'dv-re-sph': 'negative',
                                                        'dv-re-cyl': 'negative',
                                                        'dv-le-sph': 'negative',
                                                        'dv-le-cyl': 'negative',
                                                        'nv-re-sph': 'positive',
                                                        'nv-re-cyl': 'positive',
                                                        'nv-le-sph': 'positive',
                                                        'nv-le-cyl': 'positive'
                                                    });
                                                    setShowEyePowerModal(true);
                                                }}
                                                className="p-1.5 text-black hover:bg-black hover:text-white rounded-lg transition-all shadow-sm"
                                                title="Modify Power"
                                            >
                                                <Edit2 size={12} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <input type="number" disabled={!isAdmin} value={item.qty} onChange={e => isAdmin && setItems(items.map(i => i.id === item.id ? { ...i, qty: e.target.value } : i))} className="w-12 text-center bg-gray-50 border border-gray-100 rounded-xl py-1.5 text-[11px] font-black focus:outline-none focus:border-black disabled:opacity-50" />
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <input type="number" disabled={!isAdmin} value={item.price} onChange={e => isAdmin && setItems(items.map(i => i.id === item.id ? { ...i, price: e.target.value } : i))} className="w-24 text-right bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-[11px] font-black tracking-tight focus:outline-none focus:border-black disabled:opacity-50" />
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <input type="number" disabled={!isAdmin} value={item.discount} onChange={e => isAdmin && setItems(items.map(i => i.id === item.id ? { ...i, discount: e.target.value } : i))} className="w-20 text-right bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 text-[11px] font-black text-black tracking-tight focus:outline-none focus:border-black disabled:opacity-50" />
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <input type="number" disabled={!isAdmin} value={item.sgst} onChange={e => isAdmin && setItems(items.map(i => i.id === item.id ? { ...i, sgst: Number(e.target.value) } : i))} className="w-14 text-right bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black disabled:opacity-50" />
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <input type="number" disabled={!isAdmin} value={item.cgst} onChange={e => isAdmin && setItems(items.map(i => i.id === item.id ? { ...i, cgst: Number(e.target.value) } : i))} className="w-14 text-right bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:border-black disabled:opacity-50" />
                                </td>
                                <td className="py-5 px-6 text-right">
                                    <span className="text-[11px] font-black text-black tracking-tighter">
                                        ₹{((Number(item.price) * Number(item.qty)) - Number(item.discount)).toLocaleString()}
                                    </span>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <button disabled={!isAdmin} onClick={() => isAdmin && removeItem(item.id)} className="p-2 text-gray-200 hover:text-black hover:bg-gray-100 rounded-xl transition-all disabled:opacity-20 opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} strokeWidth={3} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button disabled={!isAdmin} onClick={() => isAdmin && setItems([...items, { id: Date.now(), name: "", type: "Frame", qty: 1, price: 0, discount: 0, sgst: 0, cgst: 0, igst: 0 }])} className="w-full py-4 bg-gray-50 text-[10px] font-black text-black uppercase tracking-[0.2em] hover:bg-black hover:text-white border-t border-gray-100 transition-all disabled:opacity-20">
                    + Append New Line Item
                </button>
            </div>

            {/* Summary & Totals */}
            <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                        <div>
                            <h3 className="text-lg font-black text-black uppercase tracking-tight">Technical Data</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Prescription Records</p>
                        </div>
                    </div>
                    {items.filter(i => i.prescription).length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {items.filter(i => i.prescription).map(i => (
                                <div key={i.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 group hover:border-black transition-all">
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200/50">
                                        <p className="font-black text-black text-[10px] uppercase tracking-[0.2em]">{i.name}</p>
                                        {isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setEyePowerTargetItemId(i.id);
                                                    setEyePowerData(i.prescription || {
                                                        isSamePower: false,
                                                        isCylindrical: false,
                                                        hasAdditionalPower: false,
                                                        re: { sph: '', cyl: '', axis: '' },
                                                        le: { sph: '', cyl: '', axis: '' },
                                                        adl_re: { sph: '', cyl: '', axis: '' },
                                                        adl_le: { sph: '', cyl: '', axis: '' },
                                                        add: '',
                                                        notes: ''
                                                    });
                                                    setShowEyePowerModal(true);
                                                }}
                                                className="p-1.5 bg-black text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                                            >
                                                <Edit2 size={12} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-left py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Eye</th>
                                                <th className="text-left py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">SPH</th>
                                                <th className="text-left py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">CYL</th>
                                                <th className="text-left py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Axis</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            <tr>
                                                <td className="py-2 text-[10px] font-black text-black uppercase">RE (DV)</td>
                                                <td className="py-2 text-[11px] font-mono font-black">{i.prescription.re?.sph || '-'}</td>
                                                <td className="py-2 text-[11px] font-mono font-black">{i.prescription.re?.cyl || '-'}</td>
                                                <td className="py-2 text-[11px] font-mono font-black">{i.prescription.re?.axis || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2 text-[10px] font-black text-black uppercase">LE (DV)</td>
                                                <td className="py-2 text-[11px] font-mono font-black">{i.prescription.le?.sph || '-'}</td>
                                                <td className="py-2 text-[11px] font-mono font-black">{i.prescription.le?.cyl || '-'}</td>
                                                <td className="py-2 text-[11px] font-mono font-black">{i.prescription.le?.axis || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <AlertCircle size={24} className="text-gray-200" />
                            </div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No technical entities linked</p>
                        </div>
                    )}
                </div>

                <div className="w-full md:w-96 space-y-6">
                    <div className="bg-black text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-center opacity-60">
                                <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                                <span className="text-[14px] font-bold">₹{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center opacity-60">
                                <span className="text-[10px] font-black uppercase tracking-widest">Aggregate Tax</span>
                                <span className="text-[14px] font-bold">₹{(grossTotal - (subtotal - totalDiscount)).toLocaleString()}</span>
                            </div>
                            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Gross Payable</span>
                                    <h4 className="text-4xl font-black tracking-tighter mt-1">₹{grossTotal.toLocaleString()}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Save size={120} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Prescription Modal */}
            {showPrescriptionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl relative overflow-hidden border border-white/20">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Technical Specs</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Optometric Data Interface</p>
                            </div>
                            {!isAdmin ? (
                                <span className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Lock size={12} strokeWidth={3} /> Immutable</span>
                            ) : (
                                <button onClick={() => setShowPrescriptionModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} strokeWidth={3} /></button>
                            )}
                        </div>

                        <div className="p-8 space-y-10">
                            {!isAdmin && (
                                <div className="bg-black text-white p-5 rounded-2xl flex items-start gap-4">
                                    <AlertCircle size={20} className="text-gray-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-bold uppercase tracking-wide leading-relaxed">
                                        Administrative Privileges Required. This interface is in read-only state.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-black uppercase tracking-[0.3em] border-l-4 border-black pl-4">Distance Vision — RE</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH</label>
                                            <input type="text" value={tempPrescription.re.sph} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL</label>
                                            <input type="text" value={tempPrescription.re.cyl} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                                            <input type="text" value={tempPrescription.re.axis} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-black uppercase tracking-[0.3em] border-l-4 border-black pl-4">Distance Vision — LE</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH</label>
                                            <input type="text" value={tempPrescription.le.sph} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL</label>
                                            <input type="text" value={tempPrescription.le.cyl} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                                            <input type="text" value={tempPrescription.le.axis} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-mono font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {tempPrescription.hasAdditionalPower && (
                                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-8 animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-8 border-b border-gray-200/50 pb-6">
                                        <div className="w-32 space-y-2">
                                            <label className="text-[9px] font-black text-black uppercase tracking-widest ml-1">ADD Power</label>
                                            <input type="text" value={tempPrescription.add} disabled={!isAdmin} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-black focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" />
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic pt-6">Calculated Addition Vectoring</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-black opacity-40 uppercase tracking-[0.3em] border-l-4 border-gray-300 pl-4">Near Vision — RE</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <input type="text" value={tempPrescription.adl_re.sph} disabled className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-[11px] font-mono font-bold opacity-50" />
                                                <input type="text" value={tempPrescription.adl_re.cyl} disabled className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-[11px] font-mono font-bold opacity-50" />
                                                <input type="text" value={tempPrescription.adl_re.axis} disabled className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-[11px] font-mono font-bold opacity-50" />
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-black opacity-40 uppercase tracking-[0.3em] border-l-4 border-gray-300 pl-4">Near Vision — LE</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <input type="text" value={tempPrescription.adl_le.sph} disabled className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-[11px] font-mono font-bold opacity-50" />
                                                <input type="text" value={tempPrescription.adl_le.cyl} disabled className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-[11px] font-mono font-bold opacity-50" />
                                                <input type="text" value={tempPrescription.adl_le.axis} disabled className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-[11px] font-mono font-bold opacity-50" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observation Notes</label>
                                <textarea disabled={!isAdmin} value={tempPrescription.notes} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold h-24 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all disabled:opacity-50" placeholder="Vectoring constraints / Laboratory instructions..."></textarea>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={`w-12 h-6 rounded-full relative transition-all duration-500 ${tempPrescription.hasAdditionalPower ? 'bg-black' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-500 ${tempPrescription.hasAdditionalPower ? 'left-7 shadow-lg' : 'left-1'}`} />
                                </div>
                                <input disabled={!isAdmin} type="checkbox" checked={tempPrescription.hasAdditionalPower} onChange={e => isAdmin && setTempPrescription({ ...tempPrescription, hasAdditionalPower: e.target.checked })} className="hidden" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Complex Addition Layer</span>
                            </label>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setShowPrescriptionModal(false)} className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Discard</button>
                                <button disabled={!isAdmin} onClick={() => isAdmin && (() => { setItems(items.map(i => i.id === activePrescriptionItem ? { ...i, prescription: tempPrescription } : i)); setShowPrescriptionModal(false); })()} className="px-10 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20">Sync Vector Data</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Eye Power Modal - Order Level */}
            {showEyePowerModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-[700px] shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-black uppercase tracking-tighter">Vector Configuration</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Lens Specification Interface</p>
                            </div>
                            <button onClick={() => setShowEyePowerModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Checkboxes Row */}
                            <div className="flex flex-wrap gap-6 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={eyePowerData?.isSamePower}
                                        onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, isSamePower: e.target.checked })}
                                        disabled={!isAdmin}
                                        className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black transition-all disabled:opacity-50"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black">Bilateral Sync</span>
                                </label>

                                <div className="h-4 w-px bg-gray-200"></div>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={eyePowerData?.isCylindrical}
                                        onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, isCylindrical: e.target.checked })}
                                        disabled={!isAdmin}
                                        className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black transition-all disabled:opacity-50"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black">Astigmatic Correction</span>
                                </label>

                                <div className="h-4 w-px bg-gray-200"></div>

                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={eyePowerData?.hasAdditionalPower}
                                        onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, hasAdditionalPower: e.target.checked })}
                                        disabled={!isAdmin}
                                        className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black transition-all disabled:opacity-50"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black">Near Addition</span>
                                </label>
                            </div>

                            {/* Distance Vision Section */}
                            <div className={`grid grid-cols-1 ${eyePowerData?.isSamePower ? '' : 'md:grid-cols-2'} gap-10`}>
                                {/* Right Eye */}
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] border-l-4 border-black pl-4">
                                        {eyePowerData?.isSamePower ? "Bilateral Distance" : "Distance — RE"}
                                    </h3>
                                    <div className={`grid ${eyePowerData?.isCylindrical ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH</label>
                                            <input type="text" value={eyePowerData?.re?.sph || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, re: { ...eyePowerData.re, sph: e.target.value } })} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" placeholder="0.00" />
                                        </div>
                                        {eyePowerData?.isCylindrical && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL</label>
                                                    <input type="text" value={eyePowerData?.re?.cyl || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, re: { ...eyePowerData.re, cyl: e.target.value } })} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" placeholder="0.00" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                                                    <input type="text" value={eyePowerData?.re?.axis || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, re: { ...eyePowerData.re, axis: e.target.value } })} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" placeholder="180" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Left Eye */}
                                {!eyePowerData?.isSamePower && (
                                    <div className="space-y-6">
                                        <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] border-l-4 border-black pl-4">Distance — LE</h3>
                                        <div className={`grid ${eyePowerData?.isCylindrical ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH</label>
                                                <input type="text" value={eyePowerData?.le?.sph || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, le: { ...eyePowerData.le, sph: e.target.value } })} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" placeholder="0.00" />
                                            </div>
                                            {eyePowerData?.isCylindrical && (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL</label>
                                                        <input type="text" value={eyePowerData?.le?.cyl || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, le: { ...eyePowerData.le, cyl: e.target.value } })} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" placeholder="0.00" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                                                        <input type="text" value={eyePowerData?.le?.axis || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, le: { ...eyePowerData.le, axis: e.target.value } })} disabled={!isAdmin} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[14px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50" placeholder="180" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Near Vision Section */}
                            {eyePowerData?.hasAdditionalPower && (
                                <div className="bg-black text-white p-8 rounded-[32px] space-y-8 animate-in slide-in-from-top-4 duration-500 shadow-2xl">
                                    <div className="flex items-center gap-10 border-b border-white/10 pb-6">
                                        <div className="w-40 space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">ADD Coefficient</label>
                                            <input type="text" value={eyePowerData?.add || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, add: e.target.value })} disabled={!isAdmin} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[18px] font-mono font-black text-center focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50" placeholder="+2.00" />
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic pt-8">Dynamic Near-Vision Sync Active</p>
                                    </div>
                                    <div className={`grid grid-cols-1 ${eyePowerData?.isSamePower ? '' : 'md:grid-cols-2'} gap-10`}>
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] border-l-4 border-white pl-4">Near — RE</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <input type="text" value={eyePowerData?.adl_re?.sph || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, adl_re: { ...eyePowerData.adl_re, sph: e.target.value } })} disabled={!isAdmin} className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-black text-center" />
                                                <input type="text" value={eyePowerData?.adl_re?.cyl || ''} disabled className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-black text-center opacity-30" />
                                                <input type="text" value={eyePowerData?.adl_re?.axis || ''} disabled className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-black text-center opacity-30" />
                                            </div>
                                        </div>
                                        {!eyePowerData?.isSamePower && (
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] border-l-4 border-white pl-4">Near — LE</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <input type="text" value={eyePowerData?.adl_le?.sph || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, adl_le: { ...eyePowerData.adl_le, sph: e.target.value } })} disabled={!isAdmin} className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-black text-center" />
                                                    <input type="text" value={eyePowerData?.adl_le?.cyl || ''} disabled className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-black text-center opacity-30" />
                                                    <input type="text" value={eyePowerData?.adl_le?.axis || ''} disabled className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono font-black text-center opacity-30" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Laboratory Directives</label>
                                <textarea rows="2" value={eyePowerData?.notes || ''} onChange={e => isAdmin && setEyePowerData({ ...eyePowerData, notes: e.target.value })} disabled={!isAdmin} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold h-24 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all disabled:opacity-50" placeholder="Lens material, coating specs, etc..."></textarea>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
                            <button onClick={() => setShowEyePowerModal(false)} className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Discard</button>
                            <button
                                disabled={!isAdmin}
                                onClick={() => {
                                    if (!isAdmin) return;
                                    const { isSamePower } = eyePowerData || {};
                                    const normalizedPrescription = isSamePower
                                        ? {
                                            ...eyePowerData,
                                            le: { ...(eyePowerData?.re || {}) },
                                            adl_le: { ...(eyePowerData?.adl_re || {}) },
                                        }
                                        : { ...eyePowerData };

                                    setItems(items => items.map(it => it.id === eyePowerTargetItemId ? { ...it, prescription: { ...normalizedPrescription } } : it));
                                    setShowEyePowerModal(false);
                                }}
                                className="px-10 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                            >
                                Commmit Specs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Disable Order Modal */}
            {showDisableModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] w-full max-w-md p-10 shadow-2xl border border-white/20">
                        <div className="flex items-center justify-center w-20 h-20 rounded-[24px] bg-black mx-auto mb-8 shadow-xl">
                            <AlertCircle className="text-white" size={40} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black text-black mb-3 text-center uppercase tracking-tighter">
                            {orderDisabled ? 'Activate Entity?' : 'Archive Record?'}
                        </h2>
                        <p className="text-[11px] font-bold text-gray-400 text-center uppercase tracking-widest leading-relaxed mb-10 px-4">
                            {orderDisabled 
                                ? 'Restoring technical visibility and metric inclusion for this operational unit.' 
                                : 'Hidden from operational flows and analytical indices. Entity remains in cold storage.'}
                        </p>
                        <div className="flex items-center gap-3 border-t border-gray-100 pt-8">
                            <button 
                                onClick={() => setShowDisableModal(false)} 
                                className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors"
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handleDisableOrder} 
                                disabled={disablingOrder}
                                className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20"
                            >
                                {disablingOrder ? 'Syncing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddProductModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-10">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-black tracking-tighter uppercase">Register Item</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Append New Inventory Entity</p>
                                </div>
                                <button onClick={() => setShowAddProductModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={28} strokeWidth={3} />
                                </button>
                            </div>

                            <form onSubmit={handleAddProduct} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Entity Designation</label>
                                    <input
                                        type="text"
                                        value={newProduct.name}
                                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                        placeholder="Identification Name..."
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Classification</label>
                                    <div className="relative group">
                                        <select
                                            value={newProduct.category_id}
                                            onChange={e => {
                                                const cat = storeCategories.find(c => c.id === e.target.value);
                                                setNewProduct({ ...newProduct, category_id: e.target.value, category: cat?.name || '' });
                                            }}
                                            className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            {storeCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Unit Value</label>
                                        <input
                                            type="number"
                                            value={newProduct.price}
                                            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[14px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Initial Stock</label>
                                        <input
                                            type="number"
                                            value={newProduct.stock}
                                            onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[14px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 flex flex-col gap-3 border-t border-gray-50">
                                    <button
                                        type="submit"
                                        disabled={addingProduct || !newProduct.category_id}
                                        className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                                    >
                                        {addingProduct ? 'Syncing...' : 'Register Entity'}
                                    </button>
                                    <button type="button" onClick={() => setShowAddProductModal(false)} className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors">
                                        Abort Operation
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
