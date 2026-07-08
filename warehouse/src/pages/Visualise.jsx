import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Upload, Trash2, Check, QrCode, ChevronLeft } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { Html5Qrcode } from "html5-qrcode";

const POSITIONS = ['cover', 'front', 'side'];

const titleCase = (str) => {
    if (!str) return "";
    return str
        .toString()
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

const cleanColorName = (color) => {
    if (!color) return "";
    let clean = color.toUpperCase().trim();
    
    clean = clean.replace(/\bBABAY\b/g, "BABY");
    clean = clean.replace(/\bBALCK\b/g, "BLACK");
    clean = clean.replace(/\bBLACLK\b/g, "BLACK");
    clean = clean.replace(/\bBROUN\b/g, "BROWN");
    clean = clean.replace(/\bROWN\b/g, "BROWN");
    clean = clean.replace(/\bDRAK\b/g, "DARK");
    clean = clean.replace(/\bGREAY\b/g, "GREY");
    clean = clean.replace(/\bMETEL\b/g, "METAL");
    clean = clean.replace(/\bSLIVER\b/g, "SILVER");
    clean = clean.replace(/\bSIVER\b/g, "SILVER");
    clean = clean.replace(/\b(TRANSPRENT|TRANSPRESNT|TRANSPERNT|TRANSPTRENT|TRANSRENT|TRANSPARENT)\b/g, "TRANSPARENT");
    clean = clean.replace(/\bLITE\b/g, "LIGHT");
    clean = clean.replace(/\bMATEE\b/g, "MATTE");
    clean = clean.replace(/\bMEROON\b/g, "MAROON");
    clean = clean.replace(/\bREB\b/g, "RED");
    clean = clean.replace(/\bVOILET\b/g, "VIOLET");
    clean = clean.replace(/\bGREAN\b/g, "GREEN");
    
    clean = clean.replace(/\s*&\s*/g, " & ");
    clean = clean.replace(/\s+/g, " ").trim();
    
    return clean;
};

const getComputedProductName = (name, brand, frameSpecs) => {
    const isClipOn = name && /clip-on/i.test(name);
    const brandName = isClipOn ? "Clip On" : (brand || "");
    const color = cleanColorName(frameSpecs?.color || "");
    const frameType = frameSpecs?.frameType || "";
    const frameShape = frameSpecs?.frameShape || "";
    
    return [brandName, color, frameType, frameShape]
        .map(p => p.trim())
        .filter(Boolean)
        .map(titleCase)
        .join(" ");
};

// Helper to convert any image file to a WebP data URL (Base64)
const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDim = 1200;
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/webp", 0.82);
                if (dataUrl) {
                    resolve(dataUrl);
                } else {
                    reject(new Error("Failed to convert image to WebP"));
                }
            };
            img.onerror = () => reject(new Error("Failed to load image element"));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
};

// Background removal helper using HTML5 Canvas white thresholding
const removeWhiteBackground = (webpDataUrl, threshold = 230) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            try {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // If pixel is very close to white/light gray
                    if (r > threshold && g > threshold && b > threshold) {
                        data[i + 3] = 0; // Alpha channel to 0 (fully transparent)
                    }
                }

                ctx.putImageData(imgData, 0, 0);
                resolve(canvas.toDataURL("image/webp", 0.82));
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = (e) => reject(e);
        img.src = webpDataUrl;
    });
};

// Convert a data URL back to a Blob for upload
const dataURLToBlob = async (dataUrl) => {
    const res = await fetch(dataUrl);
    return res.blob();
};

