import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Save, Plus, Trash2, X, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";
import CommandDialog from "../components/common/CommandDialog";
import { OVERLAY_CHROME_STYLE } from "../components/common/overlayChrome";
import { usePopup } from "../components/common/PopupProvider";

export default function CreateOrder({ userProfile }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { showAlert } = usePopup();
    const initialCustomer = location.state?.customer || {};

    const isCustomerLocked = !!location.state?.customer;
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [selectedPrescriptionId, setSelectedPrescriptionId] = useState("");

    const [customer, setCustomer] = useState({
        id: initialCustomer.id || "",
        name: initialCustomer.name || "",
        phone: initialCustomer.phone || "",
        street: initialCustomer.street || "",
        town: initialCustomer.town || "",
        district: initialCustomer.district || "",
        state: initialCustomer.state || "",
        email: initialCustomer.email || "",
        age: initialCustomer.age || ""
    });

    const [showRegModal, setShowRegModal] = useState(false);
    const [regForm, setRegForm] = useState({
        name: "",
        phone: "",
        age: "",
        email: "",
        street: "",
        town: "",
        district: "",
        state: ""
    });

    useEffect(() => {
        if (location.state?.triggerRegisterModal && location.state?.customer?.phone) {
            setRegForm(prev => ({ ...prev, phone: location.state.customer.phone }));
            setShowRegModal(true);
            // Clear navigation state parameter trigger so it doesn't reopen
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);



    useEffect(() => {
        const fetchCustomerDetails = async () => {
            // Avoid refetching/resetting if switching between profiles that are already loaded in the list
            const isExistingProfile = profiles.some(p => p.id === selectedProfile?.id);
            const matchesExistingPhone = profiles.some(p => p.phone === customer.phone) || (profiles[0] && profiles[0].phone === customer.phone);
            if (isExistingProfile && matchesExistingPhone) {
                return;
            }

            if (customer.phone && customer.phone.length >= 10) {
                try {
                    const { data: matchedCustomers, error: primaryError } = await supabase
                        .from('customers')
                        .select('*')
                        .eq('phone', customer.phone);

                    if (primaryError) throw primaryError;

                    if (matchedCustomers && matchedCustomers.length > 0) {
                        const primaryData = matchedCustomers.find(c => !c.parent_id) || matchedCustomers[0];
                        let dependentsData = [];

                        if (primaryData) {
                            const { data: deps, error: dependentsError } = await supabase
                                .from('customers')
                                .select('*')
                                .eq('parent_id', primaryData.id);
                            if (!dependentsError && deps) {
                                dependentsData = deps;
                            }
                        }

                        const profileMap = new Map();
                        matchedCustomers.forEach(c => {
                            profileMap.set(c.id, {
                                ...c,
                                label: c.parent_id ? `Dependent (${c.relationship || "Family"})` : "Primary Profile"
                            });
                        });

                        dependentsData.forEach(c => {
                            if (!profileMap.has(c.id)) {
                                profileMap.set(c.id, {
                                    ...c,
                                    label: `Dependent (${c.relationship || "Family"})`
                                });
                            }
                        });

                        const allProfiles = Array.from(profileMap.values());
                        setProfiles(allProfiles);
                        
                        if (!selectedProfile) {
                            const initialProfileId = (customer.phone === initialCustomer.phone) ? location.state?.initialSelectedProfileId : null;
                            const targetProfile = allProfiles.find(p => p.id === initialProfileId) || allProfiles[0];
                            setSelectedProfile(targetProfile);
                            
                            const isDep = !!targetProfile.parent_id;
                            const primary = isDep ? (primaryData || targetProfile) : targetProfile;
                            setCustomer(prev => ({
                                ...prev,
                                id: primary.id || "",
                                name: targetProfile.name || "",
                                phone: primary.phone || customer.phone,
                                street: primary.street || "",
                                town: primary.town || "",
                                district: primary.district || "",
                                state: primary.state || "",
                                email: primary.email || "",
                                age: targetProfile.age || ""
                            }));

                            // setDependent calls removed
                        }
                    } else {
                        setProfiles([]);
                        setSelectedProfile(null);
                        setPrescriptions([]);
                        setSelectedPrescriptionId("");
                    }
                } catch (err) {
                    console.error("Error auto-fetching customer profiles:", err);
                }
            } else {
                setProfiles([]);
                setSelectedProfile(null);
                setPrescriptions([]);
                setSelectedPrescriptionId("");
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCustomerDetails();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [customer.phone, profiles, selectedProfile, initialCustomer.phone, location.state?.initialSelectedProfileId]);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            if (selectedProfile?.id) {
                try {
                    const { data, error } = await supabase
                        .from('prescriptions')
                        .select('*')
                        .eq('customer_id', selectedProfile.id)
                        .order('prescribed_at', { ascending: false });

                    if (!error && data) {
                        setPrescriptions(data);
                        if (data.length > 0) {
                            setSelectedPrescriptionId(data[0].id);
                        } else {
                            setSelectedPrescriptionId("");
                        }
                    }
                } catch (err) {
                    console.error("Error fetching prescriptions:", err);
                }
            } else {
                setPrescriptions([]);
                setSelectedPrescriptionId("");
            }
        };
        fetchPrescriptions();
    }, [selectedProfile]);

    const handleProfileSelect = (p) => {
        setSelectedProfile(p);
        const primary = profiles.find(profile => !profile.parent_id) || p;
        setCustomer({
            id: primary.id || "",
            name: p.name || "",
            phone: primary.phone || customer.phone,
            street: primary.street || "",
            town: primary.town || "",
            district: primary.district || "",
            state: primary.state || "",
            email: primary.email || "",
            age: p.age || ""
        });

        // setDependent calls removed
    };

    const [items, setItems] = useState([
        { id: 1, name: "", type: "Lens", qty: 1, price: 0, discount: 0, product_id: null, stock: null, prescription: null, category_id: null, sgst: 0, cgst: 0, igst: 0 }
    ]);

    const [voucherCode, setVoucherCode] = useState("");
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState("");


    const [activeItemSearch, setActiveItemSearch] = useState(null);
    // Per-item suggestions so row 1 and row 2 never share the same dropdown list
    const [productSuggestions, setProductSuggestions] = useState({});

    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', category: '', category_id: '', price: '', stock: '10' });
    const [addingProduct, setAddingProduct] = useState(false);
    const [pendingItemIndex, setPendingItemIndex] = useState(null);

    const [loading, setLoading] = useState(false);

    const [searchingItems, setSearchingItems] = useState({});
    const searchTimeoutRef = useRef({});
    const priceInputRefs = useRef({});
    const productInputRefs = useRef({});
    const [dropdownLayout, setDropdownLayout] = useState(null);
    const [highlightedRow, setHighlightedRow] = useState(null);

    const handleRegisterCustomer = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const newCustId = generateId(ID_RULES.CUSTOMERS.prefix, ID_RULES.CUSTOMERS.digits);
            const { data: newCust, error: custError } = await supabase
                .from('customers')
                .insert([{
                    id: newCustId,
                    name: regForm.name,
                    phone: regForm.phone,
                    street: regForm.street,
                    town: regForm.town,
                    district: regForm.district,
                    state: regForm.state,
                    email: regForm.email || null,
                    age: regForm.age ? Number(regForm.age) : null,
                    created_at: new Date().toISOString()
                }])
                .select('*')
                .single();

            if (custError) throw custError;

            // Update local state to select this new customer profile
            const profileWithLabel = { ...newCust, label: "Primary Profile" };
            setProfiles([profileWithLabel]);
            setSelectedProfile(profileWithLabel);
            setCustomer({
                id: newCust.id,
                name: newCust.name,
                phone: newCust.phone,
                street: newCust.street || "",
                town: newCust.town || "",
                district: newCust.district || "",
                state: newCust.state || "",
                email: newCust.email || "",
                age: newCust.age || ""
            });
            setShowRegModal(false);
        } catch (err) {
            showAlert("Error registering customer: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showConfirmSave, setShowConfirmSave] = useState(false);
    const [payments, setPayments] = useState([{ id: Date.now(), mode: 'Cash', amount: '' }]);

    const roleLower = userProfile?.role?.toLowerCase();
    const isAdmin = roleLower === 'admin' || roleLower === 'super_admin';
    const [selectedStore, setSelectedStore] = useState("");
    const [stores, setStores] = useState([]);
    const [storeCategories, setStoreCategories] = useState([]);

    const currentStoreId = selectedStore || userProfile?.store_id || "";
    const storeSelectionRequired = isAdmin && !selectedStore;
    const typeOptions = storeCategories.length > 0
        ? Array.from(new Set(storeCategories.map(c => c.name).filter(Boolean)))
        : ["Frame", "Lens", "Contact Lens", "Accessory"];
    const getDefaultItemType = () => typeOptions[0] || "Frame";

    useEffect(() => {
        if (isAdmin) {
            supabase.from('store').select('*').order('name').then(({ data }) => setStores(data || []));
        } else if (userProfile?.store_id) {
            setSelectedStore(userProfile.store_id);
        }
    }, [isAdmin, userProfile]);

    useEffect(() => {
        const fetchStoreCategories = async () => {
            if (!currentStoreId) {
                setStoreCategories([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name')
                    .order('name', { ascending: true });

                if (error) {
                    console.error('Error fetching store categories:', error.message);
                    setStoreCategories([]);
                } else {
                    setStoreCategories(data || []);
                }
            } catch (err) {
                console.error('Error fetching store categories:', err.message || err);
                setStoreCategories([]);
            }
        };

        fetchStoreCategories();
    }, [currentStoreId]);

    const closeProductSearch = useCallback(() => {
        setActiveItemSearch(null);
        setDropdownLayout(null);
    }, []);

    const updateDropdownLayout = useCallback((itemId) => {
        if (!itemId) return;

        const inputEl = productInputRefs.current[itemId];
        if (!inputEl) return;

        const rect = inputEl.getBoundingClientRect();
        const viewportPadding = 12;
        const availableWidth = window.innerWidth - (viewportPadding * 2);
        const minWidth = Math.min(320, availableWidth);
        const width = Math.min(500, Math.max(rect.width, minWidth), availableWidth);
        const left = Math.min(
            Math.max(viewportPadding, rect.left),
            window.innerWidth - width - viewportPadding
        );

        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(180, (placeAbove ? spaceAbove : spaceBelow) - 10);

        setDropdownLayout({
            left,
            width,
            top: placeAbove ? rect.top - 8 : rect.bottom + 8,
            maxHeight,
            placeAbove
        });
    }, []);

    const openProductSearch = useCallback((itemId) => {
        setActiveItemSearch(itemId);
        requestAnimationFrame(() => updateDropdownLayout(itemId));
    }, [updateDropdownLayout]);

    useEffect(() => {
        if (!activeItemSearch) return undefined;

        const handleReposition = () => updateDropdownLayout(activeItemSearch);

        handleReposition();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);

        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [activeItemSearch, updateDropdownLayout]);

    const addItem = () => {
        if (storeSelectionRequired) {
            showAlert("Please select a store first.");
            return;
        }

        setItems(prev => [...prev, { id: Date.now(), name: "", type: getDefaultItemType(), qty: 1, price: 0, discount: 0, product_id: null, stock: null, prescription: null, category_id: null, sgst: 0, cgst: 0, igst: 0 }]);
    };

    const removeItem = (id) => {
        setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev);
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Removed old inline power helper methods

    const handleProductSearch = (id, value) => {
        updateItem(id, 'name', value);
        // Only clear product_id if the user is actually changing the name (not just refocusing)
        updateItem(id, 'product_id', null);

        if (searchTimeoutRef.current[id]) {
            clearTimeout(searchTimeoutRef.current[id]);
        }

        if (!value.trim()) {
            closeProductSearch();
            setProductSuggestions(prev => ({ ...prev, [id]: [] }));
            setSearchingItems(prev => ({ ...prev, [id]: false }));
            return;
        }

        if (!currentStoreId) {
            closeProductSearch();
            setProductSuggestions(prev => ({ ...prev, [id]: [] }));
            setSearchingItems(prev => ({ ...prev, [id]: false }));
            updateItem(id, 'searchError', 'Please select a store first.');
            return;
        }

        openProductSearch(id);

        setSearchingItems(prev => ({ ...prev, [id]: true }));
        updateItem(id, 'searchError', null);

        searchTimeoutRef.current[id] = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('id, name, base_price, category_id, categories(name), store_inventory!inner(stock_quantity, unit_price)')
                    .eq('store_inventory.store_id', currentStoreId)
                    .ilike('name', `%${value.trim()}%`)
                    .order('name', { ascending: true })
                    .limit(15);

                if (error) throw error;

                const mapped = data.map(p => ({
                    ...p,
                    price: p.store_inventory?.[0]?.unit_price || p.base_price,
                    stock: p.store_inventory?.[0]?.stock_quantity || 0
                }));

                // Store suggestions per item id so each row has its own independent list
                setProductSuggestions(prev => ({ ...prev, [id]: mapped || [] }));
            } catch (err) {
                console.error('Error fetching products:', err);
                updateItem(id, 'searchError', err.message);
                setProductSuggestions(prev => ({ ...prev, [id]: [] }));
            } finally {
                setSearchingItems(prev => ({ ...prev, [id]: false }));
            }
        }, 350);
    };

    const handleCancelAddProduct = () => {
        setItems(prev => prev.map(i => i.id === pendingItemIndex ? { ...i, name: '' } : i));
        setShowAddProductModal(false);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (!currentStoreId) {
            showAlert('Please select a store first.');
            return;
        }

        setAddingProduct(true);
        try {
            const customSku = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);
            
            // 1. Insert into products (catalog)
            const { data: prodData, error: prodError } = await supabase.from('products').insert([{
                sku: customSku,
                name: newProduct.name,
                category_id: newProduct.category_id,
                base_price: Number(newProduct.price)
            }]).select('id').single();
            
            if (prodError) throw prodError;
            const internalId = prodData.id;

            // 2. Insert into store_inventory
            const { error: invError } = await supabase.from('store_inventory').insert([{
                store_id: currentStoreId,
                product_id: internalId,
                stock_quantity: Number(newProduct.stock),
                unit_price: Number(newProduct.price)
            }]);
            if (invError) throw invError;

            setItems(items.map(i => i.id === pendingItemIndex ? {
                ...i,
                name: newProduct.name,
                price: newProduct.price,
                product_id: internalId,
                stock: newProduct.stock,
                category_id: newProduct.category_id
            } : i));

            setShowAddProductModal(false);
        } catch (err) {
            showAlert('Failed to add product: ' + err.message);
        } finally {
            setAddingProduct(false);
        }
    };

    const selectProduct = async (item, product) => {
        if (items.some(i => i.id !== item.id && i.product_id === product.id)) {
            showAlert('This product is already added to the order.');
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: '', product_id: null, price: 0, stock: null, prescription: null, category_id: null, sgst: 0, cgst: 0, igst: 0 } : i));
            closeProductSearch();
            setProductSuggestions(prev => ({ ...prev, [item.id]: [] }));
            return;
        }

        // Fetch category tax rates if product has category
        let categoryTaxes = { category_id: null, sgst: 0, cgst: 0, igst: 0 };
        if (product.category_id) {
            try {
                const { data, error } = await supabase
                    .from('product_categories')
                    .select('id, sgst, cgst, igst')
                    .eq('id', product.category_id)
                    .maybeSingle();

                if (!error && data) {
                    categoryTaxes = {
                        category_id: data.id,
                        sgst: data.sgst || 0,
                        cgst: data.cgst || 0,
                        igst: data.igst || 0
                    };
                }
            } catch (err) {
                console.error('Error fetching category taxes:', err);
            }
        }

        const selectedType = product.categories?.name || item.type || getDefaultItemType();

        setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            name: product.name,
            price: product.price,
            product_id: product.id,
            stock: product.stock,
            type: selectedType,
            ...categoryTaxes,
            searchError: null
        } : i));
        closeProductSearch();
        setProductSuggestions(prev => ({ ...prev, [item.id]: [] }));

        setHighlightedRow(item.id);
        setTimeout(() => setHighlightedRow(null), 1000);

        setTimeout(() => {
            if (priceInputRefs.current[item.id]) {
                priceInputRefs.current[item.id].focus();
                priceInputRefs.current[item.id].select();
            }
        }, 50);
    };

    // Removed inline power save handlers

    const handleApplyVoucher = async () => {
        setVoucherError("");

        if (!currentStoreId) {
            setVoucherError("Please select a store first");
            setAppliedVoucher(null);
            return;
        }

        if (!voucherCode.trim()) {
            setAppliedVoucher(null);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('voucher')
                .select('*')
                .eq('voucher_no', voucherCode.trim())
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                setVoucherError("Invalid voucher code");
                setAppliedVoucher(null);
                return;
            }

            // Check store applicability
            if (!data.applies_to_all_stores && data.store_id !== currentStoreId) {
                setVoucherError("This voucher is not applicable to the selected store");
                setAppliedVoucher(null);
                return;
            }

            // Check if already used
            if (data.order_id) {
                setVoucherError("This voucher has already been used");
                setAppliedVoucher(null);
                return;
            }

            setAppliedVoucher(data);
        } catch (err) {
            console.error("Voucher error:", err);
            setVoucherError("Failed to apply voucher");
            setAppliedVoucher(null);
        }
    };

    // Calculations
    // Inclusive Calculations
    const totalLineAmounts = items.map(item => {
        const lineTotal = (Number(item.price) * Number(item.qty)) - Number(item.discount);
        const taxRate = Number(item.sgst || 0) + Number(item.cgst || 0) + Number(item.igst || 0);
        
        const taxable = lineTotal / (1 + (taxRate / 100));
        const sgstAmt = (taxable * Number(item.sgst || 0)) / 100;
        const cgstAmt = (taxable * Number(item.cgst || 0)) / 100;
        const igstAmt = (taxable * Number(item.igst || 0)) / 100;

        return {
            ...item,
            lineTotal,
            taxable,
            sgstAmt,
            cgstAmt,
            igstAmt,
            taxRate
        };
    });

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
    const rowDiscounts = items.reduce((sum, item) => sum + (Number(item.discount)), 0);
    const voucherDiscountAmount = appliedVoucher ? (subtotal * (Number(appliedVoucher.discount_percent || 0) / 100)) : 0;
    const totalDiscount = rowDiscounts + voucherDiscountAmount;
    
    // Total amount the customer pays
    const grossTotal = subtotal - totalDiscount;
    
    // Derived Taxable and Tax Components from the gross total
    const totalTaxable = totalLineAmounts.reduce((sum, item) => sum + item.taxable, 0);
    const totalSgst = totalLineAmounts.reduce((sum, item) => sum + item.sgstAmt, 0);
    const totalCgst = totalLineAmounts.reduce((sum, item) => sum + item.cgstAmt, 0);

    const handleAddPayment = () => {
        setPayments([...payments, { id: Date.now(), mode: 'UPI', amount: '' }]);
    };

    const removePayment = (id) => {
        if (payments.length > 1) {
            setPayments(payments.filter(p => p.id !== id));
        }
    };

    const updatePayment = (id, field, value) => {
        setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalAccounted = totalPaid;
    const paymentGap = (grossTotal - totalPaid).toFixed(2);
    const finalDueAmount = "0.00";

    const handleFinalSave = () => {
        setShowConfirmSave(true);
    };

    const executeFinalSave = async () => {
        setLoading(true);
        try {
            let customerId = null;
            if (selectedProfile) {
                const isDep = !!selectedProfile.parent_id;
                const primary = isDep 
                    ? profiles.find(p => !p.parent_id) 
                    : selectedProfile;
                customerId = selectedProfile.id;

                if (isDep) {
                    // Update parent contact info only
                    if (primary) {
                        const { error: parentUpdateError } = await supabase.from('customers').update({
                            street: customer.street,
                            town: customer.town,
                            district: customer.district,
                            state: customer.state,
                            email: customer.email || null
                        }).eq('id', primary.id);
                        if (parentUpdateError) throw parentUpdateError;
                    }

                    // Update dependent name and age only
                    const { error: depUpdateError } = await supabase.from('customers').update({
                        name: customer.name,
                        age: customer.age ? Number(customer.age) : null
                    }).eq('id', selectedProfile.id);
                    if (depUpdateError) throw depUpdateError;
                } else {
                    // Update primary details
                    const { error: parentUpdateError } = await supabase.from('customers').update({
                        name: customer.name,
                        street: customer.street,
                        town: customer.town,
                        district: customer.district,
                        state: customer.state,
                        email: customer.email || null,
                        age: customer.age ? Number(customer.age) : null
                    }).eq('id', selectedProfile.id);
                    if (parentUpdateError) throw parentUpdateError;
                }
            } else {
                // Create new primary customer
                const { data: existingCustomers } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('phone', customer.phone)
                    .limit(1);

                const existingCustomer = existingCustomers && existingCustomers.length > 0 ? existingCustomers[0] : null;

                if (existingCustomer) {
                    customerId = existingCustomer.id;
                    // Update parent customer details
                    const { error: parentUpdateError } = await supabase.from('customers').update({
                        name: customer.name,
                        street: customer.street,
                        town: customer.town,
                        district: customer.district,
                        state: customer.state,
                        email: customer.email || null,
                        age: customer.age ? Number(customer.age) : null
                    }).eq('id', customerId);
                    if (parentUpdateError) throw parentUpdateError;
                } else {
                    const newCustId = generateId(ID_RULES.CUSTOMERS.prefix, ID_RULES.CUSTOMERS.digits);
                    const { data: newCust, error: custError } = await supabase.from('customers').insert([{
                        id: newCustId,
                        name: customer.name,
                        phone: customer.phone,
                        street: customer.street,
                        town: customer.town,
                        district: customer.district,
                        state: customer.state,
                        email: customer.email || null,
                        age: customer.age ? Number(customer.age) : null,
                        created_at: new Date().toISOString()
                    }]).select('id').single();
                    if (custError) throw custError;
                    customerId = newCust.id;
                }
            }

            const newOrderNumber = generateId(ID_RULES.ORDERS.prefix, ID_RULES.ORDERS.digits);
            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                order_number: newOrderNumber,
                store_id: currentStoreId,
                customer_id: customerId,
                prescription_id: selectedPrescriptionId || null,
                status: Number(finalDueAmount) > 0 ? "pending" : "processing",
                discount_amount: totalDiscount,
                due_amount: Number(finalDueAmount),
                net_amount: grossTotal,
                subtotal: subtotal,
                tax_amount: totalSgst + totalCgst,
                payment_status: Number(finalDueAmount) > 0 ? (Number(totalPaid) > 0 ? "partially_paid" : "unpaid") : "fully_paid",
                created_at: new Date().toISOString()
            }]).select('id').single();

            if (orderError) throw orderError;
            const orderId = orderData.id;

            const orderItemsPayload = totalLineAmounts.map(item => ({
                order_id: orderId,
                product_id: item.product_id,
                quantity: Number(item.qty),
                unit_price: Number(item.price),
                discount_amount: Number(item.discount || 0),
                total_price: item.lineTotal
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw itemsError;

            const orderIdForVoucher = orderId; // Local binding for voucher scope to resolve any unused variables
            const orderIdForStock = orderId;

            // Mark voucher as used
            if (appliedVoucher) {
                await supabase.from('voucher').update({ order_id: orderId }).eq('id', appliedVoucher.id);
            }

            // Update Stock in store_inventory
            for (const item of items) {
                if (!item.product_id) continue;
                
                const { data: invData } = await supabase
                    .from('store_inventory')
                    .select('stock_quantity')
                    .eq('store_id', currentStoreId)
                    .eq('product_id', item.product_id)
                    .maybeSingle();

                if (invData) {
                    const newStock = Math.max(0, (invData.stock_quantity || 0) - Number(item.qty));
                    await supabase
                        .from('store_inventory')
                        .update({ stock_quantity: newStock })
                        .eq('store_id', currentStoreId)
                        .eq('product_id', item.product_id);
                }
            }

            await showAlert(`Invoice ${newOrderNumber} Saved Successfully!`);
            navigate('/orders');
        } catch (err) {
            showAlert('Error creating invoice: ' + err.message);
        } finally {
            setLoading(false);
            setShowPaymentModal(false);
        }
    };

    const handleSaveInvoice = (e) => {
        e.preventDefault();

        if (!currentStoreId) {
            showAlert("Please select a store before creating the invoice.");
            return;
        }

        if (!customer.name || !customer.phone) {
            showAlert("Customer Name and Phone are required.");
            return;
        }

        const errors = [];
        const incompleteItems = [];
        const emptyItems = [];

        items.forEach((item, index) => {
            const rowNum = index + 1;
            if (!item.name.trim()) {
                emptyItems.push(rowNum);
            } else if (!item.product_id) {
                incompleteItems.push({ item, rowNum });
            }
        });

        if (items.length === 1 && emptyItems.length === 1) {
            showAlert("Please add at least one valid product to the order.");
            return;
        }

        if (emptyItems.length > 0) {
            errors.push(`Row(s) [${emptyItems.join(', ')}] are completely empty. Please remove them.`);
        }

        if (incompleteItems.length > 0) {
            const rowNums = incompleteItems.map(i => i.rowNum).join(', ');
            errors.push(`Row(s) [${rowNums}] have a typed name but no valid product selected.`);
        }

        if (errors.length > 0) {
            showAlert("Cannot save invoice due to the following errors:\n\n" + errors.join("\n"));
            if (incompleteItems.length > 0) {
                const first = incompleteItems[0].item;
                setNewProduct({ name: first.name, category: first.type, price: first.price || '', stock: '10' });
                setPendingItemIndex(first.id);
                setShowAddProductModal(true);
            }
            return;
        }

        // Pre-fill the first payment with total amount for convenience but leave mode empty to enforce selection
        setPayments([{ id: Date.now(), mode: '', amount: grossTotal.toFixed(2) }]);
        setShowPaymentModal(true);
    };
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/orders')}
                        className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:bg-black hover:text-white transition-all"
                    >
                        <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Create Sale</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Record detailed order and prescription</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                            <select
                                value={selectedStore}
                                onChange={e => setSelectedStore(e.target.value)}
                                className="appearance-none bg-transparent text-xs font-black text-black uppercase focus:outline-none cursor-pointer pr-8 py-1"
                            >
                                <option value="">Select Store</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-black -ml-6" />
                        </div>
                    )}
                    <button onClick={handleSaveInvoice} disabled={loading || storeSelectionRequired} className="flex items-center gap-2 px-8 py-3 bg-black text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all disabled:opacity-30">
                        <Save size={18} /> {loading ? "Processing..." : "Save"}
                    </button>
                </div>
            </div>

            {storeSelectionRequired && (
                <div className="p-4 rounded-2xl bg-gray-100 border border-black text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-3 animate-pulse">
                    <X size={16} strokeWidth={3} /> Select a store to unlock invoice actions
                </div>
            )}

            <div className={storeSelectionRequired ? "opacity-30 pointer-events-none" : ""}>

                <div className="grid grid-cols-1 gap-8">
                    {/* Customer Details */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
                        <div className="flex flex-col gap-1 border-b border-gray-50 pb-4">
                            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Customer Identity</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal and contact information</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name *</label>
                                <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight disabled:opacity-60" placeholder="JOHN DOE" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Age</label>
                                <input type="number" value={customer.age || ''} onChange={e => setCustomer({ ...customer, age: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-mono font-bold disabled:opacity-60" placeholder="AGE" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Mobile Number *</label>
                                <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight disabled:opacity-60" placeholder="+91" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
                                <input type="email" value={customer.email || ''} onChange={e => setCustomer({ ...customer, email: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight disabled:opacity-60" placeholder="INFO@EXAMPLE.COM" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Street / Landmark</label>
                                <input type="text" value={customer.street} onChange={e => setCustomer({ ...customer, street: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight disabled:opacity-60" placeholder="STREET NAME" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Town / City</label>
                                <input type="text" value={customer.town} onChange={e => setCustomer({ ...customer, town: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight disabled:opacity-60" placeholder="TOWN" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">District</label>
                                <input type="text" value={customer.district} onChange={e => setCustomer({ ...customer, district: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight disabled:opacity-60" placeholder="DISTRICT" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">State</label>
                                <input type="text" value={customer.state} onChange={e => setCustomer({ ...customer, state: e.target.value })} disabled={isCustomerLocked} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight disabled:opacity-60" placeholder="STATE" />
                            </div>
                        </div>

                        {customer.phone && customer.phone.length >= 10 && profiles.length === 0 && (
                            <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col gap-3 border-t border-gray-50 pt-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-black">No customer found</span>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                        No customer profile exists for this phone number. Please create the customer profile first.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRegForm({
                                            name: "",
                                            phone: customer.phone,
                                            age: "",
                                            email: "",
                                            street: "",
                                            town: "",
                                            district: "",
                                            state: ""
                                        });
                                        setShowRegModal(true);
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all text-center"
                                >
                                    Create Customer Profile
                                </button>
                            </div>
                        )}

                        {selectedProfile && (
                            <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-3xl p-6 shadow-sm border-t border-gray-50 pt-6">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Active Profile</span>
                                    <h4 className="text-base font-black uppercase tracking-tight text-black mt-1">{selectedProfile.name}</h4>
                                    <p className="text-[10px] font-mono text-gray-400 mt-1">
                                        Phone: {selectedProfile.phone || customer.phone} {selectedProfile.parent_id ? `• Dependent (${selectedProfile.relationship || "Family"})` : "• Primary Profile"}
                                    </p>
                                </div>
                                {!isCustomerLocked && profiles.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedProfile(null);
                                        }}
                                        className="px-5 py-2.5 border border-black hover:bg-black hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Change Profile
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Customer Family Profiles switcher */}
                        {!isCustomerLocked && !selectedProfile && profiles.length > 0 && (
                            <div className="border-t border-gray-50 pt-6 space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Select Profile</label>
                                <div className="flex flex-wrap gap-3">
                                    {profiles.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => handleProfileSelect(p)}
                                            className="px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {p.name} ({p.label})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm mb-32 z-10 relative overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-black text-white">
                                    <th className="py-4 px-6 text-left text-[9px] font-black uppercase tracking-widest w-12">#</th>
                                    <th className="py-4 px-6 text-left text-[9px] font-black uppercase tracking-widest">Product</th>
                                    <th className="py-4 px-6 text-left text-[9px] font-black uppercase tracking-widest w-32">Type</th>
                                    <th className="py-4 px-6 text-center text-[9px] font-black uppercase tracking-widest w-24">Qty</th>
                                    <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-widest w-32">Unit Price</th>
                                    <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-widest w-32">Discount</th>
                                    <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-widest w-24">Tax</th>
                                    <th className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-widest w-32">Line Total</th>
                                    <th className="py-4 px-6 text-center w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map((item, index) => (
                                    <Fragment key={item.id}>
                                    <tr className={`hover:bg-gray-50 transition-colors group ${highlightedRow === item.id ? 'bg-black/5' : ''}`}>
                                        <td className="py-4 px-6 text-[11px] font-black text-gray-400">{index + 1}</td>
                                        <td className="py-4 px-6">
                                            <div className="relative">
                                                <input
                                                    ref={el => { productInputRefs.current[item.id] = el; }}
                                                    type="text"
                                                    value={item.name}
                                                    onChange={e => handleProductSearch(item.id, e.target.value)}
                                                    className="w-full bg-transparent focus:outline-none text-[11px] font-black uppercase tracking-tight text-black placeholder:text-gray-300"
                                                    placeholder="SEARCH CATALOG…"
                                                />
                                                {activeItemSearch === item.id && dropdownLayout && createPortal(
                                                    <>
                                                        <div className="fixed z-[9998]" style={OVERLAY_CHROME_STYLE} onMouseDown={closeProductSearch} aria-hidden="true" />
                                                        <div
                                                            className="fixed z-[9999] bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-y-auto animate-in zoom-in duration-200"
                                                            style={{
                                                                left: dropdownLayout.left,
                                                                top: dropdownLayout.top,
                                                                width: dropdownLayout.width,
                                                                maxHeight: dropdownLayout.maxHeight,
                                                                transform: dropdownLayout.placeAbove ? 'translateY(calc(-100% - 8px))' : 'none'
                                                            }}
                                                        >
                                                            {item.searchError ? (
                                                                <div className="p-6 text-center">
                                                                    <p className="text-[10px] font-black text-black uppercase tracking-widest">Database Sync Failure</p>
                                                                </div>
                                                            ) : searchingItems[item.id] ? (
                                                                <div className="p-6 text-center flex items-center justify-center gap-3">
                                                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Catalog...</span>
                                                                </div>
                                                            ) : (productSuggestions[item.id] || []).length > 0 ? (
                                                                (productSuggestions[item.id] || []).map(product => (
                                                                    <div
                                                                        key={product.id}
                                                                        onMouseDown={(e) => { e.preventDefault(); selectProduct(item, product); }}
                                                                        className="px-6 py-4 hover:bg-black group/item cursor-pointer border-b border-gray-50 last:border-0 transition-all flex justify-between items-center"
                                                                    >
                                                                        <div>
                                                                            <div className="text-[11px] font-black text-black uppercase tracking-tight group-hover/item:text-white">{product.name}</div>
                                                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{product.categories?.name || 'Uncategorized'}</div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-[11px] font-black text-black group-hover/item:text-white">₹{product.price?.toLocaleString()}</div>
                                                                            <div className={`text-[9px] font-bold uppercase mt-0.5 ${product.stock > 0 ? 'text-gray-400 group-hover/item:text-gray-300' : 'text-gray-300 line-through'}`}>
                                                                                {product.stock > 0 ? `Stock: ${product.stock}` : 'Exhausted'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : item.name.trim() ? (
                                                                <div className="p-8 text-center space-y-4">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No Matches Found</p>
                                                                    <button
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setNewProduct({ name: item.name, category: item.type, price: '', stock: '10' });
                                                                            setPendingItemIndex(item.id);
                                                                            setShowAddProductModal(true);
                                                                            closeProductSearch();
                                                                        }}
                                                                        className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all"
                                                                    >
                                                                        Initialize New Product
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="p-8 text-center">
                                                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Awaiting Input...</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>,
                                                    document.body
                                                 )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1.5">
                                                <input
                                                    type="text"
                                                    value={item.type || ""}
                                                    disabled={!!item.product_id}
                                                    readOnly={!!item.product_id}
                                                    onChange={e => updateItem(item.id, 'type', e.target.value)}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-400 focus:text-black outline-none w-full disabled:opacity-50"
                                                    placeholder="Category"
                                                />
                                                {(item.type === 'Lens' || item.type === 'Contact Lens') && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest py-1 px-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-400">
                                                        Needs Power
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateItem(item.id, 'qty', Math.max(1, Number(item.qty || 1) - 1))}
                                                    className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold transition-all"
                                                >
                                                    -
                                                </button>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    value={item.qty} 
                                                    onChange={e => updateItem(item.id, 'qty', Math.max(1, parseInt(e.target.value, 10) || 1))} 
                                                    className="w-10 text-center bg-transparent focus:outline-none text-[11px] font-black text-black" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => updateItem(item.id, 'qty', Number(item.qty || 1) + 1)}
                                                    className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold transition-all"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-[9px] font-bold text-gray-300">₹</span>
                                                <input type="number" value={item.price} ref={el => priceInputRefs.current[item.id] = el} onChange={e => updateItem(item.id, 'price', e.target.value)} disabled={!isAdmin} className="w-full text-right bg-transparent focus:outline-none text-[11px] font-black text-black font-mono disabled:opacity-50" placeholder="0.00" />
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-[9px] font-bold text-gray-300">₹</span>
                                                <input type="number" value={item.discount} onChange={e => updateItem(item.id, 'discount', e.target.value)} disabled={!isAdmin} className="w-full text-right bg-transparent focus:outline-none text-[11px] font-black text-gray-400 focus:text-black font-mono disabled:opacity-50" placeholder="0.00" />
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">{(Number(item.sgst) + Number(item.cgst)).toFixed(0)}%</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className="text-[11px] font-black text-black tracking-tight font-mono">₹{((Number(item.price) * Number(item.qty)) - Number(item.discount)).toLocaleString()}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button onClick={() => removeItem(item.id)} className="text-gray-200 hover:text-black transition-all">
                                                <Trash2 size={16} strokeWidth={3} />
                                            </button>
                                        </td>
                                    </tr>
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className="w-full py-4 bg-gray-50 hover:bg-black hover:text-white border-t border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2" onClick={addItem}>
                        <Plus size={14} strokeWidth={3} /> Append Line Item
                    </button>
                </div>

                {/* Summary Footer */}
                <div className="flex flex-col lg:flex-row gap-8 justify-between items-start pb-20">
                    <div className="w-full lg:w-3/5 space-y-6">
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Redemption Token</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-widest"
                                    placeholder="ENTER CODE"
                                />
                                <button
                                    onClick={handleApplyVoucher}
                                    className="px-8 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-lg transition-all"
                                >
                                    Apply
                                </button>
                            </div>
                            {voucherError && <p className="text-black text-[10px] font-black uppercase tracking-widest mt-2">{voucherError}</p>}
                            {appliedVoucher && (
                                <div className="p-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex justify-between items-center animate-in zoom-in">
                                    <span>Token Active: {appliedVoucher.voucher_no}</span>
                                    <span className="bg-white text-black px-2 py-1 rounded-lg">-{appliedVoucher.discount_percent}%</span>
                                </div>
                            )}
                        </div>

                        {/* Prescription Selector */}
                        {selectedProfile && (
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                                    <div>
                                        <h3 className="text-sm font-black text-black uppercase tracking-tighter">Optical Prescription</h3>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Select prescription for the order</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/power')}
                                        className="px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:shadow-md transition-all"
                                    >
                                        Manage Powers
                                    </button>
                                </div>
                                
                                {prescriptions.length > 0 ? (
                                    <div className="space-y-4">
                                        <select
                                            value={selectedPrescriptionId}
                                            onChange={e => setSelectedPrescriptionId(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight cursor-pointer"
                                        >
                                            <option value="">No Prescription / Plano</option>
                                            {prescriptions.map(pres => {
                                                const dateStr = new Date(pres.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                                return (
                                                    <option key={pres.id} value={pres.id}>
                                                        Prescription dated {dateStr} {pres.notes ? `(${pres.notes})` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>

                                        {/* Show summary of selected prescription */}
                                        {(() => {
                                            const selectedPres = prescriptions.find(p => p.id === selectedPrescriptionId);
                                            if (!selectedPres) return null;
                                            const hasNV = selectedPres.nv_right_sph || selectedPres.nv_left_sph || selectedPres.nv_right_cyl || selectedPres.nv_left_cyl;
                                            return (
                                                <div className="overflow-x-auto border border-gray-50 rounded-2xl bg-gray-50/50 p-2">
                                                    <table className="w-full text-center">
                                                        <thead>
                                                            <tr className="border-b border-gray-100">
                                                                <th className="px-3 py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Scope</th>
                                                                <th className="px-3 py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Sphere</th>
                                                                <th className="px-3 py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Cyl</th>
                                                                <th className="px-3 py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Axis</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 text-[10px] font-black font-mono text-center">
                                                            <tr>
                                                                <td className="px-3 py-2 uppercase tracking-widest text-black text-[8px] font-sans">RE (DV)</td>
                                                                <td className="px-3 py-2 text-gray-600">{selectedPres.dv_right_sph || '—'}</td>
                                                                <td className="px-3 py-2 text-gray-600">{selectedPres.dv_right_cyl || '—'}</td>
                                                                <td className="px-3 py-2 text-gray-600">{selectedPres.dv_right_axis || '—'}</td>
                                                            </tr>
                                                            <tr>
                                                                <td className="px-3 py-2 uppercase tracking-widest text-black text-[8px] font-sans">LE (DV)</td>
                                                                <td className="px-3 py-2 text-gray-600">{selectedPres.dv_left_sph || '—'}</td>
                                                                <td className="px-3 py-2 text-gray-600">{selectedPres.dv_left_cyl || '—'}</td>
                                                                <td className="px-3 py-2 text-gray-600">{selectedPres.dv_left_axis || '—'}</td>
                                                            </tr>
                                                            {hasNV && (
                                                                <>
                                                                    <tr>
                                                                        <td className="px-3 py-2 uppercase tracking-widest text-black text-[8px] font-sans">RE (NV)</td>
                                                                        <td className="px-3 py-2 text-gray-600">{selectedPres.nv_right_sph || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-600">{selectedPres.nv_right_cyl || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-600">{selectedPres.nv_right_axis || '—'}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="px-3 py-2 uppercase tracking-widest text-black text-[8px] font-sans">LE (NV)</td>
                                                                        <td className="px-3 py-2 text-gray-600">{selectedPres.nv_left_sph || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-600">{selectedPres.nv_left_cyl || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-600">{selectedPres.nv_left_axis || '—'}</td>
                                                                    </tr>
                                                                </>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No prescriptions found for this profile</p>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/power')}
                                            className="mt-3 px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:shadow-md transition-all inline-flex items-center gap-1"
                                        >
                                            Record New Power
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-4">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">System Remarks</label>
                            <textarea rows="3" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight resize-none" placeholder="INTERNAL LOGS..."></textarea>
                        </div>
                    </div>

                    <div className="w-full lg:w-2/5 bg-black text-white rounded-[2rem] shadow-2xl p-10 space-y-8 animate-in slide-in-from-right-4">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Gross Subtotal</span>
                                <span className="text-xl font-black tracking-tighter">₹{subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-400">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Aggregate Discounts</span>
                                <span className="text-lg font-black tracking-tighter">-₹{totalDiscount.toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-white/10 my-4" />
                            <div className="flex justify-between items-center text-gray-400">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Statutory Taxes</span>
                                <span className="text-lg font-black tracking-tighter">₹{(totalSgst + totalCgst).toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div className="pt-8 border-t border-white/20 flex flex-col gap-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Net Payable</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-5xl font-black tracking-tighter leading-none">₹{grossTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-2">All-inclusive finalized value</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Add Product Modal */}
            <CommandDialog
                isOpen={showAddProductModal}
                onClose={handleCancelAddProduct}
                title="New Entity"
                subtitle="Registering unknown catalog item"
                maxWidth="max-w-md"
            >
                <div className="p-8 space-y-6">
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Product Name</label>
                            <input required type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" readOnly />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Classification</label>
                            <select 
                                value={newProduct.category_id} 
                                onChange={e => {
                                    const cat = storeCategories.find(c => c.id === e.target.value);
                                    setNewProduct({ ...newProduct, category_id: e.target.value, category: cat?.name || '' });
                                }} 
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight"
                                required
                            >
                                <option value="">Select Category</option>
                                {storeCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                                <input required type="number" min="0" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Init Stock</label>
                                <input required type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" placeholder="0" />
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={handleCancelAddProduct} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Abort</button>
                            <button type="submit" disabled={addingProduct || !newProduct.category_id} className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all disabled:opacity-50">
                                {addingProduct ? 'Registering...' : 'Register Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </CommandDialog>

            {/* Removed old inline prescription modal */}

            {/* Payment Details Modal */}
            <CommandDialog
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Settlement"
                subtitle={`Aggregate Value: ₹${grossTotal.toLocaleString()}`}
                maxWidth="max-w-lg"
            >
                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        {payments.map((p, idx) => (
                            <div key={p.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mode</label>
                                    <select
                                        value={p.mode}
                                        onChange={e => updatePayment(p.id, 'mode', e.target.value)}
                                        className="w-full bg-transparent text-[11px] font-black uppercase focus:outline-none cursor-pointer"
                                    >
                                        <option value="">Select Mode</option>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Card">Card</option>
                                    </select>
                                </div>
                                <div className="flex-[2]">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Quantum (₹)</label>
                                    <input
                                        type="number"
                                        value={p.amount}
                                        onChange={e => updatePayment(p.id, 'amount', e.target.value)}
                                        className="w-full bg-transparent text-[14px] font-black text-black font-mono focus:outline-none"
                                        placeholder="0.00"
                                        autoFocus={idx === payments.length - 1}
                                    />
                                </div>
                                <button
                                    onClick={() => removePayment(p.id)}
                                    className="p-2 text-gray-300 hover:text-black transition-all"
                                    disabled={payments.length === 1}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={handleAddPayment}
                            className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all"
                        >
                            Add Payment Split
                        </button>
                    </div>

                    <div className="bg-black text-white p-6 rounded-2xl space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-400">Total Recorded</span>
                            <span>₹{totalPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest border-t border-white/10 pt-3">
                            <span className="text-gray-400">Deviation</span>
                            <span className={Number(paymentGap) === 0 ? 'text-white' : 'text-gray-400'}>
                                {Number(paymentGap) === 0 ? '✓ Balanced' : `₹${paymentGap}`}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Back</button>
                        <button
                            onClick={handleFinalSave}
                            disabled={loading || Number(paymentGap) !== 0 || payments.some(p => !p.mode)}
                            className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                            Save
                        </button>
                    </div>
                </div>
            </CommandDialog>

            <CommandDialog
                isOpen={showRegModal}
                onClose={() => setShowRegModal(false)}
                title="Register Customer Profile"
                subtitle="Create a new primary customer record first"
            >
                <form onSubmit={handleRegisterCustomer} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Full Name *</label>
                            <input
                                required
                                type="text"
                                value={regForm.name}
                                onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="Name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Age</label>
                            <input
                                type="number"
                                value={regForm.age}
                                onChange={e => setRegForm({ ...regForm, age: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="Age"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobile Number *</label>
                            <input
                                required
                                type="tel"
                                value={regForm.phone}
                                onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="Mobile"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                            <input
                                type="email"
                                value={regForm.email}
                                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="Email"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Street / Landmark</label>
                            <input
                                type="text"
                                value={regForm.street}
                                onChange={e => setRegForm({ ...regForm, street: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="Street Address"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Town / City</label>
                            <input
                                type="text"
                                value={regForm.town}
                                onChange={e => setRegForm({ ...regForm, town: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="Town"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">District</label>
                            <input
                                type="text"
                                value={regForm.district}
                                onChange={e => setRegForm({ ...regForm, district: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="District"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">State</label>
                            <input
                                type="text"
                                value={regForm.state}
                                onChange={e => setRegForm({ ...regForm, state: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                placeholder="State"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
                    >
                        {loading ? "Registering..." : "Create Profile"}
                    </button>
                </form>
            </CommandDialog>

            {/* Save Confirmation Dialog */}
            {showConfirmSave && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowConfirmSave(false)}
                    />
                    <div className="relative bg-white border border-neutral-250 rounded-[24px] p-8 shadow-2xl max-w-sm w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <h3 className="text-sm font-black text-black uppercase tracking-widest">Confirm Save</h3>
                            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                                Are you sure you want to save this invoice?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmSave(false)}
                                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider border border-neutral-200 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeFinalSave}
                                className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider bg-black text-white rounded-xl hover:bg-neutral-800 transition-colors"
                            >
                                Confirm & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
