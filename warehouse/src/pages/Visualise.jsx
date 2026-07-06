import { useState, useEffect } from "react";
import { Camera, Upload, Trash2, Check, Sparkles, QrCode, Clock, AlertCircle, ChevronRight, ImageIcon, PackageCheck } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

const POSITIONS = ['cover', 'front', 'side'];

// Read a File as a Base64 Data URL
const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file as Data URL"));
        reader.readAsDataURL(file);
    });
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

    const [poolItems, setPoolItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    
    // Captured images mapping
    const [images, setImages] = useState({
        cover: null, // { file, previewDataUrl, webpDataUrl, webpBlob }
        front: null,
        side: null
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [recentUploads, setRecentUploads] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [barcodeQuery, setBarcodeQuery] = useState("");
    const [scannedProduct, setScannedProduct] = useState(null);
    const [scannedProductCategoryPath, setScannedProductCategoryPath] = useState("");
    const [scannedProductCategoryType, setScannedProductCategoryType] = useState(null);
    const [visualiseStage, setVisualiseStage] = useState('scan');
    
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
        color: ""
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

    const handleBarcodeScan = async (e) => {
        if (e) e.preventDefault();
        if (!barcodeQuery.trim()) return;
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const queryVal = barcodeQuery.trim();

            let pendingData = null;

            // Path 1a: Check if barcode is registered in pending_product_barcodes
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

            // Path 1b: Fallback to searching SKU directly in pending_products (if they entered SKU code)
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
                // Process pending product (existing flow)
                const categoryPath = await fetchCategoryPath(pendingData.category_id);
                const categoryType = getCategoryType(categoryPath);

                setScannedProduct(pendingData);
                setScannedProductCategoryPath(categoryPath);
                setScannedProductCategoryType(categoryType);
                setVisualiseStage('input');

                if (categoryType === 'lens' && pendingData.description) {
                    try {
                        const parsed = JSON.parse(pendingData.description);
                        if (parsed.type === 'lens') {
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
                        }
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
                            templeLength: parsed.templeLength || ""
                        });
                    } catch (e) {
                        setFrameForm({
                            modelNo: pendingData.frame_model_no || "",
                            color: pendingData.frame_color || "",
                            sizeA: "",
                            sizeB: "",
                            dbl: "",
                            templeLength: ""
                        });
                    }
                }
                setImages({ cover: null, front: null, side: null });
                return;
            }

            // Path 2: Look up in product_barcodes and find matching imagine_pool items
            const { data: barcodeData } = await supabase
                .from("product_barcodes")
                .select("product_id")
                .eq("barcode", queryVal)
                .maybeSingle();

            if (barcodeData) {
                // Find matching pending imagine_pool item for this product
                const { data: poolData } = await supabase
                    .from("imagine_pool")
                    .select(`
                        id,
                        status,
                        expires_at,
                        created_at,
                        products (
                            id,
                            name,
                            sku,
                            frame_shape,
                            frame_type,
                            product_barcodes (
                                barcode
                            ),
                            product_images (
                                image_url,
                                position
                            )
                        )
                    `)
                    .eq("product_id", barcodeData.product_id)
                    .eq("status", "pending")
                    .gt("expires_at", new Date().toISOString())
                    .maybeSingle();

                if (poolData) {
                    // Select item from the pool list
                    handleSelectItem(poolData);
                    setSuccessMessage(`Found linked product order request: "${poolData.products.name}"! Ready for visualisation uploads.`);
                    return;
                }
            }
            // Path 3: Fallback - Product not found anywhere
            setErrorMessage(`No pending product or order request found with barcode: ${queryVal}`);
        } catch (err) {
            setErrorMessage("Search failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmScanSubmission = async () => {
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
            }

            const { error: updateError } = await supabase
                .from("pending_products")
                .update(updatePayload)
                .eq('id', scannedProduct.id);

            if (updateError) throw updateError;

            setSuccessMessage(`Successfully confirmed and moved ${scannedProduct.name} to Confirmed Queue!`);
            
            setImages({ cover: null, front: null, side: null });
            setScannedProduct(null);
            setVisualiseStage('scan');
            setBarcodeQuery("");
            await fetchPool();
        } catch (err) {
            setErrorMessage(err.message || "Submission failed.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchPool();
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchPool = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('imagine_pool')
                .select(`
                    id,
                    status,
                    expires_at,
                    created_at,
                    products (
                        id,
                        name,
                        sku,
                        frame_shape,
                        frame_type,
                        product_barcodes (
                            barcode
                        ),
                        product_images (
                            image_url,
                            position
                        )
                    )
                `)
                .eq('status', 'pending')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPoolItems(data || []);

            const { data: recent, error: recentErr } = await supabase
                .from('imagine_pool')
                .select(`
                    id,
                    status,
                    created_at,
                    products (
                        name,
                        product_barcodes (
                            barcode
                        ),
                        product_images (
                            image_url,
                            position
                        )
                    )
                `)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(10);

            if (!recentErr) {
                setRecentUploads(recent || []);
            }
        } catch (err) {
            console.error("Error fetching visualise pool:", err);
            setErrorMessage("Failed to fetch visualise items: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setImages({ cover: null, front: null, side: null });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const handleFileChange = async (e, position) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Read the file as a base64 data URL for immediate preview
            const previewDataUrl = await readFileAsDataURL(file);

            // Set temporary local preview with the original file data URL
            // webpBlob defaults to the raw file until WebP conversion completes
            setImages(prev => ({
                ...prev,
                [position]: {
                    file,
                    previewDataUrl,
                    webpDataUrl: previewDataUrl,
                    webpBlob: file
                }
            }));

            // Convert to WebP data URL asynchronously
            const webpDataUrl = await convertToWebP(file);
            // Create a blob from the WebP data URL for storage upload
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
        } catch (err) {
            console.error("Error converting file:", err);
        }
    };

    const handleRemoveImage = (position) => {
        setImages(prev => ({ ...prev, [position]: null }));
    };

    const handleSaveTrigger = () => {
        const hasAny = POSITIONS.some(p => images[p]?.webpBlob);
        if (!hasAny) {
            setErrorMessage("Please upload at least one image.");
            return;
        }
        setShowPreviewModal(true);
    };

    const handleConfirmUpload = async () => {
        setShowPreviewModal(false);
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const product = selectedItem.products;
            if (!product) throw new Error("Linked product not found.");

            // Upload images and save URLs
            for (const position of POSITIONS) {
                const imgData = images[position];
                if (!imgData?.webpBlob) continue;

                // Save file as WebP
                const fileName = `${product.id}/${position}.webp`;

                // Upload to bucket
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

                // Insert into product_images table
                const { error: imgInsertError } = await supabase
                    .from('product_images')
                    .insert([{
                        product_id: product.id,
                        image_url: urlData.publicUrl,
                        position
                    }]);

                if (imgInsertError) throw imgInsertError;

                // If this is the cover image, update the primary products image_url field
                if (position === 'cover') {
                    await supabase
                        .from('products')
                        .update({ image_url: urlData.publicUrl })
                        .eq('id', product.id);
                }
            }

            // Mark this visualise request completed
            const { error: updateError } = await supabase
                .from('imagine_pool')
                .update({ status: 'completed' })
                .eq('id', selectedItem.id);

            if (updateError) throw updateError;

            setSuccessMessage("WebP images uploaded and linked to product successfully!");

            setImages({ cover: null, front: null, side: null });
            setSelectedItem(null);
            fetchPool();
        } catch (err) {
            setErrorMessage(err.message || "Failed to submit images.");
        } finally {
            setSubmitting(false);
        }
    };

    const getCountdownLabel = (expiresAt) => {
        const diff = new Date(expiresAt) - currentTime;
        if (diff <= 0) return "Expired";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${mins}m ${secs}s`;
    };

    // Helper: get cover image URL from product_images array
    const getCoverImage = (product) => {
        if (!product?.product_images) return null;
        const coverImg = product.product_images.find(img => img.position === 'cover');
        return coverImg?.image_url || null;
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

            {/* SCANNING & LOOKUP AREA (Only shown when no active product is selected for input/review) */}
            {!scannedProduct && !selectedItem ? (
                <div className="space-y-6">
                    {/* Barcode Search / Scan Card */}
                    <div className="bg-white rounded-3xl border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div>
                            <h3 className="text-base font-black text-black uppercase tracking-wider flex items-center gap-2">
                                <QrCode size={18} /> Warehouse Ingest Scanner
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                Scan or enter a product barcode to initiate verification
                            </p>
                        </div>
                        <form onSubmit={handleBarcodeScan} className="flex gap-2">
                            <input 
                                type="text"
                                value={barcodeQuery}
                                onChange={e => setBarcodeQuery(e.target.value)}
                                placeholder="Scan or enter barcode number..."
                                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black placeholder:text-gray-300"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 bg-black hover:bg-neutral-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                {loading ? "Searching..." : "Scan"}
                            </button>
                        </form>
                    </div>

                    {/* Pending Requests pool */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending Requests Pool</p>
                        {loading ? (
                            <div className="text-[11px] text-gray-400 font-bold text-center py-6">Loading requests...</div>
                        ) : poolItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white border-2 border-dashed border-neutral-205 rounded-[32px] px-6 text-center gap-3 shadow-sm">
                                <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                                    <PackageCheck size={26} className="text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-base font-black text-neutral-400 uppercase tracking-tight">All Clear</p>
                                    <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-widest mt-0.5">No pending requests in the pool</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {poolItems.map((item) => {
                                    const prod = item.products;
                                    const barcode = prod?.product_barcodes?.[0]?.barcode || 'No Barcode';
                                    const isExpired = new Date(item.expires_at) - currentTime <= 0;
                                    const coverUrl = getCoverImage(prod);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSelectItem(item)}
                                            className="w-full bg-white border-2 border-neutral-100 rounded-2xl p-3.5 flex items-center gap-3 hover:border-black hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-black transition-all">
                                                {coverUrl ? (
                                                    <img
                                                        src={coverUrl}
                                                        alt={prod?.name || 'Product'}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <div className={`w-full h-full items-center justify-center ${coverUrl ? 'hidden' : 'flex'} group-hover:bg-black/10 transition-all`}>
                                                    <ImageIcon size={18} className="text-neutral-500 group-hover:text-neutral-700 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="text-xs font-black text-black uppercase tracking-tight truncate">
                                                        {prod?.name || 'Unnamed Product'}
                                                    </span>
                                                    {isExpired ? (
                                                        <span className="text-[7px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                                                            <AlertCircle size={8} /> Expired
                                                        </span>
                                                    ) : (
                                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 ${
                                                            new Date(item.expires_at) - currentTime < 30 * 60 * 1000
                                                                ? 'text-red-500 bg-red-50'
                                                                : 'text-amber-600 bg-amber-50'
                                                        }`}>
                                                            <Clock size={8} />
                                                            {getCountdownLabel(item.expires_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold">
                                                    <span className="flex items-center gap-1">
                                                        <QrCode size={10} />
                                                        {barcode}
                                                    </span>
                                                    {prod?.sku && (
                                                        <span className="bg-neutral-100 px-1.5 py-0.5 rounded-full">
                                                            {prod.sku}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all shrink-0">
                                                <ChevronRight size={14} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {/* SCAN INPUT MODE STAGE */}
            {scannedProduct && visualiseStage === 'input' && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Scanned Product Details</span>
                        <h3 className="text-base font-black text-black uppercase tracking-tight">{scannedProduct.name}</h3>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            <span>Barcode: {scannedProduct.sku}</span>
                            <span className="hidden sm:inline text-gray-200">|</span>
                            <span>Category: {scannedProductCategoryPath}</span>
                        </div>
                    </div>

                    {/* Frame Form */}
                    {scannedProductCategoryType === 'frame' && (
                        <div className="space-y-4">
                            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Verify Frame Specifications</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Model No</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.modelNo || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Color</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.color || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">A Size</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.sizeA || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">B Size</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.sizeB || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">DBL</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.dbl || "—"}</span>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">Temple Length</span>
                                        <span className="text-[11px] font-black text-black uppercase">{frameForm.templeLength || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capture Frame Images</p>
                            <div className="space-y-4">
                                {/* Grid container for Cover and Front views (Row 1) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {POSITIONS.map((pos) => {
                                    const img = images[pos];
                                    return (
                                        <div key={pos} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-2.5 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[9px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                                    {img && (
                                                        <button type="button" onClick={() => handleRemoveImage(pos)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                                {(img?.webpDataUrl || img?.previewDataUrl) ? (
                                                    <div className="aspect-video w-full rounded-xl border border-neutral-150 overflow-hidden bg-neutral-50 flex items-center justify-center relative">
                                                        <img src={img.webpDataUrl || img.previewDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                                        <div className="absolute bottom-2 right-2 bg-black/60 text-[7px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider">WebP Ready</div>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center gap-1.5 aspect-video border-2 border-dashed border-neutral-200 hover:border-black rounded-xl cursor-pointer p-4 transition-all">
                                                        <Upload size={20} className="text-neutral-400" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Upload Image</span>
                                                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </div>
                        </div>
                    )}

                    {/* Lens Form */}
                    {scannedProductCategoryType === 'lens' && (
                        <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                            <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Verify & Confirm Lens Power</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Type *</label>
                                    <select 
                                        value={lensForm.lensType} 
                                        onChange={e => setLensForm({...lensForm, lensType: e.target.value})} 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none bg-white focus:border-black"
                                    >
                                        <option value="">— Select —</option>
                                        <option value="Single Vision">Single Vision</option>
                                        <option value="Bifocal">Bifocal</option>
                                        <option value="Progressive">Progressive</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Index *</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.index} 
                                        onChange={e => setLensForm({...lensForm, index: e.target.value})} 
                                        placeholder="e.g. 1.56" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Material *</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.material} 
                                        onChange={e => setLensForm({...lensForm, material: e.target.value})} 
                                        placeholder="e.g. CR-39" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Coating *</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.coating} 
                                        onChange={e => setLensForm({...lensForm, coating: e.target.value})} 
                                        placeholder="e.g. ARC" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.sph} 
                                        onChange={e => setLensForm({...lensForm, sph: e.target.value})} 
                                        placeholder="e.g. -2.00" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.cyl} 
                                        onChange={e => setLensForm({...lensForm, cyl: e.target.value})} 
                                        placeholder="e.g. -0.50" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.axis} 
                                        onChange={e => setLensForm({...lensForm, axis: e.target.value})} 
                                        placeholder="e.g. 180" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">ADD</label>
                                    <input 
                                        type="text" 
                                        value={lensForm.add} 
                                        onChange={e => setLensForm({...lensForm, add: e.target.value})} 
                                        placeholder="e.g. +2.00" 
                                        className="w-full px-3 py-2 border-2 border-gray-150 rounded-xl text-[11px] font-bold text-black outline-none focus:border-black"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => { setScannedProduct(null); setImages({ cover: null, front: null, side: null }); }}
                            className="flex-1 py-4 border border-neutral-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (scannedProductCategoryType === 'frame') {
                                    if (!frameForm.modelNo || !frameForm.color) {
                                        setErrorMessage("Please fill in Model No and Color.");
                                        return;
                                    }
                                    const hasAny = POSITIONS.some(p => images[p]?.webpBlob);
                                    if (!hasAny) {
                                        setErrorMessage("Please capture/upload at least one image.");
                                        return;
                                    }
                                } else if (scannedProductCategoryType === 'lens') {
                                    if (!lensForm.lensType || !lensForm.index || !lensForm.material || !lensForm.coating) {
                                        setErrorMessage("Please fill all required lens properties.");
                                        return;
                                    }
                                }
                                setVisualiseStage('review');
                            }}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all"
                        >
                            Proceed
                        </button>
                    </div>
                </div>
            )}

            {/* SCAN REVIEW STAGE */}
            {scannedProduct && visualiseStage === 'review' && (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2">
                        <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider self-start inline-block font-black">Review Queue Verification</span>
                        <h3 className="text-base font-black text-black uppercase tracking-tight">{scannedProduct.name}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Barcode: {scannedProduct.sku}</p>
                    </div>

                    {/* Frame Review Content */}
                    {scannedProductCategoryType === 'frame' && (
                        <div className="space-y-4">
                            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                                <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Verify Frame Specifications</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                                    <div>
                                        <span className="text-[8px] font-black text-gray-400 block">Model No</span>
                                        <span className="text-black">{frameForm.modelNo}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-gray-400 block">Color</span>
                                        <span className="text-black">{frameForm.color}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-gray-400 block">A Size</span>
                                        <span className="text-black">{frameForm.sizeA || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-gray-400 block">B Size</span>
                                        <span className="text-black">{frameForm.sizeB || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-gray-400 block">DBL</span>
                                        <span className="text-black">{frameForm.dbl || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[8px] font-black text-gray-400 block">Temple Length</span>
                                        <span className="text-black">{frameForm.templeLength || "—"}</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Verification Image Previews</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {POSITIONS.map(pos => {
                                    const img = images[pos];
                                    if (!img?.webpDataUrl && !img?.previewDataUrl) return null;
                                    return (
                                        <div key={pos} className="bg-white border border-neutral-200 p-3 rounded-2xl space-y-1">
                                            <span className="text-[8px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-neutral-50 flex items-center justify-center border border-neutral-100">
                                                <img src={img.previewDataUrl || img.webpDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Lens Review Content */}
                    {scannedProductCategoryType === 'lens' && (
                        <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
                            <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Verify Power Specifications</h4>
                            <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">Lens Type</span>
                                    <span className="text-black">{lensForm.lensType}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">Index</span>
                                    <span className="text-black">{lensForm.index}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">Material</span>
                                    <span className="text-black">{lensForm.material}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">Coating</span>
                                    <span className="text-black">{lensForm.coating}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">SPH</span>
                                    <span className="text-black">{lensForm.sph || "0.00"}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">CYL</span>
                                    <span className="text-black">{lensForm.cyl || "0.00"}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">Axis</span>
                                    <span className="text-black">{lensForm.axis || "0"}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-black text-gray-400 block">ADD</span>
                                    <span className="text-black">{lensForm.add || "0.00"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setVisualiseStage('input')}
                            className="flex-1 py-4 border border-neutral-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="button"
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
                    <div className="relative bg-white border border-neutral-200 rounded-[24px] p-6 shadow-2xl max-w-sm w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <h3 className="text-base font-black text-black uppercase tracking-tight">Confirm Verification</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                {scannedProductCategoryType === 'frame' 
                                    ? "Confirm frame details and images to catalog queue?" 
                                    : "Confirm lens power specifications to catalog queue?"}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmPopup(false)}
                                className="flex-1 py-3 text-[10px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleConfirmScanSubmission}
                                className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                                {submitting ? "Confirming..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ORIGINAL POOL ITEM SELECTION (IF ANY ACTIVE) */}
            {selectedItem && (
                <div className="space-y-4">
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Target Product</p>
                        <div className="flex items-center gap-3">
                            {getCoverImage(selectedItem.products) ? (
                                <div className="w-14 h-14 rounded-xl overflow-hidden border border-neutral-200 shrink-0">
                                    <img
                                        src={getCoverImage(selectedItem.products)}
                                        alt={selectedItem.products?.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                                    <ImageIcon size={22} className="text-neutral-400" />
                                </div>
                            )}
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-black text-black uppercase tracking-tight">
                                    {selectedItem.products?.name || 'Unnamed Product'}
                                </h3>
                                <div className="flex items-center gap-2 text-[9px] text-gray-400 font-bold uppercase">
                                    <span>Barcode: {selectedItem.products?.product_barcodes?.[0]?.barcode || 'None'}</span>
                                    <span>SKU: {selectedItem.products?.sku || 'None'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-neutral-100 pt-2.5 flex justify-between items-center">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Expiry</span>
                            <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                                {getCountdownLabel(selectedItem.expires_at)}
                            </span>
                        </div>
                    </div>

                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capture Images (WebP)</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {POSITIONS.map((pos) => {
                            const img = images[pos];
                            return (
                                <div key={pos} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-2.5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                            {img && (
                                                <button type="button" onClick={() => handleRemoveImage(pos)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                        {(img?.webpDataUrl || img?.previewDataUrl) ? (
                                            <div className="aspect-video w-full rounded-xl border border-neutral-150 overflow-hidden bg-neutral-50 flex items-center justify-center relative">
                                                <img src={img.webpDataUrl || img.previewDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                                <div className="absolute bottom-2 right-2 bg-black/60 text-[7px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider">WebP Ready</div>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center gap-1.5 aspect-video border-2 border-dashed border-neutral-200 hover:border-black rounded-xl cursor-pointer p-4 transition-all">
                                                <Upload size={20} className="text-neutral-400" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Upload Image</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-2.5">
                        <button
                            type="button"
                            onClick={() => { setSelectedItem(null); setImages({ cover: null, front: null, side: null }); }}
                            className="flex-1 py-3.5 border border-neutral-200 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveTrigger}
                            className="flex-1 py-3.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all"
                        >
                            Save Images
                        </button>
                    </div>
                </div>
            )}

            {/* WEBP PREVIEW MODAL */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreviewModal(false)} />
                    <div className="relative bg-white border border-neutral-200 rounded-[24px] p-5 shadow-2xl max-w-sm w-full space-y-5 text-center animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-black text-black uppercase tracking-tight">WebP Quality Preview</h3>
                            <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">Verify final compressed renders before upload</p>
                        </div>

                        <div className="space-y-3">
                            {POSITIONS.map(pos => {
                                const img = images[pos];
                                if (!img?.webpDataUrl && !img?.previewDataUrl) return null;
                                return (
                                    <div key={pos} className="space-y-0.5 text-left border border-neutral-100 p-2.5 rounded-xl">
                                        <span className="text-[8px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-50 flex items-center justify-center border border-neutral-200">
                                            <img src={img.previewDataUrl || img.webpDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="flex-1 py-2.5 text-[9px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleConfirmUpload}
                                className="flex-1 py-2.5 bg-black text-white text-[9px] font-black uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                                {submitting ? "Uploading..." : "Confirm & Upload"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
