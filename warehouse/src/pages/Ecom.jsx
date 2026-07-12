import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Loader2, Globe, ToggleLeft, ToggleRight, Tag, ShieldAlert, Award } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";

export default function Ecom({ userProfile }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get("tab") || "catalog";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Advanced Analytics/Fulfillment States
  const [ecomStats, setEcomStats] = useState({
    totalProducts: 0,
    onlineProducts: 0,
    averageDiscount: 0,
    featuredCount: 0
  });

  // Modal Editing States (Advanced properties)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [features, setFeatures] = useState("");
  const [ecomDescription, setEcomDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [isFeatured, setIsFeatured] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState("6");
  const [customBadge, setCustomBadge] = useState("");
  const [isFreeShipping, setIsFreeShipping] = useState(true);
  const [returnPolicyDays, setReturnPolicyDays] = useState("14");
  const [lensMaterial, setLensMaterial] = useState("Polycarbonate");
  const [coatingType, setCoatingType] = useState("Anti-Reflective");

  // Advanced dynamic settings
  const [globalPromoCode, setGlobalPromoCode] = useState("LENS20");
  const [globalDiscountVal, setGlobalDiscountVal] = useState("20");
  const [shippingFlatRate, setShippingFlatRate] = useState("150");
  const [returnInstructions, setReturnInstructions] = useState("Pack items carefully and drop off at closest warehouse point.");
  const [supportEmail, setSupportEmail] = useState("help@lenscare.com");
  const [supportPhone, setSupportPhone] = useState("+1-800-LENS-CARE");

  // Meta specifications & pricing calculator tool states
  const [customSpecKey, setCustomSpecKey] = useState("");
  const [customSpecVal, setCustomSpecVal] = useState("");
  const [specList, setSpecList] = useState([]);
  const [calcBasePrice, setCalcBasePrice] = useState("1000");
  const [calcMargin, setCalcMargin] = useState("45"); // percentage margin

  // "Add Product" Stock Sourcing Modal States
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [sourceType, setSourceType] = useState("warehouse"); // 'warehouse' | 'stores' | 'labs'
  const [storesList, setStoresList] = useState([]);
  const [labsList, setLabsList] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [showStockList, setShowStockList] = useState(false);
  const [availableStock, setAvailableStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const handleOpenAddProduct = async () => {
    setIsAddProductOpen(true);
    setSourceType("warehouse");
    setSelectedSourceId("");
    setShowStockList(false);
    setAvailableStock([]);

    try {
      const { data: stores } = await supabase.from("stores").select("id, name").order("name");
      const { data: labs } = await supabase.from("labs").select("id, name").order("name");
      setStoresList(stores || []);
      setLabsList(labs || []);
      if (stores && stores.length > 0) setSelectedSourceId(stores[0].id);
      else if (labs && labs.length > 0) setSelectedSourceId(labs[0].id);
    } catch (err) {
      console.error("Failed to load stores/labs:", err.message);
    }
  };

  const handleProceedStock = async () => {
    setLoadingStock(true);
    setShowStockList(true);
    setAvailableStock([]);

    try {
      if (sourceType === "warehouse") {
        // Fetch warehouse master products
        const { data: prods, error } = await supabase
          .from("products")
          .select("id, sku, name, brand, base_price, description")
          .order("name");
        
        if (error) throw error;
        setAvailableStock(prods || []);
      } else if (sourceType === "stores") {
        // Fetch store_inventory joined with products
        const { data: inventory, error } = await supabase
          .from("store_inventory")
          .select(`
            stock_quantity,
            product:products (
              id,
              sku,
              name,
              brand,
              base_price,
              description
            )
          `)
          .eq("store_id", selectedSourceId);
        
        if (error) throw error;

        const formatted = (inventory || [])
          .filter(inv => inv.product)
          .map(inv => ({
            ...inv.product,
            stock_quantity: inv.stock_quantity
          }));
        setAvailableStock(formatted);
      } else if (sourceType === "labs") {
        // Fetch master products as lab stock list fallback
        const { data: prods, error } = await supabase
          .from("products")
          .select("id, sku, name, brand, base_price, description")
          .order("name");
        
        if (error) throw error;
        setAvailableStock(prods || []);
      }
    } catch (err) {
      alert("Failed to load stock: " + err.message);
    } finally {
      setLoadingStock(false);
    }
  };

  const handlePublishStockItem = async (prod) => {
    setSaving(true);
    try {
      let descObj = {};
      if (prod.description && prod.description.startsWith("{")) {
        try {
          descObj = JSON.parse(prod.description);
        } catch {}
      }

      descObj.isOnline = true;
      const { error } = await supabase
        .from("products")
        .update({
          description: JSON.stringify({
            ...prod.ecomData,
            ...descObj,
            isOnline: true
          })
        })
        .eq("id", prod.id);

      if (error) throw error;
      alert(`"${prod.name}" has been published online successfully!`);
      await fetchCatalogProducts();
      // Keep stock list updated by setting published state locally
      setAvailableStock(prev => prev.map(item => {
        if (item.id === prod.id) {
          return {
            ...item,
            description: JSON.stringify({ ...descObj, isOnline: true })
          };
        }
        return item;
      }));
    } catch (err) {
      alert("Failed to publish item online: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchCatalogProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          sku,
          brand,
          base_price,
          description,
          category_id,
          category:categories (
            id,
            name
          )
        `)
        .order("name", { ascending: true });

      if (error) throw error;
      
      const mapped = (data || []).map(p => {
        let ecomData = { 
          isOnline: false, 
          features: [], 
          ecomDescription: "",
          discountPercent: 0,
          isFeatured: false,
          warrantyMonths: 6,
          customBadge: "",
          isFreeShipping: true,
          returnPolicyDays: 14,
          lensMaterial: "Polycarbonate",
          coatingType: "Anti-Reflective",
          specifications: []
        };
        if (p.description && p.description.startsWith("{")) {
          try {
            const parsed = JSON.parse(p.description);
            ecomData = {
              isOnline: parsed.isOnline || false,
              features: parsed.features || [],
              ecomDescription: parsed.ecomDescription || parsed.rawDescription || p.description || "",
              discountPercent: parsed.discountPercent !== undefined ? parsed.discountPercent : 0,
              isFeatured: parsed.isFeatured || false,
              warrantyMonths: parsed.warrantyMonths !== undefined ? parsed.warrantyMonths : 6,
              customBadge: parsed.customBadge || "",
              isFreeShipping: parsed.isFreeShipping !== undefined ? parsed.isFreeShipping : true,
              returnPolicyDays: parsed.returnPolicyDays !== undefined ? parsed.returnPolicyDays : 14,
              lensMaterial: parsed.lensMaterial || "Polycarbonate",
              coatingType: parsed.coatingType || "Anti-Reflective",
              specifications: parsed.specifications || []
            };
          } catch (e) {}
        }
        return {
          ...p,
          ecomData
        };
      });

      setProducts(mapped);

      // Calculate real stats dynamically
      const total = mapped.length;
      const online = mapped.filter(x => x.ecomData.isOnline).length;
      const featured = mapped.filter(x => x.ecomData.isFeatured).length;
      const totalDiscount = mapped.reduce((acc, curr) => acc + (curr.ecomData.discountPercent || 0), 0);
      const avgDiscount = total > 0 ? Math.round(totalDiscount / total) : 0;

      setEcomStats({
        totalProducts: total,
        onlineProducts: online,
        averageDiscount: avgDiscount,
        featuredCount: featured
      });

    } catch (err) {
      console.error("Error loading live products:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalogProducts();
  }, [fetchCatalogProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase();
      return !searchQuery || 
        p.name?.toLowerCase().includes(q) || 
        p.sku?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q);
    });
  }, [products, searchQuery]);

  const handleEditEcom = (prod) => {
    setSelectedProduct(prod);
    setIsOnline(prod.ecomData.isOnline);
    setFeatures(Array.isArray(prod.ecomData.features) ? prod.ecomData.features.join(", ") : "");
    setEcomDescription(prod.ecomData.ecomDescription || prod.description || "");
    setDiscountPercent(String(prod.ecomData.discountPercent || 0));
    setIsFeatured(prod.ecomData.isFeatured || false);
    setWarrantyMonths(String(prod.ecomData.warrantyMonths || 6));
    setCustomBadge(prod.ecomData.customBadge || "");
    setIsFreeShipping(prod.ecomData.isFreeShipping !== false);
    setReturnPolicyDays(String(prod.ecomData.returnPolicyDays || 14));
    setLensMaterial(prod.ecomData.lensMaterial || "Polycarbonate");
    setCoatingType(prod.ecomData.coatingType || "Anti-Reflective");
    setSpecList(prod.ecomData.specifications || []);
  };

  const handleQuickToggleOnline = async (prod) => {
    setSaving(true);
    try {
      let updatedDescObj = {};
      if (prod.description && prod.description.startsWith("{")) {
        try {
          updatedDescObj = JSON.parse(prod.description);
        } catch {}
      }

      updatedDescObj.isOnline = !prod.ecomData.isOnline;
      const { error } = await supabase
        .from("products")
        .update({
          description: JSON.stringify({
            ...prod.ecomData,
            ...updatedDescObj,
            isOnline: updatedDescObj.isOnline
          })
        })
        .eq("id", prod.id);

      if (error) throw error;
      await fetchCatalogProducts();
    } catch (err) {
      alert("Toggle failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInlineOption = async (prod, key, val) => {
    setSaving(true);
    try {
      let updatedDescObj = {};
      if (prod.description && prod.description.startsWith("{")) {
        try {
          updatedDescObj = JSON.parse(prod.description);
        } catch {}
      }

      updatedDescObj[key] = val;
      const { error } = await supabase
        .from("products")
        .update({
          description: JSON.stringify({
            ...prod.ecomData,
            ...updatedDescObj
          })
        })
        .eq("id", prod.id);

      if (error) throw error;
      await fetchCatalogProducts();
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEcom = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSaving(true);

    try {
      let updatedDescObj = {};
      if (selectedProduct.description && selectedProduct.description.startsWith("{")) {
        try {
          updatedDescObj = JSON.parse(selectedProduct.description);
        } catch {}
      }

      const mergedPayload = {
        ...updatedDescObj,
        isOnline,
        features: features.split(",").map(f => f.trim()).filter(Boolean),
        ecomDescription,
        discountPercent: Number(discountPercent),
        isFeatured,
        warrantyMonths: Number(warrantyMonths),
        customBadge,
        isFreeShipping,
        returnPolicyDays: Number(returnPolicyDays),
        lensMaterial,
        coatingType,
        specifications: specList
      };

      const { error } = await supabase
        .from("products")
        .update({
          description: JSON.stringify(mergedPayload)
        })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      setSelectedProduct(null);
      await fetchCatalogProducts();
      alert("Product details updated successfully!");
    } catch (err) {
      alert("Failed to update ecom specs: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Add metadata custom spec
  const handleAddCustomSpec = () => {
    if (!customSpecKey || !customSpecVal) return;
    setSpecList([...specList, { key: customSpecKey, val: customSpecVal }]);
    setCustomSpecKey("");
    setCustomSpecVal("");
  };

  const handleRemoveCustomSpec = (index) => {
    setSpecList(specList.filter((_, i) => i !== index));
  };

  // Ecom pricing calculator logic: Margin markup calculator
  const calculatedSellingPrice = useMemo(() => {
    const cost = Number(calcBasePrice) || 0;
    const margin = Number(calcMargin) || 0;
    if (margin >= 100) return cost;
    return Math.round(cost / (1 - margin / 100));
  }, [calcBasePrice, calcMargin]);

  // Tab dynamic labels
  const activeTitle = useMemo(() => {
    const map = {
      catalog: "Ecom Catalog",
      products: "Online Products List",
      promotions: "Promotions & Discounts Dashboard",
      policies: "Policy Center (Shipping & Returns)",
      support: "Customer Support & Warranties",
      specifications: "Product Specifications & Coatings"
    };
    return map[activeTab] || "Ecom Settings Manager";
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Dynamic Header Banner with Stats */}
      <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Globe className="text-black" size={22} />
              {activeTitle}
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
              Advanced warehouse online channels deployment system with smart margin calculators and dynamic batch actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[8px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-800 px-3 py-1.5 rounded-xl border">
              Total Catalog: {ecomStats.totalProducts} Items
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider bg-green-50 text-green-700 px-3 py-1.5 rounded-xl border border-green-200">
              Live Online: {ecomStats.onlineProducts} Items
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider bg-yellow-400 text-black px-3 py-1.5 rounded-xl">
              Featured Active: {ecomStats.featuredCount} Items
            </span>
          </div>
        </div>

        {/* 1. ADVANCED DYNAMIC CALCULATOR TOOL PANEL */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="col-span-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-black block">Price & Margin Planner</span>
            <span className="text-[8px] font-bold text-gray-400 block mt-0.5">Determine optimal catalog base listing price based on costs</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[8px] font-black text-neutral-400 uppercase">Cost Base</label>
            <input
              type="number"
              value={calcBasePrice}
              onChange={(e) => setCalcBasePrice(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold focus:border-black"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[8px] font-black text-neutral-400 uppercase">Margin (%)</label>
            <input
              type="number"
              value={calcMargin}
              onChange={(e) => setCalcMargin(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold focus:border-black"
            />
          </div>
          <div className="bg-black text-white px-4 py-2 rounded-xl flex items-center justify-between">
            <span className="text-[8px] font-black uppercase tracking-widest text-neutral-300">Selling Price</span>
            <span className="text-sm font-black">₹{calculatedSellingPrice}</span>
          </div>
        </div>
      </div>

      {/* 2. ONLINE PRODUCTS VIEW */}
      {activeTab === "products" && (
        <>
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search online products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:border-black focus:ring-0 outline-none"
              />
            </div>
            <button
              onClick={handleOpenAddProduct}
              className="bg-black text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 transition-all shadow-md w-full sm:w-auto"
            >
              + Add Product
            </button>
          </div>

          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-black" />
                <span className="text-[10px] font-black uppercase tracking-widest">Loading online products...</span>
              </div>
            ) : filteredProducts.filter(p => p.ecomData.isOnline).length === 0 ? (
              <div className="p-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                No products are currently listed online. Click "+ Add Product" to publish from stores, labs, or warehouse.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Publish State</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Badges & Specs</th>
                      <th className="px-6 py-4 text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredProducts.filter(p => p.ecomData.isOnline).map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center text-[8px] font-black bg-green-50 text-green-700 border border-green-150 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Online
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.ecomData.isFeatured && (
                              <span className="inline-flex items-center text-[7px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                ★ Featured
                              </span>
                            )}
                            {item.ecomData.customBadge && (
                              <span className="inline-flex items-center text-[7px] bg-black text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                                {item.ecomData.customBadge}
                              </span>
                            )}
                            <span className="inline-flex items-center text-[7px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-full font-bold uppercase">
                              {item.ecomData.lensMaterial}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditEcom(item)}
                            className="text-[9px] font-black bg-black text-white px-4 py-2 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-sm"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 3. ECOM CATALOG VIEW */}
      {activeTab === "catalog" && (
        <>
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search live catalog products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:border-black focus:ring-0 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-black" />
                <span className="text-[10px] font-black uppercase tracking-widest">Loading catalog...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                No products found in the catalog.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Publish State</th>
                      <th className="px-6 py-4">Product Name</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4">Status Badges</th>
                      <th className="px-6 py-4 text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredProducts.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleQuickToggleOnline(item)}
                            className="focus:outline-none hover:scale-105 transition-transform"
                          >
                            {item.ecomData.isOnline ? (
                              <span className="inline-flex items-center text-[8px] font-black bg-green-50 text-green-700 border border-green-150 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[8px] font-black bg-neutral-100 text-neutral-500 border border-neutral-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Draft
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                        <td className="px-6 py-4 flex gap-1">
                          {item.ecomData.isFeatured && (
                            <span className="inline-flex items-center text-[7px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                              ★ Featured
                            </span>
                          )}
                          {item.ecomData.customBadge && (
                            <span className="inline-flex items-center text-[7px] bg-black text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                              {item.ecomData.customBadge}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditEcom(item)}
                            className="text-[9px] font-black bg-black text-white px-4 py-2 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-sm"
                          >
                            Edit Ecom Specs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 3. PROMOTIONS & DISCOUNTS VIEW */}
      {activeTab === "promotions" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <Tag size={16} /> Global Warehouse Code Promotion
              </h3>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Active Coupon Code</label>
                <input
                  type="text"
                  value={globalPromoCode}
                  onChange={(e) => setGlobalPromoCode(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Global Discount Value (%)</label>
                <input
                  type="number"
                  value={globalDiscountVal}
                  onChange={(e) => setGlobalDiscountVal(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
              <button
                onClick={() => alert("Global Coupon saved!")}
                className="w-full bg-black text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-wider"
              >
                Save Coupon Rule
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col justify-center space-y-2">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Promotion Impact</span>
              <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                The global warehouse coupon will apply a general <span className="font-black text-black">{globalDiscountVal}% off</span> to customer baskets during checkout when using the code <span className="font-black text-black">{globalPromoCode}</span>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b border-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Configure Individual Discounts & Featured Status</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Featured Status</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Discount Percent (%)</th>
                  <th className="px-6 py-4">Sales Tag Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredProducts.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSaveInlineOption(item, "isFeatured", !item.ecomData.isFeatured)}
                        className="focus:outline-none hover:scale-105 transition-transform"
                      >
                        {item.ecomData.isFeatured ? (
                          <ToggleRight className="text-black w-8 h-8" />
                        ) : (
                          <ToggleLeft className="text-neutral-300 w-8 h-8" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        defaultValue={item.ecomData.discountPercent}
                        onBlur={(e) => handleSaveInlineOption(item, "discountPercent", Number(e.target.value))}
                        className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-xs font-bold focus:border-black outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        defaultValue={item.ecomData.customBadge}
                        onBlur={(e) => handleSaveInlineOption(item, "customBadge", e.target.value)}
                        className="w-32 px-2 py-1 border-2 border-gray-200 rounded-lg text-xs font-bold focus:border-black outline-none"
                        placeholder="e.g. New, Hot"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. POLICY CENTER VIEW */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <ShieldAlert size={16} /> Fulfillment & Shipping Policies
              </h3>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Flat Rate Shipping Fee (₹)</label>
                <input
                  type="number"
                  value={shippingFlatRate}
                  onChange={(e) => setShippingFlatRate(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Global Returns Instructions</label>
                <textarea
                  value={returnInstructions}
                  onChange={(e) => setReturnInstructions(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-xs font-bold min-h-[80px] resize-none"
                />
              </div>
              <button
                onClick={() => alert("Global policy parameters updated!")}
                className="w-full bg-black text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-wider"
              >
                Apply Global Policies
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col justify-center space-y-2">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fulfillment Rule details</span>
              <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                Set flat rates to apply globally during checkout except for items marked as free shipping eligible. Return guidelines are automatically parsed and sent inside client purchase dispatch notes.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b border-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Modify individual product shipping eligibility and return window</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Free Shipping</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Return window (Days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredProducts.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSaveInlineOption(item, "isFreeShipping", !item.ecomData.isFreeShipping)}
                        className="focus:outline-none hover:scale-105 transition-transform"
                      >
                        {item.ecomData.isFreeShipping ? (
                          <ToggleRight className="text-black w-8 h-8" />
                        ) : (
                          <ToggleLeft className="text-neutral-300 w-8 h-8" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        defaultValue={item.ecomData.returnPolicyDays}
                        onBlur={(e) => handleSaveInlineOption(item, "returnPolicyDays", Number(e.target.value))}
                        className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-xs font-bold focus:border-black outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER SUPPORT VIEW */}
      {activeTab === "support" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
                <Award size={16} /> Customer Support Setup
              </h3>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Support Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Support Hotline</label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>
              <button
                onClick={() => alert("Support contacts updated!")}
                className="w-full bg-black text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-wider"
              >
                Save Support Specs
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col justify-center space-y-2">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Support Guidelines</span>
              <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                This contact data is rendered under client accounts online and in automated order invoices. Individual product warranty periods are set on a per-product basis using the table below.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="p-4 border-b border-gray-100">
              <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Configure warranties by product</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Warranty period (Months)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredProducts.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        defaultValue={item.ecomData.warrantyMonths}
                        onBlur={(e) => handleSaveInlineOption(item, "warrantyMonths", Number(e.target.value))}
                        className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-xs font-bold focus:border-black outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PRODUCT SPECIFICATIONS VIEW */}
      {activeTab === "specifications" && (
        <div className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-4 border-b border-gray-100">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Update lens base materials and protective coatings</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-black text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Lens Material Spec</th>
                <th className="px-6 py-4">Coating Protection Spec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredProducts.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      defaultValue={item.ecomData.lensMaterial}
                      onBlur={(e) => handleSaveInlineOption(item, "lensMaterial", e.target.value)}
                      className="w-40 px-2 py-1 border-2 border-gray-200 rounded-lg text-xs font-bold focus:border-black outline-none"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      defaultValue={item.ecomData.coatingType}
                      onBlur={(e) => handleSaveInlineOption(item, "coatingType", e.target.value)}
                      className="w-40 px-2 py-1 border-2 border-gray-200 rounded-lg text-xs font-bold focus:border-black outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal Popup */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-2xl w-full my-8 space-y-6">
            <div>
              <h3 className="text-base font-black text-black uppercase tracking-tight">Configure Ecom Options</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 font-mono">SKU: {selectedProduct.sku}</p>
            </div>
            <form onSubmit={handleSaveEcom} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-150 rounded-xl">
                  <div>
                    <span className="text-[9px] font-black text-black uppercase block">Available Online</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-150 rounded-xl">
                  <div>
                    <span className="text-[9px] font-black text-black uppercase block">Featured Status</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Discount %</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Warranty (Months)</label>
                  <input
                    type="number"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Custom Tag Badge</label>
                  <input
                    type="text"
                    value={customBadge}
                    onChange={(e) => setCustomBadge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-150 rounded-xl">
                  <div>
                    <span className="text-[9px] font-black text-black uppercase block">Free Shipping Eligible</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFreeShipping}
                    onChange={(e) => setIsFreeShipping(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Return Window (Days)</label>
                  <input
                    type="number"
                    value={returnPolicyDays}
                    onChange={(e) => setReturnPolicyDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Material Spec</label>
                  <input
                    type="text"
                    value={lensMaterial}
                    onChange={(e) => setLensMaterial(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Coating protection</label>
                  <input
                    type="text"
                    value={coatingType}
                    onChange={(e) => setCoatingType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Dynamic Metadata Spec Specifications Block */}
              <div className="space-y-2 bg-neutral-50 p-4 border rounded-xl">
                <span className="text-[9px] font-black uppercase text-black block">Advanced Custom Metadata Specifications</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Specification Key (e.g. UV Protection)"
                    value={customSpecKey}
                    onChange={(e) => setCustomSpecKey(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-xs outline-none focus:border-black"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Value (e.g. UV400)"
                      value={customSpecVal}
                      onChange={(e) => setCustomSpecVal(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSpec}
                      className="px-4 bg-black text-white rounded-lg text-xs font-black"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {specList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {specList.map((spec, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-white border px-2 py-1 rounded-lg text-xs font-bold">
                        {spec.key}: {spec.val}
                        <button type="button" onClick={() => handleRemoveCustomSpec(i)} className="text-red-500 font-bold ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Features Tag list (Comma-Separated)</label>
                <input
                  type="text"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold text-black outline-none focus:border-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SEO Ecom Search Summary Description *</label>
                <textarea
                  required
                  value={ecomDescription}
                  onChange={(e) => setEcomDescription(e.target.value)}
                  className="w-full min-h-[80px] p-4 border border-gray-200 rounded-xl text-xs font-bold text-black outline-none resize-none focus:border-black"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-3 text-[10px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-55"
                >
                  {saving ? "Publishing..." : "Publish Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* "Add Product" Stock Sourcing Central Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-3xl w-full my-8 space-y-6">
            
            {!showStockList ? (
              // Step 1: Select Stock Source
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-black uppercase tracking-tight">Select Stock Source</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                    Choose where to fetch available stock items from to list online
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: "warehouse", name: "Warehouse" },
                    { id: "stores", name: "Stores" },
                    { id: "labs", name: "Labs" }
                  ].map(src => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => {
                        setSourceType(src.id);
                        if (src.id === "stores" && storesList.length > 0) setSelectedSourceId(storesList[0].id);
                        else if (src.id === "labs" && labsList.length > 0) setSelectedSourceId(labsList[0].id);
                        else setSelectedSourceId("");
                      }}
                      className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${sourceType === src.id
                        ? "border-black bg-neutral-50 scale-102 shadow-sm font-black"
                        : "border-gray-200 hover:border-gray-300 font-bold text-gray-500"
                      }`}
                    >
                      <span className="text-xs uppercase tracking-wider">{src.name}</span>
                    </button>
                  ))}
                </div>

                {/* Conditional Dropdown for Stores or Labs */}
                {sourceType === "stores" && (
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Select Store</label>
                    <select
                      value={selectedSourceId}
                      onChange={(e) => setSelectedSourceId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black bg-white"
                    >
                      {storesList.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {sourceType === "labs" && (
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block ml-1">Select Lab</label>
                    <select
                      value={selectedSourceId}
                      onChange={(e) => setSelectedSourceId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black bg-white"
                    >
                      {labsList.map(lb => (
                        <option key={lb.id} value={lb.id}>{lb.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="flex-1 py-3.5 text-[10px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedStock}
                    className="flex-1 py-3.5 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            ) : (
              // Step 2: Available Stock List View
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-black uppercase tracking-tight">Available Stock</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                      Sourced from: <span className="text-black font-black">{sourceType.toUpperCase()}</span> 
                      {selectedSourceId && ` (ID: ${selectedSourceId.slice(0, 8)})`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStockList(false)}
                    className="text-[9px] font-black text-gray-500 hover:text-black uppercase tracking-wider border border-gray-200 px-3 py-1.5 rounded-lg"
                  >
                    ← Back
                  </button>
                </div>

                <div className="max-h-[350px] overflow-y-auto border-2 border-black rounded-2xl">
                  {loadingStock ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3 text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Loading available stock...</span>
                    </div>
                  ) : availableStock.length === 0 ? (
                    <div className="p-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                      No stock items found in this source.
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b-2 border-black text-[8px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="px-4 py-3">Product Info</th>
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3">Stock Available</th>
                          <th className="px-4 py-3 text-right">Publish</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {availableStock.map(stockItem => {
                          let isItemOnline = false;
                          if (stockItem.description && stockItem.description.startsWith("{")) {
                            try {
                              const parsed = JSON.parse(stockItem.description);
                              isItemOnline = parsed.isOnline || false;
                            } catch {}
                          }

                          return (
                            <tr key={stockItem.id} className="hover:bg-gray-50/40 text-xs">
                              <td className="px-4 py-3">
                                <span className="font-black text-black uppercase block">{stockItem.name}</span>
                                <span className="text-[8px] font-bold text-gray-400 block uppercase">{stockItem.brand}</span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold">{stockItem.sku}</td>
                              <td className="px-4 py-3 font-bold">
                                {stockItem.stock_quantity !== undefined ? `${stockItem.stock_quantity} Units` : "Catalog Base"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isItemOnline ? (
                                  <span className="text-[8px] font-black text-green-700 uppercase tracking-wider bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                    Online
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handlePublishStockItem(stockItem)}
                                    className="bg-black text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider hover:bg-neutral-800"
                                  >
                                    Publish Online
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-[10px] font-black uppercase rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
