import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Upload, Check, QrCode, ChevronLeft, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import {
    Html5Qrcode,
    Html5QrcodeSupportedFormats,
} from "html5-qrcode";

// ─── Constants ───────────────────────────────────────────────────────────────
const POSITIONS = ["cover", "front", "side"];

// Only scan common 1D linear barcodes (EAN, Code 128, UPC) — skips heavy 2D/QR checks for instant lock speed
const BARCODE_FORMATS = typeof Html5QrcodeSupportedFormats !== "undefined" && Html5QrcodeSupportedFormats
    ? [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ]
    : [9, 10, 5, 14, 15];

const SCANNER_CONTAINER_ID = "visualise-camera-reader";

// ─── Pure utility functions (no React) ───────────────────────────────────────

const titleCase = (str) => {
    if (!str) return "";
    return str
        .toString()
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
};

const cleanColorName = (color) => {
    if (!color) return "";
    let c = color.toUpperCase().trim();
    const fixes = [
        [/\bBABAY\b/g, "BABY"], [/\bBALCK\b/g, "BLACK"], [/\bBLACLK\b/g, "BLACK"],
        [/\bBROUN\b/g, "BROWN"], [/\bROWN\b/g, "BROWN"], [/\bDRAK\b/g, "DARK"],
        [/\bGREAY\b/g, "GREY"], [/\bMETEL\b/g, "METAL"], [/\bSLIVER\b/g, "SILVER"],
        [/\bSIVER\b/g, "SILVER"], [/\b(TRANSPRENT|TRANSPRESNT|TRANSPERNT|TRANSPTRENT|TRANSRENT|TRANSPARENT)\b/g, "TRANSPARENT"],
        [/\bLITE\b/g, "LIGHT"], [/\bMATEE\b/g, "MATTE"], [/\bMEROON\b/g, "MAROON"],
        [/\bREB\b/g, "RED"], [/\bVOILET\b/g, "VIOLET"], [/\bGREAN\b/g, "GREEN"],
    ];
    fixes.forEach(([re, rep]) => { c = c.replace(re, rep); });
    return c.replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim();
};

const getComputedProductName = (name, brand, frameSpecs) => {
    const isClipOn = name && /clip-on/i.test(name);
    const brandName = isClipOn ? "Clip On" : (brand || "");
    const color = cleanColorName(frameSpecs?.color || "");
    const frameType = frameSpecs?.frameType || "";
    const frameShape = frameSpecs?.frameShape || "";
    return [brandName, color, frameType, frameShape]
        .map((p) => p.trim())
        .filter(Boolean)
        .map(titleCase)
        .join(" ");
};

const formatBytes = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
};

const safeJsonParse = (str) => {
    try {
        const val = JSON.parse(str || "{}");
        return val && typeof val === "object" ? val : {};
    } catch (_) {
        return {};
    }
};

// ─── Image processing helpers ─────────────────────────────────────────────────

/**
 * Convert any image File → WebP data URL.
 * Max dimension 1200 px, quality 0.82.
 */
const convertToWebP = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("FileReader failed"));
        reader.onload = ({ target }) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Image decode failed"));
            img.onload = () => {
                const MAX = 1200;
                let { width, height } = img;
                if (width > MAX || height > MAX) {
                    if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
                    else { width = Math.round((width * MAX) / height); height = MAX; }
                }
                const canvas = Object.assign(document.createElement("canvas"), { width, height });
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/webp", 0.82);
                dataUrl ? resolve(dataUrl) : reject(new Error("toDataURL returned empty"));
            };
            img.src = target.result;
        };
        reader.readAsDataURL(file);
    });

/**
 * Threshold-based background removal fallback (no AI, pure canvas).
 * Makes close-to-white pixels transparent, returning a PNG data URL.
 */
const thresholdRemoveBg = (file, threshold = 215) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("FileReader failed for threshold BG removal"));
        reader.onload = ({ target }) => {
            const img = new Image();
            img.onerror = () => reject(new Error("Failed to load source image for threshold BG removal"));
            img.onload = () => {
                const canvas = Object.assign(document.createElement("canvas"), {
                    width: img.width, height: img.height,
                });
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                try {
                    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const d = id.data;
                    for (let i = 0; i < d.length; i += 4) {
                        if (d[i] > threshold && d[i + 1] > threshold && d[i + 2] > threshold) {
                            d[i + 3] = 0; // Make matching background pixels transparent
                        }
                    }
                    ctx.putImageData(id, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                } catch (e) { reject(e); }
            };
            img.src = target.result;
        };
        reader.readAsDataURL(file);
    });

