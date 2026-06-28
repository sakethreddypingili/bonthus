import React, { useState, useEffect } from 'react';
import { supabase } from '../../server/supabase/supabase';
import SlideDrawer from '../common/SlideDrawer';
import { Tag, Sparkles, ShieldAlert, Check, ChevronRight, Image as ImageIcon, Wrench, Gift } from 'lucide-react';

export default function FrameWizard({
  isOpen,
  onClose,
  onSelectFrame,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [frames, setFrames] = useState([]);
  const [fittingChargesItem, setFittingChargesItem] = useState(null);

  // Selection state
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [frameSpecs, setFrameSpecs] = useState({
    color: '',
    lensWidth: '',
    bridgeWidth: '',
    templeLength: '',
    image_url: '',
    frameType: 'Full Rim',
    frameMaterial: 'Metallic',
    frameShape: 'Rectangular',
  });

  // No color presets — user types color freely
  const [validationErrors, setValidationErrors] = useState(null);
  useEffect(() => {
    if (isOpen) {
      fetchFrameCatalog();
    } else {
      // Reset state on close
      setStep(1);
      setSelectedFrame(null);
      setFrameSpecs({
        color: '',
        lensWidth: '',
        bridgeWidth: '',
        templeLength: '',
        image_url: '',
        frameType: 'Full Rim',
        frameMaterial: 'Metallic',
        frameShape: 'Rectangular',
      });
    }
  }, [isOpen]);

  const fetchFrameCatalog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('frame_catalog')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      const frameList = (data || []).filter(item => item.frame_type === 'frame');
      const fitItem = (data || []).find(item => item.frame_type === 'fitting');

      setFrames(frameList);
      setFittingChargesItem(fitItem);
    } catch (err) {
      console.error('Error fetching frame catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFrameBrandSelect = (frame) => {
    setSelectedFrame(frame);
    setStep(2);
  };

  const handleComplete = () => {
    if (!selectedFrame) return;

    const price = parseFloat(selectedFrame.price);
    const sizeString = `${frameSpecs.lensWidth || '-'}-${frameSpecs.bridgeWidth || '-'}-${frameSpecs.templeLength || '-'}`;

    onSelectFrame({
      frame_catalog_id: selectedFrame.id,
      name: selectedFrame.brand,
      brand: selectedFrame.brand,
      price: price,
      is_b1g1: !!selectedFrame.is_b1g1,
      fitting_added: false,
      fitting_price: 0,
      custom_frame_specs: {
        frame_catalog_id: selectedFrame.id,
        brand: selectedFrame.brand,
        model_name: selectedFrame.brand,
        color: frameSpecs.color,
        lens_width: frameSpecs.lensWidth,
        bridge_width: frameSpecs.bridgeWidth,
        temple_length: frameSpecs.templeLength,
        frame_type: frameSpecs.frameType,
        material: frameSpecs.frameMaterial,
        shape: frameSpecs.frameShape,
        size: sizeString,
        image_url: frameSpecs.image_url,
        is_b1g1: !!selectedFrame.is_b1g1,
        fitting_charges_added: false,
        fitting_charges_price: 0,
      }
    });
    onClose();
  };

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add Frame"
      subtitle={step === 1 ? "Select Frame Brand" : step === 2 ? "Enter Frame Specs & Details" : "Review & Confirmation"}
      width="max-w-2xl"
    >
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="py-20 text-center flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading catalog...</span>
          </div>
        ) : (
          <>
            {/* STEP 1: SELECT BRAND */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={16} className="text-black" />
                  <h3 className="text-xs font-black text-black uppercase tracking-widest">Select Frame Brand</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {frames.map((fr) => {
                    const isSelected = selectedFrame?.id === fr.id;
                    return (
                      <div
                        key={fr.id}
                        onClick={() => handleFrameBrandSelect(fr)}
                        className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-4 ${
                          isSelected
                            ? 'border-black ring-2 ring-black bg-white shadow-md'
                            : 'border-gray-100 bg-gray-50/50 text-black hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {fr.is_b1g1 && (
                          <span className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-black bg-black text-white flex items-center gap-1">
                            <Gift size={11} /> BUY 1 GET 1
                          </span>
                        )}
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                            Optical Brand
                          </span>
                          <h4 className="text-xl font-black uppercase tracking-tight mt-1 text-black">{fr.brand}</h4>
                        </div>
                        <div className="flex justify-between items-end border-t pt-4 border-gray-100">
                          <span className="text-lg font-black font-mono text-black">₹{parseFloat(fr.price).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-black">
                            Select Brand <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: FRAME SPECS & DETAILS */}
            {step === 2 && selectedFrame && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-5 rounded-2xl">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Selected Brand</span>
                    <h4 className="text-base font-black uppercase text-black">{selectedFrame.brand}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black font-mono text-black">₹{parseFloat(selectedFrame.price).toLocaleString('en-IN')}</span>
                    {selectedFrame.is_b1g1 && (
                      <span className="bg-black text-white border border-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                        <Gift size={12} /> BUY 1 GET 1
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Row 1: Color + Frame Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Frame Color</label>
                      <input
                        type="text"
                        value={frameSpecs.color}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, color: e.target.value })}
                        placeholder="e.g. Matte Black"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none ${
                          validationErrors?.color ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Frame Type</label>
                      <select
                        value={frameSpecs.frameType}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, frameType: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                      >
                        <option value="Full Rim">Full Rim</option>
                        <option value="Half Rim">Half Rim</option>
                        <option value="Rimless">Rimless</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Material + Shape */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Material</label>
                      <select
                        value={frameSpecs.frameMaterial}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, frameMaterial: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                      >
                        <option value="Metallic">Metallic</option>
                        <option value="Non Metallic">Non Metallic</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Shape</label>
                      <select
                        value={frameSpecs.frameShape}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, frameShape: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                      >
                        <option value="Rectangular">Rectangular</option>
                        <option value="Round">Round</option>
                        <option value="Oval">Oval</option>
                        <option value="Aviator">Aviator</option>
                        <option value="Wayfarer">Wayfarer</option>
                        <option value="Cat Eye">Cat Eye</option>
                        <option value="Hexagonal">Hexagonal</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Optical Dimensions */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      Dimensions (mm) — Lens · Bridge · Temple
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={frameSpecs.lensWidth}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, lensWidth: e.target.value })}
                        placeholder="Lens e.g. 52"
                        className={`w-full bg-gray-50 border rounded-xl px-3 py-3 text-center text-xs font-mono font-bold focus:ring-2 focus:ring-black outline-none ${
                          validationErrors?.lensWidth ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      />
                      <input
                        type="text"
                        value={frameSpecs.bridgeWidth}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, bridgeWidth: e.target.value })}
                        placeholder="Bridge e.g. 18"
                        className={`w-full bg-gray-50 border rounded-xl px-3 py-3 text-center text-xs font-mono font-bold focus:ring-2 focus:ring-black outline-none ${
                          validationErrors?.bridgeWidth ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      />
                      <input
                        type="text"
                        value={frameSpecs.templeLength}
                        onChange={(e) => setFrameSpecs({ ...frameSpecs, templeLength: e.target.value })}
                        placeholder="Temple e.g. 140"
                        className={`w-full bg-gray-50 border rounded-xl px-3 py-3 text-center text-xs font-mono font-bold focus:ring-2 focus:ring-black outline-none ${
                          validationErrors?.templeLength ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {validationErrors && Object.keys(validationErrors).length > 0 && (
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mt-2">
                        Please fill in all frame specifications and dimensions with numbers.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const errors = {};
                      if (!frameSpecs.color?.trim()) errors.color = true;
                      if (!frameSpecs.lensWidth?.trim() || isNaN(Number(frameSpecs.lensWidth))) errors.lensWidth = true;
                      if (!frameSpecs.bridgeWidth?.trim() || isNaN(Number(frameSpecs.bridgeWidth))) errors.bridgeWidth = true;
                      if (!frameSpecs.templeLength?.trim() || isNaN(Number(frameSpecs.templeLength))) errors.templeLength = true;

                      if (Object.keys(errors).length > 0) {
                        setValidationErrors(errors);
                      } else {
                        setValidationErrors(null);
                        setStep(3);
                      }
                    }}
                    className="flex-1 py-3.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & CONFIRMATION */}
            {step === 3 && selectedFrame && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black border-b border-gray-200 pb-3">Frame Specifications Summary</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-500">Optical Brand:</span>
                      <span className="text-black font-black uppercase">{selectedFrame.brand}</span>
                    </div>
                    {frameSpecs.color && (
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-gray-500">Color:</span>
                        <span className="text-black font-bold">{frameSpecs.color}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-500">Frame Type:</span>
                      <span className="text-black font-bold uppercase">{frameSpecs.frameType}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-500">Material:</span>
                      <span className="text-black font-bold uppercase">{frameSpecs.frameMaterial}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-500">Shape:</span>
                      <span className="text-black font-bold uppercase">{frameSpecs.frameShape}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-500">Optical Dimensions:</span>
                      <span className="text-black font-mono font-bold">
                        {frameSpecs.lensWidth || '-'}-{frameSpecs.bridgeWidth || '-'}-{frameSpecs.templeLength || '-'} mm
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-bold border-t border-gray-200 pt-3">
                      <span className="text-gray-500">Frame Cost:</span>
                      <span className="text-black font-mono font-black">₹{parseFloat(selectedFrame.price).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Total Preview */}
                <div className="bg-white text-black p-6 rounded-2xl space-y-2 border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
                    <span>Frame Price</span>
                    <span>{selectedFrame.is_b1g1 ? <span className="inline-flex items-center gap-1 text-black"><Gift size={12} /> B1G1 Eligible</span> : ""}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black uppercase text-black">Line Total</span>
                    <span className="text-2xl font-black font-mono text-black">
                      ₹{parseFloat(selectedFrame.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="flex-1 py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Confirm & Add Frame
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SlideDrawer>
  );
}
