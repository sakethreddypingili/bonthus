import React, { useState, useEffect } from 'react';
import { supabase } from '../../server/supabase/supabase';
import SlideDrawer from '../common/SlideDrawer';
import { Eye, ShieldAlert, Sparkles, Layers, ChevronRight, Check } from 'lucide-react';

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
      custom_lens_specs: {
        power_type: pType,
        lens_catalog_id: lens.id,
        coating_catalog_id: coating?.id || null,
        coating_price: coatingPrice,
        power_data: pData,
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
      title="LENS WIZARD"
      subtitle={step === 1 ? "Step 1: Select Power Type" : step === 2 ? "Step 2: Select Lens & Options" : "Step 3: Prescription Details"}
      width="max-w-[480px]"
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
              <div className="space-y-3 flex-1 overflow-y-auto">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Available Lenses</span>
                {filteredLenses.length === 0 ? (
                  <div className="text-center py-8 text-xs font-bold text-gray-400 uppercase">No matching lenses found</div>
                ) : (
                  filteredLenses.map(lens => (
                    <div
                      key={lens.id}
                      onClick={() => handleLensSelect(lens)}
                      className="p-5 rounded-[20px] border-2 border-gray-100 hover:border-black cursor-pointer flex flex-col justify-between transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black rounded uppercase tracking-wider">
                              {lens.lens_index} Index
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[8px] font-bold rounded uppercase tracking-wider">
                              {lens.material}
                            </span>
                          </div>
                          <h4 className="font-black text-sm text-black uppercase tracking-tight mt-2">{lens.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Range: {lens.power_range}</p>
                          <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase">{lens.warranty}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-base text-black">
                            ₹{parseFloat(lens.price) === 0 ? 'Free' : parseFloat(lens.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PRESCRIPTION DETAILS */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Select Mode */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPowerMode('later')}
                  className={`flex-1 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    powerMode === 'later'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                  }`}
                >
                  Enter Later
                </button>
                <button
                  type="button"
                  onClick={() => setPowerMode('manual')}
                  className={`flex-1 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                    powerMode === 'manual'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                  }`}
                >
                  Manual Entry
                </button>
                {prescriptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPowerMode('existing')}
                    className={`flex-1 py-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-all ${
                      powerMode === 'existing'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                    }`}
                  >
                    Use Saved Rx
                  </button>
                )}
              </div>

              {/* Enter Later Notice */}
              {powerMode === 'later' && (
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-start gap-3">
                  <ShieldAlert className="text-yellow-600 shrink-0" size={18} />
                  <p className="text-[10px] text-yellow-800 font-bold uppercase leading-normal">
                    This item will be added to the order without power specifications. You can attach a prescription to this order later before final delivery.
                  </p>
                </div>
              )}

              {/* Saved Prescription Dropdown */}
              {powerMode === 'existing' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Saved Prescription</label>
                  <select
                    value={selectedPrescriptionId}
                    onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-black outline-none font-bold text-sm uppercase transition-all"
                  >
                    <option value="">-- Choose Prescription --</option>
                    {prescriptions.map(rx => (
                      <option key={rx.id} value={rx.id}>
                        {rx.prescription_name || `Rx (${new Date(rx.created_at).toLocaleDateString()})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Manual Power Entry Form */}
              {powerMode === 'manual' && (
                <div className="space-y-4">
                  {/* Grid Header */}
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest col-span-1">Eye</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SPH</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CYL</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">AXIS</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ADD</span>
                  </div>

                  {/* Right Eye */}
                  <div className="grid grid-cols-5 gap-2 items-center">
                    <span className="text-[10px] font-black text-black uppercase tracking-wider text-center">R (OD)</span>
                    <input
                      type="text"
                      value={manualPower.right.sph}
                      onChange={(e) => setManualPower(p => ({ ...p, right: { ...p.right, sph: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      value={manualPower.right.cyl}
                      onChange={(e) => setManualPower(p => ({ ...p, right: { ...p.right, cyl: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      value={manualPower.right.axis}
                      onChange={(e) => setManualPower(p => ({ ...p, right: { ...p.right, axis: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="90"
                    />
                    <input
                      type="text"
                      value={manualPower.right.add}
                      onChange={(e) => setManualPower(p => ({ ...p, right: { ...p.right, add: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="+2.00"
                    />
                  </div>

                  {/* Left Eye */}
                  <div className="grid grid-cols-5 gap-2 items-center">
                    <span className="text-[10px] font-black text-black uppercase tracking-wider text-center">L (OS)</span>
                    <input
                      type="text"
                      value={manualPower.left.sph}
                      onChange={(e) => setManualPower(p => ({ ...p, left: { ...p.left, sph: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      value={manualPower.left.cyl}
                      onChange={(e) => setManualPower(p => ({ ...p, left: { ...p.left, cyl: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      value={manualPower.left.axis}
                      onChange={(e) => setManualPower(p => ({ ...p, left: { ...p.left, axis: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="90"
                    />
                    <input
                      type="text"
                      value={manualPower.left.add}
                      onChange={(e) => setManualPower(p => ({ ...p, left: { ...p.left, add: e.target.value } }))}
                      className="px-2 py-1.5 rounded-lg border border-gray-200 text-center font-bold text-xs"
                      placeholder="+2.00"
                    />
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <div className="pt-4 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 border border-gray-200 hover:border-black rounded-xl text-xs font-black uppercase tracking-wider text-black transition-all"
                >
                  Back to Lenses
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={powerMode === 'existing' && !selectedPrescriptionId}
                  className="flex-1 py-4 bg-black text-white hover:bg-black/90 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Add Lens to Order
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SlideDrawer>
  );
}
