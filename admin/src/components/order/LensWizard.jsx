import React, { useState, useEffect } from 'react';
import { supabase } from '../../server/supabase/supabase';
import SlideDrawer from '../common/SlideDrawer';
import { Eye, ShieldAlert, Sparkles, Layers, ChevronRight, Check, Gift, X } from 'lucide-react';

export default function LensWizard({
  isOpen,
  onClose,
  onSelectLens,
  prescriptions = [],
}) {
  const [step, setStep] = useState(1);
  const [powerType, setPowerType] = useState(''); // 'with_power', 'zero_power', 'reading', 'progressive_bifocal'
  const [lenses, setLenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fittingChargesItem, setFittingChargesItem] = useState(null);
  
  // Selection state
  const [selectedLens, setSelectedLens] = useState(null);
  const [addPhotochromatic, setAddPhotochromatic] = useState(false);
  const [photochromaticTiers, setPhotochromaticTiers] = useState([]);
  const [selectedPhotochromaticTier, setSelectedPhotochromaticTier] = useState(null);
  
  // Power entry state
  const [powerMode, setPowerMode] = useState('later'); // 'manual', 'existing', 'later'
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [manualPower, setManualPower] = useState({
    right: { sph: '0.00', cyl: '0.00', axis: '', add: '' },
    left: { sph: '0.00', cyl: '0.00', axis: '', add: '' }
  });

  // Fetch lens catalog
  useEffect(() => {
    if (isOpen) {
      fetchLensCatalog();
    } else {
      // Reset state on close
      setStep(1);
      setPowerType('');
      setSelectedLens(null);
      setAddPhotochromatic(false);
      setSelectedPhotochromaticTier(null);
      setPowerMode('later');
      setSelectedPrescriptionId('');
      setManualPower({
        right: { sph: '0.00', cyl: '0.00', axis: '', add: '' },
        left: { sph: '0.00', cyl: '0.00', axis: '', add: '' }
      });
    }
  }, [isOpen]);

  const fetchLensCatalog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lens_catalog')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setLenses(data || []);
      
      // Filter photochromatic tiers
      const photoTiers = (data || [])
        .filter(l => l.lens_type === 'photochromatic')
        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      setPhotochromaticTiers(photoTiers);
      if (photoTiers.length > 0) {
        setSelectedPhotochromaticTier(photoTiers[0]); // default to lowest tier if enabled
      }

      const { data: fitData } = await supabase
        .from('frame_catalog')
        .select('*')
        .eq('frame_type', 'fitting')
        .maybeSingle();
      if (fitData) setFittingChargesItem(fitData);
    } catch (err) {
      console.error('Error fetching lens catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered lenses based on step 1 selection
  const getFilteredLenses = () => {
    if (powerType === 'zero_power') {
      // Zero power BLU screen standard options
      return lenses.filter(l => 
        l.lens_type === 'single_vision' && 
        (l.name.toLowerCase().includes('blu screen') || l.name.toLowerCase().includes('anti-glare') || l.name.toLowerCase().includes('blu +'))
      );
    }
    if (powerType === 'progressive_bifocal') {
      return lenses.filter(l => l.lens_type === 'progressive' || l.lens_type === 'bifocal');
    }
    // For single vision power types
    return lenses.filter(l => l.lens_type === 'single_vision');
  };

  const handlePowerTypeSelect = (type) => {
    setPowerType(type);
    setStep(2);
  };

  const handleLensSelect = (lens) => {
    setSelectedLens(lens);
    if (powerType === 'zero_power') {
      // Zero power doesn't need power entry step
      finishSelection(lens, addPhotochromatic ? selectedPhotochromaticTier : null, 'zero_power', null);
    } else {
      setStep(3);
    }
  };

  const finishSelection = (lens, coating, pType, pData) => {
    const lensPrice = parseFloat(lens.price);
    const coatingPrice = coating ? parseFloat(coating.price) : 0;
    const total = lensPrice + coatingPrice;

    onSelectLens({
      lens_catalog_id: lens.id,
      name: `${lens.name} (${lens.lens_index})${coating ? ` + ${coating.name}` : ''}`,
      price: total,
      lens_type: lens.lens_type,
      material: lens.material,
      lens_index: lens.lens_index,
      warranty: lens.warranty,
      is_b1g1: lens.is_b1g1 !== false,
      fitting_charge: fittingChargesItem ? { name: fittingChargesItem.name, price: parseFloat(fittingChargesItem.price) } : { name: "Fitting Charges", price: 199 },
      custom_lens_specs: {
        power_type: pType,
        lens_catalog_id: lens.id,
        coating_catalog_id: coating?.id || null,
        coating_price: coatingPrice,
        power_data: pData,
        is_b1g1: lens.is_b1g1 !== false,
      }
    });
    onClose();
  };

  const handleComplete = () => {
    let powerData = null;
    if (powerMode === 'manual') {
      powerData = { mode: 'manual', values: manualPower };
    } else if (powerMode === 'existing') {
      const rx = prescriptions.find(p => p.id === selectedPrescriptionId);
      powerData = { mode: 'prescription', prescription_id: selectedPrescriptionId, rx };
    } else {
      powerData = { mode: 'later' };
    }

    finishSelection(selectedLens, addPhotochromatic ? selectedPhotochromaticTier : null, powerType, powerData);
  };

  const filteredLenses = getFilteredLenses();

  return (
    <SlideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add Lens"
      subtitle={step === 1 ? "Select Power Type" : step === 2 ? "Select Lens & Options" : "Review Lens Details"}
      width="max-w-xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mb-4"></div>
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Loading catalog...</span>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* STEP 1: POWER TYPE */}
          {step === 1 && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handlePowerTypeSelect('with_power')}
                className="w-full p-5 rounded-[20px] border-2 border-gray-100 hover:border-black text-left flex items-start gap-4 transition-all group"
              >
                <div className="p-3 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-xl transition-all">
                  <Eye size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-black uppercase tracking-tight">With Power</h4>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">Single Vision distance or near correction</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-black self-center" />
              </button>

              <button
                type="button"
                onClick={() => handlePowerTypeSelect('zero_power')}
                className="w-full p-5 rounded-[20px] border-2 border-gray-100 hover:border-black text-left flex items-start gap-4 transition-all group"
              >
                <div className="p-3 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-xl transition-all">
                  <Sparkles size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-black uppercase tracking-tight">Zero Power (Blu Screen)</h4>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">Digital protection, no eye correction</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-black self-center" />
              </button>

              <button
                type="button"
                onClick={() => handlePowerTypeSelect('reading')}
                className="w-full p-5 rounded-[20px] border-2 border-gray-100 hover:border-black text-left flex items-start gap-4 transition-all group"
              >
                <div className="p-3 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-xl transition-all">
                  <Layers size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-black uppercase tracking-tight">Reading Power</h4>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">Near vision only, simple magnification</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-black self-center" />
              </button>

              <button
                type="button"
                onClick={() => handlePowerTypeSelect('progressive_bifocal')}
                className="w-full p-5 rounded-[20px] border-2 border-gray-100 hover:border-black text-left flex items-start gap-4 transition-all group"
              >
                <div className="p-3 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-xl transition-all">
                  <Eye size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-black uppercase tracking-tight">Progressive / Bifocals</h4>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">Multi-focal lenses for both far and near</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-black self-center" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectLens({
                    lens_catalog_id: null,
                    name: 'Frame Only',
                    price: 0,
                    lens_type: 'none',
                    material: 'none',
                    lens_index: '',
                    warranty: '',
                    is_b1g1: false,
                    fitting_charge: null,
                    custom_lens_specs: {
                      power_type: 'frame_only',
                      lens_catalog_id: null,
                      coating_catalog_id: null,
                      coating_price: 0,
                      power_data: null,
                      is_b1g1: false
                    }
                  });
                  onClose();
                }}
                className="w-full p-5 rounded-[20px] border-2 border-gray-100 hover:border-black text-left flex items-start gap-4 transition-all group"
              >
                <div className="p-3 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-xl transition-all">
                  <X size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm text-black uppercase tracking-tight">Frame Only</h4>
                  <p className="text-[11px] text-gray-400 font-bold uppercase mt-1">Buy frame only, no lens added</p>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-black self-center" />
              </button>
            </div>
          )}

          {/* STEP 2: LENS CATALOG LIST */}
          {step === 2 && (
            <div className="flex flex-col h-full space-y-6">
              {/* Photochromatic Add-on Toggle */}
              <div className="p-4 bg-gray-50 rounded-[20px] border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-black text-[11px] text-black uppercase tracking-wider">Photochromatic Coating</h5>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Lenses darken automatically in sunlight</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addPhotochromatic}
                      onChange={(e) => setAddPhotochromatic(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                {addPhotochromatic && (
                  <div className="pt-2 border-t border-gray-200/50">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Select Price Tier</span>
                    <div className="grid grid-cols-3 gap-2">
                      {photochromaticTiers.map(tier => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSelectedPhotochromaticTier(tier)}
                          className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all ${
                            selectedPhotochromaticTier?.id === tier.id
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 bg-white text-black hover:border-gray-400'
                          }`}
                        >
                          +{tier.price}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lenses list */}
              <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Available Lenses</span>
                {filteredLenses.length === 0 ? (
                  <div className="text-center py-8 text-xs font-bold text-gray-400 uppercase">No matching lenses found</div>
                ) : (
                  filteredLenses.map(lens => (
                    <div
                      key={lens.id}
                      onClick={() => handleLensSelect(lens)}
                      className="p-5 bg-white rounded-[24px] border border-gray-250 hover:border-black cursor-pointer flex flex-col justify-between transition-all hover:shadow-md group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2.5 py-0.5 bg-black text-white text-[8px] font-black rounded uppercase tracking-wider">
                              {lens.lens_index} Index
                            </span>
                            <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-600 text-[8px] font-black rounded uppercase tracking-wider">
                              {lens.material}
                            </span>
                            {lens.is_b1g1 !== false && (
                              <span className="px-2.5 py-0.5 bg-neutral-100 text-black border border-neutral-250 text-[8px] font-black rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                                <Gift size={9} /> B1G1
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-black text-sm text-neutral-850 uppercase tracking-tight group-hover:text-black transition-colors">{lens.name}</h4>
                          
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase">
                              <span className="text-neutral-400 font-normal">Range:</span>
                              <span className="font-mono">{lens.power_range}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-bold uppercase">
                              <span className="text-neutral-400 font-normal">Warranty:</span>
                              <span>{lens.warranty || 'No Warranty'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 self-center">
                          <span className="font-black text-base text-black font-mono">
                            ₹{parseFloat(lens.price) === 0 ? 'Free' : parseFloat(lens.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: LENS SPECIFICATION SUMMARY (NO POWER INPUT FORMS) */}
          {step === 3 && selectedLens && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border border-gray-150 rounded-2xl p-6 bg-gray-50 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b border-gray-250 pb-3">Lens Specifications Summary</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-500">Lens Name:</span>
                    <span className="text-black font-black uppercase">{selectedLens.name}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-500">Index & Material:</span>
                    <span className="text-black font-bold uppercase">{selectedLens.lens_index} Index · {selectedLens.material}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-500">Power Range:</span>
                    <span className="text-black font-bold uppercase">{selectedLens.power_range}</span>
                  </div>
                  {addPhotochromatic && selectedPhotochromaticTier && (
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-gray-500">Photochromatic Coating:</span>
                      <span className="text-black font-bold uppercase">Added (+₹{selectedPhotochromaticTier.price})</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold border-t border-gray-200 pt-3">
                    <span className="text-gray-500">Warranty:</span>
                    <span className="text-black font-bold uppercase">{selectedLens.warranty}</span>
                  </div>
                </div>
              </div>

              {/* Total Preview */}
              <div className="bg-white text-black p-6 rounded-2xl space-y-2 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
                  <span>Lens Price</span>
                  <span>{selectedLens.is_b1g1 ? <span className="inline-flex items-center gap-1 text-black"><Gift size={12} /> B1G1 Eligible</span> : ""}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase text-black">Total</span>
                  <span className="text-2xl font-black font-mono text-black">
                    ₹{(parseFloat(selectedLens.price) + (addPhotochromatic && selectedPhotochromaticTier ? parseFloat(selectedPhotochromaticTier.price) : 0)).toLocaleString('en-IN')}
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
                  onClick={() => {
                    // Automatically pass as later mode
                    finishSelection(selectedLens, addPhotochromatic ? selectedPhotochromaticTier : null, powerType, { mode: 'later' });
                  }}
                  className="flex-1 py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirm & Add Lens
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SlideDrawer>
  );
}
