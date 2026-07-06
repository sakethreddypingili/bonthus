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
 * BarcodePrinter — TSC TE244 @ 203 DPI
 * Real label: 4.00 in × 1.00 in die-cut (101.6 mm × 25.4 mm)
 * TSPL sent via: WebUSB (primary) → Local Agent port 9100 (secondary) → Browser dialog (fallback)
 */

const TSC_USB_VID = 0x0FE6;

const DEFAULT_SETTINGS = {
  widthMm:       101.6,   // 4.00 inches
  heightMm:       25.4,   // 1.00 inch
  gapMm:           3,     // gap between labels
  direction:        1,    // 0=normal, 1=rotated 180°
  categoryX:       50,    // Shifted right (from 30) to prevent left clipping
  categoryY1:      60,    // root category Y
  categoryY2:     130,    // sub-category Y
  categoryFont:   "2",    // TSPL font
  barcodeX:       300,    // Shifted left (from 450) to keep inside the wide rectangular body
  barcodeY:        45,    // Vertically centered to prevent bottom clipping
  barcodeHeight:   70,    // Reduced height (from 90) to fit comfortably
  barcodeNarrow:    1,    // Denser barcode width
};

export default function BarcodePrinter({ userProfile }) {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [barcodeValue, setBarcodeValue]   = useState("1414199999");
  const [categories, setCategories]       = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [categoryName, setCategoryName]   = useState("Scanning...");
  const [printingStatus, setPrintingStatus] = useState("IDLE");

  // ── Label / TSPL settings ──────────────────────────────────────────────────
  const [settings, setSettings]       = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const setSetting = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  // ── Category drawer ────────────────────────────────────────────────────────
  const [showCatDrawer, setShowCatDrawer] = useState(false);
  const [newCat, setNewCat]               = useState({ name: "", description: "", parent_id: "" });
  const [creatingCat, setCreatingCat]     = useState(false);

  // ── Batch Loader Drawer ─────────────────────────────────────────────────────
  const [showBatchDrawer, setShowBatchDrawer] = useState(false);

  // ── Print Queue State Hook ─────────────────────────────────────────────────
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

  // ── Console logs ───────────────────────────────────────────────────────────
  const [logs, setLogs] = useState([
    { ts: new Date().toLocaleTimeString(), status: "INFO", msg: "Barcode Printer initialized. TSC TE244 @ 203 DPI." },
    { ts: new Date().toLocaleTimeString(), status: "INFO", msg: "Label: 4.00 in × 1.00 in die-cut (101.6 mm × 25.4 mm)" },
  ]);
  const logsEndRef = useRef(null);
  const addLog = (status, msg) =>
    setLogs((p) => [...p, { ts: new Date().toLocaleTimeString(), status, msg }]);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // ── USB state ──────────────────────────────────────────────────────────────
  const [usbStatus, setUsbStatus] = useState("DISCONNECTED");
  const usbDeviceRef   = useRef(null);
  const usbEndpointRef = useRef(null);
  const isUsbSupported = "usb" in navigator;

  // ── Local agent ping ───────────────────────────────────────────────────────
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

  // ── Fetch categories ────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories(data || []);
  };
  useEffect(() => { fetchCategories(); }, []);

  const categoryPaths = useMemo(() => {
    const map = {}; categories.forEach((c) => { map[c.id] = c; });
    const paths = {};
    const getPath = (id) => {
      if (paths[id]) return paths[id];
      const cat = map[id]; if (!cat) return "";
      if (!cat.parent_id) { paths[id] = cat.name; return cat.name; }
      const p = getPath(cat.parent_id);
      paths[id] = p ? `${p} > ${cat.name}` : cat.name;
      return paths[id];
    };
    categories.forEach((c) => getPath(c.id));
    return paths;
  }, [categories]);

  // ── Auto-resolve barcode → category ────────────────────────────────────────
  useEffect(() => {
    const resolve = async () => {
      if (!barcodeValue?.trim()) { setCategoryName("No Barcode"); return; }
      try {
        const { data: bc } = await supabase.from("product_barcodes").select("product_id").eq("barcode", barcodeValue).maybeSingle();
        const q = bc?.product_id
          ? supabase.from("products").select("id, name, category_id, category:categories(name)").eq("id", bc.product_id)
          : supabase.from("products").select("id, name, category_id, category:categories(name)").or(`sku.eq.${barcodeValue},upc.eq.${barcodeValue}`);
        const { data: prod } = await q.maybeSingle();
        if (prod?.category_id) { setSelectedCategoryId(prod.category_id); addLog("INFO", `Resolved "${barcodeValue}" → "${prod.category?.name}"`); }
      } catch (e) { console.error(e); }
    };
    const t = setTimeout(resolve, 400); return () => clearTimeout(t);
  }, [barcodeValue]);

  useEffect(() => {
    setCategoryName(selectedCategoryId ? (categoryPaths[selectedCategoryId] || "Uncategorized") : "Uncategorized");
  }, [selectedCategoryId, categoryPaths]);

  const pathParts = useMemo(() => {
    const parts = categoryName.split(" > ");
    return { root: parts[0] || "", sub: parts.slice(1).join(" > ") || "" };
  }, [categoryName]);

  // ── Create category ─────────────────────────────────────────────────────────
  const handleCreateCategory = async (e) => {
    e.preventDefault(); setCreatingCat(true);
    try {
      const { data, error } = await supabase.from("categories")
        .insert([{ name: newCat.name, description: newCat.description, parent_id: newCat.parent_id || null }])
        .select().single();
      if (error) throw error;
      addLog("SUCCESS", `Created category "${newCat.name}"`);
      await fetchCategories(); setSelectedCategoryId(data.id);
      setShowCatDrawer(false); setNewCat({ name: "", description: "", parent_id: "" });
    } catch (err) { alert("Failed: " + err.message); }
    finally { setCreatingCat(false); }
  };

  // ── Add Current Item to Queue ──────────────────────────────────────────────
  const handleAddToQueue = () => {
    if (!barcodeValue?.trim()) return;
    addSingleItem({
      id: Math.random().toString(36).substring(7),
      barcodeValue,
      categoryId: selectedCategoryId,
      categoryName,
      quantity: printQuantity,
      status: "pending",
      addedAt: new Date().toISOString(),
    });
    addLog("INFO", `Added "${barcodeValue}" to queue (${printQuantity}x).`);
  };

  // ── TSPL GENERATION ─────────────────────────────────────────────────────────
  // Label: 101.6 mm × 25.4 mm = 812 × 203 dots at 203 DPI
  // Left zone  (x = 0–340 dots):  category text
  // Right zone (x = 370–812 dots): barcode
  const buildItemTspl = (itemRoot, itemSub, val, qty) => {
    const s = settings;
    const cmds = [
      `SIZE ${s.widthMm} mm, ${s.heightMm} mm`,
      `GAP ${s.gapMm} mm, 0 mm`,
      `DIRECTION ${s.direction},0`,
      `CLS`,
      `REFERENCE 0,0`,
      `TEXT ${s.categoryX},${s.categoryY1},"${s.categoryFont}",0,1,1,"${itemRoot}"`,
    ];
    if (itemSub) {
      cmds.push(`TEXT ${s.categoryX},${s.categoryY2},"${s.categoryFont}",0,1,1,"${itemSub}"`);
    }
    cmds.push(
      `BARCODE ${s.barcodeX},${s.barcodeY},"128",${s.barcodeHeight},1,0,${s.barcodeNarrow},${s.barcodeNarrow},"${val}"`,
      `PRINT ${qty},1`
    );
    return cmds.join("\r\n");
  };

  const generateTsplCode = () => {
    return buildItemTspl(pathParts.root, pathParts.sub, barcodeValue, printQuantity);
  };
  const tsplOutput = generateTsplCode();

  // ── WebUSB connect ──────────────────────────────────────────────────────────
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
    if (device.configuration === null) await device.selectConfiguration(1).catch(() => {});
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
    catch (err) { setUsbStatus("ERROR"); addLog("ERROR", `Claim interface failed: ${err.message}`); await device.close().catch(() => {}); return; }
    usbDeviceRef.current = device; usbEndpointRef.current = bulkOut;
    setUsbStatus("CONNECTED");
    addLog("SUCCESS", `USB connected — interface ${targetIface}, endpoint #${bulkOut}.`);
  };

  const disconnectUSB = async () => {
    try { if (usbDeviceRef.current) await usbDeviceRef.current.close(); } catch (_) {}
    usbDeviceRef.current = null; usbEndpointRef.current = null;
    setUsbStatus("DISCONNECTED"); addLog("INFO", "USB disconnected.");
  };

  useEffect(() => () => { if (usbDeviceRef.current) usbDeviceRef.current.close().catch(() => {}); }, []);

  // ── Print via USB ───────────────────────────────────────────────────────────
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

  // ── Print via local agent ───────────────────────────────────────────────────
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

  // ── Batch Printing Dispatcher (Sequential with Delay) ────────────────────
  const handlePrintBatch = async () => {
    const pendingItems = queue.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      alert("No pending items in the queue to print.");
      return;
    }

    // Determine target transport mode
    let mode = "";
    if (usbStatus === "CONNECTED") mode = "USB";
    else if (agentStatus === "ONLINE") mode = "AGENT";
    else {
      alert("No active printer connection (USB or Local Agent). Please connect first.");
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

      // Split categories root and sub
      const parts = item.categoryName.split(" > ");
      const itemRoot = parts[0] || "";
      const itemSub = parts.slice(1).join(" > ") || "";
      const tspl = buildItemTspl(itemRoot, itemSub, item.barcodeValue, item.quantity);

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

      // Small delay between label prints so they output sequentially
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsPrintingBatch(false);
    setCurrentBatchIdx(-1);
    addLog("SUCCESS", "Batch print session completed.");
  };

  // ── Browser print fallback ──────────────────────────────────────────────────
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

  // ── SVG barcode bars (mock) ─────────────────────────────────────────────────
  const renderMockBars = (startX, barAreaWidth) => {
    const lines = []; let x = startX;
    const seed = barcodeValue || "1414199999";
    for (let i = 0; i < seed.length * 4; i++) {
      const c = seed.charCodeAt(i % seed.length);
      const w = Math.max(1, (c % 3) + 1);
      if (x + w > startX + barAreaWidth) break;
      lines.push(<rect key={i} x={x} y={8} width={w} height={56} fill="#111" />);
      x += w + ((c + i) % 3) + 1;
    }
    return lines;
  };

  // Preview SVG dimensions (4:1 ratio, scaled for display)
  const SVG_W = 400, SVG_H = 100;
  const isUsbConnected = usbStatus === "CONNECTED";
  const isDriverBlocked = usbStatus === "DRIVER_BLOCKED";

  // ── Settings input helper ───────────────────────────────────────────────────
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

      {/* ── Status Bar ── */}
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
            {settings.widthMm}mm × {settings.heightMm}mm
          </span>
        </div>
        {/* USB connect/disconnect */}
        {isUsbConnected
          ? <button onClick={disconnectUSB} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all"><Unplug className="w-3 h-3" /> Disconnect</button>
          : <button onClick={connectUSB} disabled={!isUsbSupported} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 disabled:opacity-40 transition-all"><Usb className="w-3 h-3" /> Connect USB</button>
        }
      </div>

      {/* ── Zadig Warning ── */}
      {isDriverBlocked && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-orange-800"><AlertTriangle className="w-4 h-4" /> Windows Driver Conflict — swap to WinUSB using Zadig</div>
          <div className="bg-white border border-orange-100 rounded-xl p-3 font-mono text-[11px] space-y-1">
            <p>1. Download <a href="https://zadig.akeo.ie" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center gap-0.5">zadig.akeo.ie <ExternalLink className="w-2.5 h-2.5"/></a></p>
            <p>2. Options → List All Devices → select <strong>TSC TE244</strong></p>
            <p>3. Set driver → <strong>WinUSB</strong> → Replace Driver → replug USB</p>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ════ Left Panel: Tag Config ════ */}
        <div className="lg:col-span-4 space-y-4">

          {/* Tag properties card */}
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
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <button onClick={() => setShowCatDrawer(true)} className="text-[9px] font-bold uppercase tracking-wider text-black flex items-center gap-1 hover:underline">
                    <FolderPlus className="w-3 h-3" /> Quick Add
                  </button>
                </div>
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-white">
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{categoryPaths[c.id] || c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity</label>
                <input type="number" min="1" max="100" value={printQuantity}
                  onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all" />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2">
              <button
                onClick={handleAddToQueue}
                disabled={!barcodeValue?.trim()}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                Add to Print Queue
              </button>
              <div className="border-t border-gray-100 my-2 pt-2" />
              <button onClick={handleUsbPrint} disabled={!isUsbConnected || printingStatus.includes("SENDING")}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:bg-neutral-300 disabled:cursor-not-allowed">
                <Zap className="w-4 h-4" />
                {isUsbConnected ? "Print Single Label (USB)" : "Connect USB Printer First"}
              </button>
              <button onClick={handleAgentPrint} disabled={agentStatus !== "ONLINE" || printingStatus.includes("SENDING")}
                className={`w-full flex items-center justify-center gap-2 border font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 ${agentStatus === "ONLINE" ? "bg-white hover:bg-gray-50 border-gray-200 text-gray-700" : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"}`}>
                <Settings className="w-3.5 h-3.5" />
                {agentStatus === "ONLINE" ? "Print Single via Local Agent" : "Agent Offline — run local-print-agent.js"}
              </button>
              <button onClick={handleBrowserPrint}
                className="w-full flex items-center justify-center gap-2 border border-gray-100 text-gray-400 font-bold py-2 rounded-xl text-[10px] hover:bg-gray-50 transition-all active:scale-95">
                <Printer className="w-3 h-3" /> Browser Dialog (Fallback)
              </button>
            </div>
          </div>

          {/* ── Custom Settings Panel ── */}
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
                      options={[{ value: 0, label: "0 — Normal" }, { value: 1, label: "1 — Rotate 180°" }]} />
                  </div>
                </div>

                {/* Category Text */}
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Text</p>
                  <div className="space-y-2">
                    <SettingRow label="X offset (dots)" settingKey="categoryX" min={0} max={800} />
                    <SettingRow label="Y — root (dots)" settingKey="categoryY1" min={0} max={200} />
                    <SettingRow label="Y — sub (dots)" settingKey="categoryY2" min={0} max={200} />
                    <SettingRow label="Font size" settingKey="categoryFont"
                      options={[
                        { value: "1", label: "1 — Tiny" },
                        { value: "2", label: "2 — Small" },
                        { value: "3", label: "3 — Medium" },
                        { value: "4", label: "4 — Large" },
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

        {/* ════ Right Panel: Preview + Queue + Logs ════ */}
        <div className="lg:col-span-8 space-y-4">

          {/* ── Label Preview ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Live Label Preview — {settings.widthMm}mm × {settings.heightMm}mm (Jewelry/Dumbbell Tag)
            </h2>
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[120px]">
              <svg
                id="preview-label-svg"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full h-auto shadow border border-gray-100"
                style={{ maxHeight: 140 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background: jewelry tag style (left rectangular lobe, neck, right tail) */}
                {/* Lobe width ~180, neck ~70, tail ~150 */}
                <path
                  d="M 10,15 H 180 A 15,15 0 0,1 195,30 V 40 A 10,10 0 0,0 205,50 H 260 A 10,10 0 0,0 270,40 V 30 A 15,15 0 0,1 285,15 H 390 A 10,10 0 0,1 400,25 V 75 A 10,10 0 0,1 390,85 H 285 A 15,15 0 0,1 270,70 V 60 A 10,10 0 0,0 260,50 H 205 A 10,10 0 0,0 195,60 V 70 A 15,15 0 0,1 180,85 H 10 A 10,10 0 0,1 0,75 V 25 A 10,10 0 0,1 10,15 Z"
                  fill="white" stroke="#e5e7eb" strokeWidth="1.5"
                />

                {/* Category text (left lobe) */}
                <text
                  x={Math.round((settings.categoryX / 812) * SVG_W) + 4}
                  y={Math.round((settings.categoryY1 / 203) * SVG_H) + 2}
                  fontFamily="'Inter', sans-serif" fontWeight="700"
                  fontSize={settings.categoryFont === "4" ? 12 : settings.categoryFont === "3" ? 10 : settings.categoryFont === "2" ? 8 : 6}
                  fill="#111"
                >
                  {pathParts.root}
                </text>
                {pathParts.sub && (
                  <text
                    x={Math.round((settings.categoryX / 812) * SVG_W) + 4}
                    y={Math.round((settings.categoryY2 / 203) * SVG_H) + 2}
                    fontFamily="'Inter', sans-serif" fontWeight="700"
                    fontSize={settings.categoryFont === "4" ? 10 : settings.categoryFont === "3" ? 8 : settings.categoryFont === "2" ? 6 : 5}
                    fill="#555"
                  >
                    {pathParts.sub}
                  </text>
                )}

                {/* Barcode (fits inside left lobe/neck intersection, x=300) */}
                {renderMockBars(Math.round((settings.barcodeX / 812) * SVG_W), Math.round((220 / 812) * SVG_W))}

                {/* Barcode number */}
                <text
                  x={Math.round((settings.barcodeX / 812) * SVG_W) + Math.round((220 / 812) * SVG_W) / 2}
                  y={SVG_H - 18}
                  fontFamily="monospace" fontSize="7" fill="#333" textAnchor="middle"
                >
                  {barcodeValue}
                </text>
              </svg>
            </div>
          </div>

          {/* ── Active Review Queue Table ── */}
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

          {/* ── TSPL Payload Preview ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Generated Single Label TSPL
            </h3>
            <pre className="bg-gray-50 rounded-xl p-4 text-[11px] font-mono text-gray-700 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {tsplOutput}
            </pre>
          </div>

          {/* ── Console Spooler Logs ── */}
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
                  <span className={`flex-shrink-0 font-bold ${
                    log.status === "INFO"       ? "text-blue-400"   :
                    log.status === "PENDING"    ? "text-amber-400"  :
                    log.status === "SUCCESS"    ? "text-green-400"  :
                    log.status === "WARNING"    ? "text-yellow-400" :
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

      {/* ── Drawer: Ingestion Checkpoint Loader ── */}
      <SlideDrawer
        isOpen={showBatchDrawer}
        onClose={() => setShowBatchDrawer(false)}
        title="Checkpoints Batch Loader"
        subtitle="Load products generated in Product Intake sessions"
      >
        <BatchLoader
          isOpen={showBatchDrawer}
          onClose={() => setShowBatchDrawer(false)}
          categoryPaths={categoryPaths}
          onLoadBatch={async (checkpointName) => {
            const count = await loadBatchFromSupabase(checkpointName, categoryPaths);
            addLog("SUCCESS", `Loaded ${count} items from checkpoint "${checkpointName}" into the queue.`);
            setShowBatchDrawer(false);
          }}
        />
      </SlideDrawer>

      {/* ── Category Drawer ── */}
      <SlideDrawer isOpen={showCatDrawer}
        onClose={() => { setShowCatDrawer(false); setNewCat({ name: "", description: "", parent_id: "" }); }}
        title="Quick Register Category" subtitle="Append a new category to the database">
        <form onSubmit={handleCreateCategory} className="space-y-6 flex flex-col h-full">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Classification Name</label>
            <input type="text" required value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              placeholder="E.g. Sunglasses"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none focus:border-black focus:bg-white transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Parent Category</label>
            <select value={newCat.parent_id} onChange={(e) => setNewCat({ ...newCat, parent_id: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none focus:border-black focus:bg-white transition-all">
              <option value="">None (Root)</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{categoryPaths[c.id]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
            <textarea rows="3" value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none resize-none focus:border-black focus:bg-white transition-all"
              placeholder="Define the bounds of this category..." />
          </div>
          <div className="pt-6 flex gap-3 border-t border-gray-50 mt-auto">
            <button type="button" onClick={() => setShowCatDrawer(false)}
              className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
            <button type="submit" disabled={creatingCat}
              className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
              {creatingCat ? "Creating..." : "Create Category"}
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
}
