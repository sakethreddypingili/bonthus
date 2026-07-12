import React, { useState, useEffect, useRef } from "react";
import {
  Printer, Terminal, Settings, FolderPlus,
  Usb, Unplug, Zap, AlertTriangle, Layers
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
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

const isLensCategory = (categoryName) => {
  return /lens/i.test(categoryName || "");
};

const cleanLensName = (name) => {
  if (!name) return "";
  const match = name.match(/^(.*?)\s+(?:lens|lenses|sph|cyl|\d\.\d\d)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return name.trim();
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
  const [activePrinterTab, setActivePrinterTab] = useState("single");

  // -- Lens Single Print State ------------------------------------------------
  const [lensName, setLensName] = useState("Bonthus High Ultra Thin 1.74 (Blue)");
  const [lensTypeSingle, setLensTypeSingle] = useState("Single Vision");
  const [lensIndexSingle, setLensIndexSingle] = useState("1.74");
  const [lensMaterialSingle, setLensMaterialSingle] = useState("Hi-Index");
  const [lensCoatingSingle, setLensCoatingSingle] = useState("Blue Cut");
  const [lensSphSingle, setLensSphSingle] = useState("0.0");
  const [lensCylSingle, setLensCylSingle] = useState("0.0");
  const [lensAxisSingle, setLensAxisSingle] = useState("0.0");
  const [lensAddSingle, setLensAddSingle] = useState("0.0");

  // -- Label / TSPL settings --------------------------------------------------
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
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
  const usbInterfaceRef = useRef(null);
  const usbEndpointRef = useRef(null);
  const isUsbSupported = "usb" in navigator;

  // Listen to physical USB connect/disconnect events
  useEffect(() => {
    if (!isUsbSupported) return;
    const handleDisconnect = (e) => {
      if (e.device === usbDeviceRef.current) {
        addLog("ERROR", "USB printer physically disconnected.");
        setUsbStatus("DISCONNECTED");
        usbDeviceRef.current = null;
        usbEndpointRef.current = null;
        usbInterfaceRef.current = null;
      }
    };
    navigator.usb.addEventListener("disconnect", handleDisconnect);
    return () => {
      navigator.usb.removeEventListener("disconnect", handleDisconnect);
    };
  }, [isUsbSupported]);

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

  const [frameColorValue, setFrameColorValue] = useState("");

  // -- Auto-resolve barcode -> category name, brand, SKU, and model no ----------
  useEffect(() => {
    const resolve = async () => {
      if (!barcodeValue?.trim()) return;
      try {
        // Resolve from pending_products & pending_product_barcodes instead of product_barcodes
        const { data: bc } = await supabase.from("pending_product_barcodes").select("pending_product_id").eq("barcode", barcodeValue).maybeSingle();
        const q = bc?.pending_product_id
          ? supabase.from("pending_products").select("id, brand, sku, category_id, category:categories(name), description").eq("id", bc.pending_product_id)
          : supabase.from("pending_products").select("id, brand, sku, category_id, category:categories(name), description").or(`sku.eq.${barcodeValue}`);
        const { data: prod } = await q.maybeSingle();
        if (prod) {
          if (prod.brand) setBrandValue(prod.brand);
          if (prod.sku) setSkuValue(prod.sku);
          if (prod.category?.name) setCategoryName(prod.category.name);
          setPriceValue("0"); // Default base price for pending items

          try {
            const descObj = JSON.parse(prod.description);
            if (descObj) {
              if (descObj.modelNo) setModelValue(descObj.modelNo);
              if (descObj.sizeA) setSizeA(descObj.sizeA.toString());
              if (descObj.sizeB) setSizeB(descObj.sizeB.toString());
              if (descObj.dbl) setDbl(descObj.dbl.toString());
              if (descObj.templeLength) setTempleLength(descObj.templeLength.toString());

              const resolvedColor = descObj.frameColor || descObj.color || "";
              setFrameColorValue(resolvedColor);
            }
          } catch (e) { }

          addLog("INFO", `Resolved "${barcodeValue}" from pending_products -> "${prod.category?.name || "Uncategorized"}" (${prod.brand || "No Brand"})`);
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
      name: lensName,
      lensType: lensTypeSingle,
      lensIndex: lensIndexSingle,
      lensMaterial: lensMaterialSingle,
      lensCoating: lensCoatingSingle,
      lensSph: lensSphSingle,
      lensCyl: lensCylSingle,
      lensAxis: lensAxisSingle,
      lensAdd: lensAddSingle,
      frameColor: frameColorValue,
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
  const buildItemTspl = (category, brand, model, sku, val, qty, price, sizeAVal, sizeBVal, dblVal, templeLengthVal, extra = {}) => {
    const isLens = /lens/i.test(category || "");
    const cmds = [
      `SIZE 101.6 mm, 15 mm`,
      `GAP 20 mm, 0 mm`,
      `DIRECTION 1,0`,
      `CLS`,
      `REFERENCE 0,0`
    ];

    if (isLens) {
      // ── LENS BLUEPRINT ───────────────────────────────────────────────
      const cleanName = cleanLensName(extra.name || brand || "Lens");
      const displayType = (extra.lensType || "Single Vision").toLowerCase().includes("single") ? "Single" : (extra.lensType || "Single Vision");
      const displayIndex = extra.lensIndex || "1.74";

      let coating = extra.lensCoating || "Blue Cut";
      const coatingWords = coating.trim().split(/\s+/);
      if (coatingWords.length > 3) {
        coating = coatingWords.slice(0, 2).join(" ");
      }

      let coating1 = coating;
      let coating2 = "";
      if (coating.length > 10) {
        const splitIdx = coating.lastIndexOf(" ", 10);
        if (splitIdx > 0) {
          coating1 = coating.slice(0, splitIdx);
          coating2 = coating.slice(splitIdx + 1);
        } else {
          coating1 = coating.slice(0, 10);
          coating2 = coating.slice(10);
        }
      }

      cmds.push(
        // Left Flap (moved down, using font size "0" for better organization)
        `TEXT 80,24,"1",0,1,1,"${cleanName.slice(0, 32)}"`,
        `TEXT 80,42,"1",0,1,1,"${sku || ""}"`,
        `TEXT 80,70,"1",0,1,1,"${displayType}"`,
        `TEXT 210,70,"1",0,1,1,"${displayIndex}"`,
        // `TEXT 80,90,"1",0,1,1,"${extra.lensMaterial || "Hi-Index"}"`,
        // //`TEXT 150,60,"1",0,1,1,"${coating1}"`
        // `TEXT 210,90,"1",0,1,1,"${coating1}"`
        `TEXT 330,31,"1",0,1,1,"${extra.lensMaterial || "Hi-Index"}"`,
        `TEXT 410,31,"1",0,1,1,"${coating1}"`
      );

      if (coating2) {
        cmds.push(`TEXT 150,96,"0",0,1,1,"${coating2}"`);
      }

      cmds.push(
        // Right Flap (wider column spacing and shifted barcode left)
        //`TEXT 295,15,"1",0,1,1,"SPH"`,
        //`TEXT 340,15,"1",0,1,1,"CYL"`,
        //`TEXT 385,15,"1",0,1,1,"AXIS"`,
        //`TEXT 430,15,"1",0,1,1,"ADD"`,

        // `TEXT 295,31,"1",0,1,1,"${extra.lensSph || "0.0"}"`,
        // //`TEXT 340,31,"1",0,1,1,"${extra.lensCyl || "0.0"}"`,
        // `TEXT 295,15,"1",0,1,1,"${extra.lensCyl || "0.0"}"`,
        // `TEXT 385,31,"1",0,1,1,"${extra.lensAxis || "0.0"}"`,
        // //`TEXT 430,31,"1",0,1,1,"${extra.lensAdd || "0.0"}"`,
        // `TEXT 385,15,"1",0,1,1,"${extra.lensAdd || "0.0"}"`,

        // `TEXT 340,24,"1",0,1,1,"sp:${extra.lensSph || "0.0"}"`,
        // //`TEXT 340,31,"1",0,1,1,"${extra.lensCyl || "0.0"}"`,
        // `TEXT 430,24,"1",0,1,1,"cy:${extra.lensCyl || "0.0"}"`,
        // `TEXT 340,38,"1",0,1,1,"ax:${extra.lensAxis || "0.0"}"`,
        // //`TEXT 430,31,"1",0,1,1,"${extra.lensAdd || "0.0"}"`,
        // `TEXT 430,38,"1",0,1,1,"ad:${extra.lensAdd || "0.0"}"`,

        `TEXT 80,95,"1",0,1,1,"${extra.lensSph || "0.0"}"`,
        `TEXT 145,95,"1",0,1,1,"${extra.lensCyl || "0.0"}"`,
        `TEXT 210,95,"1",0,1,1,"${extra.lensAxis || "0.0"}"`,
        `TEXT 275,95,"1",0,1,1,"${extra.lensAdd || "0.0"}"`,

        `BARCODE 350,62,"128",28,0,0,1,1,"${val}"`,
        `TEXT 350,100,"1",0,1,1,"${val}"`
      );
    } else {
      // ── FRAME BLUEPRINT ──────────────────────────────────────────────
      const frameColor = extra.frameColor || "";
      const displayColor = (frameColor || "").slice(0, 10);
      cmds.push(
        // Left Flap
        `TEXT 110,27,"3",0,1,1,"${brand || ""}"`,
        `TEXT 80,67,"1",0,1,1,"${displayColor}"`,
        `TEXT 180,102,"1",0,1,1,"SKU:${sku || ""}"`,
        `TEXT 80,102,"1",0,1,1,"Rs.${price || ""}"`,
        `TEXT 180,67,"1",0,1,1,"M:${model || ""}"`,

        // Right Flap
        `TEXT 340,30,"1",0,1,1,"A"`,
        `TEXT 370,30,"1",0,1,1,"B"`,
        `TEXT 400,30,"1",0,1,1,"DBL"`,
        `TEXT 445,30,"1",0,1,1,"Tem"`,

        `TEXT 340,46,"1",0,1,1,"${sizeAVal || ""}"`,
        `TEXT 370,46,"1",0,1,1,"${sizeBVal || ""}"`,
        `TEXT 400,46,"1",0,1,1,"${dblVal || ""}"`,
        `TEXT 445,46,"1",0,1,1,"${templeLengthVal || ""}"`,

        `BARCODE 350,62,"128",32,0,0,1,1,"${val}"`,
        `TEXT 350,100,"1",0,1,1,"${val}"`
      );
    }

    cmds.push(`PRINT ${qty},1`);
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
      templeLength,
      {
        name: lensName,
        lensType: lensTypeSingle,
        lensIndex: lensIndexSingle,
        lensMaterial: lensMaterialSingle,
        lensCoating: lensCoatingSingle,
        lensSph: lensSphSingle,
        lensCyl: lensCylSingle,
        lensAxis: lensAxisSingle,
        lensAdd: lensAddSingle,
        frameColor: frameColorValue
      }
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
    usbDeviceRef.current = device;
    usbInterfaceRef.current = targetIface;
    usbEndpointRef.current = bulkOut;
    setUsbStatus("CONNECTED");
    addLog("SUCCESS", `USB connected - interface ${targetIface}, endpoint #${bulkOut}.`);
  };

  const reconnectUSB = async () => {
    const device = usbDeviceRef.current;
    const iface = usbInterfaceRef.current;
    if (!device) return false;
    try {
      addLog("INFO", "Attempting automatic USB reconnection...");
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1).catch(() => { });
      if (iface !== null) {
        await device.claimInterface(iface);
      }
      setUsbStatus("CONNECTED");
      addLog("SUCCESS", "USB connection restored successfully.");
      return true;
    } catch (err) {
      addLog("ERROR", `Auto-reconnect failed: ${err.message}`);
      setUsbStatus("DISCONNECTED");
      return false;
    }
  };

  const disconnectUSB = async () => {
    try { if (usbDeviceRef.current) await usbDeviceRef.current.close(); } catch (_) { }
    usbDeviceRef.current = null;
    usbEndpointRef.current = null;
    usbInterfaceRef.current = null;
    setUsbStatus("DISCONNECTED"); addLog("INFO", "USB disconnected.");
  };

  useEffect(() => () => { if (usbDeviceRef.current) usbDeviceRef.current.close().catch(() => { }); }, []);

  // -- Print via USB ---------------------------------------------------------- 
  const handleUsbPrint = async () => {
    if (usbStatus !== "CONNECTED" && !usbDeviceRef.current) {
      addLog("ERROR", "USB printer not connected.");
      return;
    }
    setPrintingStatus("SENDING..."); addLog("PENDING", `Spooling ${printQuantity} label(s) via USB...`);
    try {
      const data = new TextEncoder().encode(generateTsplCode() + "\r\n");
      let result;
      try {
        result = await usbDeviceRef.current.transferOut(usbEndpointRef.current, data);
      } catch (err) {
        addLog("WARNING", `USB connection lost during transfer: ${err.message}. Attempting reconnect...`);
        const reconnected = await reconnectUSB();
        if (reconnected && usbDeviceRef.current) {
          result = await usbDeviceRef.current.transferOut(usbEndpointRef.current, data);
        } else {
          throw err;
        }
      }
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

  // -- Helper sleep function -------------------------------------------------
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // -- Batch Printing Dispatcher (Sequential with Delay) --------------------
  const handlePrintBatch = async () => {
    const pendingItems = queue.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      alert("No pending items in the queue to print.");
      return;
    }

    let mode = "";
    if (usbStatus === "CONNECTED" || usbDeviceRef.current) mode = "USB";
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
        item.templeLength || "",
        item
      );

      try {
        if (mode === "USB") {
          const data = new TextEncoder().encode(tspl + "\r\n");
          let result;
          try {
            result = await usbDeviceRef.current.transferOut(usbEndpointRef.current, data);
          } catch (usbErr) {
            addLog("WARNING", `[Batch] USB error on ${item.barcodeValue}, trying reconnect...`);
            const ok = await reconnectUSB();
            if (ok && usbDeviceRef.current) {
              result = await usbDeviceRef.current.transferOut(usbEndpointRef.current, data);
            } else {
              throw usbErr;
            }
          }
          if (result.status !== "ok") throw new Error(`USB status: ${result.status}`);
          // Wait 1200ms to allow physical printer feed and settle before next transfer
          await sleep(1200);
        } else {
          const res = await fetch("http://localhost:9100/print", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawTspl: tspl }),
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) throw new Error(`Agent returned HTTP ${res.status}`);
          // Wait 1200ms for agent print jobs to space out nicely as well
          await sleep(1200);
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
      <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.frameElement.remove();},100);},300);};</script>
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
    <div className="w-full space-y-6 p-2 sm:p-4">

      {/* -- Top Header & Status Bar -- */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-gray-150 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2.5">
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
        </div>
        {/* Label size badge */}
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3.5 py-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
            {settings.widthMm}mm x {settings.heightMm}mm Roll
          </span>
        </div>
      </div>

      {/* -- Tab Navigation -- */}
      <div className="flex border-2 border-black rounded-2xl p-1 bg-white overflow-hidden max-w-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {[
          { id: "single", label: "Single Print" },
          { id: "queue", label: "Batch Print Queue" },
          { id: "settings", label: "Calibrator & Settings" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePrinterTab(tab.id)}
            className={`flex-1 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all ${activePrinterTab === tab.id
              ? "bg-black text-white shadow-md scale-100"
              : "text-gray-500 hover:text-black hover:bg-gray-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- Zadig Warning -- */}
      {isDriverBlocked && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-xs animate-pulse">
          <div className="flex items-center gap-2 font-bold text-orange-800">
            <AlertTriangle className="w-4 h-4" /> Driver is blocked, swap to WinUSB
          </div>
        </div>
      )}

      {/* -- Conditional Tabs Rendering -- */}
      {activePrinterTab === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fast-zoom">
          {/* Left Column: Properties Form */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-sm font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Tag Properties
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <input type="text" value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. Eyeglasses"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Barcode Value</label>
                  <input type="text" value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                    placeholder="1414199999"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Brand</label>
                  <input type="text" value={brandValue}
                    onChange={(e) => setBrandValue(e.target.value)}
                    placeholder="e.g. Ray-Ban"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Alphanumeric Code / SKU</label>
                  <input type="text" value={skuValue}
                    onChange={(e) => setSkuValue(e.target.value)}
                    placeholder="e.g. RB3025"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Price (Rs.)</label>
                  <input type="text" value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Frame Color</label>
                  <input type="text" value={frameColorValue}
                    onChange={(e) => setFrameColorValue(e.target.value)}
                    placeholder="e.g. Black, Gold"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>

                {isLensCategory(categoryName) ? (
                  <>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Lens Name</label>
                      <input type="text" value={lensName}
                        onChange={(e) => setLensName(e.target.value)}
                        placeholder="Bonthus High Ultra Thin 1.74 (Blue)"
                        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Lens Type</label>
                      <input type="text" value={lensTypeSingle}
                        onChange={(e) => setLensTypeSingle(e.target.value)}
                        placeholder="Single Vision"
                        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Refractive Index</label>
                      <input type="text" value={lensIndexSingle}
                        onChange={(e) => setLensIndexSingle(e.target.value)}
                        placeholder="1.74"
                        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Lens Material</label>
                      <input type="text" value={lensMaterialSingle}
                        onChange={(e) => setLensMaterialSingle(e.target.value)}
                        placeholder="Hi-Index"
                        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Coating</label>
                      <input type="text" value={lensCoatingSingle}
                        onChange={(e) => setLensCoatingSingle(e.target.value)}
                        placeholder="Blue Cut"
                        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Power Values (SPH / CYL / AXIS / ADD)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="text" value={lensSphSingle} onChange={(e) => setLensSphSingle(e.target.value)} placeholder="SPH" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                        <input type="text" value={lensCylSingle} onChange={(e) => setLensCylSingle(e.target.value)} placeholder="CYL" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                        <input type="text" value={lensAxisSingle} onChange={(e) => setLensAxisSingle(e.target.value)} placeholder="AXIS" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                        <input type="text" value={lensAddSingle} onChange={(e) => setLensAddSingle(e.target.value)} placeholder="ADD" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Model No</label>
                      <input type="text" value={modelValue}
                        onChange={(e) => setModelValue(e.target.value)}
                        placeholder="e.g. RB3025"
                        className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Frame Dimensions (A / B / DBL / Temple)</label>
                      <div className="grid grid-cols-4 gap-2">
                        <input type="text" value={sizeA} onChange={(e) => setSizeA(e.target.value)} placeholder="A" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                        <input type="text" value={sizeB} onChange={(e) => setSizeB(e.target.value)} placeholder="B" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                        <input type="text" value={dbl} onChange={(e) => setDbl(e.target.value)} placeholder="DBL" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                        <input type="text" value={templeLength} onChange={(e) => setTempleLength(e.target.value)} placeholder="Tem" className="w-full border-2 border-gray-200 rounded-xl py-2 text-center text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                      </div>
                    </div>
                  </>
                )}

                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Print Quantity</label>
                  <input type="number" min="1" max="100" value={printQuantity}
                    onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-black transition-all" />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToQueue}
                  disabled={!barcodeValue?.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border-2 border-black text-black font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FolderPlus size={16} /> Add to Queue
                </button>
              </div>
            </div>

            {/* Quick Connections Panel */}
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <h2 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                <Printer className="w-4 h-4" /> Quick Print Spoolers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isUsbConnected ? (
                  <button onClick={handleUsbPrint} className="flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> USB Print Single
                  </button>
                ) : (
                  <button onClick={connectUSB} className="flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95">
                    <Usb className="w-3.5 h-3.5" /> Connect USB
                  </button>
                )}
                <button
                  onClick={handleAgentPrint}
                  disabled={agentStatus !== "ONLINE" || printingStatus.includes("SENDING")}
                  className={`flex items-center justify-center gap-2 border-2 font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 ${agentStatus === "ONLINE"
                    ? "bg-white hover:bg-gray-50 border-black text-black"
                    : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  <Settings className="w-3.5 h-3.5" /> Agent Print Single
                </button>
              </div>
              <button
                onClick={handleBrowserPrint}
                className="w-full flex items-center justify-center gap-2 border border-gray-100 text-gray-500 font-bold py-2 rounded-xl text-[10px] hover:bg-gray-50 transition-all active:scale-95"
              >
                Browser Dialog (Fallback)
              </button>
            </div>
          </div>

          {/* Right Column: Live Preview & Spooler Logs */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Live Label Preview</h2>
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex items-center justify-center min-h-[140px]">
                <svg id="preview-label-svg" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto shadow-md border border-gray-150 rounded-lg bg-white" style={{ maxHeight: 160 }} xmlns="http://www.w3.org/2000/svg">
                  {isLensCategory(categoryName) ? (
                    <>
                      {(() => {
                        const displayType = (lensTypeSingle || "Single Vision").toLowerCase().includes("single") ? "Single" : lensTypeSingle;
                        const displayIndex = lensIndexSingle || "1.74";
                        let coating = lensCoatingSingle || "Blue Cut";
                        const coatingWords = coating.trim().split(/\s+/);
                        if (coatingWords.length > 3) {
                          coating = coatingWords.slice(0, 2).join(" ");
                        }
                        let coating1 = coating;
                        let coating2 = "";
                        if (coating.length > 10) {
                          const splitIdx = coating.lastIndexOf(" ", 10);
                          if (splitIdx > 0) {
                            coating1 = coating.slice(0, splitIdx);
                            coating2 = coating.slice(splitIdx + 1);
                          } else {
                            coating1 = coating.slice(0, 10);
                            coating2 = coating.slice(10);
                          }
                        }
                        return (
                          <>
                            <path d="M 10,15 H 310 A 10,10 0 0,1 320,25 V 42 H 390 A 8,8 0 0,1 390,58 H 320 V 75 A 10,10 0 0,1 310,85 H 10 A 10,10 0 0,1 0,75 V 25 A 10,10 0 0,1 10,15 Z" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
                            <text x={Math.round((15 / 440) * 320)} y={34} fontFamily="'Inter', sans-serif" fontWeight="800" fontSize={5.5} fill="#111">{cleanLensName(lensName || brandValue || "Lens").slice(0, 32)}</text>
                            <text x={Math.round((15 / 440) * 320)} y={46} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{skuValue || ""}</text>
                            <text x={Math.round((15 / 440) * 320)} y={58} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#555">{displayType}</text>
                            <text x={Math.round((210 / 440) * 320)} y={58} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{displayIndex}</text>
                            <text x={Math.round((15 / 440) * 320)} y={70} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{lensMaterialSingle}</text>
                            <text x={Math.round((95 / 440) * 320)} y={70} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{coating1}</text>
                            {coating2 && <text x={Math.round((95 / 440) * 320)} y={80} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{coating2}</text>}

                            <text x={Math.round((295 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">SPH</text>
                            <text x={Math.round((295 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensSphSingle}</text>
                            <text x={Math.round((340 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">CYL</text>
                            <text x={Math.round((340 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensCylSingle}</text>
                            <text x={Math.round((385 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">AXIS</text>
                            <text x={Math.round((385 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensAxisSingle}</text>
                            <text x={Math.round((430 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">ADD</text>
                            <text x={Math.round((430 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensAddSingle}</text>

                            {renderMockBars(Math.round((300 / 440) * 320), Math.round((200 / 440) * 320), 48, 26)}
                            <text x={Math.round((310 / 440) * 320)} y={82} fontFamily="monospace" fontSize="6" fill="#333" textAnchor="middle">{barcodeValue}</text>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <path d="M 10,15 H 310 A 10,10 0 0,1 320,25 V 42 H 390 A 8,8 0 0,1 390,58 H 320 V 75 A 10,10 0 0,1 310,85 H 10 A 10,10 0 0,1 0,75 V 25 A 10,10 0 0,1 10,15 Z" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
                      <text x={Math.round((65 / 440) * 320)} y={32} fontFamily="'Inter', sans-serif" fontWeight="800" fontSize={8} fill="#111" textAnchor="middle">{brandValue || "No Brand"}</text>
                      <text x={Math.round((15 / 440) * 320)} y={54} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={6} fill="#555">{frameColorValue || "No Color"}</text>
                      <text x={Math.round((130 / 440) * 320)} y={54} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#444">SKU:{skuValue || ""}</text>
                      <text x={Math.round((15 / 440) * 320)} y={74} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={6} fill="#444">price:Rs.{priceValue || ""}</text>
                      <text x={Math.round((130 / 440) * 320)} y={74} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#444">M:{modelValue || ""}</text>
                      <text x={Math.round((240 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">A</text>
                      <text x={Math.round((240 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{sizeA || ""}</text>
                      <text x={Math.round((290 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">B</text>
                      <text x={Math.round((290 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{sizeB || ""}</text>
                      <text x={Math.round((340 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">DBL</text>
                      <text x={Math.round((340 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{dbl || ""}</text>
                      <text x={Math.round((390 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">Tem</text>
                      <text x={Math.round((390 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{templeLength || ""}</text>
                      {renderMockBars(Math.round((230 / 440) * 320), Math.round((200 / 440) * 320), 48, 26)}
                      <text x={Math.round((270 / 440) * 320)} y={82} fontFamily="monospace" fontSize="6" fill="#333" textAnchor="middle">{barcodeValue}</text>
                    </>
                  )}
                </svg>
              </div>
            </div>

            {/* Logs console */}
            <div className="bg-black text-white border-2 border-black rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-neutral-900 border-b-2 border-black px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" /> Live Spooler Log
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">{printingStatus}</span>
              </div>
              <div className="p-4 font-mono text-xs space-y-1.5 max-h-[220px] overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-neutral-500">[{log.ts}]</span>
                    <span className={`font-bold ${log.status === "INFO" ? "text-blue-400" : log.status === "PENDING" ? "text-amber-400" : log.status === "SUCCESS" ? "text-green-400" : log.status === "WARNING" ? "text-yellow-400" : "text-red-400"}`}>{log.status}:</span>
                    <span className="text-neutral-300">{log.msg}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activePrinterTab === "queue" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fast-zoom">
          {/* Left Column: Connections & Checkpoints */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <h2 className="text-sm font-black text-black uppercase tracking-widest">Ingestion Sources</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Import product specs from a checkpoint batch into the queue</p>
              <button
                onClick={() => setShowBatchDrawer(true)}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
              >
                <Layers className="w-4 h-4 text-white" />
                Load Ingestion Checkpoint
              </button>
            </div>

            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <h2 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                <Printer className="w-4 h-4" /> Hardware Settings
              </h2>
              <div className="space-y-2">
                {isUsbConnected ? (
                  <button onClick={disconnectUSB} className="w-full flex items-center justify-center gap-2 bg-red-50 border-2 border-red-200 hover:bg-red-100 text-red-700 font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95">
                    <Unplug className="w-4 h-4" /> Disconnect USB
                  </button>
                ) : (
                  <button onClick={connectUSB} className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-md active:scale-95">
                    <Usb className="w-4 h-4" /> Connect USB Printer
                  </button>
                )}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold"><span className="text-gray-500">USB Status:</span> <span className="uppercase text-black">{usbStatus}</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-gray-500">Print Agent:</span> <span className="uppercase text-black">{agentStatus}</span></div>
                </div>
              </div>
            </div>

            {/* Console Log */}
            <div className="bg-black text-white border-2 border-black rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="bg-neutral-900 border-b-2 border-black px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" /> Spooler Logs
                </span>
              </div>
              <div className="p-4 font-mono text-[10px] space-y-1.5 max-h-[220px] overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-neutral-500">[{log.ts}]</span>
                    <span className={`font-bold ${log.status === "INFO" ? "text-blue-400" : log.status === "PENDING" ? "text-amber-400" : log.status === "SUCCESS" ? "text-green-400" : log.status === "WARNING" ? "text-yellow-400" : "text-red-400"}`}>{log.status}:</span>
                    <span className="text-neutral-300">{log.msg}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          {/* Right Column: Print Queue Table */}
          <div className="lg:col-span-8">
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
          </div>
        </div>
      )}

      {activePrinterTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fast-zoom">
          {/* Left Column: Sliders/Settings */}
          <div className="lg:col-span-5 bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div>
              <h2 className="text-sm font-black text-black uppercase tracking-widest">TSPL Calibrator</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Fine-tune label metrics and offsets</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Label size</p>
                <SettingRow label="Width (mm)" settingKey="widthMm" min={20} max={200} step={0.1} />
                <SettingRow label="Height (mm)" settingKey="heightMm" min={10} max={200} step={0.1} />
                <SettingRow label="Gap (mm)" settingKey="gapMm" min={0} max={20} step={0.5} />
                <SettingRow label="Direction" settingKey="direction" options={[{ value: 0, label: "0 - Normal" }, { value: 1, label: "1 - Rotate 180 deg" }]} />
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Text Alignment</p>
                <SettingRow label="X offset (dots)" settingKey="categoryX" min={0} max={800} />
                <SettingRow label="Y - brand (dots)" settingKey="categoryY1" min={0} max={200} />
                <SettingRow label="Y - category (dots)" settingKey="categoryY2" min={0} max={200} />
                <SettingRow label="Y - SKU (dots)" settingKey="categoryY3" min={0} max={200} />
                <SettingRow label="Font size" settingKey="categoryFont" options={[{ value: "1", label: "1 - Tiny" }, { value: "2", label: "2 - Small" }, { value: "3", label: "3 - Medium" }, { value: "4", label: "4 - Large" }]} />
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-1">Barcode alignment</p>
                <SettingRow label="X position (dots)" settingKey="barcodeX" min={0} max={800} />
                <SettingRow label="Y position (dots)" settingKey="barcodeY" min={0} max={180} />
                <SettingRow label="Bar height (dots)" settingKey="barcodeHeight" min={20} max={200} />
                <SettingRow label="Narrow bar (dots)" settingKey="barcodeNarrow" min={1} max={4} />
                <SettingRow label="Text Y position (dots)" settingKey="barcodeTextY" min={0} max={180} />
              </div>

              <button onClick={() => setSettings(DEFAULT_SETTINGS)} className="w-full text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-700 py-3 border-2 border-red-200 hover:bg-red-50 rounded-xl transition-all">
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Right Column: Live Preview & Raw TSPL */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Calibration Preview</h2>
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center min-h-[140px]">
                <svg id="preview-label-svg" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto shadow border border-gray-105 bg-white" style={{ maxHeight: 140 }} xmlns="http://www.w3.org/2000/svg">
                  {isLensCategory(categoryName) ? (
                    <>
                      {(() => {
                        const displayType = (lensTypeSingle || "Single Vision").toLowerCase().includes("single") ? "Single" : lensTypeSingle;
                        const displayIndex = lensIndexSingle || "1.74";
                        let coating = lensCoatingSingle || "Blue Cut";
                        const coatingWords = coating.trim().split(/\s+/);
                        if (coatingWords.length > 3) {
                          coating = coatingWords.slice(0, 2).join(" ");
                        }
                        let coating1 = coating;
                        let coating2 = "";
                        if (coating.length > 10) {
                          const splitIdx = coating.lastIndexOf(" ", 10);
                          if (splitIdx > 0) {
                            coating1 = coating.slice(0, splitIdx);
                            coating2 = coating.slice(splitIdx + 1);
                          } else {
                            coating1 = coating.slice(0, 10);
                            coating2 = coating.slice(10);
                          }
                        }
                        return (
                          <>
                            <path d="M 10,15 H 310 A 10,10 0 0,1 320,25 V 42 H 390 A 8,8 0 0,1 390,58 H 320 V 75 A 10,10 0 0,1 310,85 H 10 A 10,10 0 0,1 0,75 V 25 A 10,10 0 0,1 10,15 Z" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
                            <text x={Math.round((15 / 440) * 320)} y={34} fontFamily="'Inter', sans-serif" fontWeight="800" fontSize={5.5} fill="#111">{cleanLensName(lensName || brandValue || "Lens").slice(0, 32)}</text>
                            <text x={Math.round((15 / 440) * 320)} y={46} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{skuValue || ""}</text>
                            <text x={Math.round((15 / 440) * 320)} y={58} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#555">{displayType}</text>
                            <text x={Math.round((210 / 440) * 320)} y={58} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{displayIndex}</text>
                            <text x={Math.round((15 / 440) * 320)} y={70} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{lensMaterialSingle}</text>
                            <text x={Math.round((95 / 440) * 320)} y={70} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{coating1}</text>
                            {coating2 && <text x={Math.round((95 / 440) * 320)} y={80} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={5} fill="#444">{coating2}</text>}

                            <text x={Math.round((295 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">SPH</text>
                            <text x={Math.round((295 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensSphSingle}</text>
                            <text x={Math.round((340 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">CYL</text>
                            <text x={Math.round((340 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensCylSingle}</text>
                            <text x={Math.round((385 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">AXIS</text>
                            <text x={Math.round((385 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensAxisSingle}</text>
                            <text x={Math.round((430 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">ADD</text>
                            <text x={Math.round((430 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{lensAddSingle}</text>

                            {renderMockBars(Math.round((300 / 440) * 320), Math.round((200 / 440) * 320), 48, 26)}
                            <text x={Math.round((310 / 440) * 320)} y={82} fontFamily="monospace" fontSize="6" fill="#333" textAnchor="middle">{barcodeValue}</text>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <path d="M 10,15 H 310 A 10,10 0 0,1 320,25 V 42 H 390 A 8,8 0 0,1 390,58 H 320 V 75 A 10,10 0 0,1 310,85 H 10 A 10,10 0 0,1 0,75 V 25 A 10,10 0 0,1 10,15 Z" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
                      <text x={Math.round((65 / 440) * 320)} y={32} fontFamily="'Inter', sans-serif" fontWeight="800" fontSize={8} fill="#111" textAnchor="middle">{brandValue || "No Brand"}</text>
                      <text x={Math.round((15 / 440) * 320)} y={54} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={6} fill="#555">{categoryName || "Uncategorized"}</text>
                      <text x={Math.round((130 / 440) * 320)} y={54} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#444">SKU:{skuValue || ""}</text>
                      <text x={Math.round((15 / 440) * 320)} y={74} fontFamily="'Inter', sans-serif" fontWeight="700" fontSize={6} fill="#444">price:Rs.{priceValue || ""}</text>
                      <text x={Math.round((130 / 440) * 320)} y={74} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#444">M:{modelValue || ""}</text>
                      <text x={Math.round((240 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">A</text>
                      <text x={Math.round((240 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{sizeA || ""}</text>
                      <text x={Math.round((290 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">B</text>
                      <text x={Math.round((290 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{sizeB || ""}</text>
                      <text x={Math.round((340 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">DBL</text>
                      <text x={Math.round((340 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{dbl || ""}</text>
                      <text x={Math.round((390 / 440) * 320)} y={28} fontFamily="monospace" fontWeight="700" fontSize={5} fill="#777" textAnchor="middle">Tem</text>
                      <text x={Math.round((390 / 440) * 320)} y={38} fontFamily="monospace" fontWeight="700" fontSize={6} fill="#111" textAnchor="middle">{templeLength || ""}</text>
                      {renderMockBars(Math.round((230 / 440) * 320), Math.round((200 / 440) * 320), 48, 26)}
                      <text x={Math.round((270 / 440) * 320)} y={82} fontFamily="monospace" fontSize="6" fill="#333" textAnchor="middle">{barcodeValue}</text>
                    </>
                  )}
                </svg>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Generated TSPL Payload</h3>
              <pre className="bg-gray-50 rounded-2xl p-4 text-[10px] font-mono text-gray-700 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[220px]">
                {tsplOutput}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* -- Modal: Ingestion Checkpoint Loader -- */}
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
    </div>
  );
}