/** data URL → Blob (no fetch) */
const dataURLToBlob = (dataUrl) => {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return new Blob([buf], { type: mime });
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Visualise({ userProfile }) {
    const location = useLocation();
    const navigate = useNavigate();

    // General UI state
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Workflow stages: 'scan' | 'details' | 'images' | 'summary' | 'gallery'
    const [stage, setStage] = useState("scan");

    // ── Scanner state ──────────────────────────────────────────────────────
    const [isScanning, setIsScanning] = useState(false);
    const [scannerError, setScannerError] = useState("");
    const [barcodeQuery, setBarcodeQuery] = useState("");

    // Internal refs — these must NOT be React state to avoid re-render loops
    const html5QrRef = useRef(null);       // Html5Qrcode instance
    const isProcessingRef = useRef(false); // debounce flag
    const mountedRef = useRef(true);       // unmount guard
    const startTimerRef = useRef(null);    // delayed start timer

    // ── Product state ──────────────────────────────────────────────────────
    const [scannedProduct, setScannedProduct] = useState(null);
    const [categoryPath, setCategoryPath] = useState("");
    const [categoryType, setCategoryType] = useState(null); // 'frame' | 'lens' | null

    const [frameForm, setFrameForm] = useState({
        modelNo: "", color: "", sizeA: "", sizeB: "",
        dbl: "", templeLength: "", frameShape: "", frameType: "",
    });
    const [lensForm, setLensForm] = useState({
        lensType: "", index: "", material: "", coating: "",
        sph: "", cyl: "", axis: "", add: "",
    });

    // ── Image state ────────────────────────────────────────────────────────
    // Each slot: { file, foregroundUrl, webpDataUrl, webpBlob, originalSize, processedSize, isBgRemoved, rotation, scale }
    const [images, setImages] = useState({ cover: null, front: null, side: null });
    const [bgProgress, setBgProgress] = useState(null); // { message, percent }

    const [showConfirmPopup, setShowConfirmPopup] = useState(false);

    // ── In-App Camera state ────────────────────────────────────────────────
    const [activeCaptureSlot, setActiveCaptureSlot] = useState(null); // 'cover' | 'front' | 'side' | null
    const [captureFacingMode, setCaptureFacingMode] = useState("environment");
    const activeStreamRef = useRef(null);

    // ── Gallery / History state ────────────────────────────────────────────
    const [uploadedProducts, setUploadedProducts] = useState([]);
    const [loadingUploaded, setLoadingUploaded] = useState(false);
    const [selectedUploaded, setSelectedUploaded] = useState(null);

    // ── Cleanup on unmount ─────────────────────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            clearTimeout(startTimerRef.current);
            destroyScanner();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Scanner helpers ──────────────────────────────────────────────────────

    const destroyScanner = useCallback(async () => {
        clearTimeout(startTimerRef.current);
        if (html5QrRef.current) {
            try {
                if (html5QrRef.current.isScanning) {
                    await html5QrRef.current.stop();
                }
            } catch (_) { /* always swallow stop errors */ }
            try { html5QrRef.current.clear(); } catch (_) {}
            html5QrRef.current = null;
        }
        if (mountedRef.current) setIsScanning(false);
        isProcessingRef.current = false;
    }, []);

    /**
     * Attempt to enumerate cameras and pick back-facing one.
     * Falls back to `{ facingMode: "environment" }` if enumeration fails.
     */
    const resolveCamera = useCallback(async () => {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length === 0) throw new Error("No cameras found");
            // Prefer environment/back camera by label keyword
            const back = devices.find((d) =>
                /back|rear|environment/i.test(d.label)
            );
            return back ? { deviceId: { exact: back.id } } : { facingMode: "environment" };
        } catch (_) {
            return { facingMode: "environment" };
        }
    }, []);

    // ─── Product search ───────────────────────────────────────────────────────

    const fetchCategoryPath = async (categoryId) => {
        if (!categoryId) return "";
        const path = [];
        let currentId = categoryId;
        // Max depth 10 to prevent infinite loop on bad data
        for (let i = 0; i < 10 && currentId; i++) {
            const { data, error } = await supabase
                .from("categories")
                .select("id, name, parent_id")
                .eq("id", currentId)
                .single();
            if (error || !data) break;
            path.unshift(data.name);
            currentId = data.parent_id;
        }
        return path.join(" > ");
    };

    const resolveCategoryType = (path) => {
        if (!path) return null;
        const lower = path.toLowerCase();
        if (lower.includes("frame")) return "frame";
        if (lower.includes("lens")) return "lens";
        return null;
    };

    const populateForms = (product, catType) => {
        let parsed = {};
        try { parsed = safeJsonParse(product.description); } catch (_) {}

        if (catType === "frame") {
            setFrameForm({
                modelNo: parsed.modelNo || product.frame_model_no || "",
                color: parsed.color || product.frame_color || "",
                sizeA: parsed.sizeA || "",
                sizeB: parsed.sizeB || "",
                dbl: parsed.dbl || "",
                templeLength: parsed.templeLength || "",
                frameShape: parsed.frameShape || product.frame_shape || "",
                frameType: parsed.frameType || product.frame_type || "",
            });
        } else if (catType === "lens") {
            setLensForm({
                lensType: parsed.lensType || "",
                index: parsed.index || "",
                material: parsed.material || "",
                coating: parsed.coating || "",
                sph: parsed.sph || "",
                cyl: parsed.cyl || "",
                axis: parsed.axis || "",
                add: parsed.add || "",
            });
        }
    };

    const searchProduct = useCallback(async (query) => {
        if (!query) return;
        if (!mountedRef.current) return;

        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        setScannerError("");

        try {
            let product = null;

            // 1. Try barcode table first
            const { data: barcodeRow, error: bErr } = await supabase
                .from("pending_product_barcodes")
                .select("pending_product_id")
                .eq("barcode", query)
                .maybeSingle();

            if (bErr) console.warn("[Search] barcode lookup error:", bErr.message);

            if (barcodeRow?.pending_product_id) {
                const { data: prod, error: pErr } = await supabase
                    .from("pending_products")
                    .select("*")
                    .eq("id", barcodeRow.pending_product_id)
                    .eq("status", "pending")
                    .maybeSingle();
                if (pErr) console.warn("[Search] product by barcode id error:", pErr.message);
                product = prod || null;
            }

            // 2. Try SKU direct match
            if (!product) {
                const { data: prod, error: sErr } = await supabase
                    .from("pending_products")
                    .select("*")
                    .eq("sku", query)
                    .eq("status", "pending")
                    .maybeSingle();
                if (sErr) console.warn("[Search] sku lookup error:", sErr.message);
                product = prod || null;
            }

            // 3. Try name/barcode partial match as last resort
            if (!product) {
                const { data: rows, error: nErr } = await supabase
                    .from("pending_products")
                    .select("*")
                    .ilike("sku", `%${query}%`)
                    .eq("status", "pending")
                    .limit(1);
                if (nErr) console.warn("[Search] partial lookup error:", nErr.message);
                product = rows?.[0] || null;
            }

            if (!mountedRef.current) return;

            if (product) {
                const catPath = await fetchCategoryPath(product.category_id);
                const catType = resolveCategoryType(catPath);
                setScannedProduct(product);
                setCategoryPath(catPath);
                setCategoryType(catType);
                populateForms(product, catType);
                setImages({ cover: null, front: null, side: null });
                setStage("details");
            } else {
                isProcessingRef.current = false;
                setErrorMessage(
                    `No pending product found for "${query}". Check the barcode or try manual entry.`
                );
            }
        } catch (err) {
            console.error("[Search] unexpected error:", err);
            if (mountedRef.current) {
                isProcessingRef.current = false;
                setErrorMessage(
                    `Search failed: ${err?.message || "Network error. Check your connection."}`
                );
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── In-App Camera Effects & Handlers ────────────────────────────────────

    useEffect(() => {
        if (!activeCaptureSlot) {
            if (activeStreamRef.current) {
                try {
                    activeStreamRef.current.getTracks().forEach((track) => track.stop());
                } catch (_) {}
                activeStreamRef.current = null;
            }
            return;
        }

        let active = true;
        const startStream = async () => {
            try {
                if (activeStreamRef.current) {
                    try {
                        activeStreamRef.current.getTracks().forEach((track) => track.stop());
                    } catch (_) {}
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: captureFacingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });

                if (!active) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                activeStreamRef.current = stream;
                const videoEl = document.getElementById("in-app-video-preview");
                if (videoEl) {
                    videoEl.srcObject = stream;
                }
            } catch (err) {
                console.error("[InAppCamera] getUserMedia failed:", err);
                setErrorMessage("Failed to access camera for in-app photo capture.");
                setActiveCaptureSlot(null);
            }
        };

        const timer = setTimeout(startStream, 150);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [activeCaptureSlot, captureFacingMode]);

    const startScanner = useCallback(async () => {
        if (!mountedRef.current) return;
        setScannerError("");
        setErrorMessage("");

        // Ensure previous instance is fully cleaned up
        await destroyScanner();

        let retries = 0;
        const tryStart = async () => {
            if (!mountedRef.current) return;
            const el = document.getElementById(SCANNER_CONTAINER_ID);
            if (!el) {
                if (retries < 15) {
                    retries++;
                    startTimerRef.current = setTimeout(tryStart, 100);
                } else {
                    setScannerError("Camera viewport not ready. Please try again.");
                }
                return;
            }

            try {
                const cameraConfig = await resolveCamera();
                const qr = new Html5Qrcode(SCANNER_CONTAINER_ID, {
                    formatsToSupport: BARCODE_FORMATS,
                    verbose: false,
                });
                html5QrRef.current = qr;

                await qr.start(
                    cameraConfig,
                    {
                        fps: 30, // Max frame rate for instant detection
                        aspectRatio: 1.777,
                        disableFlip: false,
                    },
                    (decodedText) => {
                        if (isProcessingRef.current) return;
                        isProcessingRef.current = true;
                        destroyScanner().then(() => {
                            if (mountedRef.current) searchProduct(decodedText.trim());
                        });
                    },
                    (_errorMsg) => {}
                );

                if (mountedRef.current) setIsScanning(true);
            } catch (err) {
                console.error("[Scanner] start failed:", err);
                if (mountedRef.current) {
                    const msg = err?.message || String(err);
                    if (/permission/i.test(msg)) {
                        setScannerError("Camera permission denied. Please allow access and try again.");
                    } else if (/not found|no camera/i.test(msg)) {
                        setScannerError("No camera found on this device.");
                    } else if (/already/i.test(msg)) {
                        setScannerError("");
                        html5QrRef.current = null;
                        setTimeout(() => { if (mountedRef.current) startScanner(); }, 400);
                    } else {
                        setScannerError(`Camera error: ${msg}`);
                    }
                    setIsScanning(false);
                }
            }
        };

        startTimerRef.current = setTimeout(tryStart, 150);
    }, [destroyScanner, resolveCamera, searchProduct]);

    const handleManualSearch = useCallback(
        (e) => {
            if (e) e.preventDefault();
            const q = barcodeQuery.trim();
            if (!q) return;
            destroyScanner().then(() => {
                searchProduct(q);
            });
        },
        [barcodeQuery, destroyScanner, searchProduct]
    );

    // ─── Image handling & compositing ─────────────────────────────────────────

    /**
     * Composites foregroundUrl centered on a square (1:1) white canvas applying scale and rotation.
     */
    const composeImage = useCallback(async (position, foregroundUrl, rotation, scale) => {
        if (!foregroundUrl) return;
        try {
            const img = new Image();
            img.src = foregroundUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement("canvas");
            // Generate a square 1:1 image by using the largest dimension
            const size = Math.max(img.width, img.height);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Fill solid white background
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Apply rotation and scale, centering on the square canvas
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
            const webpBlob = dataURLToBlob(webpDataUrl);

            setImages((prev) => {
                const current = prev[position];
                if (!current) return prev;
                return {
                    ...prev,
                    [position]: {
                        ...current,
                        webpDataUrl,
                        webpBlob,
                        processedSize: webpBlob.size,
                        rotation,
                        scale,
                    },
                };
            });
        } catch (err) {
            console.error("[composeImage] error:", err);
        }
    }, []);

    const processImage = useCallback(async (file, position) => {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const originalSize = file.size;

        try {
            // Initially, we convert directly to WebP and bypass immediate background removal
            const foregroundUrl = await convertToWebP(file);

            if (!foregroundUrl) {
                throw new Error("Failed to load source image");
            }

            // Initial alignment composition (rotation = 0, scale = 1, Square 1:1)
            const img = new Image();
            img.src = foregroundUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement("canvas");
            const size = Math.max(img.width, img.height);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get 2D context");

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, (size - img.width) / 2, (size - img.height) / 2);

            const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
            const webpBlob = dataURLToBlob(webpDataUrl);

            if (mountedRef.current) {
                setImages((prev) => ({
                    ...prev,
                    [position]: {
                        file,
                        foregroundUrl,
                        webpDataUrl,
                        webpBlob,
                        originalSize,
                        processedSize: webpBlob.size,
                        isBgRemoved: false, // background removal is triggered on-demand by button
                        rotation: 0,
                        scale: 1,
                    },
                }));

                const label = position.charAt(0).toUpperCase() + position.slice(1);
                setSuccessMessage(`${label} image uploaded, prepared in 1:1 layout.`);
            }
        } catch (err) {
            console.error("[processImage] failed:", err);
            if (mountedRef.current) {
                setErrorMessage(`Image processing failed: ${err?.message || "Unknown error"}`);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    const handleCaptureSnapshot = useCallback(async () => {
        const videoEl = document.getElementById("in-app-video-preview");
        if (!videoEl || !activeCaptureSlot) return;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = videoEl.videoWidth || 640;
            canvas.height = videoEl.videoHeight || 480;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // Draw current video frame
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            const blob = dataURLToBlob(dataUrl);
            const file = new File([blob], `${activeCaptureSlot}.jpg`, { type: "image/jpeg" });

            // Process file using existing handler
            await processImage(file, activeCaptureSlot);

            // Cleanup stream
            if (activeStreamRef.current) {
                activeStreamRef.current.getTracks().forEach((track) => track.stop());
                activeStreamRef.current = null;
            }
            setActiveCaptureSlot(null);
        } catch (err) {
            console.error("[handleCaptureSnapshot] error:", err);
            setErrorMessage("Failed to capture snapshot.");
        }
    }, [activeCaptureSlot, processImage]);

    const triggerBgRemoval = useCallback(async (position) => {
        const imgData = images[position];
        if (!imgData || !imgData.file) return;

        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        setBgProgress({ message: "Removing background via local server…", percent: 30 });

        try {
            let foregroundUrl = "";

            try {
                const formData = new FormData();
                formData.append("file", imgData.file);

                const res = await fetch("http://localhost:5001/remove-bg", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || `Server returned status code ${res.status}`);
                }

                setBgProgress({ message: "Reading transparent image data…", percent: 70 });

                const cleanBlob = await res.blob();
                foregroundUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(cleanBlob);
                });
            } catch (serverErr) {
                console.error("[BgRemoval] Local server failed, using threshold fallback:", serverErr);
                setBgProgress({ message: "Using fallback method…", percent: 50 });
                foregroundUrl = await thresholdRemoveBg(imgData.file, 215);
            }

            setBgProgress(null);

            if (!foregroundUrl) {
                throw new Error("Background removal failed to yield output.");
            }

            // Update local state foreground source
            setImages((prev) => {
                const current = prev[position];
                if (!current) return prev;
                return {
                    ...prev,
                    [position]: {
                        ...current,
                        foregroundUrl,
                        isBgRemoved: true,
                    },
                };
            });

            // Recompose with new transparent foreground using active rotation & scale
            await composeImage(position, foregroundUrl, imgData.rotation || 0, imgData.scale || 1);
            setSuccessMessage("Background removed and aligned in square 1:1 canvas.");
        } catch (err) {
            console.error("[triggerBgRemoval] failed:", err);
            setErrorMessage(`Background removal failed: ${err.message}`);
        } finally {
            setLoading(false);
            setBgProgress(null);
        }
    }, [images, composeImage]);

    const handleFileChange = useCallback(
        (e, position) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Reset input value so same file can be re-picked after failure
            e.target.value = "";
            processImage(file, position);
        },
        [processImage]
    );

    // ─── Gallery / History fetch ────────────────────────────────────────────

    const fetchUploadedProducts = useCallback(async () => {
        setLoadingUploaded(true);
        setErrorMessage("");
        try {
            const { data, error } = await supabase
                .from("pending_products")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Filter products that contain uploaded imageUrls in their description
            const withImages = (data || []).filter((prod) => {
                try {
                    const parsed = safeJsonParse(prod.description);
                    return (
                        (parsed.imageUrls && Object.keys(parsed.imageUrls).length > 0) ||
                        parsed.coverUrl ||
                        prod.image_url
                    );
                } catch (_) {
                    return false;
                }
            });

            setUploadedProducts(withImages);
        } catch (err) {
            console.error("[fetchUploadedProducts] error:", err);
            setErrorMessage("Failed to load uploaded products list.");
        } finally {
            setLoadingUploaded(false);
        }
    }, []);

    // ─── Sub-menu Navigation Effect & Scanner Re-ignition ───────────────────

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tab = queryParams.get("tab");
        if (tab === "history") {
            setStage("gallery");
            fetchUploadedProducts();
        } else {
            setStage("scan");
            if (!scannedProduct) {
                startScanner();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search, scannedProduct]);

    // ─── Final submission ─────────────────────────────────────────────────────

    const handleFinalConfirm = useCallback(async () => {
        setShowConfirmPopup(false);
        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            if (!scannedProduct) throw new Error("No product selected.");

            let finalDesc = scannedProduct.description || "{}";
            let frameModel = null;
            let frameColor = null;

            if (categoryType === "frame") {
                const uploadedUrls = {};
                let coverUrl = null;

                for (const pos of POSITIONS) {
                    const imgData = images[pos];
                    if (!imgData?.webpBlob) continue;

                    const path = `${scannedProduct.id}/${pos}.webp`;
                    const { error: upErr } = await supabase.storage
                        .from("imagine-uploads")
                        .upload(path, imgData.webpBlob, {
                            cacheControl: "3600",
                            contentType: "image/webp",
                            upsert: true,
                        });
                    if (upErr) throw new Error(`Image upload failed (${pos}): ${upErr.message}`);

                    const { data: urlData } = supabase.storage
                        .from("imagine-uploads")
                        .getPublicUrl(path);

                    uploadedUrls[pos] = urlData.publicUrl;
                    if (pos === "cover") coverUrl = urlData.publicUrl;
                }

                frameModel = frameForm.modelNo;
                frameColor = frameForm.color;

                let existingDesc = {};
                try { existingDesc = safeJsonParse(scannedProduct.description); } catch (_) {}

                finalDesc = JSON.stringify({
                    ...existingDesc,
                    type: "frame",
                    modelNo: frameForm.modelNo,
                    color: frameForm.color,
                    sizeA: frameForm.sizeA,
                    sizeB: frameForm.sizeB,
                    dbl: frameForm.dbl,
                    templeLength: frameForm.templeLength,
                    frameShape: frameForm.frameShape,
                    frameType: frameForm.frameType,
                    imageUrls: uploadedUrls,
                    coverUrl: coverUrl || scannedProduct.image_url || null,
                });
            } else if (categoryType === "lens") {
                finalDesc = JSON.stringify({
                    type: "lens",
                    lensType: lensForm.lensType,
                    index: lensForm.index,
                    material: lensForm.material,
                    coating: lensForm.coating,
                    sph: lensForm.sph,
                    cyl: lensForm.cyl,
                    axis: lensForm.axis,
                    add: lensForm.add,
                });
            }

            const payload = {
                status: "confirmed",
                description: finalDesc,
                confirmed_at: new Date().toISOString(),
            };

            if (categoryType === "frame") {
                payload.frame_model_no = frameModel;
                payload.frame_color = frameColor;

                let existingSpecs = {};
                try { existingSpecs = safeJsonParse(scannedProduct.description || "{}"); } catch (_) {}

                payload.product_name = getComputedProductName(
                    scannedProduct.name,
                    scannedProduct.brand,
                    {
                        color: frameColor,
                        frameType: frameForm.frameType || existingSpecs.frameType || "",
                        frameShape: frameForm.frameShape || existingSpecs.frameShape || "",
                    }
                );
            }

            const { error: updErr } = await supabase
                .from("pending_products")
                .update(payload)
                .eq("id", scannedProduct.id);

            if (updErr) throw new Error(`Database update failed: ${updErr.message}`);

            setSuccessMessage(
                `✓ Product "${scannedProduct.name || scannedProduct.product_name}" confirmed and ingested.`
            );

            // Reset
            setScannedProduct(null);
            setImages({ cover: null, front: null, side: null });
            setBarcodeQuery("");
            setStage("scan");
            navigate("/visualise?tab=scan");
        } catch (err) {
            console.error("[handleFinalConfirm]", err);
            setErrorMessage(err?.message || "Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }, [scannedProduct, categoryType, frameForm, lensForm, images, navigate]);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 pb-28 pt-2 animate-fast-slide">

            {/* Global messages */}
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

            {/* ── STAGE 1: SCAN ───────────────────────────────────────────── */}
            {stage === "scan" && !scannedProduct && (
                <div className="space-y-6 max-w-lg mx-auto">
                    <div className="bg-white rounded-3xl border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="text-center space-y-1.5">
                            <h3 className="text-sm font-black text-black uppercase tracking-wider flex items-center justify-center gap-2">
                                <QrCode size={18} /> Point at Barcode
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Hold barcode within the scanner area
                            </p>
                        </div>

                        {/* Camera viewport */}
                        <div className="relative aspect-video w-full rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden bg-black flex items-center justify-center">
                            {/* Html5Qrcode mounts into this div */}
                            <div id={SCANNER_CONTAINER_ID} className="w-full h-full" />

                            {!isScanning && !loading && (
                                <button
                                    onClick={startScanner}
                                    className="absolute inset-0 bg-black/70 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black/60 transition-all"
                                >
                                    <Camera size={16} /> Start Camera
                                </button>
                            )}
                            {loading && !isScanning && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {scannerError && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-xl px-3 py-2">
                                {scannerError}
                            </div>
                        )}

                        {/* Manual fallback */}
                        <form onSubmit={handleManualSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={barcodeQuery}
                                onChange={(e) => setBarcodeQuery(e.target.value)}
                                placeholder="Or type barcode / SKU manually…"
                                className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-[12px] font-bold text-black outline-none focus:border-black placeholder:text-gray-300"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 bg-black hover:bg-neutral-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                {loading ? "Searching…" : "Search"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── STAGE: GALLERY / HISTORY ─────────────────────────────────── */}
            {stage === "gallery" && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                                🖼️ Upload History
                            </h3>
                            <button
                                onClick={() => navigate("/visualise?tab=scan")}
                                className="text-[10px] font-black uppercase text-gray-500 hover:text-black flex items-center gap-1"
                            >
                                <ChevronLeft size={14} /> Back to Scanner
                            </button>
                        </div>

                        {loadingUploaded ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase text-gray-400">Loading history…</span>
                            </div>
                        ) : uploadedProducts.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-wider">
                                No products found with uploaded images.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {uploadedProducts.map((prod) => {
                                    let coverUrl = null;
                                    let imgCount = 0;
                                    try {
                                        const parsed = safeJsonParse(prod.description);
                                        coverUrl = parsed.coverUrl || parsed.imageUrls?.cover || prod.image_url;
                                        if (parsed.imageUrls) imgCount = Object.keys(parsed.imageUrls).length;
                                    } catch (_) {}

                                    return (
                                        <div
                                            key={prod.id}
                                            onClick={() => setSelectedUploaded(prod)}
                                            className="bg-white border-2 border-gray-150 hover:border-black rounded-2xl p-4 cursor-pointer transition-all duration-150 hover:shadow-md space-y-3"
                                        >
                                            <div className="aspect-square w-full bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                                                {coverUrl ? (
                                                    <img src={coverUrl} alt={prod.product_name} className="max-h-full max-w-full object-contain" />
                                                ) : (
                                                    <span className="text-[10px] text-gray-300 font-bold uppercase">No Image</span>
                                                )}
                                                {imgCount > 0 && (
                                                    <span className="absolute top-2 right-2 bg-black text-[7px] font-black text-white px-1.5 py-0.5 rounded-full">
                                                        {imgCount} views
                                                    </span>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-black text-black uppercase truncate">
                                                    {prod.product_name || prod.name}
                                                </h4>
                                                <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
                                                    <span>SKU: {prod.sku}</span>
                                                    <span>{prod.brand}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Detailed Product viewer popup from Gallery */}
                    {selectedUploaded && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setSelectedUploaded(null)}
                            />
                            <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                                    <div>
                                        <h3 className="text-base font-black text-black uppercase tracking-tight">
                                            {selectedUploaded.product_name || selectedUploaded.name}
                                        </h3>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            SKU: {selectedUploaded.sku} | Brand: {selectedUploaded.brand}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUploaded(null)}
                                        className="text-gray-400 hover:text-black font-black text-xs uppercase"
                                    >
                                        ✕ Close
                                    </button>
                                </div>

                                {/* Images */}
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Uploaded Views</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {(() => {
                                            let parsed = {};
                                            try { parsed = safeJsonParse(selectedUploaded.description); } catch (_) {}
                                            const urls = parsed.imageUrls || {};

                                            return POSITIONS.map((pos) => {
                                                const url = urls[pos] || (pos === "cover" ? selectedUploaded.image_url : null);
                                                return (
                                                    <div key={pos} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col justify-between">
                                                        <span className="text-[8px] font-black text-black uppercase tracking-widest mb-1.5 block text-center">
                                                            {pos} View
                                                        </span>
                                                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                                                            {url ? (
                                                                <img src={url} alt={pos} className="max-h-full max-w-full object-contain" />
                                                            ) : (
                                                                <span className="text-[9px] text-gray-300 font-bold uppercase">Not Uploaded</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Full Specs */}
                                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-xs">
                                    {[
                                        ["Checkpoint", selectedUploaded.checkpoint_name || "Quick Intake"],
                                        ["Base Price", selectedUploaded.base_price ? `Rs. ${selectedUploaded.base_price}` : null],
                                        ["Confirmed At", selectedUploaded.confirmed_at ? new Date(selectedUploaded.confirmed_at).toLocaleString() : null],
                                        ["Status", selectedUploaded.status],
                                    ].map(([label, val]) => (
                                        <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                            <span className="text-[11px] font-black text-black uppercase">{val || "—"}</span>
                                        </div>
                                    ))}

                                    {(() => {
                                        let parsed = {};
                                        try { parsed = safeJsonParse(selectedUploaded.description); } catch (_) {}

                                        if (parsed.type === "frame") {
                                            return (
                                                <>
                                                    {[
                                                        ["Frame Model No", parsed.modelNo || selectedUploaded.frame_model_no],
                                                        ["Colour", parsed.color || selectedUploaded.frame_color],
                                                        ["Frame Shape", parsed.frameShape || selectedUploaded.frame_shape],
                                                        ["Frame Type", parsed.frameType || selectedUploaded.frame_type],
                                                        ["Dimensions (A / B / DBL / Temple)",
                                                            `${parsed.sizeA || "—"} / ${parsed.sizeB || "—"} / ${parsed.dbl || "—"} / ${parsed.templeLength || "—"}`],
                                                    ].map(([label, val]) => (
                                                        <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                                            <span className="text-[11px] font-black text-black uppercase">{val || "—"}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        } else if (parsed.type === "lens") {
                                            return (
                                                <>
                                                    {[
                                                        ["Lens Type", parsed.lensType],
                                                        ["Index", parsed.index],
                                                        ["Material", parsed.material],
                                                        ["Coating", parsed.coating],
                                                        ["SPH", parsed.sph],
                                                        ["CYL", parsed.cyl],
                                                        ["Axis", parsed.axis],
                                                        ["Add", parsed.add],
                                                    ].map(([label, val]) => (
                                                        <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                                            <span className="text-[11px] font-black text-black uppercase">{val || "—"}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── STAGE 2: DETAILS ────────────────────────────────────────── */}
            {stage === "details" && scannedProduct && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        {/* Header row */}
                        <div className="border-b border-gray-100 pb-3 flex flex-wrap justify-between items-center gap-2">
                            <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {scannedProduct.checkpoint_name || "Quick Intake"}
                            </span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                SKU: {scannedProduct.sku}
                            </span>
                        </div>

                        {/* Product name + category */}
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-black uppercase tracking-tight">
                                {scannedProduct.name || scannedProduct.product_name}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                {categoryPath}
                            </p>
                        </div>

                        {/* Core specs grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-100 text-xs">
                            {[
                                ["Brand", scannedProduct.brand],
                                ["Base Price", scannedProduct.base_price ? `Rs. ${scannedProduct.base_price}` : null],
                                ["Created At", scannedProduct.created_at ? new Date(scannedProduct.created_at).toLocaleDateString() : null],
                            ].map(([label, value]) => (
                                <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                    <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                    <span className="text-[11px] font-black text-black uppercase">{value || "—"}</span>
                                </div>
                            ))}
                        </div>

                        {/* Frame-specific specs */}
                        {categoryType === "frame" && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-3">
                                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1">
                                        Frame Dimensions
                                    </h4>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        {[
                                            ["A", frameForm.sizeA],
                                            ["B", frameForm.sizeB],
                                            ["DBL", frameForm.dbl],
                                            ["Temple", frameForm.templeLength],
                                        ].map(([label, val]) => (
                                            <div key={label}>
                                                <span className="text-[7px] font-black text-gray-400 block uppercase">{label}</span>
                                                <span className="text-xs font-black text-black">{val || "—"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        ["Frame Model No", frameForm.modelNo],
                                        ["Colour", frameForm.color],
                                        ["Frame Shape", frameForm.frameShape],
                                        ["Frame Type", frameForm.frameType],
                                    ].map(([label, val]) => (
                                        <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                            <span className="text-[11px] font-black text-black uppercase">{val || "—"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lens-specific specs */}
                        {categoryType === "lens" && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    ["Lens Type", lensForm.lensType],
                                    ["Index", lensForm.index],
                                    ["Material", lensForm.material],
                                    ["Coating", lensForm.coating],
                                    ["SPH", lensForm.sph],
                                    ["CYL", lensForm.cyl],
                                    ["Axis", lensForm.axis],
                                    ["Add", lensForm.add],
                                ].map(([label, val]) => (
                                    <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                                        <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                        <span className="text-[11px] font-black text-black uppercase">{val || "—"}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => { setScannedProduct(null); navigate("/visualise?tab=scan"); }}
                            className="flex-1 py-4 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft size={14} /> Back
                        </button>
                        <button
                            onClick={() => setStage("images")}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all"
                        >
                            Proceed
                        </button>
                    </div>
                </div>
            )}

            {/* ── STAGE 3: IMAGES ─────────────────────────────────────────── */}
            {stage === "images" && scannedProduct && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-black uppercase tracking-widest">Image Acquisition</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Cover image background will be automatically removed. Front &amp; Side get WebP compression.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                            {POSITIONS.map((pos) => {
                                const img = images[pos];
                                const showProgress = pos === "cover" && bgProgress && loading;

                                return (
                                    <div key={pos} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-black uppercase tracking-widest">
                                                {pos} view
                                            </span>
                                            {pos === "cover" && (
                                                <span className="text-[8px] font-black text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    AI BG Remove
                                                </span>
                                            )}
                                        </div>

                                        {showProgress ? (
                                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-50 border-2 border-black flex flex-col items-center justify-center p-4 space-y-2">
                                                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[9px] font-black uppercase text-black tracking-widest text-center">
                                                    {bgProgress.message}
                                                </span>
                                                {bgProgress.percent > 0 && (
                                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-black h-full transition-all duration-300"
                                                            style={{ width: `${bgProgress.percent}%` }}
                                                        />
                                                    </div>
                                                )}
                                                <span className="text-[8px] font-black text-gray-400">
                                                    {bgProgress.percent}%
                                                </span>
                                            </div>
                                        ) : img?.webpDataUrl ? (
                                            <div className="space-y-3">
                                                <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center relative">
                                                    <img src={img.webpDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                                    <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
                                                        <span className="bg-black/70 text-[7px] font-black text-white px-2 py-0.5 rounded uppercase tracking-wider">
                                                            WebP · {formatBytes(img.processedSize)}
                                                        </span>
                                                        {img.originalSize && img.processedSize && (
                                                            <span className="bg-green-700/80 text-[7px] font-black text-white px-2 py-0.5 rounded">
                                                                {Math.round((1 - img.processedSize / img.originalSize) * 100)}% smaller
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Alignment Controls */}
                                                <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 space-y-3 text-left">
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Alignment</span>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <div className="flex justify-between text-[9px] font-bold text-gray-500 mb-0.5">
                                                                <span>Rotation</span>
                                                                <span className="font-mono text-black">{img.rotation || 0}°</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="-180"
                                                                max="180"
                                                                value={img.rotation || 0}
                                                                onChange={(e) => {
                                                                    const rot = Number(e.target.value);
                                                                    composeImage(pos, img.foregroundUrl, rot, img.scale || 1);
                                                                }}
                                                                className="w-full h-1 bg-gray-250 rounded-lg appearance-none cursor-pointer accent-black"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-[9px] font-bold text-gray-500 mb-0.5">
                                                                <span>Scale</span>
                                                                <span className="font-mono text-black">{Math.round((img.scale || 1) * 100)}%</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="0.5"
                                                                max="1.5"
                                                                step="0.05"
                                                                value={img.scale || 1}
                                                                onChange={(e) => {
                                                                    const scl = Number(e.target.value);
                                                                    composeImage(pos, img.foregroundUrl, img.rotation || 0, scl);
                                                                }}
                                                                className="w-full h-1 bg-gray-250 rounded-lg appearance-none cursor-pointer accent-black"
                                                            />
                                                        </div>
                                                    </div>

                                                    {pos === "cover" && !img.isBgRemoved && (
                                                        <button
                                                            type="button"
                                                            disabled={loading}
                                                            onClick={() => triggerBgRemoval("cover")}
                                                            className="w-full mt-2 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                                        >
                                                            <Sparkles size={12} /> Remove BG (1:1 Square)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`aspect-video w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 transition-all gap-2 text-center border-gray-300 ${loading ? "opacity-40 pointer-events-none" : ""}`}>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                                    Acquire {pos} View
                                                </span>
                                                <div className="flex flex-col gap-2 w-full max-w-[160px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCaptureFacingMode("environment");
                                                            setActiveCaptureSlot(pos);
                                                        }}
                                                        className="py-2 px-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                                    >
                                                        <Camera size={11} /> Take Photo (In-App)
                                                    </button>
                                                    <label className="py-2 px-3 border border-gray-300 hover:border-black text-gray-700 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white hover:bg-gray-50">
                                                        <Upload size={11} /> Choose File
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleFileChange(e, pos)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStage("details")}
                            className="flex-1 py-4 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            <ChevronLeft size={14} /> Back
                        </button>
                        <button
                            disabled={loading}
                            onClick={() => {
                                const hasAny = POSITIONS.some((p) => images[p]?.webpBlob);
                                if (!hasAny) {
                                    setErrorMessage("Upload at least one image to proceed.");
                                    return;
                                }
                                setErrorMessage("");
                                setStage("summary");
                            }}
                            className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-neutral-800 transition-all disabled:opacity-50"
                        >
                            {loading ? "Processing…" : "Proceed"}
                        </button>
                    </div>
                </div>
            )}

            {/* ── STAGE 4: SUMMARY ────────────────────────────────────────── */}
            {stage === "summary" && scannedProduct && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-black uppercase tracking-widest">Ingest Summary Review</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Verify all specifications and images before finalising
                            </p>
                        </div>

                        {/* Specs summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-150 text-xs">
                            {[
                                ["Checkpoint", scannedProduct.checkpoint_name || "Quick Intake"],
                                ["Product Name", scannedProduct.name || scannedProduct.product_name],
                                ["SKU", scannedProduct.sku],
                                ["Brand", scannedProduct.brand],
                                ["Base Price", scannedProduct.base_price ? `Rs. ${scannedProduct.base_price}` : null],
                                ["Category", categoryPath],
                                ["Created At", scannedProduct.created_at ? new Date(scannedProduct.created_at).toLocaleString() : null],
                            ].map(([label, val]) => (
                                <div key={label} className="space-y-1">
                                    <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                    <span className="font-black text-black uppercase text-[11px]">{val || "—"}</span>
                                </div>
                            ))}

                            {categoryType === "frame" && (
                                <>
                                    {[
                                        ["Frame Model No", frameForm.modelNo],
                                        ["Colour", frameForm.color],
                                        ["Frame Shape", frameForm.frameShape],
                                        ["Frame Type", frameForm.frameType],
                                        ["Dimensions (A / B / DBL / Temple)",
                                            `${frameForm.sizeA || "—"} / ${frameForm.sizeB || "—"} / ${frameForm.dbl || "—"} / ${frameForm.templeLength || "—"}`],
                                    ].map(([label, val]) => (
                                        <div key={label} className="space-y-1">
                                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                            <span className="font-black text-black uppercase text-[11px]">{val || "—"}</span>
                                        </div>
                                    ))}
                                </>
                            )}

                            {categoryType === "lens" && (
                                <>
                                    {[
                                        ["Lens Type", lensForm.lensType],
                                        ["Index", lensForm.index],
                                        ["Material", lensForm.material],
                                        ["Coating", lensForm.coating],
                                        ["SPH", lensForm.sph],
                                        ["CYL", lensForm.cyl],
                                        ["Axis", lensForm.axis],
                                        ["Add", lensForm.add],
                                    ].map(([label, val]) => (
                                        <div key={label} className="space-y-1">
                                            <span className="text-[8px] font-black text-gray-400 block uppercase tracking-widest">{label}</span>
                                            <span className="font-black text-black uppercase text-[11px]">{val || "—"}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Images summary */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Processed Images</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {POSITIONS.map((pos) => {
                                    const img = images[pos];
                                    if (!img?.webpDataUrl) return null;
                                    return (
                                        <div key={pos} className="bg-white border border-gray-250 p-3 rounded-2xl space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[8px] font-black text-black uppercase tracking-widest">{pos} View</span>
                                                {img.isBgRemoved && (
                                                    <span className="text-[7px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full uppercase">BG Removed</span>
                                                )}
                                            </div>
                                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center relative">
                                                <img src={img.webpDataUrl} alt={pos} className="max-h-full max-w-full object-contain" />
                                                <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
                                                    <span className="bg-black/70 text-[7px] font-black text-white px-2 py-0.5 rounded">
                                                        {formatBytes(img.processedSize)}
                                                    </span>
                                                    {img.originalSize && img.processedSize && (
                                                        <span className="bg-green-700/80 text-[7px] font-black text-white px-2 py-0.5 rounded">
                                                            -{Math.round((1 - img.processedSize / img.originalSize) * 100)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStage("images")}
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

            {/* ── CONFIRM POPUP ────────────────────────────────────────────── */}
            {showConfirmPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowConfirmPopup(false)}
                    />
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
                                onClick={handleFinalConfirm}
                                className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-1.5"
                            >
                                {submitting ? "Confirming…" : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── IN-APP CAMERA CAPTURE OVERLAY ────────────────────────────── */}
            {activeCaptureSlot && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black text-white animate-in fade-in duration-200">
                    {/* Top Bar */}
                    <div className="flex justify-between items-center px-6 py-4 bg-black/90 border-b border-neutral-900 z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                            Capture Mode: {activeCaptureSlot.toUpperCase()} VIEW
                        </span>
                        <button
                            onClick={() => setActiveCaptureSlot(null)}
                            className="text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-white"
                        >
                            ✕ Close
                        </button>
                    </div>

                    {/* Live Video Viewport */}
                    <div className="flex-1 flex items-center justify-center bg-neutral-950 relative overflow-hidden">
                        <video
                            id="in-app-video-preview"
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain max-h-[80vh]"
                        />

                        {/* Centered square guides for lining up frames */}
                        <div className="absolute inset-0 border-[3px] border-dashed border-white/20 pointer-events-none m-8 rounded-2xl flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-dashed border-amber-500/30 rounded-full" />
                        </div>
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="px-6 py-6 bg-black/95 border-t border-neutral-900 flex flex-col items-center gap-4 z-10 pb-8">
                        <div className="flex items-center justify-center gap-8 w-full max-w-xs">
                            {/* Toggle Facing Mode */}
                            <button
                                type="button"
                                onClick={() =>
                                    setCaptureFacingMode((prev) =>
                                        prev === "environment" ? "user" : "environment"
                                    )
                                }
                                className="p-3 bg-neutral-900 hover:bg-neutral-800 rounded-full transition-colors"
                                title="Flip Camera"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                            </button>

                            {/* Shutter Button */}
                            <button
                                type="button"
                                onClick={handleCaptureSnapshot}
                                className="w-16 h-16 bg-white hover:bg-neutral-100 active:scale-95 rounded-full border-4 border-neutral-800 transition-all flex items-center justify-center shadow-lg cursor-pointer"
                                title="Capture Snapshot"
                            >
                                <div className="w-10 h-10 bg-red-600 rounded-full" />
                            </button>

                            {/* Place holder to balance layout */}
                            <div className="w-12 h-12" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
