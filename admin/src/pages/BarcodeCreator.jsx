import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Layers, ScanBarcode, QrCode, Download, Printer, CheckCircle2, Database, ChevronRight, Tags } from 'lucide-react';
import { supabase } from "../server/supabase/supabase";

export default function BarcodeCreator() {
  const [generateMode, setGenerateMode] = useState("bulk");
  const [quantity, setQuantity] = useState(10);
  const [createdBarcodes, setCreatedBarcodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cascading Category states
  const [categories, setCategories] = useState([]);
  const [cascadePath, setCascadePath] = useState([]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setLoadingProducts(true);
    try {
      // Fetch Products
      const { data: pData, error: pError } = await supabase.from('products').select('id, name, sku, base_price').order('name');
      if (pError) throw pError;
      setProducts(pData || []);
      if (pData?.length > 0) setSelectedProductId(pData[0].id);

      // Fetch Categories
      const { data: cData, error: cError } = await supabase.from('categories').select('id, name, parent_id').order('name');
      if (cError) throw cError;
      setCategories(cData || []);
    } catch (err) {
      console.error("Error fetching initial data:", err.message);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // parentId (or '__root__') → direct children array for cascading picker
  const categoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

  const selectedBreadcrumb = useMemo(() => {
    if (cascadePath.length === 0) return '';
    return cascadePath
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(' › ');
  }, [cascadePath, categories]);

  const handleLevelSelect = (depth, selectedId) => {
    if (!selectedId) {
      setCascadePath(prev => prev.slice(0, depth));
      return;
    }
    const newPath = [...cascadePath.slice(0, depth), selectedId];
    setCascadePath(newPath);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const count = parseInt(quantity, 10) || 1;

      if (generateMode === "single") {
        if (!selectedProductId) {
          alert("Please select a target product first.");
          return;
        }

        const dbEntries = [];
        for (let i = 0; i < count; i++) {
          const newBarcodeVal = "8901" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
          dbEntries.push({
            barcode: newBarcodeVal,
            product_id: selectedProductId
          });
        }

        const { data, error } = await supabase
          .from('product_barcodes')
          .insert(dbEntries)
          .select();

        if (error) throw error;
        
        // Enrich barcode list with product name and price for preview
        const selectedProd = products.find(p => p.id === selectedProductId);
        const enriched = (data || []).map(b => ({
          ...b,
          product_name: selectedProd?.name || 'Linked Product',
          price: selectedProd?.base_price || 0
        }));

        setCreatedBarcodes(enriched);
        alert(`Successfully generated and linked ${data?.length} barcodes.`);
      } else {
        // Bulk Mode
        const activeCategoryId = cascadePath[cascadePath.length - 1];
        if (!activeCategoryId) {
          alert("Please select a target category first.");
          return;
        }

        const categoryName = categories.find(c => c.id === activeCategoryId)?.name || "Bulk Product";
        
        // Pre-generate barcode values
        const generatedCodes = [];
        for (let i = 0; i < count; i++) {
          generatedCodes.push("8901" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'));
        }

        // 1. Create product entries for each barcode
        const productEntries = generatedCodes.map(code => ({
          name: `${categoryName} (Bulk)`,
          sku: code,
          category_id: activeCategoryId,
          base_price: 0
        }));

        const { data: insertedProducts, error: pError } = await supabase
          .from('products')
          .insert(productEntries)
          .select();

        if (pError) throw pError;

        // 2. Create and link barcode entries
        const barcodeEntries = insertedProducts.map((p, idx) => ({
          barcode: generatedCodes[idx],
          product_id: p.id
        }));

        const { data: insertedBarcodes, error: bError } = await supabase
          .from('product_barcodes')
          .insert(barcodeEntries)
          .select();

        if (bError) throw bError;

        // Enrich barcodes for preview
        const enriched = (insertedBarcodes || []).map((b, idx) => ({
          ...b,
          product_name: insertedProducts[idx]?.name || 'Bulk Item',
          price: 0
        }));

        setCreatedBarcodes(enriched);
        alert(`Successfully generated ${insertedBarcodes?.length} barcodes and linked them to new product entries.`);
      }
    } catch (err) {
      alert("Generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Dynamic CSS styles to format printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-barcode-sheet, #printable-barcode-sheet * {
            visibility: visible;
          }
          #printable-barcode-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1.5cm;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
          }
          .print-card {
            border: 1px dashed #aaa !important;
            border-radius: 8px !important;
            padding: 12px !important;
            background: white !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100 no-print">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Barcode Creator</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Deploy new operational barcode vectors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 items-start no-print">
        {/* Configuration Panel */}
        <aside className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-8 sticky top-6">
          <div className="border-b border-gray-50 pb-6">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Barcode Creator</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Specify generation parameters</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl border border-gray-100">
              <button 
                type="button" 
                onClick={() => setGenerateMode("single")}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl ${generateMode === "single" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
              >
                Single Entity
              </button>
              <button 
                type="button" 
                onClick={() => setGenerateMode("bulk")}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl ${generateMode === "bulk" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
              >
                Bulk Vector
              </button>
            </div>

            {/* Conditional input columns */}
            {generateMode === "single" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                  <Database size={10} /> Target Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none focus:bg-white focus:border-black transition-all"
                  required
                  disabled={loadingProducts}
                >
                  {loadingProducts ? <option>Syncing Catalog...</option> : 
                    products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)
                  }
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">
                  <Tags size={11} /> Target Category
                </label>
                
                <div className="space-y-3">
                  {/* Cascading Category Selector */}
                  {(categoryChildMap['__root__'] || []).length > 0 && (
                    <CascadeLevel
                      depth={0}
                      options={categoryChildMap['__root__'] || []}
                      selectedId={cascadePath[0] || ''}
                      onSelect={id => handleLevelSelect(0, id)}
                    />
                  )}

                  {cascadePath.map((selectedId, depth) => {
                    const children = categoryChildMap[selectedId] || [];
                    if (children.length === 0) return null;
                    return (
                      <CascadeLevel
                        key={selectedId}
                        depth={depth + 1}
                        options={children}
                        selectedId={cascadePath[depth + 1] || ''}
                        onSelect={id => handleLevelSelect(depth + 1, id)}
                      />
                    );
                  })}

                  {selectedBreadcrumb ? (
                    <div className="flex items-center gap-2 mt-1 px-4 py-2.5 bg-black rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                      <span className="text-[9px] font-black text-white uppercase tracking-widest truncate">
                        {selectedBreadcrumb}
                      </span>
                    </div>
                  ) : cascadePath.length > 0 ? (
                    <div className="flex items-center gap-2 mt-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Confirm or select sub-level...
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Barcode Count</label>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[18px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isGenerating || loadingProducts || (generateMode === "bulk" && cascadePath.length === 0)}
              className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-2"
            >
              {isGenerating ? "Syncing..." : <><Plus size={16} strokeWidth={3} /> Commit Generation</>}
            </button>
          </form>
        </aside>

        {/* Preview Panel */}
        <section className="bg-white rounded-[40px] border border-gray-100 p-8 md:p-10 shadow-sm min-h-[600px] flex flex-col">
          {createdBarcodes.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-50">
                <div>
                  <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Print Sheet Preview</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Generated {createdBarcodes.length} vectors successfully</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handlePrint}
                    className="p-3 border border-gray-100 rounded-2xl text-black hover:bg-black hover:text-white transition-all"
                    title="Print Sheet"
                  >
                    <Printer size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Printable Barcode Sheet Container */}
              <div id="printable-barcode-sheet" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 no-scrollbar print-grid">
                {createdBarcodes.map(vector => (
                  <div key={vector.id} className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 hover:border-black group print-card shadow-sm">
                    {/* Header Store Label */}
                    <div className="text-center w-full">
                      <p className="text-[8px] font-black text-black uppercase tracking-widest">LensCare Opticals</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase truncate mt-0.5 max-w-[160px] mx-auto">{vector.product_name}</p>
                    </div>

                    {/* Mock Barcode Graphics */}
                    <div className="h-10 w-full flex items-center justify-center gap-0.5 opacity-80 mix-blend-multiply group-hover:opacity-100">
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-0.5 h-full bg-black"></div>
                      <div className="w-1.5 h-full bg-black"></div>
                      <div className="w-3 h-full bg-black"></div>
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-0.5 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-1.5 h-full bg-black"></div>
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                    </div>

                    {/* Code Details */}
                    <div className="text-center w-full">
                      <p className="font-mono text-[10px] font-black tracking-widest text-black">{vector.barcode}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100/55 text-[8px] font-black text-gray-400 uppercase tracking-wider">
                        <span>ID: {vector.id.slice(0,8)}</span>
                        <span className="text-black font-extrabold">{vector.price > 0 ? `$${Number(vector.price).toFixed(2)}` : '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
              <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 shadow-inner">
                <QrCode size={48} className="text-gray-200" strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Studio Standby</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 max-w-xs mx-auto">
                Select generation mode and quantity to produce operational vectors
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── CascadeLevel sub-component ─────────────────────────────────────────────
function CascadeLevel({ depth, options, selectedId, onSelect }) {
  const levelLabels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
  const label = levelLabels[depth] || `Level ${depth + 1}`;

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute -top-3 left-3 flex items-center gap-1">
          <div className="w-px h-3 bg-gray-200" />
          <ChevronRight size={10} className="text-gray-300 -ml-0.5" />
        </div>
      )}
      <div className={`rounded-xl overflow-hidden border transition-all ${
        selectedId ? 'border-black bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center px-4 py-0.5 border-b border-gray-50">
          <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">
            {label}
          </span>
        </div>
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer text-black appearance-none"
        >
          <option value="">— Select —</option>
          {options.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

