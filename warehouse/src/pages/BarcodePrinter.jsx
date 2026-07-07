import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Printer, Terminal, Settings, HelpCircle, FolderPlus,
  Usb, Unplug, Zap, AlertTriangle, ExternalLink, SlidersHorizontal, ChevronDown, ChevronUp, Layers
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";
import { usePrintQueue } from "../hooks/usePrintQueue";
import BatchLoader from "../components/printing/BatchLoader";
import PrintQueue from "../components/printing/PrintQueue";

/**
 * BarcodePrinter - TSC TE244 @ 203 DPI
 * Real label: 4.00 in x 1.00 in die-cut (101.6 mm x 25.4 mm)
 * TSPL sent via: WebUSB (primary) -> Local Agent port 9100 (secondary) -> Browser dialog (fallback)
 */

const TSC_USB_VID = 0x0FE6;

const DEFAULT_SETTINGS = {
  widthMm: 101.6,   // 101.6 mm full physical roll width
  heightMm: 15,      // 15 mm height
  gapMm: 20,      // 20 mm sensor gap (tail)
  direction: 1,       // 180 deg rotated mapping coordinates for standard feed orientation
  categoryX: 15,
  categoryY1: 8,
  categoryY2: 42,
  categoryY3: 70,
  categoryY4: 98,
  categoryFont: "1",
  barcodeX: 265,
  barcodeY: 45,
  barcodeHeight: 40,
  barcodeNarrow: 1,
  barcodeTextY: 95,
};

