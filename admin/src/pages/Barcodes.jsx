import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  QrCode, Search, Settings2, 
  Layers, ScanBarcode, CheckCircle2, AlertCircle, ChevronRight,
  Wifi, Loader2, Smartphone, Camera
} from 'lucide-react';
import { supabase } from "../server/supabase/supabase";
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

export default function Barcodes() {
  const [barcodes, setBarcodes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Barcodes
      const { data: bData, error: bError } = await supabase
        .from('product_barcodes')
        .select(`
          id,
          barcode,
          created_at,
          product:products (
            id,
            name,
            sku,
            category_id
          )
        `)
        .order('created_at', { ascending: false });

      if (bError) throw bError;
      
      const mapped = (bData || []).map(b => ({
        id: b.id,
        barcode: b.barcode,
        entityId: b.product?.id || null,
        entityName: b.product?.name || null,
        sku: b.product?.sku || null,
        categoryId: b.product?.category_id || null,
        status: b.product ? "assigned" : "unassigned",
        date: new Date(b.created_at).toLocaleDateString()
      }));

      setBarcodes(mapped);

      // 2. Fetch Categories
      const { data: cData, error: cError } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .order('name');
      if (cError) throw cError;
      setCategories(cData || []);

    } catch (err) {
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tree logic for sidebar
  const flattenedTree = useMemo(() => {
    const childMap = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!childMap[key]) childMap[key] = [];
      childMap[key].push(c);
    });
    Object.keys(childMap).forEach(key => {
      childMap[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    const result = [];
    function walk(parentKey, depth) {
      const children = childMap[parentKey] || [];
      children.forEach((cat) => {
        result.push({ ...cat, depth });
        walk(cat.id, depth + 1);
      });
    }
    walk('__root__', 0);
    return result;
  }, [categories]);

  // Barcode counts per category (recursively summing child category counts as well)
  const barcodeCounts = useMemo(() => {
    const counts = {};
    
    // Direct counts first
    barcodes.forEach(b => {
      if (b.categoryId) {
        counts[b.categoryId] = (counts[b.categoryId] || 0) + 1;
      }
    });

    // Helper to get recursive children list
    const getChildrenIds = (parentId) => {
      const list = [];
      const queue = [parentId];
      while (queue.length > 0) {
        const current = queue.shift();
        const children = categories.filter(c => c.parent_id === current).map(c => c.id);
        list.push(...children);
        queue.push(...children);
      }
      return list;
    };

    // Calculate aggregated counts including subcategories
    const aggregated = { all: barcodes.length };
    categories.forEach(c => {
      const descendants = getChildrenIds(c.id);
      const selfCount = counts[c.id] || 0;
      const descendantsCount = descendants.reduce((sum, dId) => sum + (counts[dId] || 0), 0);
      aggregated[c.id] = selfCount + descendantsCount;
    });

    return aggregated;
  }, [barcodes, categories]);

  // Get active subset of barcodes for the selected category + its subcategories
  const barcodesInSelectedCategory = useMemo(() => {
    if (selectedCategoryId === "all") return barcodes;
    
    // Find selected category and all its children recursively
    const activeIds = [selectedCategoryId];
    const queue = [selectedCategoryId];
    while (queue.length > 0) {
      const current = queue.shift();
      const children = categories.filter(c => c.parent_id === current).map(c => c.id);
      activeIds.push(...children);
      queue.push(...children);
    }

    return barcodes.filter(b => b.categoryId && activeIds.includes(b.categoryId));
  }, [selectedCategoryId, barcodes, categories]);

  const stats = useMemo(() => {
    return {
      total: barcodesInSelectedCategory.length,
      assigned: barcodesInSelectedCategory.filter(b => b.status === "assigned").length,
      unassigned: barcodesInSelectedCategory.filter(b => b.status === "unassigned").length
    };
  }, [barcodesInSelectedCategory]);

  const filtered = useMemo(() => {
    return barcodesInSelectedCategory.filter(b => {
      if (activeTab !== "all" && b.status !== activeTab) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return b.barcode.includes(q) || (b.entityName && b.entityName.toLowerCase().includes(q)) || b.id.toLowerCase().includes(q);
    });
  }, [barcodesInSelectedCategory, activeTab, searchQuery]);

  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [scanResult, setScanResult] = useState(null); // 'found', 'not_found', or null
  const [scannedProduct, setScannedProduct] = useState(null);

  // Direct & Remote Scanner States
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isScanningDirect, setIsScanningDirect] = useState(false);
  const [mobileConnected, setMobileConnected] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [remoteSessionId, setRemoteSessionId] = useState('');
  const [showRemoteQR, setShowRemoteQR] = useState(false);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    setIsMobileDevice(isMobile);
  }, []);

  const initRemoteSession = useCallback(() => {
    const sessionId = 'remote_' + Math.random().toString(36).substring(2, 11);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setRemoteSessionId(sessionId);
    setOtpCode(otp);
    setMobileConnected(false);
    setShowRemoteQR(false);
  }, []);

  const desktopQrCodeRef = useRef(null);

  const startDirectScanning = async () => {
    setIsScanningDirect(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("desktop-reader");
        desktopQrCodeRef.current = html5QrCode;
        const config = { 
          fps: 15, 
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size * 0.5 };
          }
        };
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setScannedCode(decodedText);
            lookupBarcodeDirectly(decodedText);
            stopDirectScanning();
          },
          () => {}
        );
      } catch (err) {
        alert("Failed to access camera: " + err.message);
        setIsScanningDirect(false);
      }
    }, 100);
  };

  const stopDirectScanning = async () => {
    if (desktopQrCodeRef.current) {
      try {
        await desktopQrCodeRef.current.stop();
      } catch (err) {
        console.error("Stop camera error:", err);
      }
      desktopQrCodeRef.current = null;
    }
    setIsScanningDirect(false);
  };

  // New product form states for unregistered barcodes
  const [newProduct, setNewProduct] = useState({
    name: "",
    brand: "",
    basePrice: "",
    description: "",
    frameSize: "",
    frameColor: "",
    frameShape: "",
    frameMaterial: ""
  });
  const [newProdCascadePath, setNewProdCascadePath] = useState([]);
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  // Helper to determine if selected category's super parent is Frames
  const selectedSuperParentIsFrame = useMemo(() => {
    const activeId = newProdCascadePath[newProdCascadePath.length - 1];
    if (!activeId) return false;
    
    let current = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === activeId) {
        current = categories[i];
        break;
      }
    }

    while (current && current.parent_id) {
      const pId = current.parent_id;
      let parent = null;
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === pId) {
          parent = categories[i];
          break;
        }
      }
      current = parent;
    }
    return current?.name?.toLowerCase().includes('frame') || false;
  }, [newProdCascadePath, categories]);

  // parentId (or '__root__') → direct children array for product creator
  const newProdCategoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

  const newProdCategoryBreadcrumb = useMemo(() => {
    if (newProdCascadePath.length === 0) return '';
    return newProdCascadePath
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(' › ');
  }, [newProdCascadePath, categories]);

  const handleNewProdLevelSelect = (depth, selectedId) => {
    if (!selectedId) {
      setNewProdCascadePath(prev => prev.slice(0, depth));
      return;
    }
    const newPath = [...newProdCascadePath.slice(0, depth), selectedId];
    setNewProdCascadePath(newPath);
  };

  const lookupBarcodeDirectly = useCallback(async (code) => {
    if (!code) return;
    try {
      const { data, error } = await supabase
        .from('product_barcodes')
        .select(`
          id,
          barcode,
          product:products (
            id,
            name,
            sku,
            brand,
            base_price,
            description,
            category:categories(name)
          )
        `)
        .eq('barcode', code)
        .maybeSingle();

      if (error) throw error;

      if (data && data.product) {
        setScanResult('found');
        setScannedProduct(data.product);
      } else {
        setScanResult('not_found');
        setScannedProduct(null);
        setNewProduct({
          name: "",
          brand: "",
          basePrice: "",
          description: "",
          frameSize: "",
          frameColor: "",
          frameShape: "",
          frameMaterial: ""
        });
        setNewProdCascadePath([]);
      }
    } catch (err) {
      alert("Lookup failed: " + err.message);
    }
  }, []);

  useEffect(() => {
    if (!remoteSessionId || !showScanner) return;

    const channel = supabase.channel(remoteSessionId);

    channel
      .on('broadcast', { event: 'auth-request' }, ({ payload }) => {
        if (payload.otp === otpCode) {
          setMobileConnected(true);
          setShowRemoteQR(false);
          channel.send({
            type: 'broadcast',
            event: 'auth-success',
            payload: { success: true }
          });
        } else {
          channel.send({
            type: 'broadcast',
            event: 'auth-success',
            payload: { success: false }
          });
        }
      })
      .on('broadcast', { event: 'barcode-scanned' }, ({ payload }) => {
        if (payload.barcode) {
          setScannedCode(payload.barcode);
          lookupBarcodeDirectly(payload.barcode);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [remoteSessionId, otpCode, showScanner, lookupBarcodeDirectly]);

  const handleScanLookup = async (e) => {
    e.preventDefault();
    lookupBarcodeDirectly(scannedCode);
  };

  const handleCreateAndLinkProduct = async (e) => {
    e.preventDefault();
    const activeCategoryId = newProdCascadePath[newProdCascadePath.length - 1];
    if (!activeCategoryId) {
      alert("Please select a category first.");
      return;
    }
    setSavingNewProduct(true);
    try {
      // 1. Compile description (append frame details if super parent is frames)
      let finalDescription = newProduct.description;
      if (selectedSuperParentIsFrame) {
        const frameDetails = [
          newProduct.frameSize && `Size: ${newProduct.frameSize}`,
          newProduct.frameColor && `Color: ${newProduct.frameColor}`,
          newProduct.frameShape && `Shape: ${newProduct.frameShape}`,
          newProduct.frameMaterial && `Material: ${newProduct.frameMaterial}`
        ].filter(Boolean).join(' | ');
        if (frameDetails) {
          finalDescription = finalDescription 
            ? `${finalDescription} (${frameDetails})`
            : frameDetails;
        }
      }

      // 2. Insert product
      const { data: pData, error: pError } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          sku: scannedCode,
          brand: newProduct.brand || null,
          base_price: Number(newProduct.basePrice) || 0,
          category_id: activeCategoryId,
          description: finalDescription || null
        }])
        .select()
        .single();

      if (pError) throw pError;

      // 3. Link barcode: check if exists in product_barcodes first
      const { data: existingB, error: existBError } = await supabase
        .from('product_barcodes')
        .select('id')
        .eq('barcode', scannedCode)
        .maybeSingle();

      if (existBError) throw existBError;

      if (existingB) {
        const { error: bError } = await supabase
          .from('product_barcodes')
          .update({ product_id: pData.id })
          .eq('id', existingB.id);
        if (bError) throw bError;
      } else {
        const { error: bError } = await supabase
          .from('product_barcodes')
          .insert([{
            barcode: scannedCode,
            product_id: pData.id
          }]);
        if (bError) throw bError;
      }

      alert(`Successfully registered product and linked barcode "${scannedCode}"`);
      setShowScanner(false);
      setScannedCode("");
      setScanResult(null);
      fetchData();
    } catch (err) {
      alert("Registration failed: " + err.message);
    } finally {
      setSavingNewProduct(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Barcode Studio</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Vector Audit & Analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scan Barcode Trigger */}
          <button 
            onClick={() => { setShowScanner(true); setScanResult(null); setScannedCode(""); initRemoteSession(); }}
            className="flex items-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            <ScanBarcode size={14} strokeWidth={3} />
            <span>Scan Barcode</span>
          </button>

          {/* Category Dropdown Filter at Top Right */}
          <CategoryFilterDropdown
            categories={categories}
            flattenedTree={flattenedTree}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            barcodeCounts={barcodeCounts}
          />
          
          <button onClick={fetchData} className="p-3 border border-gray-100 rounded-2xl hover:bg-black hover:text-white transition-all">
            <Settings2 size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl group transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Aggregate Created</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black tracking-tighter">{loading ? "..." : stats.total}</span>
            <QrCode size={24} className="text-gray-200 group-hover:text-black" strokeWidth={3} />
          </div>
        </div>
        <div className="bg-black rounded-[32px] p-8 border border-black shadow-2xl">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-gray-400">Entity Bound</p>
          <div className="flex items-end justify-between text-white">
            <span className="text-4xl font-black tracking-tighter">{loading ? "..." : stats.assigned}</span>
            <CheckCircle2 size={24} strokeWidth={3} />
          </div>
        </div>
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl group transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Available Vectors</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black tracking-tighter">{loading ? "..." : stats.unassigned}</span>
            <ScanBarcode size={24} className="text-gray-200 group-hover:text-black" strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tab Filter switcher */}
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1">
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === "all" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
            >
              All Vectors
            </button>
            <button 
              onClick={() => setActiveTab("assigned")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === "assigned" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
            >
              Bound
            </button>
            <button 
              onClick={() => setActiveTab("unassigned")}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === "unassigned" ? "bg-black text-white shadow-md" : "text-gray-400 hover:text-black"}`}
            >
              Available
            </button>
          </div>

          {/* Search Filter */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-80">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
              <input
                type="text"
                placeholder="Audit Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Vector Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Barcode Content</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Linked Entity</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Creation Vector</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && barcodes.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Accessing Ledger...</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="hover:bg-black hover:text-white group text-black transition-colors">
                  <td className="px-8 py-6 font-mono text-[11px] font-black">{b.id.slice(0, 8)}</td>
                  <td className="px-8 py-6 font-mono text-[11px] font-black tracking-widest border-x border-transparent">
                    {b.barcode}
                  </td>
                  <td className="px-8 py-6">
                    {b.entityName ? (
                      <>
                        <p className="text-[11px] font-black uppercase tracking-tight">{b.entityName}</p>
                        <p className="text-[9px] font-mono text-gray-400 mt-1 uppercase tracking-widest group-hover:text-gray-400">SKU: {b.sku}</p>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic group-hover:text-gray-500">No Entity Bound</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400">{b.date}</td>
                  <td className="px-8 py-6 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      b.status === 'assigned' 
                        ? "bg-black text-white group-hover:bg-white group-hover:text-black" 
                        : "border border-gray-200 text-gray-400 group-hover:border-white/30 group-hover:text-white"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Zero vectors matched audit criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Scanner Modal ────────────────────────────────────────────────────── */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] border border-gray-100 max-w-lg w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar animate-fast-slide">
            <div className="flex justify-between items-start border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Vector Scanner</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Audit or link operational codes</p>
              </div>
              <button 
                onClick={() => { stopDirectScanning(); setShowScanner(false); }} 
                className="text-gray-400 hover:text-black font-black uppercase text-[11px] tracking-widest"
              >
                Close
              </button>
            </div>

            {/* Scan Controls Tabs for Desktop & Mobile */}
            {!isMobileDevice ? (
              <div className="flex border border-gray-100 bg-gray-50 rounded-2xl p-1 text-[10px] font-black uppercase tracking-widest gap-1">
                <button
                  type="button"
                  onClick={() => { setShowRemoteQR(false); stopDirectScanning(); }}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${(!showRemoteQR && !isScanningDirect) ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRemoteQR(true); stopDirectScanning(); }}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${showRemoteQR ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  <Smartphone size={12} />
                  Connect Mobile
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRemoteQR(false); startDirectScanning(); }}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${isScanningDirect ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  <Camera size={12} />
                  Use Webcam
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-3xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-800">
                  <div id="desktop-reader" className="absolute inset-0 w-full h-full object-cover" />
                  {!isScanningDirect && (
                    <button
                      type="button"
                      onClick={startDirectScanning}
                      className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest z-10 shadow-lg hover:scale-105 transition-all"
                    >
                      Start Camera Scanner
                    </button>
                  )}
                </div>
                {isScanningDirect && (
                  <button
                    type="button"
                    onClick={stopDirectScanning}
                    className="w-full py-3 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all"
                  >
                    Stop Camera
                  </button>
                )}
              </div>
            )}

            {/* Direct Webcam Scanner (Desktop mode) */}
            {isScanningDirect && !isMobileDevice && (
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-gray-800">
                <div id="desktop-reader" className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={stopDirectScanning}
                  className="absolute bottom-4 bg-white text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest z-10 hover:scale-105 transition-all shadow-md"
                >
                  Cancel Webcam
                </button>
              </div>
            )}

            {/* Remote Mobile QR Pairing Setup */}
            {showRemoteQR && !isMobileDevice && !mobileConnected && (
              <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 text-center space-y-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Scan QR with Mobile Camera
                </p>
                <div className="flex justify-center p-4 bg-white rounded-2xl border border-gray-100 max-w-[180px] mx-auto shadow-sm">
                  <QRCodeSVG 
                    value={`${window.location.origin}/mobile-scan?session=${remoteSessionId}`} 
                    size={150}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                    Security PIN
                  </span>
                  <div className="text-3xl font-black tracking-widest text-black font-mono">
                    {otpCode}
                  </div>
                </div>
                <p className="text-[9px] font-medium text-gray-400 leading-relaxed px-4">
                  Open the link, type this PIN to pair the device, then scan barcodes using your phone's camera.
                </p>
              </div>
            )}

            {/* Mobile Link Success Banner */}
            {mobileConnected && !isMobileDevice && (
              <div className="bg-green-50/50 border border-green-100/50 rounded-2xl p-4 flex items-center justify-between text-green-700">
                <div className="flex items-center gap-2">
                  <Wifi size={14} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Mobile Scanner Connected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setMobileConnected(false); initRemoteSession(); }}
                  className="text-[9px] font-black uppercase tracking-widest text-green-800 hover:underline"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Manual entry / Scan search form */}
            {(!showRemoteQR || mobileConnected) && !isScanningDirect && (
              <form onSubmit={handleScanLookup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Scan or Enter Barcode</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="E.g. 8901323058645"
                      value={scannedCode}
                      onChange={e => setScannedCode(e.target.value)}
                      className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[16px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-black text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105"
                    >
                      Lookup
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Scan results */}
            {scanResult === 'found' && scannedProduct && (
              <div className="bg-green-50/50 border border-green-100/50 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active operational vector bound</span>
                </div>
                <div>
                  <h4 className="text-[18px] font-black text-black uppercase tracking-tight">{scannedProduct.name}</h4>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <div>
                      <span className="text-gray-400">SKU:</span>
                      <p className="text-black font-black font-mono mt-0.5">{scannedProduct.sku}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <p className="text-black font-black mt-0.5">{scannedProduct.category?.name || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Brand:</span>
                      <p className="text-black font-black mt-0.5">{scannedProduct.brand || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Base Price:</span>
                      <p className="text-black font-black mt-0.5">${Number(scannedProduct.base_price).toFixed(2)}</p>
                    </div>
                  </div>
                  {scannedProduct.description && (
                    <div className="mt-4 pt-4 border-t border-green-100/50">
                      <span className="text-[9px] text-gray-400 uppercase tracking-widest">Specifications & bounds</span>
                      <p className="text-[10px] text-gray-600 mt-1 font-medium">{scannedProduct.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {scanResult === 'not_found' && (
              <form onSubmit={handleCreateAndLinkProduct} className="space-y-5 border-t border-gray-50 pt-5">
                <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 flex items-start gap-2.5 text-amber-700">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest block">Unassigned Vector Detected</span>
                    <p className="text-[9px] font-medium text-amber-600/90 mt-1">This code does not match any register in the catalog ledger. Create a new product entry to bind it.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Category Cascading Selector */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Target Category</label>
                    <div className="space-y-3">
                      {(newProdCategoryChildMap['__root__'] || []).length > 0 && (
                        <CascadeLevel
                          depth={0}
                          options={newProdCategoryChildMap['__root__'] || []}
                          selectedId={newProdCascadePath[0] || ''}
                          onSelect={id => handleNewProdLevelSelect(0, id)}
                        />
                      )}
                      {newProdCascadePath.map((selectedId, depth) => {
                        const children = newProdCategoryChildMap[selectedId] || [];
                        if (children.length === 0) return null;
                        return (
                          <CascadeLevel
                            key={selectedId}
                            depth={depth + 1}
                            options={children}
                            selectedId={newProdCascadePath[depth + 1] || ''}
                            onSelect={id => handleNewProdLevelSelect(depth + 1, id)}
                          />
                        );
                      })}
                      {newProdCategoryBreadcrumb && (
                        <div className="px-4 py-2 bg-black rounded-xl text-[9px] font-black text-white uppercase tracking-widest truncate">
                          {newProdCategoryBreadcrumb}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Product Name</label>
                      <input
                        type="text"
                        required
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="E.g. Aviator Classic"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase tracking-wider focus:bg-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Brand</label>
                      <input
                        type="text"
                        value={newProduct.brand}
                        onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                        placeholder="E.g. Ray-Ban"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase tracking-wider focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Base Price</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={newProduct.basePrice}
                        onChange={e => setNewProduct({...newProduct, basePrice: e.target.value})}
                        placeholder="E.g. 129.00"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase tracking-wider focus:bg-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SKU (Locked to Vector)</label>
                      <input
                        type="text"
                        disabled
                        value={scannedCode}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-xl text-[11px] font-mono font-bold tracking-wider text-gray-400 outline-none"
                      />
                    </div>
                  </div>

                  {/* Frame specifications fields (rendered dynamically if parent is Frames) */}
                  {selectedSuperParentIsFrame && (
                    <div className="border border-gray-100 rounded-3xl p-5 space-y-4 bg-gray-50/50">
                      <span className="text-[9px] font-black text-black uppercase tracking-widest block border-b border-gray-100 pb-2">Frame Specifications</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Eye-Bridge-Temple Size</label>
                          <input
                            type="text"
                            placeholder="E.g. 54-18-140"
                            value={newProduct.frameSize}
                            onChange={e => setNewProduct({...newProduct, frameSize: e.target.value})}
                            className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Color</label>
                          <input
                            type="text"
                            placeholder="E.g. Tortoise Gold"
                            value={newProduct.frameColor}
                            onChange={e => setNewProduct({...newProduct, frameColor: e.target.value})}
                            className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Shape</label>
                          <select
                            value={newProduct.frameShape}
                            onChange={e => setNewProduct({...newProduct, frameShape: e.target.value})}
                            className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none"
                          >
                            <option value="">— Select —</option>
                            <option value="Round">Round</option>
                            <option value="Aviator">Aviator</option>
                            <option value="Square">Square</option>
                            <option value="Rectangle">Rectangle</option>
                            <option value="Wayfarer">Wayfarer</option>
                            <option value="Oval">Oval</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Material Type</label>
                          <select
                            value={newProduct.frameMaterial}
                            onChange={e => setNewProduct({...newProduct, frameMaterial: e.target.value})}
                            className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-wider outline-none"
                          >
                            <option value="">— Select —</option>
                            <option value="Acetate">Acetate</option>
                            <option value="Metal">Metal</option>
                            <option value="TR90">TR90 / Plastic</option>
                            <option value="Titanium">Titanium</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">General Description</label>
                    <textarea
                      rows="2"
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="Enter description bounds..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase tracking-wider focus:bg-white outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 border-t border-gray-50 pt-4 mt-4">
                  <button
                    type="button"
                    onClick={() => { setScanResult(null); setScannedCode(""); }}
                    className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={savingNewProduct || newProdCascadePath.length === 0}
                    className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
                  >
                    {savingNewProduct ? "Registering..." : "Register & Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom Category Filter Dropdown Sub-component ──────────────────────────
function CategoryFilterDropdown({ categories, flattenedTree, selectedCategoryId, setSelectedCategoryId, barcodeCounts }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedName = useMemo(() => {
    if (selectedCategoryId === 'all') return 'All Categories';
    return categories.find(c => c.id === selectedCategoryId)?.name || 'Select Category';
  }, [selectedCategoryId, categories]);

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 hover:border-black rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all w-full md:w-auto text-left"
      >
        <span className="text-gray-400">Category:</span>
        <span className="text-black font-extrabold truncate max-w-[120px]">{selectedName}</span>
        <ChevronRight size={12} className={`text-gray-400 transition-transform duration-200 ml-1 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-3xl shadow-xl z-30 max-h-80 overflow-y-auto p-3 no-scrollbar animate-fast-slide">
            {/* All Categories Option */}
            <button
              type="button"
              onClick={() => { setSelectedCategoryId("all"); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all ${
                selectedCategoryId === "all"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              }`}
            >
              <span>All Categories</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${selectedCategoryId === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {barcodeCounts.all || 0}
              </span>
            </button>

            {/* Tree Categories */}
            <div className="mt-2 border-t border-gray-50 pt-2 space-y-0.5">
              {flattenedTree.map(cat => {
                const isSelected = selectedCategoryId === cat.id;
                const count = barcodeCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setSelectedCategoryId(cat.id); setIsOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight flex items-center justify-between transition-all relative ${
                      isSelected
                        ? "bg-black text-white font-black"
                        : "text-gray-500 hover:bg-gray-50 hover:text-black"
                    }`}
                    style={{ paddingLeft: `${16 + cat.depth * 16}px` }}
                  >
                    {/* Tree lines inside dropdown */}
                    {cat.depth > 0 && (
                      <span 
                        className="absolute top-0 bottom-1/2 w-2.5 border-l border-b border-gray-200 rounded-bl-sm"
                        style={{ 
                          left: `${12 + (cat.depth - 1) * 16}px`,
                          height: '50%'
                        }}
                      />
                    )}
                    <span className="truncate">{cat.name}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CascadeLevel sub-component ─────────────────────────────────────────────
function CascadeLevel({ depth, options, selectedId, onSelect }) {
  const levelLabels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
  const label = levelLabels[depth] || `Level ${depth + 1}`;

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute -top-3 left-3 flex items-center gap-1">
          <div className="w-px h-3 bg-gray-200" />
          <ChevronRight size={10} className="text-gray-300 -ml-0.5" />
        </div>
      )}
      <div className={`rounded-xl overflow-hidden border transition-all ${
        selectedId ? 'border-black bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center px-4 py-0.5 border-b border-gray-50">
          <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">
            {label}
          </span>
        </div>
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer text-black appearance-none"
        >
          <option value="">— Select —</option>
          {options.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
