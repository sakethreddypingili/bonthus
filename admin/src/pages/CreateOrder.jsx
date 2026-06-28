import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Save, Plus, Trash2, X, CheckCircle, Loader2, ChevronDown, ChevronUp, Gift, User, ShoppingBag, Sparkles, ArrowRight, Info, Edit3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";
import CommandDialog from "../components/common/CommandDialog";
import SlideDrawer from "../components/common/SlideDrawer";
import AlertDialog from "../components/common/AlertDialog";
import { OVERLAY_CHROME_STYLE } from "../components/common/overlayChrome";
import LensWizard from "../components/order/LensWizard";
import FrameWizard from "../components/order/FrameWizard";

export default function CreateOrder({ userProfile }) {
    const navigate = useNavigate();
    const location = useLocation();
    const initialCustomer = location.state?.customer || {};
    const [loading, setLoading] = useState(false);

    const [alertDialog, setAlertDialog] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "warning",
        onClose: null
    });

    const showAlert = (title, message, type = "warning", onClose = null) => {
        setAlertDialog({
            isOpen: true,
            title,
            message,
            type,
            onClose
        });
    };

    const [customer, setCustomer] = useState({
        name: initialCustomer.name || "",
        phone: initialCustomer.phone || "",
        street: initialCustomer.street || "",
        town: initialCustomer.town || "",
        district: initialCustomer.district || "",
        state: initialCustomer.state || "",
        email: initialCustomer.email || ""
    });

    const [currentStep, setCurrentStep] = useState(initialCustomer.phone ? 1 : 0);
    const [customerLookupStatus, setCustomerLookupStatus] = useState(initialCustomer.phone ? 'found' : 'idle');
    const [isItemPriceOpen, setIsItemPriceOpen] = useState(false);
    const [isDiscountOpen, setIsDiscountOpen] = useState(false);

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            if (customer.phone && customer.phone.length >= 10) {
                setCustomerLookupStatus('searching');
                try {
                    const { data: customerList, error } = await supabase
                        .from('customers')
                        .select('name, street, town, district, state, email')
                        .eq('phone', customer.phone)
                        .limit(1);
                    const data = customerList && customerList.length > 0 ? customerList[0] : null;
                    if (data && !error) {
                        setCustomer(prev => ({
                            ...prev,
                            name: data.name || prev.name || "",
                            street: data.street || prev.street || "",
                            town: data.town || prev.town || "",
                            district: data.district || prev.district || "",
                            state: data.state || prev.state || "",
                            email: data.email || prev.email || ""
                        }));
                        setCustomerLookupStatus('found');
                    } else {
                        setCustomerLookupStatus('not_found');
                    }
                } catch (err) {
                    console.error("Error auto-fetching customer:", err);
                    setCustomerLookupStatus('not_found');
                }
            } else {
                setCustomerLookupStatus('idle');
            }
        };

        const timeoutId = setTimeout(() => {
            fetchCustomerDetails();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [customer.phone]);

    const [items, setItems] = useState([]);
    const [activeFrameItem, setActiveFrameItem] = useState(null);
    const [isLensWizardOpen, setIsLensWizardOpen] = useState(false);
    const [isFrameWizardOpen, setIsFrameWizardOpen] = useState(false);
    const [activeFrameConfigureItem, setActiveFrameConfigureItem] = useState(null);

    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
    const [catalogBrands, setCatalogBrands] = useState([]);
    const [catalogProducts, setCatalogProducts] = useState([]);
    const [searchingCatalog, setSearchingCatalog] = useState(false);
    const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);

    const [voucherCode, setVoucherCode] = useState("");
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherError, setVoucherError] = useState("");


    const [activeItemSearch, setActiveItemSearch] = useState(null);
    // Per-item suggestions so row 1 and row 2 never share the same dropdown list
    const [productSuggestions, setProductSuggestions] = useState({});

    const [showAddProductModal, setShowAddProductModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', category: '', category_id: '', unit_price: '', stock: '10' });
    const [addingProduct, setAddingProduct] = useState(false);
    const [pendingItemIndex, setPendingItemIndex] = useState(null);

    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [activePrescriptionItem, setActivePrescriptionItem] = useState(null);
    const [customerPreviousPrescriptions, setCustomerPreviousPrescriptions] = useState([]);
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
            supabase.from('stores').select('*').order('name').then(({ data }) => setStores(data || []));
        } else if (userProfile?.store_id) {
            setSelectedStore(userProfile.store_id);
        }
    }, [isAdmin, userProfile]);

    useEffect(() => {
        const fetchStoreCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name')
                    .order('name', { ascending: true });

                if (error) throw error;
                setStoreCategories(data || []);
            } catch (err) {
                console.error('Error fetching categories:', err);
                setStoreCategories([]);
            }
        };

        fetchStoreCategories();
    }, []);

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

    const handleOpenCatalogModal = async () => {
        if (storeSelectionRequired) {
            showAlert("Required", "Please select a store first.", "warning");
            return;
        }
        setShowCatalogModal(true);
        setSearchingCatalog(true);
        try {
            const { data, error } = await supabase.from('frame_catalog').select('*').eq('is_active', true);
            if (!error && data) {
                const frameList = data.filter(item => item.frame_type === 'frame');
                setCatalogBrands(frameList);
            }
        } catch (err) {
            console.error("Error loading brands:", err);
        } finally {
            setSearchingCatalog(false);
        }
    };

    const handleSelectBrandFromModal = (brand) => {
        setShowCatalogModal(false);
        const newItem = {
            id: Date.now(),
            name: brand.brand || brand.name,
            type: "Frame",
            quantity: 1,
            unit_price: Number(brand.price || 0),
            price: Number(brand.price || 0),
            discount: 0,
            product_id: null,
            stock: null,
            prescription: null,
            category_id: null,
            sgst: 0, cgst: 0, igst: 0
        };
        setItems(prev => [...prev, newItem]);
        setActiveFrameConfigureItem(newItem);
        setIsFrameWizardOpen(true);
    };

    const handleCatalogSearchChange = async (query) => {
        setCatalogSearchQuery(query);
        if (!query.trim()) {
            setCatalogProducts([]);
            return;
        }
        setSearchingCatalog(true);
        try {
            const { data: prods } = await supabase
                .from('products')
                .select('id, name, base_price, category_id, categories(name)')
                .ilike('name', `%${query}%`)
                .limit(10);
            setCatalogProducts(prods || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSearchingCatalog(false);
        }
    };

    const handleSelectProductFromModal = (prod) => {
        setShowCatalogModal(false);
        const newItem = {
            id: Date.now(),
            name: prod.name,
            type: prod.categories?.name || "Product",
            quantity: 1,
            unit_price: Number(prod.base_price || 0),
            price: Number(prod.base_price || 0),
            discount: 0,
            product_id: prod.id,
            stock: null,
            prescription: null,
            category_id: prod.category_id,
            sgst: 0, cgst: 0, igst: 0
        };
        setItems(prev => [...prev, newItem]);
    };

    const addItem = () => {
        setIsFrameWizardOpen(true);
    };

    const removeItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const repeatItem = (itemToRepeat) => {
        const newItem = {
            ...itemToRepeat,
            id: Date.now() + Math.floor(Math.random() * 10000)
        };
        setItems(prev => [...prev, newItem]);
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
                    .from('products')
                    .select('id, name, base_price, category_id, product_categories(*), store_inventory!inner(stock_quantity, unit_price)')
                    .eq('store_inventory.store_id', currentStoreId)
                    .neq('category_id', 'd705f4e3-0ac1-4777-9c38-5249d9a1993c')
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
            showAlert("Required", "Please select a store first.", "warning");
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
                base_price: Number(newProduct.unit_price)
            }]).select('id').single();
            
            if (prodError) throw prodError;
            const internalId = prodData.id;

            // 2. Insert into store_inventory
            const { error: invError } = await supabase.from('store_inventory').insert([{
                store_id: currentStoreId,
                product_id: internalId,
                stock_quantity: Number(newProduct.stock),
                unit_price: Number(newProduct.unit_price)
            }]);
            if (invError) throw invError;

            setItems(items.map(i => i.id === pendingItemIndex ? {
                ...i,
                name: newProduct.name,
                unit_price: newProduct.unit_price,
                product_id: internalId,
                stock: newProduct.stock,
                category_id: newProduct.category_id
            } : i));

            setShowAddProductModal(false);
        } catch (err) {
            showAlert("Failed", 'Failed to add product: ' + err.message, "error");
        } finally {
            setAddingProduct(false);
        }
    };

    const handleAddLensForFrame = (item) => {
        if (!currentStoreId) {
            showAlert("Store Required", 'Please select a store first.', "warning");
            return;
        }
        setActiveFrameItem(item);
        setIsLensWizardOpen(true);
    };

    const handleOpenFrameWizard = (item) => {
        if (!currentStoreId) {
            showAlert("Store Required", 'Please select a store first.', "warning");
            return;
        }
        setActiveFrameConfigureItem(item);
        setIsFrameWizardOpen(true);
    };

    const handleSelectFrame = (frameDetails) => {
        const targetId = activeFrameConfigureItem ? activeFrameConfigureItem.id : Date.now();
        const frameItem = {
            id: targetId,
            name: frameDetails.name,
            type: "Frame",
            quantity: 1,
            unit_price: Number(frameDetails.price),
            price: Number(frameDetails.price),
            discount: 0,
            is_b1g1: frameDetails.is_b1g1,
            custom_frame_specs: frameDetails.custom_frame_specs,
            product_id: null,
            stock: null,
            prescription: null,
            category_id: null,
            sgst: 0, cgst: 0, igst: 0
        };

        if (activeFrameConfigureItem) {
            setItems(prev => prev.map(i => i.id === activeFrameConfigureItem.id ? frameItem : i));
        } else {
            setItems(prev => [...prev, frameItem]);
        }
        setActiveFrameConfigureItem(null);
    };

    const handleSelectLens = async (lensDetails) => {
        setLoading(true);
        try {
            // Find if a product with the same name exists under the 'lens' category
            const { data: existingProd, error: findError } = await supabase
                .from('products')
                .select('id')
                .eq('name', lensDetails.name)
                .eq('category_id', 'd705f4e3-0ac1-4777-9c38-5249d9a1993c')
                .maybeSingle();

            let productId = existingProd?.id;

            if (!productId) {
                // Generate a custom SKU
                const customSku = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);

                // Create product
                const { data: newProd, error: insertError } = await supabase
                    .from('products')
                    .insert([{
                        sku: customSku,
                        name: lensDetails.name,
                        category_id: 'd705f4e3-0ac1-4777-9c38-5249d9a1993c',
                        base_price: Number(lensDetails.price)
                    }])
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                productId = newProd.id;

                // Create inventory entry for store
                const { error: invError } = await supabase
                    .from('store_inventory')
                    .insert([{
                        store_id: currentStoreId,
                        product_id: productId,
                        stock_quantity: 9999, // Lenses are bespoke, mock high stock
                        unit_price: Number(lensDetails.price)
                    }]);
                if (invError) throw invError;
            }

            // Fetch category taxes for lens category
            let categoryTaxes = { category_id: 'd705f4e3-0ac1-4777-9c38-5249d9a1993c', sgst: 0, cgst: 0, igst: 0 };
            try {
                const { data: taxData } = await supabase
                    .from('product_categories')
                    .select('id, sgst, cgst, igst')
                    .eq('id', 'd705f4e3-0ac1-4777-9c38-5249d9a1993c')
                    .maybeSingle();
                if (taxData) {
                    categoryTaxes = {
                        category_id: taxData.id,
                        sgst: taxData.sgst || 0,
                        cgst: taxData.cgst || 0,
                        igst: taxData.igst || 0
                    };
                }
            } catch (err) {
                console.error('Error fetching lens category taxes:', err);
            }

            // Attach lens details directly to the active frame item in items array (No separate item card created)
            setItems(prev => prev.map(item => {
                if (item.id === activeFrameItem?.id) {
                    return {
                        ...item,
                        custom_lens_specs: {
                            ...lensDetails.custom_lens_specs,
                            name: lensDetails.name,
                            price: Number(lensDetails.price || 0),
                            product_id: productId,
                            ...categoryTaxes
                        }
                    };
                }
                return item;
            }));

        } catch (err) {
            showAlert("Error", 'Failed to process lens selection: ' + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const selectProduct = async (item, product) => {
        if (items.some(i => i.id !== item.id && i.product_id === product.id)) {
            showAlert("Duplicate Product", 'This product is already added to the order.', "warning");
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: '', product_id: null, unit_price: 0, stock: null, prescription: null, category_id: null, sgst: 0, cgst: 0, igst: 0 } : i));
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

        const selectedType = product?.product_categories?.name || item.type || getDefaultItemType();
        const needsPrescription = selectedType === 'Lens' || selectedType === 'Contact Lens';

        setItems(prev => prev.map(i => i.id === item.id ? {
            ...i,
            name: product.name,
            unit_price: product.price,
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

    const handleOpenPrescription = async (item) => {
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
        
        // Fetch previous prescriptions for selected customer
        setCustomerPreviousPrescriptions([]);
        if (customer.phone || customer.id) {
            try {
                let query = supabase.from('prescriptions').select('*');
                if (customer.id) {
                    query = query.eq('customer_id', customer.id);
                } else {
                    const { data: cData } = await supabase.from('customers').select('id').eq('phone', customer.phone).maybeSingle();
                    if (cData?.id) query = query.eq('customer_id', cData.id);
                }
                const { data: rxList } = await query.order('prescribed_at', { ascending: false });
                if (rxList) setCustomerPreviousPrescriptions(rxList);
            } catch (err) {
                console.error("Error fetching previous prescriptions:", err);
            }
        }

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

    // Calculations & Dynamic B1G1 Logic
    let b1g1Units = [];
    items.forEach((item) => {
        const isEligible = item.type === 'Frame' || item.custom_frame_specs || item.is_b1g1;
        const qty = Number(item.quantity || item.qty || 1);
        const price = Number(item.price || 0);
        if (isEligible && price > 0) {
            for (let q = 0; q < qty; q++) {
                b1g1Units.push({ itemId: item.id, price, item });
            }
        }
    });

    // Sort units by price DESCENDING (highest prices charged first, cheapest ones free)
    b1g1Units.sort((a, b) => b.price - a.price);
    const freeCount = Math.floor(b1g1Units.length / 2);
    const freeUnits = b1g1Units.slice(b1g1Units.length - freeCount);
    
    const itemDiscountMap = {};
    let totalB1g1Discount = 0;
    freeUnits.forEach(unit => {
        if (!itemDiscountMap[unit.itemId]) {
            itemDiscountMap[unit.itemId] = { freeQty: 0, discount: 0 };
        }
        itemDiscountMap[unit.itemId].freeQty += 1;
        itemDiscountMap[unit.itemId].discount += unit.price;
        totalB1g1Discount += unit.price;
    });

    const totalLineAmounts = items.map(item => {
        const lineTotal = (Number(item.price) * Number(item.quantity || item.qty || 1)) - Number(item.discount || 0);
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

    const subtotal = items.reduce((sum, item) => sum + ((Number(item.price || 0) + Number(item.custom_lens_specs?.price || 0)) * Number(item.quantity || item.qty || 1)), 0);
    const rowDiscounts = items.reduce((sum, item) => sum + (Number(item.discount || 0)), 0);
    const voucherDiscountAmount = appliedVoucher ? (subtotal * (Number(appliedVoucher.discount_percent || 0) / 100)) : 0;
    const totalDiscount = rowDiscounts + voucherDiscountAmount + totalB1g1Discount;
    
    // Fitting charges calculated directly in bill (₹199 when lenses are configured)
    const fittingCharges = items.some(i => i.custom_lens_specs) ? 199 : 0;
    
    // Total amount the customer pays
    const grossTotal = Math.max(0, subtotal - totalDiscount + fittingCharges);
    
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
            const { data: existingCustomers } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', customer.phone)
                .limit(1);

            const existingCustomer = existingCustomers && existingCustomers.length > 0 ? existingCustomers[0] : null;

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const { data: newCust, error: custError } = await supabase.from('customers').insert([{
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

            // Handle Eye Power saving first
            let prescriptionId = null;
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
                    const { data: eyeData, error: eyeError } = await supabase.from('prescriptions').insert([
                        {
                            customer_id: customerId,
                            dv_re_sph: normalizeOptical(preset.re?.sph),
                            dv_re_cyl: normalizeOptical(preset.re?.cyl),
                            dv_re_axis: normalizeAxis(preset.re?.axis),
                            dv_le_sph: normalizeOptical(preset.le?.sph),
                            dv_le_cyl: normalizeOptical(preset.le?.cyl),
                            dv_le_axis: normalizeAxis(preset.le?.axis),
                            nv_re_sph: normalizeOptical(preset.adl_re?.sph),
                            nv_re_cyl: normalizeOptical(preset.adl_re?.cyl) ?? normalizeOptical(preset.re?.cyl),
                            nv_re_axis: normalizeAxis(preset.adl_re?.axis) ?? normalizeAxis(preset.re?.axis),
                            nv_le_sph: normalizeOptical(preset.adl_le?.sph),
                            nv_le_cyl: normalizeOptical(preset.adl_le?.cyl) ?? normalizeOptical(preset.le?.cyl),
                            nv_le_axis: normalizeAxis(preset.adl_le?.axis) ?? normalizeAxis(preset.le?.axis),
                            notes: isNonEmpty(preset.notes) ? String(preset.notes).trim() : null,
                        },
                    ]).select('id').single();

                    if (eyeError) throw eyeError;
                    prescriptionId = eyeData.id;
                }
            }

            const newOrderNumber = generateId(ID_RULES.ORDERS.prefix, ID_RULES.ORDERS.digits);
            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                order_number: newOrderNumber,
                store_id: currentStoreId,
                customer_id: customerId,
                prescription_id: prescriptionId,
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
                quantity: Number(item.quantity),
                unit_price: Number(item.price),
                discount_amount: Number(item.discount || 0),
                total_price: item.lineTotal,
                custom_lens_specs: item.custom_lens_specs || null,
                custom_frame_specs: item.custom_frame_specs || null,
                is_b1g1: item.is_b1g1 || false
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw itemsError;

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
                    const newStock = Math.max(0, (invData.stock_quantity || 0) - Number(item.quantity));
                    await supabase
                        .from('store_inventory')
                        .update({ stock_quantity: newStock })
                        .eq('store_id', currentStoreId)
                        .eq('product_id', item.product_id);
                }
            }

            showAlert("Success", `Invoice ${newOrderNumber} Saved Successfully!`, "success", () => {
                navigate('/orders');
            });
        } catch (err) {
            showAlert("Error", 'Error creating invoice: ' + err.message, "error");
        } finally {
            setLoading(false);
            setShowPaymentModal(false);
        }
    };

    const handleSaveInvoice = (e) => {
        e.preventDefault();

        if (!currentStoreId) {
            showAlert("Required", "Please select a store before creating the invoice.", "warning");
            return;
        }

        if (!customer.name || !customer.phone) {
            showAlert("Required", "Customer Name and Phone are required.", "warning");
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
            showAlert("Required", "Please add at least one valid product to the order.", "warning");
            return;
        }

        if (emptyItems.length > 0) {
            errors.push(`Row(s) ${emptyItems.join(', ')}: Please enter product details or remove the empty row.`);
        }

        if (incompleteItems.length > 0) {
            incompleteItems.forEach(({ item, rowNum }) => {
                errors.push(`Row ${rowNum}: You typed "${item.name}" but didn't select it. Please select a product from the dropdown list.`);
            });
        }

        if (errors.length > 0) {
            showAlert("Validation Check", "Please fix the following issues before continuing:\n\n" + errors.join("\n\n"), "error", () => {
                if (incompleteItems.length > 0) {
                    const first = incompleteItems[0].item;
                    setNewProduct({ name: first.name, category: first.type, unit_price: first.price || '', stock: '10' });
                    setPendingItemIndex(first.id);
                    setShowAddProductModal(true);
                }
            });
            return;
        }

        // Pre-fill the first payment with total amount for convenience
        setPayments([{ id: Date.now(), mode: 'Cash', amount: grossTotal.toFixed(2) }]);
        setShowPaymentModal(true);
    };
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (currentStep > 0) setCurrentStep(currentStep - 1);
                            else navigate('/orders');
                        }}
                        className="p-2.5 border border-gray-200 rounded-xl text-black hover:bg-black hover:text-white transition-all"
                    >
                        <ArrowLeft size={18} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-black tracking-tighter uppercase">Cart</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-0.5">Configure Products & Optical Lenses</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {customer.phone && (
                        <button
                            type="button"
                            onClick={() => setShowCustomerDetailsModal(true)}
                            className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl transition-all shadow-sm group"
                        >
                            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs uppercase">
                                {customer.name ? customer.name.charAt(0) : <User size={16} />}
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-black text-black uppercase tracking-tight group-hover:text-black">
                                    {customer.name || "Customer Profile"}
                                </div>
                                <div className="text-[9px] font-mono font-bold text-gray-400">
                                    {customer.phone}
                                </div>
                            </div>
                            <ChevronDown size={14} className="text-gray-400 group-hover:text-black" />
                        </button>
                    )}

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
                </div>
            </div>

            {storeSelectionRequired && (
                <div className="p-4 rounded-2xl bg-gray-100 border border-black text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-3 animate-pulse">
                    <X size={16} strokeWidth={3} /> Select a store to unlock invoice actions
                </div>
            )}

            <div className={storeSelectionRequired ? "opacity-30 pointer-events-none" : ""}>

                {/* STEP 0: CUSTOMER LOOKUP */}
                {currentStep === 0 && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
                            <div>
                                <h2 className="text-xl font-black text-black uppercase tracking-tight">Customer Lookup</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Enter 10-digit mobile number to search database</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mobile Number *</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={customer.phone}
                                        onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-black text-lg font-black font-mono tracking-wider"
                                        placeholder="e.g. 9876543210"
                                        autoFocus
                                    />
                                    {customerLookupStatus === 'searching' && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs font-bold text-gray-400">
                                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Searching...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Found Customer Card */}
                            {customerLookupStatus === 'found' && (
                                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 animate-in fade-in">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={16} className="text-emerald-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Existing Customer Record Found</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">{customer.name}</h3>
                                        <p className="text-xs font-mono text-gray-500 mt-1">Phone: {customer.phone} | Address: {[customer.street, customer.town, customer.district, customer.state].filter(Boolean).join(', ') || 'No address registered'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="w-full py-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                                    >
                                        Proceed to Cart Builder →
                                    </button>
                                </div>
                            )}

                            {/* New Customer Form */}
                            {(customerLookupStatus === 'not_found' || (customer.phone.length === 10 && customerLookupStatus !== 'searching' && customerLookupStatus !== 'found')) && (
                                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 animate-in fade-in">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-black block border-b border-gray-200 pb-2">New Customer Registration</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Full Name *</label>
                                            <input type="text" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase" placeholder="JOHN DOE" required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                                            <input type="email" value={customer.email || ''} onChange={e => setCustomer({ ...customer, email: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black" placeholder="EMAIL@EXAMPLE.COM" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Street / Landmark</label>
                                            <input type="text" value={customer.street} onChange={e => setCustomer({ ...customer, street: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase" placeholder="STREET NAME" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Town / City</label>
                                            <input type="text" value={customer.town} onChange={e => setCustomer({ ...customer, town: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase" placeholder="TOWN" />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!customer.name.trim()) {
                                                showAlert("Required", "Please enter customer full name.", "warning");
                                                return;
                                            }
                                            setCurrentStep(1);
                                        }}
                                        className="w-full py-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 mt-2"
                                    >
                                        Create Profile & Proceed →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 1: CART BUILDER (Black & White Theme - UI/UX Pro Max) */}
                {currentStep === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
                        {/* Left Column (8 cols): Cart Items */}
                        <div className="lg:col-span-8 space-y-4">
                            {items.length === 0 ? (
                                <div className="p-16 text-center space-y-6 bg-white rounded-[2rem] border border-neutral-200/80 shadow-sm">
                                    <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-black border border-neutral-200">
                                        <ShoppingBag size={32} strokeWidth={2} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="text-lg font-black text-black uppercase tracking-tight">Your Cart is Empty</h3>
                                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Select a frame brand to start configuring optical specifications</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="px-9 py-4.5 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all shadow-xl inline-flex items-center gap-2.5 hover:scale-[1.02] active:scale-95"
                                    >
                                        <Plus size={16} strokeWidth={3} /> Add Frame / Product
                                    </button>
                                </div>
                            ) : (
                                items.map((item, index) => {
                                    const isFreeItem = (itemDiscountMap[item.id]?.freeQty > 0) || Number(item.price) === 0;
                                    const freeQty = itemDiscountMap[item.id]?.freeQty || 0;
                                    const itemQty = Number(item.quantity || item.qty || 1);
                                    const effectivePrice = Math.max(0, (Number(item.price || 0) * itemQty) - (itemDiscountMap[item.id]?.discount || 0));
                                    return (
                                        <div key={item.id} className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 relative overflow-hidden transition-all duration-300 hover:border-black/60 hover:shadow-xl group">
                                            {/* Black & White Corner Ribbon for Free / B1G1 items */}
                                            {isFreeItem && (
                                                <div className="absolute top-0 left-0 z-10">
                                                    <div className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-8 py-1.5 transform -rotate-45 -translate-x-7 translate-y-3 shadow-md text-center border-b border-white/20">
                                                        FREE
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-1">
                                                {/* Product Image / Icon Thumbnail */}
                                                <div className="w-32 h-28 bg-neutral-50/80 rounded-2xl border border-neutral-200/90 flex items-center justify-center p-3 shrink-0 relative group-hover:bg-neutral-100/80 transition-colors">
                                                    {item.custom_frame_specs?.image_url ? (
                                                        <img src={item.custom_frame_specs.image_url} alt={item.name} className="max-h-full max-w-full object-contain" />
                                                    ) : item.type === 'Frame' || item.custom_frame_specs ? (
                                                        <svg className="w-16 h-16 text-black" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="25" cy="20" r="14" />
                                                            <circle cx="75" cy="20" r="14" />
                                                            <path d="M39 20 Q 50 15 61 20" />
                                                            <path d="M11 20 Q 5 15 0 12" />
                                                            <path d="M89 20 Q 95 15 100 12" />
                                                        </svg>
                                                    ) : (
                                                        <div className="text-xs font-black uppercase text-neutral-400 tracking-wider">{item.type || 'Item'}</div>
                                                    )}
                                                </div>

                                                {/* Product Details & Pricing (UI UX Pro Max Monochromatic Layout) */}
                                                <div className="flex-1 w-full space-y-2">
                                                    {/* 1. Product Name (Brand, Color) */}
                                                    <div className="flex justify-between items-start gap-4 pb-1">
                                                        <div>
                                                            <h3 className="text-sm font-black text-black uppercase tracking-tight leading-snug">
                                                                {item.custom_frame_specs?.color 
                                                                    ? `${item.name || "UNNAMED PRODUCT"}, ${item.custom_frame_specs.color}` 
                                                                    : (item.name || "UNNAMED PRODUCT")}
                                                            </h3>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            {isFreeItem && effectivePrice === 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs line-through text-neutral-400 font-mono">₹{Number(item.price || 0).toLocaleString()}</span>
                                                                    <span className="text-sm font-black text-black font-mono">Free</span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm font-black text-black font-mono">
                                                                    ₹{effectivePrice.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Dotted Line Divider */}
                                                    <div className="border-b border-dashed border-neutral-200" />

                                                    {/* 2. Lens Specifications Row */}
                                                    <div className="py-1">
                                                        {item.custom_lens_specs ? (
                                                            <div 
                                                                onClick={() => handleAddLensForFrame(item)}
                                                                className="group/lens flex items-center justify-between py-0.5 cursor-pointer"
                                                            >
                                                                <p className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                                                                    LENS: {item.custom_lens_specs.name || item.custom_lens_specs.lens_type} {item.custom_lens_specs.price > 0 ? `(₹${item.custom_lens_specs.price.toLocaleString()})` : ''}
                                                                    <span className="text-[10px] font-black text-black underline underline-offset-2 opacity-0 group-hover/lens:opacity-100 transition-opacity">Change</span>
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between py-0.5">
                                                                {item.type === 'Frame' && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleAddLensForFrame(item)} 
                                                                        className="text-xs font-black uppercase text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
                                                                    >
                                                                        ADD LENS
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Dotted Line Divider */}
                                                    <div className="border-b border-dashed border-neutral-200" />

                                                    {/* 3. Prescription Status Row */}
                                                    <div className="py-1">
                                                        {item.prescription || item.custom_lens_specs?.prescription ? (
                                                            <div 
                                                                onClick={() => handleOpenPrescription(item)}
                                                                className="group/rx flex items-center justify-between py-0.5 cursor-pointer"
                                                            >
                                                                <p className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                                                                    PRESCRIPTION: ADDED
                                                                    <span className="text-[10px] font-black text-black underline underline-offset-2 opacity-0 group-hover/rx:opacity-100 transition-opacity">Edit</span>
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between py-0.5">
                                                                {item.type === 'Frame' && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleOpenPrescription(item)} 
                                                                        className="text-xs font-black uppercase text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
                                                                    >
                                                                        ADD POWER
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Dotted Line Divider */}
                                                    <div className="border-b border-dashed border-neutral-200" />

                                                    {/* 4. Final Price Row */}
                                                    <div className="flex justify-between items-center text-xs py-1.5">
                                                        <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Final Price</span>
                                                        <span className="font-black font-mono text-black">
                                                            {effectivePrice === 0 ? 'Free' : `₹${effectivePrice.toLocaleString()}`}
                                                        </span>
                                                    </div>

                                                    {/* Dotted Line Divider */}
                                                    <div className="border-b border-dashed border-neutral-200" />

                                                    {/* 5. Dedicated Action Row for Repeat & Remove (Left side side-by-side, nothing under price) */}
                                                    <div className="flex items-center gap-6 pt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => repeatItem(item)}
                                                            className="text-xs font-black text-black hover:text-neutral-600 uppercase tracking-wider underline underline-offset-4 transition-colors"
                                                        >
                                                            REPEAT
                                                        </button>
                                                        
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.id)}
                                                            className="text-xs font-black text-neutral-400 hover:text-black uppercase tracking-wider underline underline-offset-4 transition-colors"
                                                        >
                                                            REMOVE
                                                        </button>
                                                    </div>

                                                    {/* Black and White Offer Banner Notice */}
                                                    {isFreeItem && (
                                                        <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl px-4 py-2.5 mt-3 flex items-center gap-2.5 text-[10px] font-black text-black uppercase tracking-wider shadow-2xs">
                                                            <CheckCircle size={15} className="text-black shrink-0" />
                                                            This Product is Free with B1G1 / Membership Offer!
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Add Product Option at the end of the cart items list (Right-aligned plain text link) */}
                            {items.length > 0 && (
                                <div className="flex justify-end pt-3 pb-3">
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-xs font-black text-black uppercase tracking-widest underline underline-offset-4 hover:text-neutral-600 transition-colors active:scale-95"
                                    >
                                        + ADD PRODUCT
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Column (4 cols): Bill Details & Checkout */}
                        <div className="lg:col-span-4 space-y-4 sticky top-6">
                            {/* Bill Details Card (Expandable Monochromatic UI) */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-black uppercase tracking-tight pl-1">Bill Details</h3>
                                <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 space-y-4 shadow-sm">
                                    {/* Total Item Price Row */}
                                    <div>
                                        <div 
                                            onClick={() => setIsItemPriceOpen(!isItemPriceOpen)}
                                            className="flex justify-between items-center text-xs font-black text-black cursor-pointer select-none group hover:opacity-75 transition-all"
                                        >
                                            <span className="uppercase tracking-tight flex items-center gap-1.5">
                                                Total item price 
                                                {isItemPriceOpen ? <ChevronUp size={14} className="text-black stroke-[3]" /> : <ChevronDown size={14} className="text-black stroke-[3]" />}
                                            </span>
                                            <span className="font-mono text-sm font-black">₹{subtotal.toLocaleString()}</span>
                                        </div>

                                        {/* Expandable Itemized Breakdown */}
                                        {isItemPriceOpen && (
                                            <div className="pl-3 space-y-2 pt-3 border-l-2 border-neutral-200 my-2 animate-in fade-in duration-200">
                                                {items.map((item, idx) => (
                                                    <div key={item.id || idx} className="flex justify-between items-center text-[11px] font-bold text-neutral-600">
                                                        <span className="truncate max-w-[180px] uppercase tracking-wider">Item {idx + 1}: {item.name || 'Product'}</span>
                                                        <span className="font-mono font-black text-black">₹{Number(item.price || 0).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-b border-dashed border-neutral-200 my-2" />

                                    {/* Total Discount Row */}
                                    <div>
                                        <div 
                                            onClick={() => setIsDiscountOpen(!isDiscountOpen)}
                                            className="flex justify-between items-center text-xs font-black text-black cursor-pointer select-none group hover:opacity-75 transition-all"
                                        >
                                            <span className="uppercase tracking-tight flex items-center gap-1.5">
                                                Total discount 
                                                {isDiscountOpen ? <ChevronUp size={14} className="text-black stroke-[3]" /> : <ChevronDown size={14} className="text-black stroke-[3]" />}
                                            </span>
                                            <span className="font-mono text-sm font-black text-black">-₹{totalDiscount.toLocaleString()}</span>
                                        </div>

                                        {/* Expandable Discount Breakdown */}
                                        {isDiscountOpen && (
                                            <div className="pl-3 space-y-2 pt-3 border-l-2 border-neutral-200 my-2 animate-in fade-in duration-200">
                                                <div className="flex justify-between items-center text-[11px] font-bold text-neutral-600">
                                                    <span className="uppercase tracking-wider">Promotional / B1G1 Discount</span>
                                                    <span className="font-mono font-black text-black">-₹{totalDiscount.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-b border-dashed border-neutral-200 my-2" />

                                    {/* Fitting Charges Row */}
                                    {fittingCharges > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-xs font-black text-black">
                                                <span className="uppercase tracking-tight">Fitting charges</span>
                                                <span className="font-mono text-sm font-black">₹{fittingCharges.toLocaleString()}</span>
                                            </div>
                                            <div className="border-b border-dashed border-neutral-200 my-2" />
                                        </>
                                    )}

                                    {/* Total Payable Row */}
                                    <div className="flex justify-between items-center text-sm font-black pt-1">
                                        <span className="text-black uppercase tracking-tight">Total payable</span>
                                        <span className="text-black font-mono text-xl font-black">₹{grossTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Prominent Proceed Button (Increased Height & Updated Text) */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (items.length === 0) {
                                        showAlert("Empty Cart", "Please add at least one item to proceed.", "warning");
                                        return;
                                    }
                                    setCurrentStep(2);
                                }}
                                className="w-full py-5 bg-black hover:bg-neutral-800 text-white rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2.5 mt-2"
                            >
                                PROCEED <ArrowRight size={18} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}

            </div>



            {/* Customer Details Drawer */}
            <SlideDrawer
                isOpen={showCustomerDetailsModal}
                onClose={() => setShowCustomerDetailsModal(false)}
                title="Customer Profile"
                subtitle="Registered account and contact information"
                width="max-w-[440px]"
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-black text-lg uppercase shadow-md">
                            {customer.name ? customer.name.charAt(0) : <User size={24} />}
                        </div>
                        <div>
                            <h3 className="text-base font-black text-black uppercase tracking-tight">{customer.name || "N/A"}</h3>
                            <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">{customer.phone || "N/A"}</p>
                        </div>
                    </div>

                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Street / Landmark</span>
                            <span className="font-black text-black uppercase">{customer.street || "—"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Town / City</span>
                            <span className="font-black text-black uppercase">{customer.town || "—"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">District</span>
                            <span className="font-black text-black uppercase">{customer.district || "—"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">State</span>
                            <span className="font-black text-black uppercase">{customer.state || "—"}</span>
                        </div>
                        {customer.email && (
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Email</span>
                                <span className="font-black text-black">{customer.email}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCustomerDetailsModal(false);
                                setCurrentStep(0);
                            }}
                            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-xl text-black hover:bg-black hover:text-white transition-all"
                        >
                            Change Customer
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCustomerDetailsModal(false)}
                            className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </SlideDrawer>

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
                                {storeCategories.filter(cat => cat.name !== 'lens').map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                                <input required type="number" min="0" value={newProduct.unit_price} onChange={e => setNewProduct({ ...newProduct, unit_price: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-tight" placeholder="0" />
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

            {/* Prescription Modal */}
            <SlideDrawer
                isOpen={showPrescriptionModal}
                onClose={() => setShowPrescriptionModal(false)}
                title="Optical Data Input"
                subtitle="Specify lens power requirements"
                width="max-w-2xl"
            >
                <div className="p-8 space-y-8">
                    {/* Previous Power Records Selector */}
                    {customerPreviousPrescriptions.length > 0 && (
                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-black"></span>
                                    Previous Power Records ({customerPreviousPrescriptions.length})
                                </h4>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">Click to load</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                                {customerPreviousPrescriptions.map((rx, idx) => (
                                    <button
                                        key={rx.id || idx}
                                        type="button"
                                        onClick={() => {
                                            setTempPrescription({
                                                isSamePower: false,
                                                isCylindrical: Boolean(rx.dv_re_cyl || rx.dv_le_cyl),
                                                re: { sph: rx.dv_re_sph || '', cyl: rx.dv_re_cyl || '', axis: rx.dv_re_axis || '' },
                                                le: { sph: rx.dv_le_sph || '', cyl: rx.dv_le_cyl || '', axis: rx.dv_le_axis || '' },
                                                adl_re: { sph: rx.nv_re_sph || '', cyl: rx.nv_re_cyl || '', axis: rx.nv_re_axis || '' },
                                                adl_le: { sph: rx.nv_le_sph || '', cyl: rx.nv_le_cyl || '', axis: rx.nv_le_axis || '' },
                                                hasAdditionalPower: Boolean(rx.nv_re_sph || rx.nv_le_sph),
                                                notes: rx.notes || ''
                                            });
                                        }}
                                        className="p-3 bg-white hover:bg-neutral-900 hover:text-white rounded-xl border border-neutral-200 text-left transition-all group shadow-sm flex flex-col justify-between"
                                    >
                                        <div className="flex justify-between items-center w-full mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider group-hover:text-white">Record #{customerPreviousPrescriptions.length - idx}</span>
                                            <span className="text-[9px] font-bold text-neutral-400 group-hover:text-neutral-300">{rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'Saved'}</span>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold space-y-0.5 opacity-90">
                                            <div>RE: {rx.dv_re_sph || '0.00'} / {rx.dv_re_cyl || '0.00'} x {rx.dv_re_axis || '0'}</div>
                                            <div>LE: {rx.dv_le_sph || '0.00'} / {rx.dv_le_cyl || '0.00'} x {rx.dv_le_axis || '0'}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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
            </SlideDrawer>

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
            </CommandDialog>

            <AlertDialog
                isOpen={alertDialog.isOpen}
                onClose={() => {
                    setAlertDialog(prev => ({ ...prev, isOpen: false }));
                    if (alertDialog.onClose) alertDialog.onClose();
                }}
                title={alertDialog.title}
                message={alertDialog.message}
                type={alertDialog.type}
            />

            <FrameWizard
                isOpen={isFrameWizardOpen}
                onClose={() => { setIsFrameWizardOpen(false); setActiveFrameConfigureItem(null); }}
                onSelectFrame={handleSelectFrame}
            />
            <LensWizard
                isOpen={isLensWizardOpen}
                onClose={() => { setIsLensWizardOpen(false); setActiveFrameItem(null); }}
                onSelectLens={handleSelectLens}
                prescriptions={[]}
            />

        </div>
    );
}