export default function BarcodePrinter({ userProfile }) {
  // -- Core state ------------------------------------------------------------ 
  const [barcodeValue, setBarcodeValue] = useState("1414199999");
  const [brandValue, setBrandValue] = useState("Ray-Ban");
  const [skuValue, setSkuValue] = useState("RB3025");
  const [modelValue, setModelValue] = useState(""); // Model No text input
  const [categoryName, setCategoryName] = useState("Eyeglasses");
  const [priceValue, setPriceValue] = useState("1200");
  const [sizeA, setSizeA] = useState("52");
  const [sizeB, setSizeB] = useState("45");
  const [dbl, setDbl] = useState("18");
  const [templeLength, setTempleLength] = useState("140");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [printingStatus, setPrintingStatus] = useState("IDLE");

  // -- Label / TSPL settings --------------------------------------------------
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const setSetting = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  // -- Batch Loader Drawer ---------------------------------------------------- 
  const [showBatchDrawer, setShowBatchDrawer] = useState(false);

  // -- Print Queue State Hook ------------------------------------------------ 
  const {
    queue,
    addSingleItem,
    updateItemQty,
    updateItemStatus,
    removeItem,
    clearQueue,
    clearCompleted,
    loadBatchFromSupabase,
  } = usePrintQueue();

  const [isPrintingBatch, setIsPrintingBatch] = useState(false);
  const [currentBatchIdx, setCurrentBatchIdx] = useState(-1);

  // -- Console logs ---------------------------------------------------------- 
  const [logs, setLogs] = useState([
    { ts: new Date().toLocaleTimeString(), status: "INFO", msg: "Barcode Printer initialized. TSC TE244 @ 203 DPI." },
    { ts: new Date().toLocaleTimeString(), status: "INFO", msg: "Label: 4.00 in x 1.00 in die-cut (101.6 mm x 25.4 mm)" },
  ]);
  const logsEndRef = useRef(null);
  const addLog = (status, msg) =>
    setLogs((p) => [...p, { ts: new Date().toLocaleTimeString(), status, msg }]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // -- USB state --------------------------------------------------------------
  const [usbStatus, setUsbStatus] = useState("DISCONNECTED");
  const usbDeviceRef = useRef(null);
  const usbEndpointRef = useRef(null);
  const isUsbSupported = "usb" in navigator;

  // -- Local agent ping ------------------------------------------------------ 
  const [agentStatus, setAgentStatus] = useState("UNKNOWN");
  useEffect(() => {
    let active = true, delay = 3000, tid;
    const ping = async () => {
      try {
        const r = await fetch("http://localhost:9100/ping");
        if (active) { setAgentStatus(r.ok ? "ONLINE" : "OFFLINE"); delay = r.ok ? 8000 : Math.min(delay * 2, 30000); }
      } catch { if (active) { setAgentStatus("OFFLINE"); delay = Math.min(delay * 2, 30000); } }
      if (active) tid = setTimeout(ping, delay);
    };
    ping();
    return () => { active = false; clearTimeout(tid); };
  }, []);

  // -- Auto-resolve barcode -> category name, brand, SKU, and model no ----------
  useEffect(() => {
    const resolve = async () => {
      if (!barcodeValue?.trim()) return;
      try {
        const { data: bc } = await supabase.from("product_barcodes").select("product_id").eq("barcode", barcodeValue).maybeSingle();
        const q = bc?.product_id
          ? supabase.from("products").select("id, name, sku, brand, category_id, category:categories(name), description, base_price").eq("id", bc.product_id)
          : supabase.from("products").select("id, name, sku, brand, category_id, category:categories(name), description, base_price").or(`sku.eq.${barcodeValue}`);
        const { data: prod } = await q.maybeSingle();
        if (prod) {
          if (prod.brand) setBrandValue(prod.brand);
          if (prod.sku) setSkuValue(prod.sku);
          if (prod.category?.name) setCategoryName(prod.category.name);
          if (prod.base_price) setPriceValue(prod.base_price.toString());

          try {
            const descObj = JSON.parse(prod.description);
            if (descObj) {
              if (descObj.modelNo) setModelValue(descObj.modelNo);
              if (descObj.sizeA) setSizeA(descObj.sizeA.toString());
              if (descObj.sizeB) setSizeB(descObj.sizeB.toString());
              if (descObj.dbl) setDbl(descObj.dbl.toString());
              if (descObj.templeLength) setTempleLength(descObj.templeLength.toString());
            }
          } catch (e) { }

          addLog("INFO", `Resolved "${barcodeValue}" -> "${prod.category?.name || "Uncategorized"}" (${prod.brand || "No Brand"})`);
        }
      } catch (e) { console.error(e); }
    };
    const t = setTimeout(resolve, 400); return () => clearTimeout(t);
  }, [barcodeValue]);

  // -- Add Current Item to Queue ----------------------------------------------
  const handleAddToQueue = () => {
    if (!barcodeValue?.trim()) return;
    addSingleItem({
      id: Math.random().toString(36).substring(7),
      barcodeValue,
      brandValue,
      modelValue,
      skuValue,
      categoryName,
      priceValue,
      sizeA,
      sizeB,
      dbl,
      templeLength,
      quantity: printQuantity,
      status: "pending",
      addedAt: new Date().toISOString(),
    });
    addLog("INFO", `Added "${barcodeValue}" to queue (${printQuantity}x).`);
  };

  // -- TSPL GENERATION -------------------------------------------------------- 
  // Label: 101.6 mm x 15.4 mm = 812 x 123 dots at 203 DPI
  //
  // -- TAIL ACCOUNTING (EMPIRICALLY VERIFIED) ---------------------------------- 
  // Dumbbell/jewelry tag - tail (~20mm = 160 dots) is on the PHYSICAL RIGHT.
  // In DIRECTION 1,0: LOW X = physical RIGHT side, HIGH X = physical LEFT side.
  //   X=0   -> physical RIGHT (tail tip - DO NOT PLACE CONTENT HERE)
  //   X=160  -> start of wide body (tail-body junction)
  //   X=812  -> physical LEFT (far end of wide body)
  //
  // EMPIRICALLY CONFIRMED from print output (matching user's original snippet):
  //   BARCODE 180 = physical RIGHT area of wide body (near tail edge) OK
  //   TEXT 500    = physical LEFT area of wide body OK
  //
  // SAFE WIDE-BODY PRINTABLE ZONE: X=172-800, Y=8-115
  //
  // LAYOUT (left->right physically = high->low X in coordinates):
  //   PHYSICAL LEFT  (text info):   X = 470-800  [330 dots / 41mm]
  //   PHYSICAL RIGHT (spec+barcode): X = 172-460  [288 dots / 36mm]
  //   TAIL ZONE (avoid):            X = 0-165
  //
  // Y BUDGET (height=15.4mm=123 dots, Y=8-120 usable):
  const buildItemTspl = (category, brand, model, sku, val, qty, price, sizeAVal, sizeBVal, dblVal, templeLengthVal) => {
    const truncatedCategory = (category || "").slice(0, 8); // Truncate category to 8 chars to guarantee zero overlap
    const cmds = [
      `SIZE 101.6 mm, 15 mm`,
      `GAP 20 mm, 0 mm`,
      `DIRECTION 1,0`, // Keeps the text printing right-side up
      `CLS`,
      `REFERENCE 0,0`,

      // ── LEFT FLAP (Shifted down by 10% for vertical centering) ────────
      `TEXT 110,27,"3",0,1,1,"${brand || ""}"`,
      `TEXT 80,67,"3",0,1,1,"${truncatedCategory}"`,
      `TEXT 180,67,"3",0,1,1,"SKU:${sku || ""}"`,
      `TEXT 80,102,"3",0,1,1,"Rs.${price || ""}"`,
      `TEXT 180,102,"3",0,1,1,"M:${model || ""}"`,

      // ── RIGHT FLAP (Specs shifted down by 10%) ────────
      `TEXT 340,30,"3",0,1,1,"A"`,
      `TEXT 370,30,"3",0,1,1,"B"`,
      `TEXT 400,30,"3",0,1,1,"DBL"`,
      `TEXT 445,30,"3",0,1,1,"Tem"`,

      `TEXT 340,46,"3",0,1,1,"${sizeAVal || ""}"`,
      `TEXT 370,46,"3",0,1,1,"${sizeBVal || ""}"`,
      `TEXT 400,46,"3",0,1,1,"${dblVal || ""}"`,
      `TEXT 445,46,"3",0,1,1,"${templeLengthVal || ""}"`,

      // Barcode decreased in height to 32, shifted right to X=350, and down by 5% to Y=62
      `BARCODE 350,62,"128",32,0,0,1,1,"${val}"`,
      // Barcode number centered under barcode at Y=100
      `TEXT 350,100,"3",0,1,1,"${val}"`,

      // ── TAIL ZONE (X = 440 to 812) ────────
      // Untouched and blank

      `PRINT ${qty},1`
    ];
    return cmds.join("\r\n");
  };

  const generateTsplCode = () => {
    return buildItemTspl(
      categoryName,
      brandValue,
      modelValue,
      skuValue,
      barcodeValue,
      printQuantity,
      priceValue,
      sizeA,
      sizeB,
      dbl,
      templeLength
    );
  };
  const tsplOutput = generateTsplCode();

  // -- WebUSB connect ----------------------------------------------------------
  const connectUSB = async () => {
    if (!isUsbSupported) { addLog("ERROR", "WebUSB requires Chrome or Edge."); return; }
    setUsbStatus("CONNECTING");
    addLog("INFO", "Requesting USB device... select TSC TE244 in the picker.");
    let device;
    try {
      device = await navigator.usb.requestDevice({ filters: [{ vendorId: TSC_USB_VID }] });
    } catch (err) {
      if (err.name === "NotFoundError") {
        try { device = await navigator.usb.requestDevice({ filters: [] }); }
        catch (e2) { addLog("INFO", e2.name === "NotFoundError" ? "Picker cancelled." : `Error: ${e2.message}`); setUsbStatus("DISCONNECTED"); return; }
      } else { addLog("ERROR", `Picker error: ${err.message}`); setUsbStatus("DISCONNECTED"); return; }
    }
    try { await device.open(); } catch (err) {
      if (err.name === "SecurityError" || err.message.includes("Access denied")) {
        setUsbStatus("DRIVER_BLOCKED");
        addLog("ERROR", "Windows driver blocking USB. Swap to WinUSB via Zadig (see instructions below).");
      } else { setUsbStatus("ERROR"); addLog("ERROR", `Open failed: ${err.message}`); }
      return;
    }
    if (device.configuration === null) await device.selectConfiguration(1).catch(() => { });
    let targetIface = null, bulkOut = null;
    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        const ep = alt.endpoints.find((e) => e.direction === "out" && e.type === "bulk");
        if (ep) { targetIface = iface.interfaceNumber; bulkOut = ep.endpointNumber; break; }
      }
      if (bulkOut !== null) break;
    }
    if (bulkOut === null) { targetIface = 0; bulkOut = 1; addLog("WARNING", "Defaulting to interface 0, endpoint 1."); }
    try { await device.claimInterface(targetIface); }
    catch (err) { setUsbStatus("ERROR"); addLog("ERROR", `Claim interface failed: ${err.message}`); await device.close().catch(() => { }); return; }
    usbDeviceRef.current = device; usbEndpointRef.current = bulkOut;
    setUsbStatus("CONNECTED");
    addLog("SUCCESS", `USB connected - interface ${targetIface}, endpoint #${bulkOut}.`);
  };

  const disconnectUSB = async () => {
    try { if (usbDeviceRef.current) await usbDeviceRef.current.close(); } catch (_) { }
    usbDeviceRef.current = null; usbEndpointRef.current = null;
    setUsbStatus("DISCONNECTED"); addLog("INFO", "USB disconnected.");
  };

  useEffect(() => () => { if (usbDeviceRef.current) usbDeviceRef.current.close().catch(() => { }); }, []);

  // -- Print via USB ---------------------------------------------------------- 
  const handleUsbPrint = async () => {
    if (usbStatus !== "CONNECTED") { addLog("ERROR", "USB printer not connected."); return; }
    setPrintingStatus("SENDING..."); addLog("PENDING", `Spooling ${printQuantity} label(s) via USB...`);
    try {
      const data = new TextEncoder().encode(generateTsplCode() + "\r\n");
      const result = await usbDeviceRef.current.transferOut(usbEndpointRef.current, data);
      if (result.status === "ok") { setPrintingStatus("SUCCESS: USB"); addLog("SUCCESS", `USB: ${result.bytesWritten} bytes sent.`); }
      else throw new Error(`Transfer status: ${result.status}`);
    } catch (err) { setPrintingStatus("ERROR"); addLog("ERROR", `USB print: ${err.message}`); }
  };

  // -- Print via local agent -------------------------------------------------- 
  const handleAgentPrint = async () => {
    if (agentStatus !== "ONLINE") { addLog("ERROR", "Local agent offline. Run: node scripts/local-print-agent.js"); return; }
    setPrintingStatus("SENDING..."); addLog("PENDING", `Dispatching ${printQuantity} label(s) via agent...`);
    try {
      const res = await fetch("http://localhost:9100/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTspl: generateTsplCode() }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setPrintingStatus("SUCCESS: Agent"); addLog("SUCCESS", `Agent: ${json.message || "spooled."}`); }
      else throw new Error(json.error || `HTTP ${res.status}`);
    } catch (err) { setPrintingStatus("ERROR"); addLog("ERROR", `Agent: ${err.message}`); }
  };

  // -- Batch Printing Dispatcher (Sequential with Delay) --------------------
  const handlePrintBatch = async () => {
    const pendingItems = queue.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      alert("No pending items in the queue to print.");
      return;
    }

    let mode = "";
    if (usbStatus === "CONNECTED") mode = "USB";
    else if (agentStatus === "ONLINE") mode = "AGENT";
    else {
      alert("No active printer connection. Please connect via USB or Local Agent first.");
      return;
    }

    setIsPrintingBatch(true);
    addLog("PENDING", `Starting batch print queue (${pendingItems.length} items) via ${mode}...`);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "pending") continue;

      setCurrentBatchIdx(i);
      updateItemStatus(item.id, "printing");
      addLog("INFO", `[Batch] Printing item ${i + 1}/${queue.length}: ${item.barcodeValue}`);

      const tspl = buildItemTspl(
        item.categoryName || "",
        item.brandValue || "",
        item.modelValue || "",
        item.skuValue || "",
        item.barcodeValue,
        item.quantity,
        item.priceValue || "",
        item.sizeA || "",
        item.sizeB || "",
        item.dbl || "",
        item.templeLength || ""
      );

      try {
        if (mode === "USB") {
          const data = new TextEncoder().encode(tspl + "\r\n");
          const result = await usbDeviceRef.current.transferOut(usbEndpointRef.current, data);
          if (result.status !== "ok") throw new Error(`USB status: ${result.status}`);
        } else {
          const res = await fetch("http://localhost:9100/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawTspl: tspl }),
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) throw new Error(`Agent returned HTTP ${res.status}`);
        }

        updateItemStatus(item.id, "done");
        addLog("SUCCESS", `[Batch] Printed: ${item.barcodeValue}`);
      } catch (err) {
        updateItemStatus(item.id, "error");
        addLog("ERROR", `[Batch] Failed to print ${item.barcodeValue}: ${err.message}`);
      }
    }

    setIsPrintingBatch(false);
    setCurrentBatchIdx(-1);
    addLog("SUCCESS", "Batch print session completed.");
  };

  // -- Browser print fallback --------------------------------------------------
  const handleBrowserPrint = () => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:absolute;width:0;height:0;border:none;";
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      const svgEl = document.getElementById("preview-label-svg");
      doc.write(`<html><head><title>Label</title><style>
        @media print{@page{size:${settings.widthMm}mm ${settings.heightMm}mm;margin:0;}body{margin:0;-webkit-print-color-adjust:exact;}}
        body{margin:0;width:${settings.widthMm}mm;height:${settings.heightMm}mm;display:flex;align-items:center;justify-content:center;}
        svg{width:${settings.widthMm}mm;height:${settings.heightMm}mm;}
      </style></head><body>${svgEl ? svgEl.outerHTML : ""}
      <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.frameElement.remove();},100);},300);};<\/script>
      </body></html>`);
      doc.close();
      setPrintingStatus("Dialog"); addLog("SUCCESS", "Browser print dialog opened.");
    } catch (err) { addLog("ERROR", `Browser: ${err.message}`); }
  };

  // -- SVG barcode bars (mock) ------------------------------------------------ 
  const renderMockBars = (startX, barAreaWidth, startY = 8, barHeight = 56) => {
    const lines = []; let x = startX;
    const seed = barcodeValue || "1414199999";
    for (let i = 0; i < seed.length * 4; i++) {
      const c = seed.charCodeAt(i % seed.length);
      const w = Math.max(1, (c % 3) + 1);
      if (x + w > startX + barAreaWidth) break;
      lines.push(<rect key={i} x={x} y={startY} width={w} height={barHeight} fill="#111" />);
      x += w + ((c + i) % 3) + 1;
    }
    return lines;
  };

  // Preview SVG dimensions (4:1 ratio, scaled for display)
  const SVG_W = 400, SVG_H = 100;
  const isUsbConnected = usbStatus === "CONNECTED";
  const isDriverBlocked = usbStatus === "DRIVER_BLOCKED";

  // -- Settings input helper -------------------------------------------------- 
  const SettingRow = ({ label, settingKey, type = "number", min, max, step = 1, options }) => (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex-1">{label}</label>
      {options ? (
        <select value={settings[settingKey]} onChange={(e) => setSetting(settingKey, e.target.value)}
          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} min={min} max={max} step={step} value={settings[settingKey]}
          onChange={(e) => setSetting(settingKey, type === "number" ? parseFloat(e.target.value) : e.target.value)}
          className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white text-right" />
      )}
    </div>
  );

  return (
    <div className="w-full space-y-4 p-2 sm:p-4">

      {/* -- Status Bar -- */}
      <div className="flex flex-wrap items-center gap-2">
        {/* USB */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isUsbConnected ? "bg-green-500 animate-pulse" : usbStatus === "CONNECTING" ? "bg-yellow-400 animate-pulse" : isDriverBlocked ? "bg-orange-500" : "bg-gray-300"}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">USB: {isUsbConnected ? "CONNECTED" : usbStatus}</span>
        </div>
        {/* Agent */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${agentStatus === "ONLINE" ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Agent: {agentStatus}</span>
        </div>
        {/* Checkpoint Loader Button */}
        <button
          onClick={() => setShowBatchDrawer(true)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <Layers className="w-3.5 h-3.5 text-black" />
          Ingestion Checkpoints
        </button>
        {/* Label size badge */}
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
            {settings.widthMm}mm x {settings.heightMm}mm
          </span>
        </div>
      </div>

      {/* -- Zadig Warning -- */}
      {isDriverBlocked && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-orange-800">
            <AlertTriangle className="w-4 h-4" /> Driver is blocked, swap to WinUSB
          </div>
        </div>
      )}

      {/* -- Main Grid -- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ==== Left Panel: Tag Config & Connections ==== */}
        <div className="lg:col-span-4 space-y-4">

          {/* Card 1: Tag Properties */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> Tag Properties
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Barcode Value</label>
                <input type="text" value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                  placeholder="1414199999"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Brand</label>
                <input type="text" value={brandValue}
                  onChange={(e) => setBrandValue(e.target.value)}
                  placeholder="e.g. Ray-Ban"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Alphanumeric Code / SKU</label>
                <input type="text" value={skuValue}
                  onChange={(e) => setSkuValue(e.target.value)}
                  placeholder="e.g. RB3025"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Model No</label>
                <input type="text" value={modelValue}
                  onChange={(e) => setModelValue(e.target.value)}
                  placeholder="e.g. RB3025"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                <input type="text" value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Eyeglasses"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Price (Rs.)</label>
                <input type="text" value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder="e.g. 1200"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">A</label>
                  <input type="text" value={sizeA}
                    onChange={(e) => setSizeA(e.target.value)}
                    placeholder="52"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-center text-xs focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">B</label>
                  <input type="text" value={sizeB}
                    onChange={(e) => setSizeB(e.target.value)}
                    placeholder="45"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-center text-xs focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">DBL</label>
                  <input type="text" value={dbl}
                    onChange={(e) => setDbl(e.target.value)}
                    placeholder="18"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-center text-xs focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tem</label>
                  <input type="text" value={templeLength}
                    onChange={(e) => setTempleLength(e.target.value)}
                    placeholder="140"
                    className="w-full border border-gray-200 rounded-xl px-2 py-2 text-center text-xs focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                <input type="number" min="1" max="100" value={printQuantity}
                  onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleAddToQueue}
                disabled={!barcodeValue?.trim()}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                Add to Print Queue
              </button>
            </div>
          </div>

          {/* Card 2: Hardware Printer Control */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Printer className="w-3.5 h-3.5" /> Hardware Connection
            </h2>

            <div className="space-y-2">
              {/* USB Action button */}
              {isUsbConnected ? (
                <button
                  onClick={disconnectUSB}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-bold py-3 rounded-xl text-xs transition-all active:scale-95"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect USB Printer
                </button>
              ) : (
                <button
                  onClick={connectUSB}
                  disabled={!isUsbSupported || printingStatus.includes("SENDING")}
                  className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  <Usb className="w-3.5 h-3.5" />
                  Connect USB Printer First
                </button>
              )}

              {/* Agent Print Button */}
              <button
                onClick={handleAgentPrint}
                disabled={agentStatus !== "ONLINE" || printingStatus.includes("SENDING")}
                className={`w-full flex items-center justify-center gap-2 border font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 ${agentStatus === "ONLINE"
                  ? "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                  : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
              >
                <Settings className="w-3.5 h-3.5" />
                {agentStatus === "ONLINE"
                  ? "Print Single via Local Agent"
                  : "Agent Offline - run local-print-agent.js"}
              </button>

              {/* Fallback Dialog */}
              <button
                onClick={handleBrowserPrint}
                className="w-full flex items-center justify-center gap-2 border border-gray-100 text-gray-500 font-bold py-2 rounded-xl text-[10px] hover:bg-gray-50 transition-all active:scale-95"
              >
                <Printer className="w-3 h-3" />
                Browser Dialog (Fallback)
              </button>
            </div>
          </div>

          {/* -- Custom Settings Panel -- */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <button onClick={() => setShowSettings((s) => !s)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-all">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" /> Custom TSPL Settings
              </span>
              {showSettings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showSettings && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                {/* Label Size */}
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-4 mb-2">Label Size</p>
                  <div className="space-y-2">
                    <SettingRow label="Width (mm)" settingKey="widthMm" min={20} max={200} step={0.1} />
                    <SettingRow label="Height (mm)" settingKey="heightMm" min={10} max={200} step={0.1} />
                    <SettingRow label="Gap (mm)" settingKey="gapMm" min={0} max={20} step={0.5} />
                    <SettingRow label="Direction" settingKey="direction"
                      options={[{ value: 0, label: "0 - Normal" }, { value: 1, label: "1 - Rotate 180 deg" }]} />
                  </div>
                </div>

                {/* Category Text */}
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Text</p>
                  <div className="space-y-2">
                    <SettingRow label="X offset (dots)" settingKey="categoryX" min={0} max={800} />
                    <SettingRow label="Y - brand (dots)" settingKey="categoryY1" min={0} max={200} />
                    <SettingRow label="Y - category (dots)" settingKey="categoryY2" min={0} max={200} />
                    <SettingRow label="Y - SKU (dots)" settingKey="categoryY3" min={0} max={200} />
                    <SettingRow label="Font size" settingKey="categoryFont"
                      options={[
                        { value: "1", label: "1 - Tiny" },
                        { value: "2", label: "2 - Small" },
                        { value: "3", label: "3 - Medium" },
                        { value: "4", label: "4 - Large" },
                      ]} />
                  </div>
                </div>

                {/* Barcode */}
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Barcode</p>
                  <div className="space-y-2">
                    <SettingRow label="X position (dots)" settingKey="barcodeX" min={0} max={800} />
                    <SettingRow label="Y position (dots)" settingKey="barcodeY" min={0} max={180} />
                    <SettingRow label="Bar height (dots)" settingKey="barcodeHeight" min={20} max={200} />
                    <SettingRow label="Narrow bar (dots)" settingKey="barcodeNarrow" min={1} max={4} />
                    <SettingRow label="Text Y position (dots)" settingKey="barcodeTextY" min={0} max={180} />
                  </div>
                </div>

                {/* Reset */}
                <button onClick={() => setSettings(DEFAULT_SETTINGS)}
                  className="w-full text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 py-2 border border-red-100 rounded-xl hover:bg-red-50 transition-all">
                  Reset to Defaults
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ==== Right Panel: Preview + Queue + Logs ==== */}
        <div className="lg:col-span-8 space-y-4">

          {/* -- Label Preview -- */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Live Label Preview - {settings.widthMm}mm x {settings.heightMm}mm (Jewelry/Dumbbell Tag)
            </h2>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[120px]">
              <svg
                id="preview-label-svg"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-auto shadow border border-gray-100"
                style={{ maxHeight: 140 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background: actual physical flat-edged jewelry dumbbell tag shape with a tail */}
                <path
                  d="M 10,15 H 310 A 10,10 0 0,1 320,25 V 42 H 390 A 8,8 0 0,1 390,58 H 320 V 75 A 10,10 0 0,1 310,85 H 10 A 10,10 0 0,1 0,75 V 25 A 10,10 0 0,1 10,15 Z"
                  fill="white" stroke="#e5e7eb" strokeWidth="1.5"
                />

                {/* Left Flap: Brand Name (Centered at X = 65 dots -> SVG X = 47) */}
                <text
                  x={Math.round((65 / 440) * 320)}
                  y={32}
                  fontFamily="'Inter', sans-serif" fontWeight="800"
                  fontSize={8}
                  fill="#111"
                  textAnchor="middle"
                >
                  {brandValue || "No Brand"}
                </text>

                {/* Left Flap: Category (Left-aligned at X = 15 dots -> SVG X = 11) */}
                <text
                  x={Math.round((15 / 440) * 320)}
                  y={54}
                  fontFamily="'Inter', sans-serif" fontWeight="700"
                  fontSize={6}
                  fill="#555"
                >
                  {categoryName || "Uncategorized"}
                </text>

                {/* Left Flap: SKU (Right-aligned at X = 130 dots -> SVG X = 95) */}
                <text
                  x={Math.round((130 / 440) * 320)}
                  y={54}
                  fontFamily="monospace" fontWeight="700"
                  fontSize={6}
                  fill="#444"
                >
                  SKU:{skuValue || ""}
                </text>

                {/* Left Flap: Price (Left-aligned at X = 15 dots -> SVG X = 11) */}
                <text
                  x={Math.round((15 / 440) * 320)}
                  y={74}
                  fontFamily="'Inter', sans-serif" fontWeight="700"
                  fontSize={6}
                  fill="#444"
                >
                  price:Rs.{priceValue || ""}
                </text>

                {/* Left Flap: Model No (Right-aligned at X = 130 dots -> SVG X = 95) */}
                <text
                  x={Math.round((130 / 440) * 320)}
                  y={74}
                  fontFamily="monospace" fontWeight="700"
                  fontSize={6}
                  fill="#444"
                >
                  M:{modelValue || ""}
                </text>

                {/* Right Flap: Spec Headers & Values (Evenly spaced columns starting at X=240 dots) */}
                <text x={Math.round((240 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">A</text>
                <text x={Math.round((240 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{sizeA || ""}</text>

                <text x={Math.round((290 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">B</text>
                <text x={Math.round((290 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{sizeB || ""}</text>

                <text x={Math.round((340 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">DBL</text>
                <text x={Math.round((340 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{dbl || ""}</text>

                <text x={Math.round((390 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">Tem</text>
                <text x={Math.round((390 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{templeLength || ""}</text>

                {/* Right Flap: Barcode (Centered in the right flap zone, Y=48 to 74) */}
                {renderMockBars(Math.round((230 / 440) * 320), Math.round((200 / 440) * 320), 48, 26)}

                {/* Right Flap: Barcode number (Y = 82) */}
                <text
                  x={Math.round((270 / 440) * 320)}
                  y={82}
                  fontFamily="monospace" fontSize="6" fill="#333" textAnchor="middle"
                >
                  {barcodeValue}
                </text>
              </svg>
            </div>
          </div>

          {/* -- Active Review Queue Table -- */}
          <PrintQueue
            queue={queue}
            onUpdateQty={updateItemQty}
            onRemove={removeItem}
            onClear={clearQueue}
            onClearCompleted={clearCompleted}
            onPrintBatch={handlePrintBatch}
            isPrinting={isPrintingBatch}
            currentIndex={currentBatchIdx}
            activeMode={usbStatus === "CONNECTED" ? "usb" : "agent"}
          />

          {/* -- TSPL Payload Preview -- */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Generated Single Label TSPL
            </h3>
            <pre className="bg-gray-50 rounded-xl p-4 text-[11px] font-mono text-gray-700 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {tsplOutput}
            </pre>
          </div>

          {/* -- Console Spooler Logs -- */}
          <div className="bg-black text-white border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Spooler Log
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${printingStatus === "IDLE" ? "bg-neutral-500" : printingStatus.includes("SENDING") ? "bg-amber-500 animate-pulse" : printingStatus.includes("SUCCESS") ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">{printingStatus}</span>
              </div>
            </div>
            <div className="p-4 font-mono text-xs space-y-1 max-h-[180px] overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-neutral-500 flex-shrink-0">[{log.ts}]</span>
                  <span className={`flex-shrink-0 font-bold ${log.status === "INFO" ? "text-blue-400" :
                    log.status === "PENDING" ? "text-amber-400" :
                      log.status === "SUCCESS" ? "text-green-400" :
                        log.status === "WARNING" ? "text-yellow-400" :
                          log.status === "DIAGNOSTIC" ? "text-orange-400" : "text-red-400"
                    }`}>{log.status}:</span>
                  <span className="text-neutral-300">{log.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* -- Drawer: Ingestion Checkpoint Loader -- */}
      <SlideDrawer
        isOpen={showBatchDrawer}
        onClose={() => setShowBatchDrawer(false)}
        title="Checkpoints Batch Loader"
        subtitle="Load products generated in Product Intake sessions"
      >
        <BatchLoader
          isOpen={showBatchDrawer}
          onClose={() => setShowBatchDrawer(false)}
          categoryPaths={{}}
          onLoadBatch={async (checkpointName) => {
            const count = await loadBatchFromSupabase(checkpointName, {});
            addLog("SUCCESS", `Loaded ${count} items from checkpoint "${checkpointName}" into the queue.`);
            setShowBatchDrawer(false);
          }}
        />
      </SlideDrawer>
    </div>
  );
}
