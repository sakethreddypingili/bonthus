import React, { useState } from 'react';
import { Plus, QrCode, Download, Printer } from 'lucide-react';
import { supabase } from '../server/supabase/supabase';

export default function BarcodeCreator({ userProfile }) {
  const [generateMode, setGenerateMode] = useState("bulk"); //"single" or"bulk"
  const [quantity, setQuantity] = useState(10);
  const [createdBarcodes, setCreatedBarcodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.store_name === 'All';

  const generateBarcodeValue = () => {
    const randomDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    return `8901${randomDigits}`;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setNotice("");
    setIsGenerating(true);
    try {
      const targetStoreId = userProfile?.store_id;
      if (!targetStoreId && !isSuperAdmin) throw new Error("Store not found for current user.");

      const countRaw = generateMode === "single" ? 1 : parseInt(quantity, 10);
      const count = Number.isNaN(countRaw) ? 1 : Math.max(1, Math.min(500, countRaw));
      const generated = new Set();
      while (generated.size < count) {
        generated.add(generateBarcodeValue());
      }

      const payload = Array.from(generated).map((barcode) => ({
        barcode,
        status: "unassigned",
        store_id: targetStoreId || null
      }));

      const { data, error } = await supabase
        .from("barcode_vectors")
        .insert(payload)
        .select("id, barcode, status, created_at");

      if (error) throw error;
      setCreatedBarcodes(data || []);
      setNotice(`Created ${data?.length || 0} barcode vectors.`);
    } catch (err) {
      setNotice(err.message || "Failed to create barcode vectors.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Barcode Creator</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Deploy new operational barcode vectors</p>
          {notice && <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-gray-500">{notice}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10 items-start">
        {/* Configuration Panel */}
        <aside className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-8 sticky top-6">
          <div className="border-b border-gray-50 pb-6">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Vector Config</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Specify generation parameters</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl border border-gray-100">
              <button 
                type="button" 
                onClick={() => setGenerateMode("single")}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl  ${generateMode ==="single" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
              >
                Single Entity
              </button>
              <button 
                type="button" 
                onClick={() => setGenerateMode("bulk")}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl  ${generateMode ==="bulk" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
              >
                Bulk Vector
              </button>
            </div>

            {generateMode ==="bulk" && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Quantity to Generate</label>
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
            )}

            <button 
              type="submit"
              disabled={isGenerating}
              className="w-full py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-[0.98]  disabled:opacity-20 flex items-center justify-center gap-2"
            >
              {isGenerating ?"Syncing..." : <><Plus size={16} strokeWidth={3} /> Commit Generation</>}
            </button>
          </form>
        </aside>

        {/* Preview Panel */}
        <section className="bg-white rounded-[40px] border border-gray-100 p-8 md:p-10 shadow-sm min-h-[600px] flex flex-col">
          {createdBarcodes.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-50">
                <div>
                  <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Manifest Preview</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Generated {createdBarcodes.length} vectors successfully</p>
                </div>
                <div className="flex gap-2">
                   <button className="p-3 border border-gray-100 rounded-2xl text-black hover:bg-black hover:text-white">
                     <Printer size={18} strokeWidth={3} />
                   </button>
                   <button className="p-3 bg-black text-white rounded-2xl shadow-lg hover:scale-110">
                     <Download size={18} strokeWidth={3} />
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 no-scrollbar">
                {createdBarcodes.map(vector => (
                  <div key={vector.id} className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 hover:border-black  group">
                    {/* Mock Barcode */}
                    <div className="h-12 w-full flex items-center justify-center gap-0.5 opacity-80 mix-blend-multiply group-hover:opacity-100">
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-0.5 h-full bg-black"></div>
                      <div className="w-1.5 h-full bg-black"></div>
                      <div className="w-3 h-full bg-black"></div>
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[11px] font-black tracking-widest text-black">{vector.barcode}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">ID: {vector.id}</p>
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
