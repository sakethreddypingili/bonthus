import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Save, Plus, Trash2, X, ChevronDown, ChevronUp, Gift, CheckCircle, User, ShoppingBag, Sparkles, ArrowRight, Info, Edit3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";
import CommandDialog from "../components/common/CommandDialog";
import SlideDrawer from "../components/common/SlideDrawer";
import { OVERLAY_CHROME_STYLE } from "../components/common/overlayChrome";
import { usePopup } from "../components/common/PopupProvider";
import LensWizard from "../components/order/LensWizard";
import FrameWizard from "../components/order/FrameWizard";

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

    const [currentStep, setCurrentStep] = useState(initialCustomer.phone ? 1 : 0);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [expandedPrescriptions, setExpandedPrescriptions] = useState({});
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

    const [powerSuggestions, setPowerSuggestions] = useState({});
    const [activePowerInput, setActivePowerInput] = useState(null);
    const [powerDropdownLayout, setPowerDropdownLayout] = useState(null);
    const [selectedSigns, setSelectedSigns] = useState({});
    const [signToggleConfirm, setSignToggleConfirm] = useState(null);
    const powerInputRefs = useRef({});
    const [customerLookupStatus, setCustomerLookupStatus] = useState(initialCustomer.phone ? 'found' : 'idle');
    const [isItemPriceOpen, setIsItemPriceOpen] = useState(false);
    const [isDiscountOpen, setIsDiscountOpen] = useState(false);
    const [removeConfirmItemId, setRemoveConfirmItemId] = useState(null);

    const [flowCustomers, setFlowCustomers] = useState([]);
    const [loadingFlow, setLoadingFlow] = useState(false);

    const fetchFlowCustomers = async () => {
        if (!currentStoreId) return;
        setLoadingFlow(true);
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from('customer_visits')
                .select(`
                    id,
                    customer_id,
                    purpose,
                    status,
                    customers (
                        id,
                        name,
                        phone,
                        email,
                        street,
                        town,
                        district,
                        state,
                        postal_code,
                        age
                    )
                `)
                .eq('store_id', currentStoreId)
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            const unique = [];
            const seen = new Set();
            (data || []).forEach(v => {
                if (v.customers && !seen.has(v.customers.id)) {
                    seen.add(v.customers.id);
                    unique.push({
                        ...v.customers,
                        purpose: v.purpose,
                        status: v.status
                    });
                }
            });
            setFlowCustomers(unique);
        } catch (err) {
            console.error("Error loading flow customers:", err);
        } finally {
            setLoadingFlow(false);
        }
    };

    useEffect(() => {
        if (currentStoreId && currentStep === 0) {
            fetchFlowCustomers();
        }
    }, [currentStoreId, currentStep]);

    const selectFlowCustomer = (c) => {
        setCustomer({
            id: c.id,
            name: c.name || "",
            phone: c.phone || "",
            email: c.email || "",
            street: c.street || "",
            town: c.town || "",
            district: c.district || "",
            state: c.state || "",
            postal_code: c.postal_code || "",
            age: c.age || ""
        });
        setProfiles([{
            ...c,
            label: "Primary Profile"
        }]);
        setSelectedProfile({
            ...c,
            label: "Primary Profile"
        });
        setCustomerLookupStatus('found');
    };

    useEffect(() => {
        if (location.state?.triggerRegisterModal && location.state?.customer?.phone) {
            setRegForm(prev => ({ ...prev, phone: location.state.customer.phone }));
            setShowRegModal(true);
            // Clear navigation state parameter trigger so it doesn't reopen
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);    const selectedProfileRef = useRef(selectedProfile);
    useEffect(() => {
        selectedProfileRef.current = selectedProfile;
    }, [selectedProfile]);

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            // Avoid refetching/resetting if switching between profiles that are already loaded in the list
            const currentSelected = selectedProfileRef.current;
            const isExistingProfile = currentSelected && profiles.some(p => p.id === currentSelected.id);
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
                        
                        if (!currentSelected || !allProfiles.some(p => p.id === currentSelected.id)) {
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
    }, [customer.phone, initialCustomer.phone, location.state?.initialSelectedProfileId]);

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

    const [items, setItems] = useState([]);
    const [activeFrameItem, setActiveFrameItem] = useState(null);
    const [isLensWizardOpen, setIsLensWizardOpen] = useState(false);
    const [isFrameWizardOpen, setIsFrameWizardOpen] = useState(false);
    const [activeFrameConfigureItem, setActiveFrameConfigureItem] = useState(null);

    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const [showImageRequestModal, setShowImageRequestModal] = useState(false);
    const [imageRequestText, setImageRequestText] = useState("");
    const [imageRequestItem, setImageRequestItem] = useState(null);
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

    const handleOpenCatalogModal = async () => {
        if (storeSelectionRequired) {
            showAlert("Please select a store first.");
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
            qty: 1,
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
            qty: 1,
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
        setRemoveConfirmItemId(id);
    };

    const confirmRemoveItem = () => {
        if (removeConfirmItemId) {
            setItems(prev => prev.filter(item => item.id !== removeConfirmItemId));
            setRemoveConfirmItemId(null);
        }
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

    const handleOpenPrescription = async (item) => {
        setActivePrescriptionItem(item.id);
        setTempPrescription(item.prescription || null);
        
        setCustomerPreviousPrescriptions([]);
        const targetProfileId = selectedProfile?.id;
        
        if (targetProfileId) {
            try {
                const { data: rxList, error } = await supabase
                    .from('prescriptions')
                    .select('*')
                    .eq('customer_id', targetProfileId)
                    .order('prescribed_at', { ascending: false });
                if (!error && rxList) {
                    setCustomerPreviousPrescriptions(rxList);
                }
            } catch (err) {
                console.error("Error fetching previous prescriptions:", err);
            }
        }
        
        setShowPrescriptionModal(true);
    };

    const handleSavePrescription = () => {
        if (!tempPrescription) return;
        setItems(prev => prev.map(i => i.id === activePrescriptionItem ? { ...i, prescription: tempPrescription } : i));
        setShowPrescriptionModal(false);
    };

    const handleAddLensForFrame = (item) => {
        if (!currentStoreId) {
            showAlert('Please select a store first.');
            return;
        }
        setActiveFrameItem(item);
        setIsLensWizardOpen(true);
    };

    const handleOpenFrameWizard = (item) => {
        if (!currentStoreId) {
            showAlert('Please select a store first.');
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
            qty: 1,
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
            let selectedItemAfterLens = null;
            setItems(prev => prev.map(item => {
                if (item.id === activeFrameItem?.id) {
                    const isRxFreeType = lensDetails.custom_lens_specs?.power_type === 'frame_only' || lensDetails.custom_lens_specs?.power_type === 'zero_power';
                    const updatedItem = {
                        ...item,
                        prescription: isRxFreeType ? null : item.prescription,
                        custom_lens_specs: {
                            ...lensDetails.custom_lens_specs,
                            name: lensDetails.name,
                            price: Number(lensDetails.price || 0),
                            product_id: productId,
                            ...categoryTaxes
                        }
                    };
                    selectedItemAfterLens = updatedItem;
                    return updatedItem;
                }
                return item;
            }));

            // If switching to a power-requiring lens type and there's no prescription, prompt for power immediately
            const isRxFreeType = lensDetails.custom_lens_specs?.power_type === 'frame_only' || lensDetails.custom_lens_specs?.power_type === 'zero_power';
            if (!isRxFreeType && selectedItemAfterLens && !selectedItemAfterLens.prescription) {
                // Open the prescription selection modal for this item
                setTimeout(() => {
                    handleOpenPrescription(selectedItemAfterLens);
                }, 100);
            }

        } catch (err) {
            showAlert('Failed to process lens selection: ' + err.message);
        } finally {
            setLoading(false);
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
        const qty = Number(item.quantity || item.qty || 1);
        const framePrice = Number(item.price || 0);
        const lensPrice = Number(item.custom_lens_specs?.price || 0);
        const unitPrice = framePrice + lensPrice;
        const lineDiscount = Number(item.discount || 0) + (itemDiscountMap[item.id]?.discount || 0);
        const lineTotal = Math.max(0, (unitPrice * qty) - lineDiscount);
        const taxRate = Number(item.sgst || 0) + Number(item.cgst || 0) + Number(item.igst || 0);
        const taxable = taxRate > 0 ? lineTotal / (1 + (taxRate / 100)) : lineTotal;
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

    const subtotal = items.reduce((sum, item) => {
        const qty = Number(item.quantity || item.qty || 1);
        const framePrice = Number(item.price || 0);
        const lensPrice = Number(item.custom_lens_specs?.price || 0);
        return sum + ((framePrice + lensPrice) * qty);
    }, 0);
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

            // Resolve prescription from the items list (no new insertion needed)
            let prescriptionId = null;
            const preset = items.find(it => it.prescription?.id);
            if (preset) {
                prescriptionId = preset.prescription.id;
            }

            // Create catalog products on the fly for any custom frame items that lack product_id
            const finalizedItems = [];
            for (const item of totalLineAmounts) {
                if (item.type === 'Frame' && !item.product_id) {
                    try {
                        // 1. Resolve Category hierarchy: Frames -> Eyeglasses -> [Shape]
                        let resolvedCategoryId = null;
                        try {
                            const { data: rootCat } = await supabase
                                .from('categories')
                                .select('id')
                                .eq('name', 'frames')
                                .maybeSingle();

                            let rootId = rootCat?.id;
                            if (!rootId) {
                                const { data: newRoot } = await supabase
                                    .from('categories')
                                    .insert([{ name: 'frames', parent_id: null }])
                                    .select('id')
                                    .single();
                                rootId = newRoot.id;
                            }

                            const { data: eyeCat } = await supabase
                                .from('categories')
                                .select('id')
                                .eq('name', 'Eyeglasses')
                                .eq('parent_id', rootId)
                                .maybeSingle();

                            let eyeId = eyeCat?.id;
                            if (!eyeId) {
                                const { data: newEye } = await supabase
                                    .from('categories')
                                    .insert([{ name: 'Eyeglasses', parent_id: rootId }])
                                    .select('id')
                                    .single();
                                eyeId = newEye.id;
                            }

                            const shapeName = item.custom_frame_specs?.shape || 'Other';
                            const { data: shapeCat } = await supabase
                                .from('categories')
                                .select('id')
                                .eq('name', shapeName)
                                .eq('parent_id', eyeId)
                                .maybeSingle();

                            let shapeId = shapeCat?.id;
                            if (!shapeId) {
                                const { data: newShape } = await supabase
                                    .from('categories')
                                    .insert([{ name: shapeName, parent_id: eyeId }])
                                    .select('id')
                                    .single();
                                shapeId = newShape.id;
                            }
                            resolvedCategoryId = shapeId;
                        } catch (catErr) {
                            console.error('Failed to resolve category tree for frame:', catErr);
                        }

                        // 2. Create Product
                        const brandName = item.custom_frame_specs?.brand || item.brand || item.name || 'Custom';
                        const frameColor = item.custom_frame_specs?.color || 'Unknown';
                        const productName = `${brandName} - ${frameColor}`.trim();
                        const customSku = `FRM-AUTO-${Date.now().toString().slice(-6)}`;

                        const { data: newProd, error: newProdError } = await supabase
                            .from('products')
                            .insert([{
                                name: productName,
                                sku: customSku,
                                base_price: Number(item.price || 0),
                                category_id: resolvedCategoryId,
                                frame_shape: item.custom_frame_specs?.shape || null,
                                frame_type: item.custom_frame_specs?.frame_type || null
                            }])
                            .select('id')
                            .single();

                        if (newProdError) throw newProdError;

                        // 3. Create barcode
                        const customBarcode = '8901' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
                        await supabase
                            .from('product_barcodes')
                            .insert([{
                                barcode: customBarcode,
                                product_id: newProd.id
                            }]);

                        finalizedItems.push({
                            ...item,
                            product_id: newProd.id
                        });
                    } catch (err) {
                        console.error('Failed to create frame catalog product on save:', err);
                        throw new Error(`Failed to register custom frame product: ${err.message}`);
                    }
                } else {
                    finalizedItems.push(item);
                }
            }

            const newOrderNumber = generateId(ID_RULES.ORDERS.prefix, ID_RULES.ORDERS.digits);
            const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
                order_number: newOrderNumber,
                store_id: currentStoreId,
                customer_id: customerId,
                prescription_id: prescriptionId || selectedPrescriptionId || null,
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

            const orderItemsPayload = finalizedItems.map(item => ({
                order_id: orderId,
                product_id: item.product_id,
                quantity: Number(item.qty),
                unit_price: Number(item.price),
                discount_amount: Number(item.discount || 0),
                total_price: item.lineTotal,
                custom_lens_specs: item.custom_lens_specs || null,
                custom_frame_specs: item.custom_frame_specs || null,
                is_b1g1: item.is_b1g1 || false
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw itemsError;

            // Insert payments log so Cash Desk can track auto cash sales
            const paymentsPayload = payments
                .filter(p => Number(p.amount) > 0)
                .map(p => {
                    let dbMethod = 'cash';
                    const modeUpper = (p.mode || '').toUpperCase();
                    if (modeUpper === 'CASH') dbMethod = 'cash';
                    else if (modeUpper === 'CARD') dbMethod = 'card';
                    else if (modeUpper === 'UPI' || modeUpper === 'GPAY' || modeUpper === 'PHONEPE') dbMethod = 'digital_wallet';
                    else dbMethod = 'bank_transfer';

                    return {
                        order_id: orderId,
                        amount: Number(p.amount),
                        payment_method: dbMethod,
                        status: 'completed'
                    };
                });

            if (paymentsPayload.length > 0) {
                const { error: payErr } = await supabase.from('payments').insert(paymentsPayload);
                if (payErr) console.error('Failed to save payments record:', payErr);
            }

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
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Select from today's flow or search database</p>
                            </div>

                            {/* Today's Flow checked-in customers */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Today's Checked-in (Flow) Customers</p>
                                {loadingFlow ? (
                                    <div className="text-[10px] text-gray-400 font-bold py-2 ml-1">Loading today's flow...</div>
                                ) : flowCustomers.length === 0 ? (
                                    <div className="p-4 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">
                                        No customer checked-in today yet
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                                        {flowCustomers.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => selectFlowCustomer(p)}
                                                className="w-full text-left px-5 py-3.5 border border-gray-150 hover:border-black bg-gray-50 hover:bg-white rounded-2xl transition-all flex items-center justify-between shadow-sm group"
                                            >
                                                <div>
                                                    <span className="block text-[11px] font-black uppercase tracking-tight text-neutral-900 truncate max-w-[120px]">{p.name}</span>
                                                    <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{p.purpose || "Walk-in"}</span>
                                                </div>
                                                <span className="text-[10px] font-mono font-bold text-neutral-500">{p.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 my-4" />

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Search Directory (Mobile Number) *</label>
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
                        {/* Left Column: Cart Items (Full width if empty) */}
                        <div className={`${items.length === 0 ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
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
                                        className="px-10 py-6 bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all shadow-xl inline-flex items-center gap-2.5 hover:scale-[1.02] active:scale-95"
                                    >
                                        <Plus size={16} strokeWidth={3} /> Add Product
                                    </button>
                                </div>
                            ) : (
                                items.map((item, index) => {
                                    const isFreeItem = (itemDiscountMap[item.id]?.freeQty > 0) || Number(item.price) === 0;
                                    const itemQty = Number(item.quantity || item.qty || 1);
                                    
                                    const hasLensSpecs = !!item.custom_lens_specs;
                                    const isZeroPower = item.custom_lens_specs?.power_type === 'zero_power';
                                    const isFrameOnly = item.custom_lens_specs?.power_type === 'frame_only';
                                    
                                    const lensCost = hasLensSpecs ? Number(item.custom_lens_specs.price || 0) : 0;
                                    const basePrice = Number(item.price || 0) + lensCost;
                                    const effectivePrice = Math.max(0, (basePrice * itemQty) - (itemDiscountMap[item.id]?.discount || 0));
                                    return (
                                        <div key={item.id} className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-6 relative overflow-hidden transition-all hover:border-black hover:shadow-md group">
                                            {removeConfirmItemId === item.id ? (
                                                <div className="text-center py-6 space-y-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col justify-center items-center w-full">
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-black text-black uppercase tracking-tight">Remove Item From Cart?</h4>
                                                        <p className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">This action cannot be undone.</p>
                                                    </div>
                                                    <div className="flex justify-center gap-4 w-full max-w-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemoveConfirmItemId(null)}
                                                            className="flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest border-2 border-neutral-100 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-50 transition-all active:scale-95"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={confirmRemoveItem}
                                                            className="flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest bg-black text-white rounded-xl hover:bg-neutral-800 transition-all active:scale-95"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Black & White Corner Ribbon for Free / B1G1 items */}
                                                    {isFreeItem && (
                                                        <div className="absolute top-0 left-0">
                                                            <div className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-8 py-1.5 transform -rotate-45 -translate-x-7 translate-y-3 shadow-md text-center border-b border-white/20">
                                                                FREE
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                                                        {/* Product Image / Icon Thumbnail */}
                                                        <div 
                                                             className="w-32 h-26 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-center p-3 shrink-0 relative transition-colors group/image"
                                                             onMouseEnter={() => setHoveredItemId(item.id)}
                                                             onMouseLeave={() => setHoveredItemId(null)}
                                                         >
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

                                                             {/* Hover Action Overlay */}
                                                             {hoveredItemId === item.id && (item.type === 'Frame' || item.custom_frame_specs) && (
                                                                 <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-2 p-1.5 animate-in fade-in duration-100">
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => handleOpenFrameWizard(item)}
                                                                         className="w-full py-1.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-lg shadow hover:bg-neutral-100 transition-all text-center"
                                                                     >
                                                                         Edit Specs
                                                                     </button>
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => {
                                                                             setImageRequestItem(item);
                                                                             setImageRequestText("");
                                                                             setShowImageRequestModal(true);
                                                                         }}
                                                                         className="w-full py-1.5 bg-neutral-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow hover:bg-neutral-800 transition-all text-center border border-white/10"
                                                                     >
                                                                          Visualise
                                                                      </button>
                                                                 </div>
                                                             )}
                                                         </div>

                                                        {/* Product Details & Pricing (UI UX Pro Max Monochromatic Layout) */}
                                                        <div className="flex-1 w-full">
                                                            {/* 1. Product Name (Brand, Color) */}
                                                            <div className="flex justify-between items-start gap-4 pb-2.5">
                                                                <div>
                                                                    <h3 className="text-sm font-black text-black uppercase tracking-tight leading-snug">
                                                                        {item.custom_frame_specs?.color 
                                                                            ? `${item.name || "UNNAMED PRODUCT"} - ${item.custom_frame_specs.color}` 
                                                                            : (item.name || "UNNAMED PRODUCT")}
                                                                    </h3>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    {isFreeItem && effectivePrice === 0 ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs line-through text-neutral-400 font-mono">₹{basePrice.toLocaleString()}</span>
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

                                                            {/* Lens row / No Lens row */}
                                                            <div className="py-2.5">
                                                                {isFrameOnly ? (
                                                                    <div className="flex justify-between items-center text-xs group/lens">
                                                                        <span className="font-bold text-neutral-850 uppercase tracking-wider text-[11px]">
                                                                            Frame Only
                                                                            <span className="opacity-0 group-hover/lens:opacity-100 transition-opacity ml-2 text-neutral-450 font-normal">
                                                                                (
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => handleAddLensForFrame(item)} 
                                                                                    className="text-[10px] font-black uppercase text-black underline underline-offset-2 hover:text-neutral-600 transition-colors mx-1"
                                                                                >
                                                                                    Change
                                                                                </button>
                                                                                )
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                ) : hasLensSpecs ? (
                                                                    <div className="flex justify-between items-center text-xs group/lens">
                                                                        <span className="font-bold text-neutral-850 uppercase tracking-wider text-[11px]">
                                                                            {item.custom_lens_specs.name || item.custom_lens_specs.lens_type}
                                                                            <span className="opacity-0 group-hover/lens:opacity-100 transition-opacity ml-2 text-neutral-450 font-normal">
                                                                                (
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => handleAddLensForFrame(item)} 
                                                                                    className="text-[10px] font-black uppercase text-black underline underline-offset-2 hover:text-neutral-600 transition-colors mx-1"
                                                                                >
                                                                                    Change
                                                                                </button>
                                                                                )
                                                                            </span>
                                                                        </span>
                                                                        {lensCost > 0 && (
                                                                            <span className="font-bold text-neutral-500 font-mono">
                                                                                ₹{lensCost.toLocaleString()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-start items-center text-xs">
                                                                        {item.type === 'Frame' && (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={() => handleAddLensForFrame(item)} 
                                                                                className="text-xs font-black uppercase text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
                                                                            >
                                                                                Add Lens
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Prescription Row (Only displayed if Lens is selected and is NOT zero power or frame only) */}
                                                            {hasLensSpecs && !isZeroPower && !isFrameOnly && (
                                                                <>
                                                                    {/* Dotted Line Divider */}
                                                                    <div className="border-b border-dashed border-neutral-200" />
                                                                    <div className="py-2.5">
                                                                        {item.prescription ? (
                                                                            <div className="space-y-3">
                                                                                <div className="flex justify-between items-center text-xs">
                                                                                    <span className="font-bold text-neutral-850 uppercase tracking-wider text-[11px] group/rx flex items-center">
                                                                                        Buying for&nbsp;
                                                                                        <span className="underline">{(() => {
                                                                                            const rxProfile = profiles.find(p => p.id === item.prescription.customer_id);
                                                                                            return rxProfile?.name || selectedProfile?.name || 'Customer';
                                                                                        })()}</span>
                                                                                        <span className="opacity-0 group-hover/rx:opacity-100 transition-opacity ml-2 text-neutral-450 font-normal">
                                                                                            (
                                                                                            <button 
                                                                                                type="button"
                                                                                                onClick={() => handleOpenPrescription(item)} 
                                                                                                className="text-[10px] font-black uppercase text-black underline underline-offset-2 hover:text-neutral-600 transition-colors mx-1"
                                                                                            >
                                                                                                Edit
                                                                                            </button>
                                                                                            )
                                                                                        </span>
                                                                                        <button 
                                                                                            type="button"
                                                                                            onClick={() => setExpandedPrescriptions(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                                                            className="ml-2 hover:text-black"
                                                                                        >
                                                                                            {expandedPrescriptions[item.id] === false ? '⌵' : '⌃'}
                                                                                        </button>
                                                                                    </span>
                                                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase">
                                                                                        No extra charge for high power
                                                                                    </span>
                                                                                </div>
                                                                                
                                                                                {expandedPrescriptions[item.id] !== false && (
                                                                                    <div className="border border-neutral-100 rounded-xl overflow-hidden mt-2">
                                                                                        <table className="w-full text-left border-collapse bg-white">
                                                                                            <thead>
                                                                                                <tr className="bg-[#f4f5fa] text-[9px] font-black uppercase tracking-wider text-[#4d5b91] border-b border-neutral-100">
                                                                                                    <th className="px-4 py-2">Eye</th>
                                                                                                    <th className="px-4 py-2 text-center">SPH</th>
                                                                                                    <th className="px-4 py-2 text-center">CYL</th>
                                                                                                    <th className="px-4 py-2 text-center">AXIS</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="text-[10px] font-bold font-mono text-neutral-700 divide-y divide-neutral-100/50">
                                                                                                <tr>
                                                                                                    <td className="px-4 py-2 text-[9px] font-black text-neutral-400">L</td>
                                                                                                    <td className="px-4 py-2 text-center">{item.prescription.dv_le_sph || '—'}</td>
                                                                                                    <td className="px-4 py-2 text-center">{item.prescription.dv_le_cyl || '—'}</td>
                                                                                                    <td className="px-4 py-2 text-center">{item.prescription.dv_le_axis || '—'}</td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    <td className="px-4 py-2 text-[9px] font-black text-neutral-400">R</td>
                                                                                                    <td className="px-4 py-2 text-center">{item.prescription.dv_re_sph || '—'}</td>
                                                                                                    <td className="px-4 py-2 text-center">{item.prescription.dv_re_cyl || '—'}</td>
                                                                                                    <td className="px-4 py-2 text-center">{item.prescription.dv_re_axis || '—'}</td>
                                                                                                </tr>
                                                                                            </tbody>
                                                                                        </table>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex justify-start items-center text-xs">
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => handleOpenPrescription(item)} 
                                                                                    className="text-xs font-black uppercase text-black underline underline-offset-4 hover:text-neutral-600 transition-colors"
                                                                                >
                                                                                    Add Power
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </>
                                                            )}

                                                            {/* 4. Final Price Row */}
                                                            <div className="flex justify-between items-center text-xs py-2.5">
                                                                <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Final Price</span>
                                                                <span className="font-black font-mono text-black">
                                                                    {effectivePrice === 0 ? 'Free' : `₹${effectivePrice.toLocaleString()}`}
                                                                </span>
                                                            </div>

                                                            {/* Dotted Line Divider */}
                                                            <div className="border-b border-dashed border-neutral-200" />

                                                            {/* 5. Dedicated Action Row for Repeat & Remove (Left side side-by-side, nothing under price) */}
                                                            <div className="flex items-center gap-6 pt-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => repeatItem(item)}
                                                                    className="text-xs font-black text-black hover:text-neutral-600 uppercase tracking-wider underline underline-offset-4 transition-colors"
                                                                >
                                                                    Repeat
                                                                </button>
                                                                
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRemoveConfirmItemId(item.id)}
                                                                    className="text-xs font-black text-neutral-400 hover:text-black uppercase tracking-wider underline underline-offset-4 transition-colors"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>

                                                            {/* Black and White Offer Banner Notice */}
                                                            {isFreeItem && (
                                                                <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl px-4 py-2.5 mt-3 flex items-center gap-2.5 text-[10px] font-black text-black uppercase tracking-wider">
                                                                    <CheckCircle size={15} className="text-black shrink-0" />
                                                                    This Product is Free with B1G1 / Membership Offer!
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {/* Add Product Option at the end of the cart items list (Right-aligned plain text link) */}
                            {items.length > 0 && (
                                <div className="flex justify-end pt-2 pb-3">
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-xs font-black text-black uppercase tracking-widest underline underline-offset-4 hover:text-neutral-600 transition-colors"
                                    >
                                        + Add Product
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Column (4 cols): Bill Details & Checkout */}
                        {items.length > 0 && (
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
                        )}
                    </div>
                )}

                {/* STEP 2: REVIEW & CONFIRMATION */}
                {currentStep === 2 && (
                    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] border border-neutral-200/80 shadow-sm p-8 space-y-8 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finalization</span>
                                <h2 className="text-xl font-black text-black uppercase tracking-tight">Review & Settlement</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className="flex items-center gap-1.5 px-4 py-2 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                            >
                                <ArrowLeft size={14} /> Back to Cart
                            </button>
                        </div>

                        {/* Customer Info Card */}
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex justify-between items-center">
                            <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer Details</span>
                                <h3 className="text-base font-black uppercase text-black mt-0.5">{customer.name || "N/A"}</h3>
                                <p className="text-xs font-mono font-bold text-gray-500">{customer.phone || "N/A"}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Store</span>
                                <p className="text-xs font-black uppercase text-black mt-0.5">
                                    {stores.find(s => s.id === currentStoreId)?.name || "N/A"}
                                </p>
                            </div>
                        </div>

                        {/* Items Breakdown list */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Items</h4>
                            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                                {totalLineAmounts.map((item) => {
                                    const hasLensSpecs = !!item.custom_lens_specs;
                                    const lensCost = hasLensSpecs ? Number(item.custom_lens_specs.price || 0) : 0;
                                    const basePrice = Number(item.price || 0) + lensCost;
                                    const qty = Number(item.quantity || item.qty || 1);
                                    const lineDiscount = Number(item.discount || 0) + (itemDiscountMap[item.id]?.discount || 0);
                                    const effectivePrice = Math.max(0, (basePrice * qty) - lineDiscount);

                                    return (
                                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all text-xs">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-black uppercase tracking-tight">
                                                        {item.custom_frame_specs ? `${item.custom_frame_specs.brand} (${item.custom_frame_specs.color})` : item.name}
                                                    </span>
                                                    {item.is_b1g1 && (
                                                        <span className="bg-black text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                            <Gift size={9} /> B1G1 Eligible
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-neutral-400 font-bold uppercase text-[9px] tracking-wider space-x-2">
                                                    <span>Qty: {qty}</span>
                                                    <span>·</span>
                                                    <span>Base: ₹{Number(item.price || 0).toLocaleString()}</span>
                                                    {hasLensSpecs && (
                                                        <>
                                                            <span>·</span>
                                                            <span>Lens ({item.custom_lens_specs.name}): ₹{lensCost.toLocaleString()}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-black text-black">₹{effectivePrice.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Settlement Input splits */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Settlement / Payments</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div className="space-y-3">
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
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removePayment(p.id)}
                                                className="p-2 text-gray-300 hover:text-black transition-all"
                                                disabled={payments.length === 1}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={handleAddPayment}
                                        className="w-full py-4 border-2 border-dashed border-gray-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all"
                                    >
                                        Add Payment Split
                                    </button>
                                </div>

                                {/* Bill summary layout card */}
                                <div className="bg-black text-white p-6 rounded-3xl space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Invoice Summary</h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between font-bold text-gray-400">
                                            <span>Subtotal</span>
                                            <span className="font-mono text-white">₹{subtotal.toLocaleString()}</span>
                                        </div>
                                        {totalB1g1Discount > 0 && (
                                            <div className="flex justify-between font-bold text-green-400">
                                                <span>B1G1 Savings</span>
                                                <span className="font-mono">-₹{totalB1g1Discount.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {fittingCharges > 0 && (
                                            <div className="flex justify-between font-bold text-gray-400">
                                                <span>Fitting Charges</span>
                                                <span className="font-mono text-white">₹{fittingCharges}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/10 my-2 pt-2" />
                                        <div className="flex justify-between items-center text-sm font-black pt-1">
                                            <span className="uppercase tracking-tight text-white">Total payable</span>
                                            <span className="font-mono text-white text-xl font-black">₹{grossTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-gray-400 pt-2 text-[10px]">
                                            <span>Recorded Pay</span>
                                            <span className="font-mono text-white">₹{totalPaid.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-[10px] pt-1">
                                            <span className="text-gray-400">Balance due</span>
                                            <span className={`font-mono ${Number(paymentGap) === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {Number(paymentGap) === 0 ? '✓ Balanced' : `₹${paymentGap}`}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleFinalSave}
                                        disabled={loading || Number(paymentGap) !== 0 || payments.some(p => !p.mode)}
                                        className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.01] transition-all disabled:opacity-30 flex items-center justify-center gap-3 mt-4"
                                    >
                                        {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                                        Save Invoice
                                    </button>
                                </div>
                            </div>
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

            {/* Prescription Modal */}
            <SlideDrawer
                isOpen={showPrescriptionModal}
                onClose={() => setShowPrescriptionModal(false)}
                title="RECENT PRESCRIPTIONS"
                subtitle="Select a power record from the history below"
                width="max-w-5xl"
            >
                <div className="p-8 space-y-6 flex flex-col h-full">
                    {customerPreviousPrescriptions.length > 0 ? (
                        <div className="flex-1 overflow-x-auto overflow-y-auto">
                            <table className="w-full text-left border-collapse border border-neutral-100 rounded-2xl overflow-hidden text-neutral-800">
                                <thead>
                                    <tr className="bg-neutral-50 text-[10px] font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
                                        <th className="px-5 py-4">Customer</th>
                                        <th className="px-5 py-4">Date</th>
                                        <th className="px-5 py-4">Eye</th>
                                        <th className="px-5 py-4 text-center">SPH</th>
                                        <th className="px-5 py-4 text-center">CYL</th>
                                        <th className="px-5 py-4 text-center">AXIS</th>
                                        <th className="px-5 py-4 text-center">ADD</th>
                                        <th className="px-5 py-4">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-bold divide-y divide-neutral-100">
                                    {customerPreviousPrescriptions.map((rx, rxIdx) => {
                                        const profile = profiles.find(p => p.id === rx.customer_id);
                                        const customerName = profile?.name || 'Customer';
                                        const customerPhone = profile?.phone || '';
                                        const dateStr = rx.prescribed_at 
                                            ? new Date(rx.prescribed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) 
                                            : '—';
                                        
                                        const isSelected = tempPrescription?.id === rx.id;
                                        
                                        // Helper to format values
                                        const fmtVal = (val) => {
                                            if (val === null || val === undefined || String(val).trim() === '') return '—';
                                            return val;
                                        };

                                        // Helper to calculate near SPH sum
                                        const getNvSphSum = (dvSph, addVal) => {
                                            if (!dvSph) return '—';
                                            const dv = parseFloat(dvSph) || 0;
                                            const add = parseFloat(addVal) || 0;
                                            const sum = dv + add;
                                            if (sum === 0) return 'Plano';
                                            return sum > 0 ? `+${sum.toFixed(2)}` : sum.toFixed(2);
                                        };

                                        // 4 rows for each prescription: RE (DV), RE (NV), LE (DV), LE (NV)
                                        return (
                                            <Fragment key={rx.id || rxIdx}>
                                                {/* RE (DV) Row */}
                                                <tr 
                                                    onClick={() => setTempPrescription(rx)}
                                                    className={`cursor-pointer transition-all hover:bg-neutral-50/50 ${isSelected ? 'bg-neutral-50' : 'bg-white'}`}
                                                >
                                                    <td rowSpan={4} className="px-5 py-4 align-top border-r border-neutral-100 min-w-[160px]">
                                                        <div className="flex items-start gap-3">
                                                            <input 
                                                                type="radio" 
                                                                checked={isSelected} 
                                                                onChange={() => setTempPrescription(rx)}
                                                                className="mt-1 accent-black" 
                                                            />
                                                            <div>
                                                                <div className="font-black text-black uppercase tracking-tight leading-tight">{customerName}</div>
                                                                <div className="text-[9px] font-mono text-gray-400 mt-1 font-bold">{customerPhone}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td rowSpan={4} className="px-5 py-4 align-top border-r border-neutral-100 font-bold text-neutral-600">
                                                        {dateStr}
                                                    </td>
                                                    <td className="px-5 py-3 border-r border-neutral-100 text-[10px] font-black uppercase text-neutral-400">RE (DV)</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-black">{fmtVal(rx.dv_re_sph)}</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600">{fmtVal(rx.dv_re_cyl)}</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600">{fmtVal(rx.dv_re_axis)}</td>
                                                    <td rowSpan={2} className="px-5 py-4 text-center border-r border-neutral-100 font-mono font-black">
                                                        {fmtVal(rx.nv_re_sph)}
                                                    </td>
                                                    <td rowSpan={4} className="px-5 py-4 align-top font-bold text-neutral-500 max-w-[150px] break-words">
                                                        {fmtVal(rx.notes)}
                                                    </td>
                                                </tr>
                                                {/* RE (NV) Row */}
                                                <tr 
                                                    onClick={() => setTempPrescription(rx)}
                                                    className={`cursor-pointer transition-all hover:bg-neutral-50/50 ${isSelected ? 'bg-neutral-50' : 'bg-white'}`}
                                                >
                                                    <td className="px-5 py-3 border-r border-neutral-100 text-[10px] font-black uppercase text-neutral-400 border-t border-neutral-100/50">RE (NV)</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-black border-t border-neutral-100/50">
                                                        {getNvSphSum(rx.dv_re_sph, rx.nv_re_sph)}
                                                    </td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600 border-t border-neutral-100/50">
                                                        {fmtVal(rx.nv_re_cyl || rx.dv_re_cyl)}
                                                    </td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600 border-t border-neutral-100/50">
                                                        {fmtVal(rx.nv_re_axis || rx.dv_re_axis)}
                                                    </td>
                                                </tr>
                                                {/* LE (DV) Row */}
                                                <tr 
                                                    onClick={() => setTempPrescription(rx)}
                                                    className={`cursor-pointer transition-all hover:bg-neutral-50/50 ${isSelected ? 'bg-neutral-50' : 'bg-white'}`}
                                                >
                                                    <td className="px-5 py-3 border-r border-neutral-100 text-[10px] font-black uppercase text-neutral-400 border-t border-neutral-100/50">LE (DV)</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-black border-t border-neutral-100/50">{fmtVal(rx.dv_le_sph)}</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600 border-t border-neutral-100/50">{fmtVal(rx.dv_le_cyl)}</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600 border-t border-neutral-100/50">{fmtVal(rx.dv_le_axis)}</td>
                                                    <td rowSpan={2} className="px-5 py-4 text-center border-r border-neutral-100 font-mono font-black border-t border-neutral-100/50">
                                                        {fmtVal(rx.nv_le_sph)}
                                                    </td>
                                                </tr>
                                                {/* LE (NV) Row */}
                                                <tr 
                                                    onClick={() => setTempPrescription(rx)}
                                                    className={`cursor-pointer transition-all hover:bg-neutral-50/50 ${isSelected ? 'bg-neutral-50' : 'bg-white'}`}
                                                >
                                                    <td className="px-5 py-3 border-r border-neutral-100 text-[10px] font-black uppercase text-neutral-400 border-t border-neutral-100/50">LE (NV)</td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-black border-t border-neutral-100/50">
                                                        {getNvSphSum(rx.dv_le_sph, rx.nv_le_sph)}
                                                    </td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600 border-t border-neutral-100/50">
                                                        {fmtVal(rx.nv_le_cyl || rx.dv_le_cyl)}
                                                    </td>
                                                    <td className="px-5 py-3 text-center border-r border-neutral-100 font-mono font-bold text-neutral-600 border-t border-neutral-100/50">
                                                        {fmtVal(rx.nv_le_axis || rx.dv_le_axis)}
                                                    </td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-neutral-400 font-bold uppercase text-xs flex-1">
                            No saved power records found for this customer profile.
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 flex gap-4 mt-auto">
                        <button type="button" onClick={() => setShowPrescriptionModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Cancel</button>
                        <button
                            onClick={handleSavePrescription}
                            disabled={!tempPrescription?.id}
                            className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all disabled:opacity-30"
                        >
                            Select Power
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

            {/* Image Request Dialog */}
            <CommandDialog
                isOpen={showImageRequestModal}
                onClose={() => setShowImageRequestModal(false)}
                title="Visualise"
                subtitle="Add this item config to the request pool?"
            >
                <div className="p-8 space-y-6 text-center">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setShowImageRequestModal(false)}
                            className="flex-1 py-3.5 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    setLoading(true);

                                    // 1. Resolve Category hierarchy: Frames -> Eyeglasses -> [Shape]
                                    let resolvedCategoryId = null;
                                    try {
                                        // A. Find or create root category: frames
                                        const { data: rootCat, error: rootErr } = await supabase
                                            .from('categories')
                                            .select('id')
                                            .eq('name', 'frames')
                                            .maybeSingle();

                                        let rootId = rootCat?.id;
                                        if (rootErr || !rootId) {
                                            const { data: newRoot, error: newRootErr } = await supabase
                                                .from('categories')
                                                .insert([{ name: 'frames', parent_id: null }])
                                                .select('id')
                                                .single();
                                            if (newRootErr) throw newRootErr;
                                            rootId = newRoot.id;
                                        }

                                        // B. Find or create second-level: Eyeglasses
                                        const { data: eyeCat, error: eyeErr } = await supabase
                                            .from('categories')
                                            .select('id')
                                            .eq('name', 'Eyeglasses')
                                            .eq('parent_id', rootId)
                                            .maybeSingle();

                                        let eyeId = eyeCat?.id;
                                        if (eyeErr || !eyeId) {
                                            const { data: newEye, error: newEyeErr } = await supabase
                                                .from('categories')
                                                .insert([{ name: 'Eyeglasses', parent_id: rootId }])
                                                .select('id')
                                                .single();
                                            if (newEyeErr) throw newEyeErr;
                                            eyeId = newEye.id;
                                        }

                                        // C. Find or create third-level matching the frame shape
                                        const shapeName = imageRequestItem?.frameSpecs?.shape || 'Other';
                                        const { data: shapeCat, error: shapeErr } = await supabase
                                            .from('categories')
                                            .select('id')
                                            .eq('name', shapeName)
                                            .eq('parent_id', eyeId)
                                            .maybeSingle();

                                        let shapeId = shapeCat?.id;
                                        if (shapeErr || !shapeId) {
                                            const { data: newShape, error: newShapeErr } = await supabase
                                                .from('categories')
                                                .insert([{ name: shapeName, parent_id: eyeId }])
                                                .select('id')
                                                .single();
                                            if (newShapeErr) throw newShapeErr;
                                            shapeId = newShape.id;
                                        }

                                        resolvedCategoryId = shapeId;
                                    } catch (catErr) {
                                        console.error('Failed to resolve category tree:', catErr);
                                    }

                                    // 2. Generate EAN-13-like barcode: 8901 + 9 random digits
                                    const customBarcode = '8901' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
                                    const customSku = `IMG-REQ-${Date.now().toString().slice(-6)}`;

                                    // 3. Create Product in database
                                    const brandName = imageRequestItem?.custom_frame_specs?.brand || imageRequestItem?.brand || imageRequestItem?.name || 'Custom';
                                    const frameColor = imageRequestItem?.custom_frame_specs?.color || 'Unknown';
                                    const productName = `${brandName} - ${frameColor}`.trim();

                                    const { data: newProd, error: newProdError } = await supabase
                                        .from('products')
                                        .insert([{
                                            name: productName,
                                            sku: customSku,
                                            base_price: 0,
                                            category_id: resolvedCategoryId,
                                            frame_shape: imageRequestItem?.custom_frame_specs?.shape || null,
                                            frame_type: imageRequestItem?.custom_frame_specs?.frame_type || null,
                                            is_imagine_origin: true
                                        }])
                                        .select('id')
                                        .single();

                                    if (newProdError) throw newProdError;

                                    // 4. Create and link barcode entry
                                    const { error: barcodeError } = await supabase
                                        .from('product_barcodes')
                                        .insert([{
                                            barcode: customBarcode,
                                            product_id: newProd.id
                                        }]);
                                    if (barcodeError) throw barcodeError;

                                    // 5. Submit to imagine_pool linked to this product (expires in 3 hours)
                                    const { error: poolError } = await supabase
                                        .from('imagine_pool')
                                        .insert([{
                                            store_id: currentStoreId || null,
                                            product_id: newProd.id,
                                            status: 'pending',
                                            expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
                                        }]);
                                    if (poolError) throw poolError;

                                    showAlert("Added to visualise pool successfully!");
                                    setShowImageRequestModal(false);
                                } catch (err) {
                                    showAlert("Failed: " + err.message);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="flex-1 py-3.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
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

            {/* Lens & Frame Wizards */}
            <FrameWizard
                isOpen={isFrameWizardOpen}
                onClose={() => { setIsFrameWizardOpen(false); setActiveFrameConfigureItem(null); }}
                onSelectFrame={handleSelectFrame}
            />
            <LensWizard
                isOpen={isLensWizardOpen}
                onClose={() => { setIsLensWizardOpen(false); setActiveFrameItem(null); }}
                onSelectLens={handleSelectLens}
                prescriptions={prescriptions}
            />

        </div>
    );
}