export default function Visualise({ userProfile }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Step state: 'scan' | 'details' | 'images' | 'summary'
    const [visualiseStage, setVisualiseStage] = useState('scan');
    
    // Scanner control states
    const [isScanning, setIsScanning] = useState(false);
    const html5QrCodeRef = useRef(null);
    const isProcessingBarcodeRef = useRef(false);

    // Scanned product details
    const [barcodeQuery, setBarcodeQuery] = useState("");
    const [scannedProduct, setScannedProduct] = useState(null);
    const [scannedProductCategoryPath, setScannedProductCategoryPath] = useState("");
    const [scannedProductCategoryType, setScannedProductCategoryType] = useState(null);

    const [lensForm, setLensForm] = useState({
        lensType: "",
        index: "",
        material: "",
        coating: "",
        sph: "",
        cyl: "",
        axis: "",
        add: ""
    });

    const [frameForm, setFrameForm] = useState({
        modelNo: "",
        color: "",
        sizeA: "",
        sizeB: "",
        dbl: "",
        templeLength: "",
        frameShape: "",
        frameType: ""
    });

    // Ingested images state
    const [images, setImages] = useState({
        cover: null, // { file, previewDataUrl, webpDataUrl, webpBlob, isBgRemoved }
        front: null,
        side: null
    });

    const [showConfirmPopup, setShowConfirmPopup] = useState(false);

    const fetchCategoryPath = async (categoryId) => {
        if (!categoryId) return "";
        let path = [];
        let currentId = categoryId;
        try {
            while (currentId) {
                const { data, error } = await supabase
                    .from('categories')
                    .select('id, name, parent_id')
                    .eq('id', currentId)
                    .single();
                if (error || !data) break;
                path.unshift(data.name);
                currentId = data.parent_id;
            }
        } catch (e) {}
        return path.join(" > ");
    };

    const getCategoryType = (categoryPath) => {
        if (!categoryPath) return null;
        const path = categoryPath.toLowerCase();
        if (path.includes("frame")) return "frame";
        if (path.includes("lens")) return "lens";
        return null;
    };

    // Camera scanner start/stop helpers
    const stopScanner = useCallback(async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
            } catch (err) {
                console.warn("Scanner stop cleanup:", err);
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
        isProcessingBarcodeRef.current = false;
    }, []);

    const searchProductByBarcode = useCallback(async (queryVal) => {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            let pendingData = null;

            // Search pending_products
            const { data: pBarData } = await supabase
                .from("pending_product_barcodes")
                .select("pending_product_id")
                .eq("barcode", queryVal)
                .maybeSingle();

            if (pBarData) {
                const { data: pProd } = await supabase
                    .from("pending_products")
                    .select("*")
                    .eq("id", pBarData.pending_product_id)
                    .eq("status", "pending")
                    .maybeSingle();
                pendingData = pProd;
            }

            if (!pendingData) {
                const { data: pProd } = await supabase
                    .from("pending_products")
                    .select("*")
                    .eq("sku", queryVal)
                    .eq("status", "pending")
                    .maybeSingle();
                pendingData = pProd;
            }

            if (pendingData) {
                const categoryPath = await fetchCategoryPath(pendingData.category_id);
                const categoryType = getCategoryType(categoryPath);

                setScannedProduct(pendingData);
                setScannedProductCategoryPath(categoryPath);
                setScannedProductCategoryType(categoryType);
                setVisualiseStage('details');

                // Populate specs forms
                if (categoryType === 'lens' && pendingData.description) {
                    try {
                        const parsed = JSON.parse(pendingData.description);
                        setLensForm({
                            lensType: parsed.lensType || "",
                            index: parsed.index || "",
                            material: parsed.material || "",
                            coating: parsed.coating || "",
                            sph: parsed.sph || "",
                            cyl: parsed.cyl || "",
                            axis: parsed.axis || "",
                            add: parsed.add || ""
                        });
                    } catch (e) {}
                } else if (categoryType === 'frame') {
                    try {
                        const parsed = pendingData.description ? JSON.parse(pendingData.description) : {};
                        setFrameForm({
                            modelNo: parsed.modelNo || pendingData.frame_model_no || "",
                            color: parsed.color || pendingData.frame_color || "",
                            sizeA: parsed.sizeA || "",
                            sizeB: parsed.sizeB || "",
                            dbl: parsed.dbl || "",
                            templeLength: parsed.templeLength || "",
                            frameShape: parsed.frameShape || pendingData.frame_shape || "",
                            frameType: parsed.frameType || pendingData.frame_type || ""
                        });
                    } catch (e) {
                        setFrameForm({
                            modelNo: pendingData.frame_model_no || "",
                            color: pendingData.frame_color || "",
                            sizeA: "", sizeB: "", dbl: "", templeLength: "", frameShape: "", frameType: ""
                        });
                    }
                }
                setImages({ cover: null, front: null, side: null });
            } else {
                setErrorMessage(`Product with barcode "${queryVal}" was not found in pending inventory.`);
                isProcessingBarcodeRef.current = false;
            }
        } catch (err) {
            setErrorMessage("Search error: " + err.message);
            isProcessingBarcodeRef.current = false;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleBarcodeFound = useCallback(async (barcodeVal) => {
        if (isProcessingBarcodeRef.current) return;
        isProcessingBarcodeRef.current = true;
        await stopScanner();
        await searchProductByBarcode(barcodeVal);
    }, [stopScanner, searchProductByBarcode]);

    const startScanner = useCallback(async () => {
        setErrorMessage("");
        setSuccessMessage("");
        try {
            await stopScanner();
            const qrCode = new Html5Qrcode("visualise-camera-reader");
            html5QrCodeRef.current = qrCode;
            setIsScanning(true);
            await qrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 180 } },
                (decodedText) => {
                    handleBarcodeFound(decodedText);
                },
                () => {}
            );
        } catch (err) {
            setErrorMessage("Failed to access device camera: " + err.message);
            setIsScanning(false);
        }
    }, [stopScanner, handleBarcodeFound]);

    const handleManualSearch = useCallback((e) => {
        if (e) e.preventDefault();
        if (!barcodeQuery.trim()) return;
        stopScanner();
        searchProductByBarcode(barcodeQuery.trim());
    }, [barcodeQuery, stopScanner, searchProductByBarcode]);

    // Auto-start camera when stage is 'scan'
    useEffect(() => {
        if (visualiseStage === 'scan') {
            startScanner();
        }
        return () => {
            stopScanner();
        };
    }, [visualiseStage, startScanner, stopScanner]);

    const handleFileChange = async (e, position) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Read for immediate preview
            const reader = new FileReader();
            reader.onload = async (event) => {
                const previewDataUrl = event.target.result;

                setImages(prev => ({
                    ...prev,
                    [position]: {
                        file,
                        previewDataUrl,
                        webpDataUrl: previewDataUrl,
                        webpBlob: file,
                        isBgRemoved: false
                    }
                }));

                // Convert to WebP format
                const webpDataUrl = await convertToWebP(file);
                const webpBlob = await dataURLToBlob(webpDataUrl);

                setImages(prev => {
                    if (!prev[position]) return prev;
                    return {
                        ...prev,
                        [position]: {
                            ...prev[position],
                            webpDataUrl,
                            webpBlob
                        }
                    };
                });
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setErrorMessage("Image processing failed: " + err.message);
        }
    };

    // Run Background Removal for the Cover Image
    const handleRemoveCoverBg = async () => {
        const cover = images.cover;
        if (!cover?.webpDataUrl) return;

        setLoading(true);
        try {
            const cleanDataUrl = await removeWhiteBackground(cover.webpDataUrl, 238);
            const cleanBlob = await dataURLToBlob(cleanDataUrl);

            setImages(prev => ({
                ...prev,
                cover: {
                    ...prev.cover,
                    webpDataUrl: cleanDataUrl,
                    webpBlob: cleanBlob,
                    isBgRemoved: true
                }
            }));
            setSuccessMessage("Background removed from Cover image.");
        } catch (err) {
            setErrorMessage("Background removal failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveImage = (position) => {
        setImages(prev => ({ ...prev, [position]: null }));
    };

    // Final confirmation submission
    const handleFinalConfirmSubmission = async () => {
        setShowConfirmPopup(false);
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            if (!scannedProduct) throw new Error("No scanned product selected.");

            let finalDesc = scannedProduct.description;
            let frameModel = null;
            let frameColor = null;

            if (scannedProductCategoryType === 'frame') {
                let coverUrl = null;
                const uploadedUrls = {};

                // Upload WebP images to storage
                for (const position of POSITIONS) {
                    const imgData = images[position];
                    if (!imgData?.webpBlob) continue;

                    const fileName = `${scannedProduct.id}/${position}.webp`;

                    const { error: uploadError } = await supabase.storage
                        .from('imagine-uploads')
                        .upload(fileName, imgData.webpBlob, { 
                            cacheControl: '3600', 
                            contentType: 'image/webp',
                            upsert: true 
                        });

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage
                        .from('imagine-uploads')
                        .getPublicUrl(fileName);

                    uploadedUrls[position] = urlData.publicUrl;

                    if (position === 'cover') {
                        coverUrl = urlData.publicUrl;
                    }
                }

                frameModel = frameForm.modelNo;
                frameColor = frameForm.color;

                finalDesc = JSON.stringify({
                    ...JSON.parse(scannedProduct.description || '{}'),
                    type: 'frame',
                    modelNo: frameForm.modelNo,
                    color: frameForm.color,
                    sizeA: frameForm.sizeA,
                    sizeB: frameForm.sizeB,
                    dbl: frameForm.dbl,
                    templeLength: frameForm.templeLength,
                    frameShape: frameForm.frameShape,
                    frameType: frameForm.frameType,
                    imageUrls: uploadedUrls,
                    coverUrl: coverUrl || scannedProduct.image_url
                });
            } else if (scannedProductCategoryType === 'lens') {
                finalDesc = JSON.stringify({
                    type: 'lens',
                    lensType: lensForm.lensType,
                    index: lensForm.index,
                    material: lensForm.material,
                    coating: lensForm.coating,
                    sph: lensForm.sph,
                    cyl: lensForm.cyl,
                    axis: lensForm.axis,
                    add: lensForm.add
                });
            }

            const updatePayload = { 
                status: 'confirmed', 
                description: finalDesc,
                confirmed_at: new Date().toISOString() 
            };

            if (scannedProductCategoryType === 'frame') {
                updatePayload.frame_model_no = frameModel;
                updatePayload.frame_color = frameColor;
                
                let existingSpecs = {};
                try {
                    existingSpecs = JSON.parse(scannedProduct.description || '{}');
                } catch (e) {}

                updatePayload.product_name = getComputedProductName(
                    scannedProduct.name,
                    scannedProduct.brand,
                    {
                        color: frameColor,
                        frameType: existingSpecs.frameType || '',
                        frameShape: existingSpecs.frameShape || ''
                    }
                );
            }

            const { error: updateError } = await supabase
                .from("pending_products")
                .update(updatePayload)
                .eq('id', scannedProduct.id);

            if (updateError) throw updateError;

            setSuccessMessage(`Successfully confirmed and ingested product: "${scannedProduct.name}"!`);
            
            // Reset state
            setImages({ cover: null, front: null, side: null });
            setScannedProduct(null);
            setVisualiseStage('scan');
            setBarcodeQuery("");
        } catch (err) {
            setErrorMessage(err.message || "Failed to finalize submission.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-28 pt-2 animate-fast-slide">
            
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-[11px] font-bold rounded-xl px-3.5 py-2.5 flex items-center gap-2 animate-in fade-in duration-150">
                    <Check size={14} /> {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold rounded-xl px-3.5 py-2.5 animate-in fade-in duration-150">
                    {errorMessage}
                </div>
            )}

            {/* STAGE 1: SCAN BARCODE (No other distractions on the page) */}
            {visualiseStage === 'scan' && (
                <div className="space-y-6 max-w-lg mx-auto">
                    <div className="bg-white rounded-3xl border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="text-center space-y-1.5">
                            <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center justify-center gap-2">
                                <QrCode size={18} /> Point at Barcode
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Hold barcode within scanner area
                            </p>
                        </div>

                        {/* Scanner Reader Viewport */}
                        <div className="relative aspect-video w-full rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden bg-black flex items-center justify-center">
                            <div id="visualise-camera-reader" className="w-full h-full object-cover" />
                            {!isScanning && (
                                <button
                                    onClick={startScanner}
                                    className="absolute inset-0 bg-black/60 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black/50 transition-all"
                                >
                                    <Camera size={16} /> Start Camera
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleManualSearch} className="flex gap-2">
                            <input 
                                type="text"
                                value={barcodeQuery}
                                onChange={e => setBarcodeQuery(e.target.value)}
                                placeholder="Or type barcode/SKU manually..."
                                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black placeholder:text-gray-300"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 bg-black hover:bg-neutral-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                {loading ? "Searching..." : "Search"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* STAGE 2: PRODUCT DETAILS */}
            {visualiseStage === 'details' && scannedProduct && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="border-b border-gray-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                            <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {scannedProduct.checkpoint_name || "Quick Intake"}
                            </span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SKU: {scannedProduct.sku}</span>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-base font-black text-black uppercase tracking-tight">{scannedProduct.name || scannedProduct.product_name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{scannedProductCategoryPath}</p>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Brand</span>
                                <span className="text-[11px] font-black text-black uppercase">{scannedProduct.brand || "—"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Base Price</span>
                                <span className="text-[11px] font-black text-black uppercase">{scannedProduct.base_price ? `Rs. ${scannedProduct.base_price}` : "—"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Created At</span>
                                <span className="text-[10px] font-bold text-black uppercase">{scannedProduct.created_at ? new Date(scannedProduct.created_at).toLocaleString() : "—"}</span>
                            </div>
                        </div>

                        {scannedProductCategoryType === 'frame' && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-3">
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1">Frame Dimensions</h4>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <span className="text-[7px] font-black text-gray-400 block uppercase">A Size</span>
                                            <span className="text-xs font-black text-black">{frameForm.sizeA || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[7px] font-black text-gray-400 block uppercase">B Size</span>
                                            <span className="text-xs font-black text-black">{frameForm.sizeB || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[7px] font-black text-gray-400 block uppercase">DBL</span>
                                            <span className="text-xs font-black text-black">{frameForm.dbl || "—"}</span>
                                        </div>
                                        <div>
                                            <span className="text-[7px] font-black text-gray-400 block uppercase">Temple</span>
                                            <span className="text-xs font-black text-black">{frameForm.templeLength || "—"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Frame Shape</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.frameShape || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Frame Type</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.frameType || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Frame Model No</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.modelNo || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Color</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.color || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => { setScannedProduct(null); setVisualiseStage('scan'); }}
                            className="flex-1 py-4 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft size={14} /> Back
                        </button>
                        <button
                            onClick={() => setVisualiseStage('images')}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all"
                        >
                            Proceed
                        </button>
                    </div>
                </div>
            )}

            {/* STAGE 3: ACQUIRE IMAGES */}
            {visualiseStage === 'images' && scannedProduct && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-black uppercase tracking-widest">Image Acquisition</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Provide Cover, Front, and Side product perspectives</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                            {POSITIONS.map((pos) => {
                                const img = images[pos];
                                return (
                                    <div key={pos} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-black uppercase tracking-widest">{pos} view</span>
                                            {img && (
                                                <button onClick={() => handleRemoveImage(pos)} className="text-red-500 hover:text-red-700 p-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {img?.webpDataUrl ? (
                                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center relative">
                                                <img src={img.webpDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                                <span className="absolute bottom-2 right-2 bg-black/60 text-[6px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider">WebP</span>
                                            </div>
                                        ) : (
                                            <label className="aspect-video w-full border-2 border-dashed border-gray-300 hover:border-black rounded-xl cursor-pointer flex flex-col items-center justify-center p-4 transition-all gap-1 text-center">
                                                <Upload size={18} className="text-gray-400" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Capture / Upload</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                            </label>
                                        )}

                                        {/* Background removal tool exclusively for Cover View */}
                                        {pos === 'cover' && img?.webpDataUrl && (
                                            <button
                                                onClick={handleRemoveCoverBg}
                                                disabled={loading || img.isBgRemoved}
                                                className={`w-full py-2 text-[8px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                                    img.isBgRemoved 
                                                        ? "bg-green-50 border-green-200 text-green-700 cursor-not-allowed" 
                                                        : "bg-white border-black text-black hover:bg-gray-50"
                                                }`}
                                            >
                                                {img.isBgRemoved ? "✓ Background Removed" : "✨ Remove Background"}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setVisualiseStage('details')}
                            className="flex-1 py-4 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft size={14} /> Back
                        </button>
                        <button
                            onClick={() => {
                                const hasAny = POSITIONS.some(pos => images[pos]?.webpBlob);
                                if (!hasAny) {
                                    setErrorMessage("Please capture or upload at least one image to proceed.");
                                    return;
                                }
                                setVisualiseStage('summary');
                            }}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all"
                        >
                            Proceed
                        </button>
                    </div>
                </div>
            )}

            {/* STAGE 4: SUMMARY & CONFIRMATION */}
            {visualiseStage === 'summary' && scannedProduct && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-black uppercase tracking-widest">Ingest Summary Review</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Review all catalog specifications and image renders before finalizing</p>
                        </div>

                        {/* specs summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-150 text-xs">
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Checkpoint</span>
                                <span className="font-black text-black uppercase">{scannedProduct.checkpoint_name || "Quick Intake"}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Product Display Name</span>
                                <span className="font-black text-black uppercase">{scannedProduct.name || scannedProduct.product_name}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Barcode / SKU</span>
                                <span className="font-black text-black uppercase">{scannedProduct.sku}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Brand</span>
                                <span className="font-black text-black uppercase">{scannedProduct.brand || "—"}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Base Price</span>
                                <span className="font-black text-black uppercase">{scannedProduct.base_price ? `Rs. ${scannedProduct.base_price}` : "—"}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Category</span>
                                <span className="font-black text-black uppercase">{scannedProductCategoryPath}</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Created At</span>
                                <span className="font-bold text-black uppercase">{scannedProduct.created_at ? new Date(scannedProduct.created_at).toLocaleString() : "—"}</span>
                            </div>

                            {scannedProductCategoryType === 'frame' && (
                                <>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Frame Model No</span>
                                        <span className="font-black text-black uppercase">{frameForm.modelNo || "—"}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Color</span>
                                        <span className="font-black text-black uppercase">{frameForm.color || "—"}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Frame Shape</span>
                                        <span className="font-black text-black uppercase">{frameForm.frameShape || "—"}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Dimensions (A / B / DBL / Temple)</span>
                                        <span className="font-black text-black uppercase">{`${frameForm.sizeA || "—"} / ${frameForm.sizeB || "—"} / ${frameForm.dbl || "—"} / ${frameForm.templeLength || "—"}`}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* images summary */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Processed Images</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {POSITIONS.map(pos => {
                                    const img = images[pos];
                                    if (!img?.webpDataUrl) return null;
                                    return (
                                        <div key={pos} className="bg-white border border-gray-250 p-3 rounded-2xl space-y-1">
                                            <span className="text-[8px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                <img src={img.webpDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setVisualiseStage('images')}
                            className="flex-1 py-4 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft size={14} /> Back
                        </button>
                        <button
                            onClick={() => setShowConfirmPopup(true)}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* CONFIRMATION POPUP MODAL */}
            {showConfirmPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmPopup(false)} />
                    <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-sm w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <h3 className="text-base font-black text-black uppercase tracking-tight">Confirm Pending Product</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                Are you sure you want to confirm and ingest this product to active inventory?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmPopup(false)}
                                className="flex-1 py-3 text-[10px] font-black uppercase border-2 border-black rounded-xl hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleFinalConfirmSubmission}
                                className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                                {submitting ? "Confirming..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
