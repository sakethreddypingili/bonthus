import React, { useState, useEffect, useMemo } from "react";
import { Printer, Terminal, Settings, HelpCircle, Plus, FolderPlus } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";

/**
 * BarcodePrinter Page Component
 * Refactored for a flat, solid straight rectangular label measuring 102mm x 25mm.
 * Target Printer: TSC TE244 (203 DPI / 8 dots per mm).
 * Allows auto-resolving barcode, manual category selection, and inline category creation.
 */
export default function BarcodePrinter({ userProfile }) {
  // 1. STATE MANAGEMENT
  const [barcodeValue, setBarcodeValue] = useState("1414199999");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [printQuantity, setPrintQuantity] = useState(1);
  const [categoryName, setCategoryName] = useState("Scanning...");

  // Inline Category Creation Modal state
  const [showCatDrawer, setShowCatDrawer] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', description: '', parent_id: '' });
  const [creatingCat, setCreatingCat] = useState(false);

  // Console log states
  const [logs, setLogs] = useState([
    { timestamp: new Date().toLocaleTimeString(), status: "INFO", message: "Barcode Printer module initialized." },
    { timestamp: new Date().toLocaleTimeString(), status: "INFO", message: "Printer profile selected: TSC TE244 (203 DPI)." }
  ]);
  const [printingStatus, setPrintingStatus] = useState("IDLE");
  const [agentStatus, setAgentStatus] = useState("CHECKING");

  // Check connectivity with local print agent with backoff to prevent flooding console when offline
  useEffect(() => {
    let active = true;
    let timeoutId;
    let checkDelay = 3000;

    const checkAgent = async () => {
      try {
        const res = await fetch("http://localhost:9100/ping", { method: "GET", mode: "cors" });
        if (res.ok) {
          if (active) {
            setAgentStatus("ONLINE");
            checkDelay = 5000; // Normal online poll interval
          }
        } else {
          if (active) {
            setAgentStatus("OFFLINE");
            checkDelay = Math.min(checkDelay * 2, 30000); // Backoff to prevent flooding
          }
        }
      } catch (err) {
        if (active) {
          setAgentStatus("OFFLINE");
          checkDelay = Math.min(checkDelay * 2, 30000); // Backoff to prevent flooding
        }
      }
      if (active) {
        timeoutId = setTimeout(checkAgent, checkDelay);
      }
    };

    checkAgent();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // 2. CONVERSION CONSTANTS
  const LABEL_WIDTH_MM = 35;
  const LABEL_HEIGHT_MM = 55;
  const GAP_MM = 2;

  // Helper to add log entries
  const addLog = (status, message) => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), status, message }
    ]);
  };

  // 3. FETCH CATEGORIES
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err.message);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Compute category paths
  const categoryPaths = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.id] = c;
    });
    
    const paths = {};
    const getPath = (id) => {
      if (paths[id]) return paths[id];
      const cat = map[id];
      if (!cat) return '';
      if (!cat.parent_id) {
        paths[id] = cat.name;
        return cat.name;
      }
      const parentPath = getPath(cat.parent_id);
      paths[id] = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      return paths[id];
    };
    
    categories.forEach(c => {
      getPath(c.id);
    });
    return paths;
  }, [categories]);

  // 4. AUTO-RESOLVE CATEGORY BY BARCODE
  useEffect(() => {
    const fetchCategory = async () => {
      if (!barcodeValue || barcodeValue.trim() === "") {
        setCategoryName("No Barcode");
        return;
      }
      
      try {
        const { data: bcData } = await supabase
          .from('product_barcodes')
          .select('product_id')
          .eq('barcode', barcodeValue)
          .maybeSingle();

        let prodId = bcData?.product_id;
        let query;
        if (prodId) {
          query = supabase
            .from('products')
            .select('id, name, category_id, category:categories(name)')
            .eq('id', prodId);
        } else {
          query = supabase
            .from('products')
            .select('id, name, category_id, category:categories(name)')
            .or(`sku.eq.${barcodeValue},upc.eq.${barcodeValue}`);
        }

        const { data: prodData, error: prodError } = await query.maybeSingle();
        
        if (prodError) throw prodError;
        if (prodData) {
          if (prodData.category_id) {
            setSelectedCategoryId(prodData.category_id);
          }
          addLog("INFO", `Resolved "${barcodeValue}" to category "${prodData.category?.name || "Uncategorized"}" (${prodData.name})`);
        }
      } catch (err) {
        console.error("Error auto-resolving barcode:", err.message);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchCategory();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [barcodeValue]);

  // Update printed category name when selected category changes
  useEffect(() => {
    if (selectedCategoryId) {
      setCategoryName(categoryPaths[selectedCategoryId] || "Uncategorized");
    } else {
      setCategoryName("Uncategorized");
    }
  }, [selectedCategoryId, categoryPaths]);

  // Split Category path
  const pathParts = useMemo(() => {
    const parts = categoryName.split(" > ");
    return {
      root: parts[0] || "",
      sub: parts.slice(1).join(" > ") || ""
    };
  }, [categoryName]);

  // 5. INLINE CATEGORY CREATION
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setCreatingCat(true);
    try {
      const { data, error } = await supabase.from('categories').insert([{
        name: newCat.name,
        description: newCat.description,
        parent_id: newCat.parent_id || null
      }]).select().single();

      if (error) throw error;
      
      addLog("SUCCESS", `Created new category "${newCat.name}"`);
      await fetchCategories();
      setSelectedCategoryId(data.id);
      setShowCatDrawer(false);
      setNewCat({ name: '', description: '', parent_id: '' });
    } catch (err) {
      alert("Failed to create category: " + err.message);
    } finally {
      setCreatingCat(false);
    }
  };

  // 6. TSPL GENERATION ENGINE
  const generateTsplCode = () => {
    const commands = [
      `SIZE ${LABEL_WIDTH_MM} mm, ${LABEL_HEIGHT_MM} mm`,
      `GAP ${GAP_MM} mm, 0 mm`,
      `DIRECTION 0,0`,
      `CLS`,
      `REFERENCE 0,0`,
      `TEXT 40,50,"3",0,1,1,"${pathParts.root}"`
    ];

    if (pathParts.sub) {
      commands.push(`TEXT 40,110,"3",0,1,1,"${pathParts.sub}"`);
    }

    commands.push(
      `BARCODE 40,290,"128",80,1,0,2,4,"${barcodeValue}"`,
      `TEXT 80,390,"3",0,1,1,"${barcodeValue}"`,
      `PRINT ${printQuantity},1`
    );

    return commands.join("\n");
  };

  const tsplOutput = generateTsplCode();

  // 7. DISPATCH LAYER
  const handlePrint = async () => {
    setPrintingStatus("SENDING...");
    addLog("PENDING", `Initiating print spool for ${printQuantity} copies...`);
    console.log("[BarcodePrinter] Starting print job spooling. Quantity:", printQuantity);
    console.log("[BarcodePrinter] TSPL command payload:\n", tsplOutput);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("[BarcodePrinter] Aborting request - 5 second connection timeout reached.");
      controller.abort();
    }, 5000);

    try {
      const targetUrl = "http://localhost:9100/print";
      addLog("INFO", `POST request dispatched to local print agent...`);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawTspl: tsplOutput }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setPrintingStatus("SUCCESS: Print Job Sent");
        addLog("SUCCESS", "Spooler confirmed. Dispatched raw TSPL payload successfully.");
      } else {
        const errorText = await response.text().catch(() => "No response body text available");
        throw new Error(`HTTP Error Status: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setPrintingStatus("ERROR: Spooler Offline");
      console.error("[BarcodePrinter] Print dispatch failed. Detailed error object:", error);
      
      addLog("ERROR", `Failed to connect: ${error.name} - ${error.message}`);
      addLog("DIAGNOSTIC", "🔍 ---- DIAGNOSTIC CHECKLIST ----");
      addLog("DIAGNOSTIC", "1. Ensure print agent is running: run 'node scripts/local-print-agent.js' in your terminal.");
      addLog("DIAGNOSTIC", "2. If using Cloudflare Tunnel (HTTPS), the browser may block localhost (HTTP) requests due to Mixed Content policies.");
      addLog("DIAGNOSTIC", "3. Check if local agent responds: open http://localhost:9100/ in a new tab.");
      addLog("DIAGNOSTIC", "4. Check for CORS blocking in browser console.");
      addLog("DIAGNOSTIC", "----------------------------------");
    }
  };

  const handleBrowserPrint = () => {
    addLog("INFO", "Initiating direct browser print...");
    setPrintingStatus("SENDING...");
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      const svgElement = document.getElementById("preview-label-svg");
      const svgHtml = svgElement ? svgElement.outerHTML : "";
      
      doc.write(`
        <html>
          <head>
            <title>Print Label</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&family=Space+Mono:wght@700&display=swap');
              @media print {
                @page {
                  size: 35mm 55mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  -webkit-print-color-adjust: exact;
                }
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 35mm;
                height: 55mm;
                box-sizing: border-box;
                overflow: hidden;
              }
              .print-wrapper {
                width: 35mm;
                height: 55mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                overflow: hidden;
              }
              svg {
                width: 35mm;
                height: 55mm;
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="print-wrapper">
              ${svgHtml}
            </div>
            <script>
              window.onload = function() {
                const totalCopies = ${printQuantity};
                if (totalCopies > 1) {
                  const container = document.body;
                  const labelHtml = container.innerHTML;
                  container.innerHTML = "";
                  for (let i = 0; i < totalCopies; i++) {
                    const pageDiv = document.createElement("div");
                    pageDiv.style.pageBreakAfter = i === totalCopies - 1 ? "avoid" : "always";
                    pageDiv.style.width = "35mm";
                    pageDiv.style.height = "55mm";
                    pageDiv.style.display = "flex";
                    pageDiv.style.alignItems = "center";
                    pageDiv.style.justifyContent = "center";
                    pageDiv.innerHTML = labelHtml;
                    container.appendChild(pageDiv);
                  }
                }
                
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.frameElement.remove();
                  }, 100);
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
      setPrintingStatus("SUCCESS: Print Dialog Opened");
      addLog("SUCCESS", `Direct browser print dialog opened for ${printQuantity} copies.`);
    } catch (err) {
      setPrintingStatus("ERROR: Print Failed");
      addLog("ERROR", `Direct print failed: ${err.message}`);
    }
  };

  // 8. MOCK BARCODE GENERATOR FOR SVG PREVIEW
  const renderMockBarcodeLines = () => {
    const lines = [];
    let startX = 40;
    const seed = barcodeValue || "1414199999";
    
    for (let i = 0; i < seed.length * 5; i++) {
      const charCode = seed.charCodeAt(i % seed.length);
      const width = (charCode % 3) + 2;
      const gap = ((charCode + i) % 4) + 2;
      
      if (startX + width + gap > 240) break;
      
      lines.push(
        <rect
          key={i}
          x={startX}
          y={295}
          width={width * 1.5}
          height={80}
          fill="black"
        />
      );
      startX += (width + gap) * 1.5;
    }
    return lines;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black uppercase tracking-tight flex items-center gap-2">
            <Printer className="w-6 h-6 sm:w-7 sm:h-7 text-black" />
            Barcode Printer Manager
          </h1>
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            TSC TE244 Layout Spooler & Hardware Manager
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 self-start sm:self-center">
          <span className={`w-2 h-2 rounded-full ${
            agentStatus === "ONLINE" ? "bg-green-500 animate-pulse" :
            agentStatus === "OFFLINE" ? "bg-red-500 animate-pulse" : "bg-yellow-500"
          }`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
            Local Agent: {agentStatus}
          </span>
        </div>
      </div>

      {agentStatus === "OFFLINE" && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            ⚠️ LOCAL PRINT AGENT IS OFFLINE
          </div>
          <p>
            Your browser cannot communicate with the local hardware spooler at <code>http://localhost:9100</code>.
          </p>
          <div className="bg-white/60 p-3 rounded-lg border border-red-100 font-mono text-[10px] leading-relaxed text-red-900 space-y-1">
            <div><strong>How to fix:</strong></div>
            <div>1. Open a new terminal in the project directory.</div>
            <div>2. Run the print agent command: <code className="bg-red-100 px-1 py-0.5 rounded text-black font-bold">node scripts/local-print-agent.js</code></div>
            <div>3. <strong>Cloudflare / HTTPS Warning:</strong> If you are accessing this site via HTTPS (e.g., Cloudflare tunnel), browsers block connections to HTTP localhost by default. You must open <a href="http://localhost:9100/ping" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">http://localhost:9100/ping</a> in a new tab and click "Proceed" / "Allow" or access the application via a non-secure local HTTP URL (e.g. your local dev server address) if possible.</div>
          </div>
        </div>
      )}

      {/* Main Layout Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Panel: Configuration Form */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              Tag Properties
            </h2>
            
            <div className="space-y-4">
              {/* Barcode Value */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Barcode Value (Alphanumeric)
                </label>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                  placeholder="1414199999"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-white"
                />
              </div>

              {/* Category Dropdown & Quick Create */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Category Selection
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCatDrawer(true)}
                    className="text-[9px] font-bold uppercase tracking-wider text-black flex items-center gap-1 hover:underline"
                  >
                    <FolderPlus className="w-3 h-3" /> Quick Add
                  </button>
                </div>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-white"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {categoryPaths[c.id] || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity to Print */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Print Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-white"
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={handleBrowserPrint}
                disabled={printingStatus.includes("SENDING")}
                className="w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:bg-neutral-400 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Print Label (Direct Browser)
              </button>

              <button
                onClick={handlePrint}
                disabled={printingStatus.includes("SENDING")}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:bg-neutral-100 disabled:text-neutral-400"
              >
                <Settings className="w-3.5 h-3.5" />
                Spool via Local Print Agent (Raw TSPL)
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-[#F8F9FB] border border-gray-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              Straight Sticker Layout Specifications
            </h3>
            <ul className="text-xs text-gray-500 space-y-2 leading-relaxed">
              <li>• <strong>No Dumbbell Fold:</strong> Designed for standard 102mm x 25mm labels using full width.</li>
              <li>• <strong>Category Selection:</strong> Auto-resolves by barcode or select manually from the dropdown.</li>
              <li>• <strong>Direction:</strong> `DIRECTION 0,0` handles feeding orientation without text inversion.</li>
            </ul>
          </div>
        </div>

        {/* Right Panel: SVG Preview & Code Console */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Label Preview Container */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Real-time Sticker Preview (35mm x 55mm - Dumbbell)
            </h2>

            {/* Simulated Label Canvas */}
            <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex items-center justify-center overflow-x-auto min-h-[300px]">
              <svg
                id="preview-label-svg"
                viewBox="0 0 280 440"
                className="h-[350px] w-auto border border-gray-200 shadow-sm bg-white"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Dumbbell sticker boundary path */}
                <path
                  d="M 110,165 A 30,30 0 0,0 15,135 V 45 A 30,30 0 0,1 45,15 H 235 A 30,30 0 0,1 265,45 V 135 A 30,30 0 0,0 170,165 V 275 A 30,30 0 0,0 265,305 V 395 A 30,30 0 0,1 235,425 H 45 A 30,30 0 0,1 15,395 V 305 A 30,30 0 0,0 110,275 Z"
                  fill="#fafafa"
                  stroke="#dddddd"
                  strokeWidth="2"
                />

                {/* Top Lobe Content (Text Group) */}
                <text
                  x="140"
                  y="70"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="bold"
                  fontSize="24"
                  fill="black"
                  textAnchor="middle"
                >
                  {pathParts.root}
                </text>

                {pathParts.sub && (
                  <text
                    x="140"
                    y="120"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    fontWeight="bold"
                    fontSize="20"
                    fill="black"
                    textAnchor="middle"
                  >
                    {pathParts.sub}
                  </text>
                )}

                {/* Bottom Lobe Content (Horizontal Barcode Group) */}
                {renderMockBarcodeLines()}
                <text
                  x="140"
                  y="400"
                  fontFamily="monospace"
                  fontSize="18"
                  fill="black"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {barcodeValue || "1414199999"}
                </text>
              </svg>
            </div>
          </div>

          {/* Terminal styled Console Logs */}
          <div className="bg-black text-white border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-neutral-900 border-b border-neutral-800 px-5 py-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                Spooler Logs & Status Monitor
              </span>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                  printingStatus === "IDLE" ? "bg-neutral-500" :
                  printingStatus.includes("SENDING") ? "bg-amber-500 animate-pulse" :
                  printingStatus.includes("SUCCESS") ? "bg-green-500" : "bg-red-500"
                }`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {printingStatus}
                </span>
              </div>
            </div>
            
            <div className="p-5 font-mono text-xs space-y-1.5 max-h-[160px] overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-neutral-500 flex-shrink-0">[{log.timestamp}]</span>
                  <span className={`flex-shrink-0 font-bold ${
                    log.status === "INFO" ? "text-blue-400" :
                    log.status === "PENDING" ? "text-amber-400" :
                    log.status === "SUCCESS" ? "text-green-400" :
                    log.status === "DIAGNOSTIC" ? "text-yellow-500" : "text-red-400"
                  }`}>
                    {log.status}:
                  </span>
                  <span className={log.status === "DIAGNOSTIC" ? "text-yellow-200" : "text-neutral-300"}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Drawer: Quick Create Category */}
      <SlideDrawer
        isOpen={showCatDrawer}
        onClose={() => { setShowCatDrawer(false); setNewCat({ name: '', description: '', parent_id: '' }); }}
        title="Quick Register Category"
        subtitle="Append a new category directly to the database"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleCreateCategory} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Classification Name</label>
              <input
                type="text"
                required
                value={newCat.name}
                onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="E.g. Sunglasses"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Parent Category (Optional)</label>
              <select
                value={newCat.parent_id}
                onChange={e => setNewCat({ ...newCat, parent_id: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
              >
                <option value="">None (Root Category)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {categoryPaths[c.id]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
              <textarea
                rows="3"
                value={newCat.description}
                onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none resize-none transition-all"
                placeholder="Define the bounds of this category..."
              />
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setShowCatDrawer(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
              <button type="submit" disabled={creatingCat} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                {creatingCat ? "Creating..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>

    </div>
  );
}
