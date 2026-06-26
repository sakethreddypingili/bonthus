import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ScanBarcode, CheckCircle2, AlertCircle, Wifi, Smartphone, Camera, ChevronRight
} from 'lucide-react';
import { supabase } from "../server/supabase/supabase";
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

export default function ProductScanner() {
  const [categories, setCategories] = useState([]);

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

  const desktopQrCodeRef = useRef(null);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    setIsMobileDevice(isMobile);
  }, [fetchCategories]);

  const initRemoteSession = useCallback(() => {
    const sessionId = 'remote_' + Math.random().toString(36).substring(2, 11);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setRemoteSessionId(sessionId);
    setOtpCode(otp);
    setMobileConnected(false);
    setShowRemoteQR(false);
  }, []);

  useEffect(() => {
    initRemoteSession();
  }, [initRemoteSession]);

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

  // Listen for broadcast scanner messages
  useEffect(() => {
    if (!remoteSessionId) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteSessionId]);

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

  const stopDirectScanning = useCallback(async () => {
    if (desktopQrCodeRef.current) {
      try {
        await desktopQrCodeRef.current.stop();
      } catch (err) {
        console.error("Stop camera error:", err);
      }
      desktopQrCodeRef.current = null;
    }
    setIsScanningDirect(false);
  }, []);

  const handleScanLookup = async (e) => {
    e.preventDefault();
    lookupBarcodeDirectly(scannedCode);
  };

  // Frame Specifications check
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

  const handleCreateAndLinkProduct = async (e) => {
    e.preventDefault();
    const activeCategoryId = newProdCascadePath[newProdCascadePath.length - 1];
    if (!activeCategoryId) {
      alert("Please select a category first.");
      return;
    }
    setSavingNewProduct(true);
    try {
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

      // 1. Insert product
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

      // 2. Link barcode
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
      setScannedCode("");
      setScanResult(null);
    } catch (err) {
      alert("Registration failed: " + err.message);
    } finally {
      setSavingNewProduct(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-fast-slide max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Scan Barcode</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Vector Audit & Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Controls & Viewfinders */}
        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Vector Scanner</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Select scanning mode to look up barcode</p>
          </div>

          {/* Scanner Toggle Options */}
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
                    Start Mobile Camera
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

          {/* Webcam Viewfinder */}
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

          {/* Remote QR Mobile Link */}
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

          {/* Search Lookup Field */}
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
        </div>

        {/* Right Side: Scan Results & Register Forms */}
        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
          {scanResult === null && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <ScanBarcode size={48} className="text-gray-200 animate-pulse" />
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Awaiting scan or lookup input
              </p>
            </div>
          )}

          {scanResult === 'found' && scannedProduct && (
            <div className="bg-green-50/50 border border-green-100/50 rounded-3xl p-6 space-y-4 h-full">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Active operational vector bound</span>
              </div>
              <div>
                <h4 className="text-[20px] font-black text-black uppercase tracking-tight">{scannedProduct.name}</h4>
                <div className="grid grid-cols-2 gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">
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
            <form onSubmit={handleCreateAndLinkProduct} className="space-y-5 h-full">
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

                {/* Frame Specifications */}
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
    </div>
  );
}

// CascadeLevel Component
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
