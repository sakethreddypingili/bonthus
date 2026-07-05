import { useState, useEffect } from "react";
import { Camera, Upload, Trash2, Check, Sparkles, QrCode, Clock, AlertCircle, ChevronRight, ImageIcon, PackageCheck } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

const POSITIONS = ['cover', 'front', 'side'];

// Helper to convert any image file to a WebP blob client-side
const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
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

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Failed to convert image to WebP"));
                    }
                }, "image/webp", 0.82);
            };
            img.onerror = () => reject(new Error("Failed to load image element"));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
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
        cover: null, // { file, preview, webpBlob, webpPreviewUrl }
        front: null,
        side: null
    });

    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [recentUploads, setRecentUploads] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

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
        // Clear previews
        POSITIONS.forEach(pos => {
            if (images[pos]?.preview) URL.revokeObjectURL(images[pos].preview);
            if (images[pos]?.webpPreviewUrl) URL.revokeObjectURL(images[pos].webpPreviewUrl);
        });
        setImages({ cover: null, front: null, side: null });
        setErrorMessage("");
        setSuccessMessage("");
    };

    const handleFileChange = async (e, position) => {
        const file = e.target.files[0];
        if (!file) return;

        // Clean up old object URLs
        if (images[position]?.preview) URL.revokeObjectURL(images[position].preview);
        if (images[position]?.webpPreviewUrl) URL.revokeObjectURL(images[position].webpPreviewUrl);

        try {
            const preview = URL.createObjectURL(file);
            
            // Set temporary local preview first so UI does not show broken image
            setImages(prev => ({
                ...prev,
                [position]: {
                    file,
                    preview,
                    webpBlob: file, // fallback to raw file until WebP converts
                    webpPreviewUrl: preview // show preview immediately
                }
            }));

            // Convert to webp blob asynchronously
            const webpBlob = await convertToWebP(file);
            const webpPreviewUrl = URL.createObjectURL(webpBlob);

            setImages(prev => {
                // Only update if item is still present
                if (!prev[position]) return prev;
                return {
                    ...prev,
                    [position]: {
                        ...prev[position],
                        webpBlob,
                        webpPreviewUrl
                    }
                };
            });
        } catch (err) {
            console.error("Error converting file:", err);
        }
    };

    const handleRemoveImage = (position) => {
        if (images[position]?.preview) URL.revokeObjectURL(images[position].preview);
        if (images[position]?.webpPreviewUrl) URL.revokeObjectURL(images[position].webpPreviewUrl);
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
            
            // Clean up URLs
            POSITIONS.forEach(pos => {
                if (images[pos]?.preview) URL.revokeObjectURL(images[pos].preview);
                if (images[pos]?.webpPreviewUrl) URL.revokeObjectURL(images[pos].webpPreviewUrl);
            });

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
        <div className="max-w-4xl mx-auto space-y-6 pb-28 pt-2 animate-fast-slide">
            {/* Header */}
            <div className="space-y-0.5 pb-4 border-b border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Studio</span>
                <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                    <Sparkles size={18} strokeWidth={2.5} /> Visualise
                </h2>
            </div>

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

            {/* STEP 0: Select Pending Product Request from Pool */}
            {!selectedItem ? (
                <div className="space-y-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending Requests</p>
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
                                        {/* Product image or placeholder */}
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center shrink-0 group-hover:ring-2 group-hover:ring-black transition-all">
                                            {coverUrl ? (
                                                <img
                                                    src={coverUrl}
                                                    alt={prod?.name || 'Product'}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <div
                                                className={`w-full h-full items-center justify-center ${coverUrl ? 'hidden' : 'flex'} group-hover:bg-black/10 transition-all`}
                                            >
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
                                                {coverUrl && (
                                                    <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full text-[7px] font-black">
                                                        ✓ Has Image
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

                    {/* Recently Completed uploads */}
                    {recentUploads.length > 0 && (
                        <div className="space-y-2 pt-5">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recently Completed</p>
                            <div className="grid grid-cols-1 gap-6">
                                {recentUploads.map((item) => {
                                    const coverUrl = getCoverImage(item.products);
                                    return (
                                        <div key={item.id} className="bg-white border border-neutral-100 rounded-[28px] p-6 flex flex-col sm:flex-row items-center gap-6 min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
                                            {/* Cover image or green check icon */}
                                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-green-50 flex items-center justify-center shrink-0 border border-neutral-100 shadow-inner">
                                                {coverUrl ? (
                                                    <img
                                                        src={coverUrl}
                                                        alt={item.products?.name || 'Product'}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <div className={`w-full h-full items-center justify-center ${coverUrl ? 'hidden' : 'flex'}`}>
                                                    <PackageCheck size={36} className="text-green-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                                                <p className="text-base font-black text-black uppercase tracking-tight truncate">
                                                    {item.products?.name || 'Completed Item'}
                                                </p>
                                                <p className="text-[10px] text-gray-405 font-black uppercase tracking-widest">
                                                    Barcode: {item.products?.product_barcodes?.[0]?.barcode || 'None'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-green-700 bg-green-50 px-4.5 py-2.5 rounded-xl border border-green-100 uppercase tracking-widest shrink-0">
                                                <Check size={11} strokeWidth={3} />
                                                Completed
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* STEP 1: Upload Images for Selected Product */
                <div className="space-y-4">
                    <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Target Product</p>
                        <div className="flex items-center gap-3">
                            {/* Show cover image if already exists */}
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
                    <div className="space-y-3">
                        {POSITIONS.map((pos) => {
                            const img = images[pos];
                            return (
                                <div key={pos} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                        {img && (
                                            <button type="button" onClick={() => handleRemoveImage(pos)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    {img?.webpPreviewUrl ? (
                                        <div className="aspect-video w-full rounded-xl border border-neutral-150 overflow-hidden bg-neutral-50 flex items-center justify-center relative">
                                            <img src={img.webpPreviewUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-[7px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-wider">WebP Ready</div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <label className="flex flex-col items-center justify-center gap-1.5 aspect-square border-2 border-dashed border-neutral-200 hover:border-black rounded-xl cursor-pointer p-3 transition-all">
                                                <Camera size={20} className="text-neutral-400" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Camera</span>
                                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                            </label>
                                            <label className="flex flex-col items-center justify-center gap-1.5 aspect-square border-2 border-dashed border-neutral-200 hover:border-black rounded-xl cursor-pointer p-3 transition-all">
                                                <Upload size={20} className="text-neutral-400" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Upload</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                            </label>
                                        </div>
                                    )}
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

                        {/* Previews List */}
                        <div className="space-y-3">
                            {POSITIONS.map(pos => {
                                const img = images[pos];
                                if (!img?.webpPreviewUrl) return null;
                                return (
                                    <div key={pos} className="space-y-0.5 text-left border border-neutral-100 p-2.5 rounded-xl">
                                        <span className="text-[8px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-50 flex items-center justify-center border border-neutral-200">
                                            <img src={img.webpPreviewUrl} alt={pos} className="max-h-full max-w-full object-contain" />
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
