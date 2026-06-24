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

  // 2. CONVERSION CONSTANTS
  const LABEL_WIDTH_MM = 102;
  const LABEL_HEIGHT_MM = 25;
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
      `TEXT 40,40,"3",0,1,1,"${pathParts.root}"`
    ];

    if (pathParts.sub) {
      commands.push(`TEXT 40,100,"3",0,1,1,"${pathParts.sub}"`);
    }

    commands.push(
      `BARCODE 350,30,"128",120,1,0,3,6,"${barcodeValue}"`,
      `TEXT 530,165,"3",0,1,1,"${barcodeValue}"`,
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
        addLog("SUCCESS", "Spooler confirmed. Dispatched rawTL payload successfully.");
      } else {
        const errorText = await response.text().catch(() => "No response body text available");
        throw new Error(`HTTP Error Status: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setPrintingStatus("ERROR: Connection Timeout (Local Agent Offline)");
      if (error.name === "AbortError") {
        addLog("ERROR", "Connection Timeout: Print daemon at localhost:9100 did not respond within 5 seconds.");
      } else {
        addLog("ERROR", `Failed to connect: ${error.message || "Local Agent is offline or unreachable."}`);
      }
    }
  };

  // 8. MOCK BARCODE GENERATOR FOR SVG PREVIEW
  const renderMockBarcodeLines = () => {
    const lines = [];
    let startX = 350;
    const barcodeWidth = 430;
    const seed = barcodeValue || "1414199999";
    
    for (let i = 0; i < seed.length * 5; i++) {
      const charCode = seed.charCodeAt(i % seed.length);
      const width = (charCode % 3) + 2;
      const gap = ((charCode + i) % 4) + 2;
      
      if (startX + width + gap > 350 + barcodeWidth) break;
      
      lines.push(
        <rect
          key={i}
          x={startX}
          y={30}
          width={width * 1.8}
          height={120}
          fill="black"
        />
      );
      startX += (width + gap) * 1.8;
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
      </div>

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

            <button
              onClick={handlePrint}
              disabled={printingStatus.includes("SENDING")}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:bg-neutral-400 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Send to local printer
            </button>
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
              Real-time Sticker Preview (102mm x 25mm)
            </h2>

            {/* Simulated Label Canvas */}
            <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex items-center justify-center overflow-x-auto min-h-[160px]">
              <svg
                viewBox="0 0 816 200"
                className="w-full max-w-2xl border border-gray-200 shadow-sm bg-white"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Full Straight Sticker Border */}
                <rect
                  x="0"
                  y="0"
                  width="816"
                  height="200"
                  fill="#fafafa"
                  stroke="#dddddd"
                  strokeWidth="2"
                  rx="4"
                />

                {/* Left Column Text Group */}
                <text
                  x="40"
                  y="50"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="bold"
                  fontSize="24"
                  fill="black"
                  dominantBaseline="middle"
                >
                  {pathParts.root}
                </text>

                {pathParts.sub && (
                  <text
                    x="40"
                    y="110"
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                    fontWeight="bold"
                    fontSize="22"
                    fill="black"
                    dominantBaseline="middle"
                  >
                    {pathParts.sub}
                  </text>
                )}

                {/* Right Column: Barcode Representation */}
                {renderMockBarcodeLines()}

                <text
                  x="530"
                  y="165"
                  fontFamily="monospace"
                  fontSize="22"
                  fill="black"
                  fontWeight="bold"
                  dominantBaseline="middle"
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
                    log.status === "SUCCESS" ? "text-green-400" : "text-red-400"
                  }`}>
                    {log.status}:
                  </span>
                  <span className="text-neutral-300">{log.message}</span>
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
              <button type="button" onClick={() => setShowCatDrawer(true)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
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
