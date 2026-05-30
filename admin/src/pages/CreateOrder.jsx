import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Save, Plus, Trash2, X, CheckCircle, Loader2, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";

export default function CreateOrder({ userProfile }) {
    const navigate = useNavigate();
    const location = useLocation();
    const initialCustomer = location.state?.customer || {};
    const [loading, setLoading] = useState(false);

    const [customer, setCustomer] = useState({
        name: initialCustomer.name || "",
        phone: initialCustomer.phone || "",
        street: initialCustomer.street || "",
        town: initialCustomer.town || "",
        district: initialCustomer.district || "",
        state: initialCustomer.state || "",
        email: initialCustomer.email || ""
    });

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            if (customer.phone && customer.phone.length >= 10) {
                try {
                    const { data, error } = await supabase
                        .from('customers')
                        .select('name, street, town, district, state')
                        .eq('phone', customer.phone)
                        .single();
                    if (data && !error) {
                        setCustomer(prev => ({
                            ...prev,
                            name: prev.name || data.name || "",
                            street: prev.street || data.street || "",
                            town: prev.town || data.town || "",
                            district: prev.district || data.district || "",
                            state: prev.state || data.state || ""
                        }));
                    }
                } catch (err) {
                    console.error("Error auto-fetching customer:", err);
                }
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCustomerDetails();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [customer.phone]);

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

    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [activePrescriptionItem, setActivePrescriptionItem] = useState(null);
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

    const [searchingItems, setSearchingItems] = useState({});
    const searchTimeoutRef = useRef({});
    const priceInputRefs = useRef({});
    const productInputRefs = useRef({});
    const [dropdownLayout, setDropdownLayout] = useState(null);
    const [highlightedRow, setHighlightedRow] = useState(null);

    // Power suggestions state
    const [powerSuggestions, setPowerSuggestions] = useState({});
    const [activePowerInput, setActivePowerInput] = useState(null);
    const [powerDropdownLayout, setPowerDropdownLayout] = useState(null);
    const [selectedSigns, setSelectedSigns] = useState({});
    const [signToggleConfirm, setSignToggleConfirm] = useState(null);
    const powerInputRefs = useRef({});

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [payments, setPayments] = useState([{ id: Date.now(), mode: 'Cash', amount: '' }]);

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
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
            alert("Please select a store first.");
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

    const normalizePowerEyeKey = (eye) => {
        if (eye === 'adl_re') return 're';
        if (eye === 'adl_le') return 'le';
        return eye;
    };

    const resolvePrescriptionEye = (eye) => {
        if (eye === 're' || eye === 'adl_re') return 'adl_re' === eye ? 'adl_re' : 're';
        if (eye === 'le' || eye === 'adl_le') return 'adl_le' === eye ? 'adl_le' : 'le';
        return eye;
    };

    // Helper functions for power suggestions
    const generatePowerSuggestions = (input, isForNV = false, fieldKey) => {
        if (!input || input === '') return [];
        
        const parsed = parseFloat(input.trim());
        if (isNaN(parsed)) return [];

        const base = Math.abs(parsed);
        const suggestions = [];
        
        const currentSign = selectedSigns[fieldKey] || (isForNV ? 'positive' : 'negative');
        const signChar = currentSign === 'positive' ? '+' : '-';

        // Generate exactly 4 suggestions: .00, .25, .50, .75
        for (let i = 0; i < 4; i++) {
            const value = base + (i * 0.25);
            suggestions.push(`${signChar}${value.toFixed(2)}`);
        }

        return suggestions;
    };

    const handlePowerInputChange = (e, fieldKey, eye, field) => {
        const value = e.target.value;
        const normalizedEye = normalizePowerEyeKey(eye);
        const key = `${fieldKey}-${normalizedEye}-${field}`;
        const isForNV = fieldKey === 'nv';
        
        // Generate suggestions based on input
        const numericValue = value.replace(/^[+-]/, '').trim();
        const suggestions = generatePowerSuggestions(numericValue || value, isForNV, key);
        setPowerSuggestions(prev => ({ ...prev, [key]: suggestions }));
        setActivePowerInput(key);

        // Update the prescription value
        const eyeObj = resolvePrescriptionEye(eye);
        setTempPrescription(prev => ({
            ...prev,
            [eyeObj]: { ...prev[eyeObj], [field]: value }
        }));

        // Update dropdown layout
        const inputEl = powerInputRefs.current[key];
        if (inputEl) {
            const rect = inputEl.getBoundingClientRect();
            
            setPowerDropdownLayout({
                left: rect.left,
                width: rect.width,
                top: rect.bottom + 2,
                maxHeight: 200
            });
        }
    };

    const selectPowerValue = (value, fieldKey, eye, field, isForNV = false) => {
        // Extract the numeric value
        const numValue = parseFloat(value);

        // Get normalized key for state management first (needed to check selected sign)
        const normalizedEye = normalizePowerEyeKey(eye);
        const key = `${fieldKey}-${normalizedEye}-${field}`;

        // Format value appropriately based on field type
        let displayValue;

        // AXIS is an angle (0-180), preserve user-entered sign
        if (field === 'axis') {
            displayValue = numValue.toFixed(0); // No decimal places for axis
        } else {
            // Check the selected sign for this field
            const currentSign = selectedSigns[key];
            // Determine sign: priority is 1) toggle selection, 2) defaults
            let isPositive;
            if (currentSign === 'positive') {
                isPositive = true;
            } else if (currentSign === 'negative') {
                isPositive = false;
            } else {
                // No toggle selected - use defaults
                isPositive = isForNV; // NV defaults to positive, DV defaults to negative
            }

            if (isPositive) {
                displayValue = `+${Math.abs(numValue).toFixed(2)}`;
            } else {
                displayValue = `-${Math.abs(numValue).toFixed(2)}`;
            }
        }

        // Resolve which prescription object to update
        const eyeObj = resolvePrescriptionEye(eye);

        // Update prescription with formatted value
        setTempPrescription(prev => ({
            ...prev,
            [eyeObj]: { ...prev[eyeObj], [field]: displayValue }
        }));

        // Clear suggestions and close dropdown
        setPowerSuggestions(prev => ({ ...prev, [key]: [] }));
        setActivePowerInput(null);
    };

    const togglePowerSign = (key, makePositive) => {
        const currentSign = selectedSigns[key];
        const targetSign = makePositive ? 'positive' : 'negative';

        // Only show confirmation if sign is actually changing
        if (currentSign === targetSign) {
            return; // Already set to this sign, no action needed
        }

        // Show confirmation dialog
        setSignToggleConfirm({ key, makePositive });
    };

    const confirmSignToggle = () => {
        if (!signToggleConfirm) return;

        const { key, makePositive } = signToggleConfirm;
        const sign = makePositive ? 'positive' : 'negative';
        setSelectedSigns(prev => {
            const next = { ...prev, [key]: sign };

            // If this is the active input, refresh suggestions with the new sign
            if (activePowerInput === key) {
                const inputEl = powerInputRefs.current[key];
                if (inputEl) {
                    const value = inputEl.value;
                    const numericValue = value.replace(/^[+-]/, '').trim();
                    if (numericValue || value) {
                        const isForNV = key.startsWith('nv');
                        const suggestions = generatePowerSuggestions(numericValue || value, isForNV, key);
                        setTimeout(() => {
                            setPowerSuggestions(p => ({ ...p, [key]: suggestions }));
                        }, 0);
                    }
                }
            }

            return next;
        });

        // key format: 'dv-re-sph', 'dv-re-cyl', 'dv-le-sph', 'dv-le-cyl', 'nv-re-sph', 'nv-re-cyl', 'nv-le-sph', 'nv-le-cyl'
        const parts = key.split('-');
        const fieldKey = parts[0]; // 'dv' or 'nv'
        const eye = parts[1]; // 're' or 'le'
        const field = parts[2]; // 'sph' or 'cyl'

        // Resolve the correct eye object
        const actualEyeObj = fieldKey === 'dv' ?
            (eye === 're' ? 're' : 'le') :
            (eye === 're' ? 'adl_re' : 'adl_le');

        setTempPrescription(prev => {
            const currentObjRef = prev[actualEyeObj];
            if (!currentObjRef) return prev;

            const currentValue = currentObjRef[field] || '';
            const numericValue = currentValue.replace(/^[+-]/, '').trim();

            if (!numericValue) return prev;

            const newValue = `${makePositive ? '+' : '-'}${numericValue}`;

            return {
                ...prev,
                [actualEyeObj]: { ...prev[actualEyeObj], [field]: newValue }
            };
        });

        setSignToggleConfirm(null);
    };

    const handlePowerFocus = (key, fieldKey, currentValue) => {
        setActivePowerInput(key);
        const isForNV = fieldKey === 'nv';
        
        // Always set the layout on focus
        const inputEl = powerInputRefs.current[key];
        if (inputEl) {
            const rect = inputEl.getBoundingClientRect();
            
            setPowerDropdownLayout({
                left: rect.left,
                width: rect.width,
                top: rect.bottom + 2,
                maxHeight: 200
            });
        }
        
        // Generate suggestions if there's a current value (extract numeric part)
        if (currentValue && currentValue.trim()) {
            // Extract numeric value from display value (remove +/- sign)
            const numericValue = currentValue.replace(/^[+-]/, '').trim();
            if (numericValue) {
                const suggestions = generatePowerSuggestions(numericValue, isForNV, key);
                setPowerSuggestions(prev => ({ ...prev, [key]: suggestions }));
            } else {
                setPowerSuggestions(prev => ({ ...prev, [key]: [] }));
            }
        } else {
            // Clear suggestions if field is empty
            setPowerSuggestions(prev => ({ ...prev, [key]: [] }));
        }
    };

    const handlePowerBlur = (e, fieldKey, eye, field) => {
        const value = e.target.value.trim();
        const isForNV = fieldKey === 'nv';

        // If field is empty, just close the dropdown
        if (!value) {
            setActivePowerInput(null);
            return;
        }

        // For axis, preserve the sign by not stripping it
        const numericValue = field === 'axis' 
            ? value.trim() 
            : value.replace(/^[+-]/, '').trim();
        if (!numericValue || isNaN(parseFloat(numericValue))) {
            setActivePowerInput(null);
            return;
        }

        const numValue = parseFloat(numericValue);

        // Format to 2 decimals with appropriate sign
        let formattedValue;

        // AXIS is an angle (0-180), preserve user-entered sign
        if (field === 'axis') {
            formattedValue = numValue.toFixed(0); // No decimal places for axis
        } else {
            // For sph/cyl: check selected sign from toggle buttons
            // Normalize eye key to match toggle button keys (re/le not adl_re/adl_le)
            const normalizedEye = normalizePowerEyeKey(eye);
            const key = `${fieldKey}-${normalizedEye}-${field}`;
            const currentSign = selectedSigns[key];
            // Determine sign: priority is 1) toggle selection, 2) value's explicit sign, 3) defaults
            const hasExplicitPositive = value.trim().startsWith('+');
            const hasExplicitNegative = value.trim().startsWith('-');
            
            let isPositive;
            if (currentSign === 'positive') {
                isPositive = true;
            } else if (currentSign === 'negative') {
                isPositive = false;
            } else if (hasExplicitPositive) {
                isPositive = true;
            } else if (hasExplicitNegative) {
                isPositive = false;
            } else {
                // No toggle selected, no explicit sign - use defaults
                isPositive = isForNV; // NV defaults to positive, DV defaults to negative
            }
            
            if (isPositive) {
                formattedValue = `+${Math.abs(numValue).toFixed(2)}`;
            } else {
                formattedValue = `-${Math.abs(numValue).toFixed(2)}`;
            }
        }

        const eyeObj = resolvePrescriptionEye(eye);
        setTempPrescription(prev => ({
            ...prev,
            [eyeObj]: { ...prev[eyeObj], [field]: formattedValue }
        }));

        // Close the suggestions dropdown
        setActivePowerInput(null);
    };

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
                    .from('products_list')
                    .select('id, name, price, stock, category_id, products_category(*)')
                    .eq('store_id', currentStoreId)
                    .ilike('name', `%${value.trim()}%`)
                    .order('name', { ascending: true })
                    .limit(15);

                if (error) throw error;

                // Store suggestions per item id so each row has its own independent list
                setProductSuggestions(prev => ({ ...prev, [id]: data || [] }));
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
            alert('Please select a store first.');
            return;
        }

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
            const newProductId = data.id;

            setItems(items.map(i => i.id === pendingItemIndex ? {
                ...i,
                name: newProduct.name,
                price: newProduct.price,
                product_id: newProductId,
                stock: newProduct.stock
            } : i));

            setShowAddProductModal(false);
        } catch (err) {
            alert('Failed to add product: ' + err.message);
        } finally {
            setAddingProduct(false);
        }
    };

    const selectProduct = async (item, product) => {
        if (items.some(i => i.id !== item.id && i.product_id === product.id)) {
            alert('This product is already added to the order.');
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
                    .from('products_category')
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

        const selectedType = product.products_category?.name || item.type || getDefaultItemType();
        const needsPrescription = selectedType === 'Lens' || selectedType === 'Contact Lens';

        setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            name: product.name,
            price: product.price,
            product_id: product.id,
            stock: product.stock,
            type: selectedType,
            ...categoryTaxes,
            prescription: needsPrescription ? (i.prescription || {
                isSamePower: false,
                isCylindrical: false,
                re: { sph: '', cyl: '', axis: '' },
                le: { sph: '', cyl: '', axis: '' },
                adl_re: { sph: '', cyl: '', axis: '' },
                adl_le: { sph: '', cyl: '', axis: '' },
                hasAdditionalPower: false,
                notes: ''
            }) : null,
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

    const handleOpenPrescription = (item) => {
        setActivePrescriptionItem(item.id);
        setTempPrescription(item.prescription || {
            isSamePower: false,
            isCylindrical: false,
            re: { sph: '', cyl: '', axis: '' },
            le: { sph: '', cyl: '', axis: '' },
            adl_re: { sph: '', cyl: '', axis: '' },
            adl_le: { sph: '', cyl: '', axis: '' },
            hasAdditionalPower: false,
            notes: ''
        });
        
        // Default signs: DV to negative, NV to positive
        setSelectedSigns(prev => ({
            ...prev,
            'dv-re-sph': 'negative',
            'dv-re-cyl': 'negative',
            'dv-le-sph': 'negative',
            'dv-le-cyl': 'negative',
            'nv-re-sph': 'positive',
            'nv-re-cyl': 'positive',
            'nv-le-sph': 'positive',
            'nv-le-cyl': 'positive'
        }));
        
        setShowPrescriptionModal(true);
    };

    const handleSavePrescription = () => {
        // Sync powers if same power for both eyes is checked
        const finalizedPrescription = tempPrescription.isSamePower ? {
            ...tempPrescription,
            le: { ...tempPrescription.re },
            adl_le: { ...tempPrescription.adl_re }
        } : tempPrescription;

        setItems(prev => prev.map(i => i.id === activePrescriptionItem ? { ...i, prescription: finalizedPrescription } : i));
        setShowPrescriptionModal(false);
    };

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

    const totalPaid = payments.filter(p => p.mode !== 'Due').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalAccounted = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentGap = (grossTotal - totalAccounted).toFixed(2);
    const finalDueAmount = (grossTotal - totalPaid).toFixed(2);

    const handleFinalSave = async () => {
        setLoading(true);
        try {
            let customerId = null;
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', customer.phone)
                .limit(1)
                .maybeSingle();

            if (existingCustomer) {
                customerId = existingCustomer.id;
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
                    email: null,
                    store_id: currentStoreId,
                    created_at: new Date().toISOString()
                }]).select('id').single();
                if (custError) throw custError;
                customerId = newCust.id;
            }

            const newOrderId = generateId(ID_RULES.ORDERS.prefix, ID_RULES.ORDERS.digits);
            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                id: newOrderId,
                store_id: currentStoreId,
                customer_id: customerId,
                status: Number(finalDueAmount) > 0 ? "Due" : "Processing",
                total_discount: totalDiscount,
                due_amount: Number(finalDueAmount),
                gross_amount: grossTotal,
                subtotal: subtotal,
                taxable_amount: totalTaxable,
                sgst_amt: totalSgst,
                cgst_amt: totalCgst,
                created_at: new Date().toISOString()
            }]).select('id').single();

            if (orderError) throw orderError;
            const orderId = orderData.id;

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
                total_price: item.lineTotal
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw itemsError;

            // Handle Eye Power saving
            {
                const isNonEmpty = (v) => v != null && String(v).trim() !== '';

                const normalizeAxis = (val) => {
                    if (!isNonEmpty(val)) return null;
                    const s = String(val).trim();
                    const n = Number.parseInt(s, 10);
                    return Number.isFinite(n) ? String(n) : null;
                };

                const normalizeOptical = (val, { decimals = 2, keepPlus = false } = {}) => {
                    if (!isNonEmpty(val)) return null;
                    const raw = String(val).trim();
                    const upper = raw.toUpperCase();
                    if (upper === 'PL' || upper === 'PLANO') return 'PL';
                    // Allow values like "+1.75" or "-0.50"
                    const num = Number.parseFloat(raw);
                    if (!Number.isFinite(num)) return raw;
                    const fixed = num.toFixed(decimals);
                    if (keepPlus && num > 0) return `+${fixed}`;
                    return fixed;
                };

                const scorePrescription = (p) => {
                    if (!p) return 0;
                    const fields = [
                        p.re?.sph, p.re?.cyl, p.re?.axis,
                        p.le?.sph, p.le?.cyl, p.le?.axis,
                        p.adl_re?.sph, p.adl_re?.cyl, p.adl_re?.axis,
                        p.adl_le?.sph, p.adl_le?.cyl, p.adl_le?.axis,
                        p.notes,
                    ];
                    return fields.reduce((acc, v) => acc + (isNonEmpty(v) ? 1 : 0), 0);
                };

                const candidates = items
                    .map((it) => it.prescription)
                    .filter((p) => {
                        if (!p) return false;
                        return [
                            p.re?.sph, p.re?.cyl, p.re?.axis,
                            p.le?.sph, p.le?.cyl, p.le?.axis,
                            p.adl_re?.sph, p.adl_re?.cyl, p.adl_re?.axis,
                            p.adl_le?.sph, p.adl_le?.cyl, p.adl_le?.axis,
                            p.notes,
                        ].some(isNonEmpty);
                    })
                    .sort((a, b) => scorePrescription(b) - scorePrescription(a));

                const preset = candidates[0];
                if (preset) {
                    const { error: eyeError } = await supabase.from('eye_power').insert([
                        {
                            customer_id: customerId,
                            order_id: orderId,
                            // Distance Vision (DV)
                            dv_right_sph: normalizeOptical(preset.re?.sph),
                            dv_right_cyl: normalizeOptical(preset.re?.cyl),
                            dv_right_axis: normalizeAxis(preset.re?.axis),
                            dv_left_sph: normalizeOptical(preset.le?.sph),
                            dv_left_cyl: normalizeOptical(preset.le?.cyl),
                            dv_left_axis: normalizeAxis(preset.le?.axis),
                            // Near Vision (NV)
                            nv_right_sph: normalizeOptical(preset.adl_re?.sph),
                            // If NV cyl/axis not provided, keep DV cyl/axis for the near entry
                            nv_right_cyl: normalizeOptical(preset.adl_re?.cyl) ?? normalizeOptical(preset.re?.cyl),
                            nv_right_axis: normalizeAxis(preset.adl_re?.axis) ?? normalizeAxis(preset.re?.axis),
                            nv_left_sph: normalizeOptical(preset.adl_le?.sph),
                            nv_left_cyl: normalizeOptical(preset.adl_le?.cyl) ?? normalizeOptical(preset.le?.cyl),
                            nv_left_axis: normalizeAxis(preset.adl_le?.axis) ?? normalizeAxis(preset.le?.axis),
                            notes: isNonEmpty(preset.notes) ? String(preset.notes).trim() : null,
                        },
                    ]);

                    if (eyeError) {
                        console.error('Eye Power Insert Error:', eyeError);
                        throw new Error(`Failed to save eye power: ${eyeError.message}`);
                    }
                }
            }

            // Mark voucher as used
            if (appliedVoucher) {
                await supabase.from('voucher').update({ order_id: orderId }).eq('id', appliedVoucher.id);
            }

            // Update Stock and Sales in products_list
            for (const item of items) {
                // Fetch current stock & sales first because we need to calculate
                const { data: prodData } = await supabase
                    .from('products_list')
                    .select('stock, sales')
                    .eq('id', item.product_id)
                    .single();

                if (prodData) {
                    const newStock = Math.max(0, (prodData.stock || 0) - Number(item.qty));
                    const newSales = (prodData.sales || 0) + Number(item.qty);
                    await supabase
                        .from('products_list')
                        .update({ stock: newStock, sales: newSales })
                        .eq('id', item.product_id);
                }
            }

            alert(`Invoice ${orderId} Saved Successfully!`);
            navigate('/orders');
        } catch (err) {
            alert('Error creating invoice: ' + err.message);
        } finally {
            setLoading(false);
            setShowPaymentModal(false);
        }
    };

    const handleSaveInvoice = (e) => {
        e.preventDefault();

        if (!currentStoreId) {
            alert("Please select a store before creating the invoice.");
            return;
        }

        if (!customer.name || !customer.phone) {
            alert("Customer Name and Phone are required.");
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
            alert("Please add at least one valid product to the order.");
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
            alert("Cannot save invoice due to the following errors:\n\n" + errors.join("\n"));
            if (incompleteItems.length > 0) {
                const first = incompleteItems[0].item;
                setNewProduct({ name: first.name, category: first.type, price: first.price || '', stock: '10' });
                setPendingItemIndex(first.id);
                setShowAddProductModal(true);
            }
            return;
        }

        // Pre-fill the first payment with total amount for convenience
        setPayments([{ id: Date.now(), mode: 'Cash', amount: grossTotal.toFixed(2) }]);
        setShowPaymentModal(true);
    };
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fast-slide pb-20">
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
                        <Save size={18} /> {loading ? "Processing..." : "Commit Invoice"}
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
                                <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="JOHN DOE" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Mobile Number *</label>
                                <input type="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="+91" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
                                <input type="email" value={customer.email || ''} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" placeholder="INFO@EXAMPLE.COM" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Street / Landmark</label>
                                <input type="text" value={customer.street} onChange={e => setCustomer({ ...customer, street: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="STREET NAME" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Town / City</label>
                                <input type="text" value={customer.town} onChange={e => setCustomer({ ...customer, town: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="TOWN" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">District</label>
                                <input type="text" value={customer.district} onChange={e => setCustomer({ ...customer, district: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="DISTRICT" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">State</label>
                                <input type="text" value={customer.state} onChange={e => setCustomer({ ...customer, state: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight" placeholder="STATE" />
                            </div>
                        </div>
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
                                                        <div className="fixed inset-0 z-[9998]" onMouseDown={closeProductSearch}></div>
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
                                                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{product.products_category?.category_name || 'Uncategorized'}</div>
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
                                                <select
                                                    value={item.type}
                                                    onChange={e => {
                                                        const newType = e.target.value;
                                                        updateItem(item.id, 'type', newType);
                                                        if (item.name.trim() && !item.product_id) {
                                                            handleProductSearch(item.id, item.name);
                                                        }
                                                    }}
                                                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-gray-400 focus:text-black outline-none cursor-pointer"
                                                >
                                                    {typeOptions.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                                {(item.type === 'Lens' || item.type === 'Contact Lens') && (
                                                    <button
                                                        onClick={() => handleOpenPrescription(item)}
                                                        className={`text-[9px] font-black uppercase tracking-widest py-1 px-2 rounded-lg transition-all border ${item.prescription?.re?.sph || item.prescription?.re?.cyl ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
                                                    >
                                                        {item.prescription?.re?.sph || item.prescription?.re?.cyl ? 'Edit Power' : 'Add Power'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className="w-full text-center bg-transparent focus:outline-none text-[11px] font-black text-black" />
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-[9px] font-bold text-gray-300">₹</span>
                                                <input type="number" value={item.price} ref={el => priceInputRefs.current[item.id] = el} onChange={e => updateItem(item.id, 'price', e.target.value)} className="w-full text-right bg-transparent focus:outline-none text-[11px] font-black text-black font-mono" placeholder="0.00" />
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-[9px] font-bold text-gray-300">₹</span>
                                                <input type="number" value={item.discount} onChange={e => updateItem(item.id, 'discount', e.target.value)} className="w-full text-right bg-transparent focus:outline-none text-[11px] font-black text-gray-400 focus:text-black font-mono" placeholder="0.00" />
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

                        {/* Power Prescription Summary */}
                        {(tempPrescription.re.sph || tempPrescription.re.cyl || tempPrescription.le.sph || tempPrescription.le.cyl) && (
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="text-[10px] font-black text-black uppercase tracking-widest">Optical Data Summary</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100">
                                                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Scope</th>
                                                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Sphere</th>
                                                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Cyl</th>
                                                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Axis</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 text-[11px] font-black font-mono">
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-center uppercase tracking-widest text-black">RE (DV)</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.re.sph || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.re.cyl || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.re.axis || '—'}</td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-center uppercase tracking-widest text-black">RE (NV)</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.adl_re.sph || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.adl_re.cyl || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.adl_re.axis || '—'}</td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-center uppercase tracking-widest text-black">LE (DV)</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.le.sph || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.le.cyl || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.le.axis || '—'}</td>
                                            </tr>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-center uppercase tracking-widest text-black">LE (NV)</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.adl_le.sph || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.adl_le.cyl || '—'}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{tempPrescription.adl_le.axis || '—'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
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
            {showAddProductModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-fast-zoom">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">New Entity</h2>
                                <button onClick={handleCancelAddProduct} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registering unknown catalog item</p>
                            
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
                    </div>
                </div>
            )}

            {/* Prescription Modal */}
            {showPrescriptionModal && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fast-zoom">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-black uppercase tracking-tighter leading-none">Optical Data Input</h2>
                                    <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest">Specify lens power requirements</p>
                                </div>
                                <button onClick={() => setShowPrescriptionModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                {[
                                    { key: 'isSamePower', label: 'Uniform Eye Power' },
                                    { key: 'isCylindrical', label: 'Cylindrical Focus' },
                                    { key: 'hasAdditionalPower', label: 'Addition Enabled' }
                                ].map(opt => (
                                    <label key={opt.key} className={`flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all border ${tempPrescription[opt.key] ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:text-black'}`}>
                                        <input
                                            type="checkbox"
                                            checked={tempPrescription[opt.key]}
                                            onChange={e => setTempPrescription({ ...tempPrescription, [opt.key]: e.target.checked })}
                                            className="hidden"
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="space-y-8">
                                <div className={`grid grid-cols-1 ${tempPrescription.isSamePower ? '' : 'md:grid-cols-2'} gap-8`}>
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">{tempPrescription.isSamePower ? "Universal Distance" : "Right Eye (RE) Distance"}</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['sph', 'cyl', 'axis'].map(f => (
                                                <div key={f} className={(!tempPrescription.isCylindrical && (f === 'cyl' || f === 'axis')) ? 'hidden' : ''}>
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                                                    <input
                                                        type="text"
                                                        value={tempPrescription.re[f]}
                                                        onChange={e => handlePowerInputChange(e, 'dv', 're', f)}
                                                        className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {!tempPrescription.isSamePower && (
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">Left Eye (LE) Distance</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['sph', 'cyl', 'axis'].map(f => (
                                                    <div key={f} className={(!tempPrescription.isCylindrical && (f === 'cyl' || f === 'axis')) ? 'hidden' : ''}>
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                                                        <input
                                                            type="text"
                                                            value={tempPrescription.le[f]}
                                                            onChange={e => handlePowerInputChange(e, 'dv', 'le', f)}
                                                            className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {tempPrescription.hasAdditionalPower && (
                                    <div className={`grid grid-cols-1 ${tempPrescription.isSamePower ? '' : 'md:grid-cols-2'} gap-8 pt-4 border-t border-gray-50`}>
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">{tempPrescription.isSamePower ? "Universal Near" : "Right Eye (RE) Near"}</p>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['sph', 'cyl', 'axis'].map(f => (
                                                    <div key={f} className={(!tempPrescription.isCylindrical && (f === 'cyl' || f === 'axis')) ? 'hidden' : ''}>
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                                                        <input
                                                            type="text"
                                                            value={tempPrescription.adl_re[f]}
                                                            onChange={e => handlePowerInputChange(e, 'nv', 'adl_re', f)}
                                                            className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {!tempPrescription.isSamePower && (
                                            <div className="space-y-4">
                                                <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">Left Eye (LE) Near</p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['sph', 'cyl', 'axis'].map(f => (
                                                        <div key={f} className={(!tempPrescription.isCylindrical && (f === 'cyl' || f === 'axis')) ? 'hidden' : ''}>
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                                                            <input
                                                                type="text"
                                                                value={tempPrescription.adl_le[f]}
                                                                onChange={e => handlePowerInputChange(e, 'nv', 'adl_le', f)}
                                                                className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex gap-4">
                                <button type="button" onClick={() => setShowPrescriptionModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Discard</button>
                                <button
                                    onClick={handleSavePrescription}
                                    className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all"
                                >
                                    Commit Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Details Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fast-zoom">
                        <div className="p-8 space-y-8">
                            <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Settlement</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Aggregate Value: <span className="text-black">₹{grossTotal.toLocaleString()}</span></p>
                                </div>
                                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {payments.map((p, idx) => (
                                    <div key={p.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mode</label>
                                            <select
                                                value={p.mode}
                                                onChange={e => updatePayment(p.id, 'mode', e.target.value)}
                                                className="w-full bg-transparent text-[11px] font-black uppercase focus:outline-none"
                                            >
                                                <option>Cash</option>
                                                <option>UPI</option>
                                                <option>Card</option>
                                                <option>Due</option>
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
                                    disabled={loading || Number(paymentGap) !== 0}
                                    className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                                    Finalize Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
