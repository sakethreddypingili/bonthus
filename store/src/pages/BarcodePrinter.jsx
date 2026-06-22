import React, { useState } from "react";
import { Printer, Terminal, Settings, HelpCircle } from "lucide-react";

/**
 * BarcodePrinter Page Component
 * Refactored for a flat, solid straight rectangular label measuring 102mm x 25mm.
 * Target Printer: TSC TE244 (203 DPI / 8 dots per mm).
 */
export default function BarcodePrinter({ userProfile }) {
  // 1. STATE MANAGEMENT
  const [productName, setProductName] = useState("Premium EyeWear");
  const [price, setPrice] = useState("1499");
  const [barcodeValue, setBarcodeValue] = useState("1414199999");
  const [printQuantity, setPrintQuantity] = useState(1);

  // Console log states
  const [logs, setLogs] = useState([
    { timestamp: new Date().toLocaleTimeString(), status: "INFO", message: "Barcode Printer module initialized." },
    { timestamp: new Date().toLocaleTimeString(), status: "INFO", message: "Printer profile selected: TSC TE244 (203 DPI)." }
  ]);
  const [printingStatus, setPrintingStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR

  // 2. CONVERSION CONSTANTS
  // TSC TE244 resolution: 203 DPI (8 dots per mm)
  // const DOTS_PER_MM = 8;
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

  // 3. TSPL GENERATION ENGINE
  const generateTsplCode = () => {
    // Format price to prepend rupee symbol if not present
    const formattedPrice = price.startsWith("₹") ? price : `₹ ${price}`;

    // Exact optimized TSPL command block for TSC TE244 straight label
    return [
      `SIZE ${LABEL_WIDTH_MM} mm, ${LABEL_HEIGHT_MM} mm`,
      `GAP ${GAP_MM} mm, 0 mm`,
      `DIRECTION 0,0`,
      `CLS`,
      `REFERENCE 0,0`,
      `TEXT 40,30,"3",0,1,1,"${productName}"`,
      `TEXT 40,75,"2",0,1,1,"(Inc. Of All Taxes)"`,
      `TEXT 40,110,"2",0,1,1,"Qty 1"`,
      `TEXT 40,145,"4",0,1,1,"${formattedPrice}"`,
      `BARCODE 450,50,"128",75,1,0,2,4,"${barcodeValue}"`,
      `TEXT 530,145,"3",0,1,1,"${barcodeValue}"`,
      `PRINT ${printQuantity},1`
    ].join("\n");
  };

  const tsplOutput = generateTsplCode();

  // 4. DISPATCH LAYER (Option A - Asynchronous Local Daemon Service)
  const handlePrint = async () => {
    setPrintingStatus("SENDING...");
    addLog("PENDING", `Initiating print spool for ${printQuantity} copies...`);
    console.log("[BarcodePrinter] Starting print job spooling. Quantity:", printQuantity);
    console.log("[BarcodePrinter] TSPL command payload:\n", tsplOutput);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("[BarcodePrinter] Aborting request - 5 second connection timeout reached.");
      controller.abort();
    }, 5000); // 5-second connection timeout controller

    try {
      const targetUrl = "http://localhost:9100/print";
      console.log(`[BarcodePrinter] Dispatching fetch request to Local Agent at: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rawTspl: tsplOutput }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`[BarcodePrinter] Received response status: ${response.status} (${response.statusText})`);

      if (response.ok) {
        setPrintingStatus("SUCCESS: Print Job Sent");
        addLog("SUCCESS", "Spooler confirmed. Dispatched raw TSPL payload successfully.");
        console.log("[BarcodePrinter] Print job successfully accepted by local daemon.");
      } else {
        const errorText = await response.text().catch(() => "No response body text available");
        console.error(`[BarcodePrinter] HTTP Error received. Status: ${response.status}. Response body: ${errorText}`);
        throw new Error(`HTTP Error Status: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setPrintingStatus("ERROR: Connection Timeout (Local Agent Offline)");
      console.error("[BarcodePrinter] Print dispatch failed. Detailed error object:", error);
      if (error.name === "AbortError") {
        addLog("ERROR", "Connection Timeout: Print daemon at localhost:9100 did not respond within 5 seconds.");
        console.error("[BarcodePrinter] Request was aborted due to timeout. Verify the local daemon on port 9100 is running and not blocked by CORS/firewall.");
      } else {
        addLog("ERROR", `Failed to connect: ${error.message || "Local Agent is offline or unreachable."}`);
        console.error("[BarcodePrinter] Connection or Network error. Make sure the local agent server is listening on port 9100. Error Message:", error.message);
      }
    }
  };

  // 5. MOCK BARCODE GENERATOR FOR SVG PREVIEW
  const renderMockBarcodeLines = () => {
    const lines = [];
    let startX = 450;
    const barcodeWidth = 280; // proportional size for preview
    const seed = barcodeValue || "1414199999";
    
    for (let i = 0; i < seed.length * 3.5; i++) {
      const charCode = seed.charCodeAt(i % seed.length);
      const width = (charCode % 3) + 1; // bar thickness: 1, 2, or 3px
      const gap = ((charCode + i) % 4) + 1; // gap width: 1 to 4px
      
      if (startX + width + gap > 450 + barcodeWidth) break;
      
      lines.push(
        <rect
          key={i}
          x={startX}
          y={50}
          width={width * 2}
          height={75}
          fill="black"
        />
      );
      startX += (width + gap) * 2.2;
    }
    return lines;
  };

  const formattedPrice = price.startsWith("₹") ? price : `₹ ${price}`;

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
              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Premium EyeWear"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-white"
                />
              </div>

              {/* Price / AOV */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Price / AOV (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={price.replace(/[^\d]/g, "")}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1499"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all bg-white"
                  />
                </div>
              </div>

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
              <li>• <strong>Text coordinates:</strong> Left column starts at X=40. Barcode begins at X=450 to fill the right half.</li>
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
              {/* Responsive SVG representing full 102mm x 25mm straight tag (816 x 200 viewbox) */}
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
                  y="30"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="bold"
                  fontSize="24"
                  fill="black"
                  dominantBaseline="middle"
                >
                  {productName || "Premium EyeWear"}
                </text>

                <text
                  x="40"
                  y="75"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="600"
                  fontSize="15"
                  fill="#555555"
                  dominantBaseline="middle"
                >
                  (Inc. Of All Taxes)
                </text>

                <text
                  x="40"
                  y="110"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="600"
                  fontSize="15"
                  fill="#555555"
                  dominantBaseline="middle"
                >
                  Qty 1
                </text>

                <text
                  x="40"
                  y="145"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="bold"
                  fontSize="28"
                  fill="black"
                  dominantBaseline="middle"
                >
                  {formattedPrice}
                </text>

                {/* Right Column: Barcode Representation */}
                {renderMockBarcodeLines()}

                <text
                  x="530"
                  y="145"
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
    </div>
  );
}
