import { useState, useEffect } from "react";
import { Camera, Upload, Trash2, Check, Sparkles, User, Package, ArrowRight } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

const POSITIONS = ['cover', 'front', 'side'];

export default function Imagine({ userProfile }) {
    const [step, setStep] = useState(0); // 0 = select order, 1 = upload images
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [images, setImages] = useState({ cover: null, front: null, side: null });
    const [recentSessions, setRecentSessions] = useState([]);

    useEffect(() => {
        fetchOrders();
        fetchSessions();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id, customer_name, customer_phone, items, created_at, store_id')
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) setOrders(data);
        } catch (err) {
            console.error("Error fetching orders:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('imagine_sessions')
                .select('*, imagine_images(*)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (!error && data) setRecentSessions(data);
        } catch (err) {
            console.error("Error fetching sessions:", err);
        }
    };

    const getProductLabel = (order) => {
        if (!order?.items?.length) return "No items";
        const first = order.items[0];
        return first?.name || first?.brandName || first?.frameName || `${order.items.length} item(s)`;
    };

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
        setImages({ cover: null, front: null, side: null });
        setStep(1);
    };

    const handleFileChange = (e, position) => {
        const file = e.target.files[0];
        if (!file) return;
        if (images[position]?.preview) URL.revokeObjectURL(images[position].preview);
        setImages(prev => ({ ...prev, [position]: { file, preview: URL.createObjectURL(file) } }));
    };

    const handleRemoveImage = (position) => {
        if (images[position]?.preview) URL.revokeObjectURL(images[position].preview);
        setImages(prev => ({ ...prev, [position]: null }));
    };

    const handleSubmit = async () => {
        const hasAny = POSITIONS.some(p => images[p]?.file);
        if (!hasAny) {
            setErrorMessage("Please upload at least one image.");
            return;
        }
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const { data: sessionData, error: sessionError } = await supabase
                .from('imagine_sessions')
                .insert([{
                    order_id: selectedOrder.id,
                    customer_id: selectedOrder.customer_phone || null,
                    customer_name: selectedOrder.customer_name || null,
                    store_id: userProfile?.store_id || selectedOrder.store_id || null,
                    status: 'pending'
                }])
                .select('id')
                .single();

            if (sessionError) throw sessionError;
            const sessionId = sessionData.id;

            for (const position of POSITIONS) {
                const imgData = images[position];
                if (!imgData?.file) continue;

                const fileExt = imgData.file.name.split('.').pop() || 'jpg';
                const fileName = `${sessionId}/${position}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('imagine-uploads')
                    .upload(fileName, imgData.file, { cacheControl: '3600', upsert: true });
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('imagine-uploads')
                    .getPublicUrl(fileName);

                const { error: imgInsertError } = await supabase
                    .from('imagine_images')
                    .insert([{ session_id: sessionId, image_url: urlData.publicUrl, position }]);
                if (imgInsertError) throw imgInsertError;
            }

            setSuccessMessage("Session submitted to the Imagine Pool!");
            setImages({ cover: null, front: null, side: null });
            setSelectedOrder(null);
            setStep(0);
            fetchSessions();
        } catch (err) {
            setErrorMessage(err.message || "Failed to submit session.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-6 pb-28 pt-2">
            {/* Header */}
            <div className="space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Studio</span>
                <h2 className="text-2xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                    <Sparkles size={20} strokeWidth={2.5} /> Imagine
                </h2>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-2xl p-4 flex items-center gap-2">
                    <Check size={16} /> {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl p-4">
                    {errorMessage}
                </div>
            )}

            {/* STEP 0: Select Order */}
            {step === 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Order</p>
                    {loading ? (
                        <div className="text-xs text-gray-400 font-bold text-center py-8">Loading...</div>
                    ) : orders.length === 0 ? (
                        <div className="text-xs text-gray-400 font-bold text-center py-8">No orders found.</div>
                    ) : (
                        <div className="space-y-2">
                            {orders.map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    onClick={() => handleSelectOrder(order)}
                                    className="w-full bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between hover:border-black transition-all text-left group"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="text-gray-400" />
                                            <span className="text-xs font-black text-black uppercase tracking-wider">
                                                {order.customer_name || "Unknown"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Package size={12} className="text-gray-400" />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                                {getProductLabel(order)}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest pl-4">
                                            {order.customer_phone} · {new Date(order.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Recent Pool */}
                    {recentSessions.length > 0 && (
                        <div className="space-y-3 pt-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Pool</p>
                            <div className="space-y-2">
                                {recentSessions.map((session) => (
                                    <div key={session.id} className="bg-white border border-neutral-150 rounded-2xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black text-black uppercase">{session.customer_name || `#${session.id.slice(0, 6)}`}</p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                {session.imagine_images?.length || 0} image(s) · {new Date(session.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                            session.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                                        }`}>
                                            {session.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 1: Review + Upload */}
            {step === 1 && selectedOrder && (
                <div className="space-y-5">
                    {/* Order Summary Card */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0">
                                <User size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-black uppercase tracking-wider">
                                    {selectedOrder.customer_name || "Unknown"}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedOrder.customer_phone}</p>
                            </div>
                        </div>
                        <div className="border-t border-neutral-100 pt-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Product</p>
                            <p className="text-xs font-black text-black uppercase tracking-wide">{getProductLabel(selectedOrder)}</p>
                            {selectedOrder.items?.length > 1 && (
                                <p className="text-[9px] text-gray-400 font-bold mt-0.5">+{selectedOrder.items.length - 1} more item(s)</p>
                            )}
                        </div>
                    </div>

                    {/* Image Slots */}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Capture Images</p>
                    <div className="space-y-4">
                        {POSITIONS.map((pos) => {
                            const img = images[pos];
                            return (
                                <div key={pos} className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                        {img && (
                                            <button type="button" onClick={() => handleRemoveImage(pos)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {img?.preview ? (
                                        <div className="aspect-video w-full rounded-2xl border border-neutral-150 overflow-hidden bg-neutral-50 flex items-center justify-center">
                                            <img src={img.preview} alt={pos} className="max-h-full max-w-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="flex flex-col items-center justify-center gap-2 aspect-square border-2 border-dashed border-neutral-200 hover:border-black rounded-2xl cursor-pointer p-4 transition-all">
                                                <Camera size={22} className="text-neutral-400" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Camera</span>
                                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                            </label>
                                            <label className="flex flex-col items-center justify-center gap-2 aspect-square border-2 border-dashed border-neutral-200 hover:border-black rounded-2xl cursor-pointer p-4 transition-all">
                                                <Upload size={22} className="text-neutral-400" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Upload</span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, pos)} className="hidden" />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setStep(0); setImages({ cover: null, front: null, side: null }); }}
                            className="flex-1 py-4 border border-neutral-200 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSubmit}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-neutral-800 transition-all disabled:opacity-60"
                        >
                            {submitting ? "Uploading..." : "Submit to Pool"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
