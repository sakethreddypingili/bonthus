import { useState, useRef, Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../server/supabase/supabase";
import { Search, Plus, CheckCircle, AlertCircle } from "lucide-react";
import SlideDrawer from "../components/common/SlideDrawer";

// Constant overlays style for portal dropdowns
const OVERLAY_CHROME_STYLE = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "transparent",
  cursor: "default",
};

export default function Power({ userProfile }) {
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Recent power history list for default view
  const [recentPowers, setRecentPowers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Sign toggle states for power fields (to track +/-)
  const [selectedSigns, setSelectedSigns] = useState({});

  // Suggestion states
  const [powerSuggestions, setPowerSuggestions] = useState({});
  const [activePowerInput, setActivePowerInput] = useState(null);
  const [powerDropdownLayout, setPowerDropdownLayout] = useState(null);
  const powerInputRefs = useRef({});

  // Prescription Form State
  const [tempPrescription, setTempPrescription] = useState({
    isSamePower: false,
    isCylindrical: true,
    hasAdditionalPower: false,
    re: { sph: "", cyl: "", axis: "" },
    le: { sph: "", cyl: "", axis: "" },
    adl_re: { sph: "", cyl: "", axis: "" },
    adl_le: { sph: "", cyl: "", axis: "" },
    notes: "",
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setSearching(true);
    setCustomer(null);
    setProfiles([]);
    setSelectedProfile(null);
    setHistory([]);

    try {
      // Find the primary customer matching the phone number
      const { data: primaryData, error: primaryError } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim())
        .is("parent_id", null)
        .maybeSingle();

      if (primaryError) throw primaryError;

      if (primaryData) {
        setCustomer(primaryData);

        // Load primary + dependents
        const { data: dependentsData, error: dependentsError } = await supabase
          .from("customers")
          .select("*")
          .eq("parent_id", primaryData.id);

        if (dependentsError) throw dependentsError;

        const allProfiles = [
          { ...primaryData, label: "Primary Profile" },
          ...(dependentsData || []).map((dep) => ({
            ...dep,
            label: `Dependent (${dep.relationship || "Family"})`,
          })),
        ];

        setProfiles(allProfiles);
        setSelectedProfile(allProfiles[0]);
        // Fetch history for first profile
        fetchHistory(allProfiles[0].id);
      } else {
        showNotification("No customer found with this number.", "error");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSearching(false);
    }
  };

  const fetchHistory = async (profileId) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("eye_power")
        .select("*")
        .eq("customer_id", profileId)
        .order("prescribed_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRecentPowers = async () => {
    if (!userProfile) return;

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';
    const userStoreId = userProfile.store_id;

    if (isAdmin) {
      console.log(`[Power Page] Authenticated User Role: ${userProfile.role} (Super/Global Admin). Showing all recent prescriptions.`);
    } else {
      const storeName = userProfile.store?.name || userProfile.store_name || "Assigned Store";
      console.log(`[Power Page] Authenticated User Role: ${userProfile.role} | Store: ${storeName} (ID: ${userStoreId}). Applying 48-hour activity window.`);
    }

    setLoadingRecent(true);
    try {
      let query = supabase
        .from("eye_power")
        .select(`
          *,
          customers ( name, phone )
        `)
        .order("prescribed_at", { ascending: false });

      if (!isAdmin && userStoreId) {
        // Query recent orders from the last 48 hours to find relevant customer_ids
        const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('store_id', userStoreId)
          .gte('created_at', thresholdDate)
          .eq('disabled', false);

        const customerIds = (recentOrders || []).map(o => o.customer_id).filter(Boolean);
        if (customerIds.length > 0) {
          query = query.in("customer_id", customerIds);
        } else {
          // If no orders in the last 48 hours, return empty list
          setRecentPowers([]);
          setLoadingRecent(false);
          return;
        }
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;
      setRecentPowers(data || []);
    } catch (err) {
      console.error("Error fetching recent prescriptions:", err.message);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (!customer && userProfile) {
      fetchRecentPowers();
    }
  }, [customer, userProfile]);

  const handleProfileSelect = (p) => {
    setSelectedProfile(p);
    fetchHistory(p.id);
  };

  // Helper functions for power suggestions (copied from CreateOrder.jsx)
  const normalizePowerEyeKey = (eye) => {
    if (eye === "adl_re") return "re";
    if (eye === "adl_le") return "le";
    return eye;
  };

  const resolvePrescriptionEye = (eye) => {
    if (eye === "re" || eye === "adl_re") return "adl_re" === eye ? "adl_re" : "re";
    if (eye === "le" || eye === "adl_le") return "adl_le" === eye ? "adl_le" : "le";
    return eye;
  };

  const generatePowerSuggestions = (input, isForNV = false, fieldKey) => {
    if (!input || input === "") return [];
    const parsed = parseFloat(input.trim());
    if (isNaN(parsed)) return [];

    const base = Math.abs(parsed);
    const suggestions = [];

    const currentSign = selectedSigns[fieldKey] || (isForNV ? "positive" : "negative");
    const signChar = currentSign === "positive" ? "+" : "-";

    for (let i = 0; i < 4; i++) {
      const value = base + i * 0.25;
      suggestions.push(`${signChar}${value.toFixed(2)}`);
    }
    return suggestions;
  };

  const handlePowerInputChange = (e, fieldKey, eye, field) => {
    const value = e.target.value;
    const normalizedEye = normalizePowerEyeKey(eye);
    const key = `${fieldKey}-${normalizedEye}-${field}`;
    const isForNV = fieldKey === "nv";

    const numericValue = value.replace(/^[+-]/, "").trim();
    const suggestions = generatePowerSuggestions(numericValue || value, isForNV, key);
    setPowerSuggestions((prev) => ({ ...prev, [key]: suggestions }));
    setActivePowerInput(key);

    const eyeObj = resolvePrescriptionEye(eye);
    setTempPrescription((prev) => ({
      ...prev,
      [eyeObj]: { ...prev[eyeObj], [field]: value },
    }));

    const inputEl = powerInputRefs.current[key];
    if (inputEl) {
      const rect = inputEl.getBoundingClientRect();
      setPowerDropdownLayout({
        left: rect.left,
        width: rect.width,
        top: rect.bottom + window.scrollY + 2,
        maxHeight: 200,
      });
    }
  };

  const selectPowerValue = (value, fieldKey, eye, field, isForNV = false) => {
    const numValue = parseFloat(value);
    const normalizedEye = normalizePowerEyeKey(eye);
    const key = `${fieldKey}-${normalizedEye}-${field}`;

    let displayValue;
    if (field === "axis") {
      displayValue = numValue.toFixed(0);
    } else {
      const currentSign = selectedSigns[key];
      let isPositive = currentSign === "positive" || (currentSign === undefined && isForNV);

      if (isPositive) {
        displayValue = `+${Math.abs(numValue).toFixed(2)}`;
      } else {
        displayValue = `-${Math.abs(numValue).toFixed(2)}`;
      }
    }

    const eyeObj = resolvePrescriptionEye(eye);
    setTempPrescription((prev) => ({
      ...prev,
      [eyeObj]: { ...prev[eyeObj], [field]: displayValue },
    }));

    setPowerSuggestions((prev) => ({ ...prev, [key]: [] }));
    setActivePowerInput(null);
  };

  const handleOpenAddModal = () => {
    setTempPrescription({
      isSamePower: false,
      isCylindrical: true,
      hasAdditionalPower: false,
      re: { sph: "", cyl: "", axis: "" },
      le: { sph: "", cyl: "", axis: "" },
      adl_re: { sph: "", cyl: "", axis: "" },
      adl_le: { sph: "", cyl: "", axis: "" },
      notes: "",
    });
    setSelectedSigns({});
    setShowAddModal(true);
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!selectedProfile) return;

    setSaving(true);
    try {
      const isNonEmpty = (v) => v != null && String(v).trim() !== "";
      const normalizeAxis = (val) => {
        if (!isNonEmpty(val)) return null;
        const s = String(val).trim();
        const n = Number.parseInt(s, 10);
        return Number.isFinite(n) ? String(n) : null;
      };

      const normalizeOptical = (val, { decimals = 2 } = {}) => {
        if (!isNonEmpty(val)) return null;
        const raw = String(val).trim();
        const upper = raw.toUpperCase();
        if (upper === "PL" || upper === "PLANO") return "PL";
        const num = Number.parseFloat(raw);
        if (!Number.isFinite(num)) return raw;
        const fixed = num.toFixed(decimals);
        if (num > 0) return `+${fixed}`;
        return fixed;
      };

      // Sync powers if uniform power is checked
      const preset = tempPrescription.isSamePower
        ? {
            ...tempPrescription,
            le: { ...tempPrescription.re },
            adl_le: { ...tempPrescription.adl_re },
          }
        : tempPrescription;

      const payload = {
        customer_id: selectedProfile.id,
        // Distance Vision (DV)
        dv_right_sph: normalizeOptical(preset.re?.sph),
        dv_right_cyl: tempPrescription.isCylindrical ? normalizeOptical(preset.re?.cyl) : null,
        dv_right_axis: tempPrescription.isCylindrical ? normalizeAxis(preset.re?.axis) : null,
        dv_left_sph: normalizeOptical(preset.le?.sph),
        dv_left_cyl: tempPrescription.isCylindrical ? normalizeOptical(preset.le?.cyl) : null,
        dv_left_axis: tempPrescription.isCylindrical ? normalizeAxis(preset.le?.axis) : null,
        // Near Vision (NV)
        nv_right_sph: tempPrescription.hasAdditionalPower ? normalizeOptical(preset.adl_re?.sph) : null,
        nv_right_cyl: tempPrescription.hasAdditionalPower && tempPrescription.isCylindrical
          ? (normalizeOptical(preset.adl_re?.cyl) ?? normalizeOptical(preset.re?.cyl))
          : null,
        nv_right_axis: tempPrescription.hasAdditionalPower && tempPrescription.isCylindrical
          ? (normalizeAxis(preset.adl_re?.axis) ?? normalizeAxis(preset.re?.axis))
          : null,
        nv_left_sph: tempPrescription.hasAdditionalPower ? normalizeOptical(preset.adl_le?.sph) : null,
        nv_left_cyl: tempPrescription.hasAdditionalPower && tempPrescription.isCylindrical
          ? (normalizeOptical(preset.adl_le?.cyl) ?? normalizeOptical(preset.le?.cyl))
          : null,
        nv_left_axis: tempPrescription.hasAdditionalPower && tempPrescription.isCylindrical
          ? (normalizeAxis(preset.adl_le?.axis) ?? normalizeAxis(preset.le?.axis))
          : null,
        notes: isNonEmpty(tempPrescription.notes) ? String(tempPrescription.notes).trim() : null,
      };

      const { error } = await supabase.from("eye_power").insert([payload]);
      if (error) throw error;

      showNotification("Prescription recorded successfully!");
      setShowAddModal(false);
      fetchHistory(selectedProfile.id);
      fetchRecentPowers();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tighter uppercase mb-2">Power Records</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Add & View customer prescriptions</p>
        </div>
        {selectedProfile && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} /> Record Power
          </button>
        )}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            Search Customer by Phone Number
          </label>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                required
                type="tel"
                placeholder="Enter Customer Phone..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Profiles section */}
        {customer && (
          <div className="border-t border-gray-50 pt-8 space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Select Customer Profile
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {profiles.map((p) => {
                  const isSelected = selectedProfile?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProfileSelect(p)}
                      className={`flex flex-col text-left p-5 rounded-2xl border transition-all ${
                        isSelected
                          ? "border-black bg-black text-white shadow-xl scale-[1.02]"
                          : "border-gray-100 bg-gray-50/50 text-black hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {p.label}
                      </span>
                      <span className="text-sm font-black mt-1 uppercase tracking-tight">{p.name}</span>
                      <span className="text-[10px] font-mono mt-1 opacity-70">{p.phone}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prescription History Table */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-black">
                Prescription History for {selectedProfile?.name}
              </h3>
              <div className="overflow-x-auto border border-gray-50 rounded-[24px]">
                {loadingHistory ? (
                  <div className="p-10 text-center flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading history...</span>
                  </div>
                ) : history.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Eye</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">SPH</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">CYL</th>
                        <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">AXIS</th>
                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[11px] font-black">
                      {history.map((pow) => {
                        const hasNV = pow.nv_right_sph || pow.nv_left_sph || pow.nv_right_cyl || pow.nv_left_cyl;
                        const rowSpan = hasNV ? 4 : 2;
                        return (
                          <Fragment key={pow.id}>
                            {/* RE (DV) */}
                            <tr className="hover:bg-gray-50/50">
                              <td rowSpan={rowSpan} className="px-6 py-4 text-xs font-bold text-gray-600 border-r border-gray-100">
                                {new Date(pow.prescribed_at || pow.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">RE (DV)</td>
                              <td className="px-6 py-3 text-center text-gray-700">{pow.dv_right_sph || "—"}</td>
                              <td className="px-6 py-3 text-center text-gray-700">{pow.dv_right_cyl || "—"}</td>
                              <td className="px-6 py-3 text-center text-gray-700">{pow.dv_right_axis || "—"}</td>
                              <td rowSpan={rowSpan} className="px-6 py-4 text-xs font-medium text-gray-400 font-sans italic border-l border-gray-100 max-w-[200px]">
                                {pow.notes || "—"}
                              </td>
                            </tr>
                            {/* LE (DV) */}
                            <tr className="hover:bg-gray-50/50 border-b border-gray-100">
                              <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">LE (DV)</td>
                              <td className="px-6 py-3 text-center text-gray-700">{pow.dv_left_sph || "—"}</td>
                              <td className="px-6 py-3 text-center text-gray-700">{pow.dv_left_cyl || "—"}</td>
                              <td className="px-6 py-3 text-center text-gray-700">{pow.dv_left_axis || "—"}</td>
                            </tr>
                            {/* Near Vision rows */}
                            {hasNV && (
                              <>
                                <tr className="hover:bg-gray-50/50">
                                  <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">RE (NV)</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.nv_right_sph || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.nv_right_cyl || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.nv_right_axis || "—"}</td>
                                </tr>
                                <tr className="hover:bg-gray-50/50 border-b border-gray-100">
                                  <td className="px-6 py-3 text-center bg-gray-50/50 text-[10px] uppercase font-sans tracking-wider">LE (NV)</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.nv_left_sph || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.nv_left_cyl || "—"}</td>
                                  <td className="px-6 py-3 text-center text-gray-700">{pow.nv_left_axis || "—"}</td>
                                </tr>
                              </>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-10 text-center text-gray-400 italic">No prescription records found for this profile.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!customer && (
          <div className="space-y-4 border-t border-gray-50 pt-8">
            <h3 className="text-sm font-black uppercase tracking-wider text-black">
              Recent Prescriptions
            </h3>
            <div className="overflow-x-auto border border-gray-50 rounded-[24px]">
              {loadingRecent ? (
                <div className="p-10 text-center flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading prescriptions...</span>
                </div>
              ) : recentPowers.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">RE (DV) SPH/CYL/AXIS</th>
                      <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">LE (DV) SPH/CYL/AXIS</th>
                      <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[11px] font-black font-mono">
                    {recentPowers.map((pow) => (
                      <tr key={pow.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-sans">
                          <span className="block text-xs font-black uppercase text-black">{pow.customers?.name || "Unknown"}</span>
                          <span className="block text-[9px] text-gray-400 mt-0.5">{pow.customers?.phone}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-600 font-sans">
                          {new Date(pow.prescribed_at || pow.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
                          {pow.dv_right_sph || "0.00"} / {pow.dv_right_cyl || "0.00"} / {pow.dv_right_axis || "0"}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-700">
                          {pow.dv_left_sph || "0.00"} / {pow.dv_left_cyl || "0.00"} / {pow.dv_left_axis || "0"}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-sans italic max-w-[200px]">
                          {pow.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400 italic">No recent prescriptions recorded.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Record Power Drawer */}
      <SlideDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Eye Power"
        subtitle={`Specify prescription data for ${selectedProfile?.name}`}
        width="max-w-2xl"
      >
        <form onSubmit={handleSavePrescription} className="p-8 space-y-8">
          <div className="grid grid-cols-3 gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            {[
              { key: "isSamePower", label: "Uniform Eye Power" },
              { key: "isCylindrical", label: "Cylindrical Focus" },
              { key: "hasAdditionalPower", label: "Addition Enabled" },
            ].map((opt) => (
              <label
                key={opt.key}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all border ${
                  tempPrescription[opt.key] ? "bg-black border-black text-white shadow-lg" : "bg-white border-gray-100 text-gray-400 hover:text-black"
                }`}
              >
                <input
                  type="checkbox"
                  checked={tempPrescription[opt.key]}
                  onChange={(e) => setTempPrescription({ ...tempPrescription, [opt.key]: e.target.checked })}
                  className="hidden"
                />
                <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-8">
            <div className={`grid grid-cols-1 ${tempPrescription.isSamePower ? "" : "md:grid-cols-2"} gap-8`}>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">
                  {tempPrescription.isSamePower ? "Universal Distance" : "Right Eye (RE) Distance"}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {["sph", "cyl", "axis"].map((f) => (
                    <div key={f} className={!tempPrescription.isCylindrical && (f === "cyl" || f === "axis") ? "hidden" : ""}>
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                      <div className="relative">
                        <input
                          ref={(el) => (powerInputRefs.current[`dv-re-${f}`] = el)}
                          type="text"
                          value={tempPrescription.re[f]}
                          onChange={(e) => handlePowerInputChange(e, "dv", "re", f)}
                          className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                          placeholder="0.00"
                        />
                        {activePowerInput === `dv-re-${f}` &&
                          powerSuggestions[`dv-re-${f}`]?.length > 0 &&
                          createPortal(
                            <>
                              <div className="fixed z-[9998]" style={OVERLAY_CHROME_STYLE} onMouseDown={() => setPowerSuggestions((p) => ({ ...p, [`dv-re-${f}`]: [] }))} />
                              <div
                                className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden min-w-[70px]"
                                style={{
                                  left: powerDropdownLayout.left,
                                  top: powerDropdownLayout.top,
                                  width: powerDropdownLayout.width,
                                }}
                              >
                                {powerSuggestions[`dv-re-${f}`].map((sug) => (
                                  <button
                                    key={sug}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectPowerValue(sug, "dv", "re", f, false);
                                    }}
                                    className="w-full px-3 py-2 text-center text-xs font-mono font-bold hover:bg-black hover:text-white border-b border-gray-50 last:border-0"
                                  >
                                    {sug}
                                  </button>
                                ))}
                              </div>
                            </>,
                            document.body
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!tempPrescription.isSamePower && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">
                    Left Eye (LE) Distance
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {["sph", "cyl", "axis"].map((f) => (
                      <div key={f} className={!tempPrescription.isCylindrical && (f === "cyl" || f === "axis") ? "hidden" : ""}>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                        <div className="relative">
                          <input
                            ref={(el) => (powerInputRefs.current[`dv-le-${f}`] = el)}
                            type="text"
                            value={tempPrescription.le[f]}
                            onChange={(e) => handlePowerInputChange(e, "dv", "le", f)}
                            className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                            placeholder="0.00"
                          />
                          {activePowerInput === `dv-le-${f}` &&
                            powerSuggestions[`dv-le-${f}`]?.length > 0 &&
                            createPortal(
                              <>
                                <div className="fixed z-[9998]" style={OVERLAY_CHROME_STYLE} onMouseDown={() => setPowerSuggestions((p) => ({ ...p, [`dv-le-${f}`]: [] }))} />
                                <div
                                  className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden min-w-[70px]"
                                  style={{
                                    left: powerDropdownLayout.left,
                                    top: powerDropdownLayout.top,
                                    width: powerDropdownLayout.width,
                                  }}
                                >
                                  {powerSuggestions[`dv-le-${f}`].map((sug) => (
                                    <button
                                      key={sug}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectPowerValue(sug, "dv", "le", f, false);
                                      }}
                                      className="w-full px-3 py-2 text-center text-xs font-mono font-bold hover:bg-black hover:text-white border-b border-gray-50 last:border-0"
                                    >
                                      {sug}
                                    </button>
                                  ))}
                                </div>
                              </>,
                              document.body
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {tempPrescription.hasAdditionalPower && (
              <div className={`grid grid-cols-1 ${tempPrescription.isSamePower ? "" : "md:grid-cols-2"} gap-8 pt-4 border-t border-gray-50`}>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">
                    {tempPrescription.isSamePower ? "Universal Near" : "Right Eye (RE) Near"}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {["sph", "cyl", "axis"].map((f) => (
                      <div key={f} className={!tempPrescription.isCylindrical && (f === "cyl" || f === "axis") ? "hidden" : ""}>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                        <div className="relative">
                          <input
                            ref={(el) => (powerInputRefs.current[`nv-re-${f}`] = el)}
                            type="text"
                            value={tempPrescription.adl_re[f]}
                            onChange={(e) => handlePowerInputChange(e, "nv", "adl_re", f)}
                            className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                            placeholder="0.00"
                          />
                          {activePowerInput === `nv-re-${f}` &&
                            powerSuggestions[`nv-re-${f}`]?.length > 0 &&
                            createPortal(
                              <>
                                <div className="fixed z-[9998]" style={OVERLAY_CHROME_STYLE} onMouseDown={() => setPowerSuggestions((p) => ({ ...p, [`nv-re-${f}`]: [] }))} />
                                <div
                                  className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden min-w-[70px]"
                                  style={{
                                    left: powerDropdownLayout.left,
                                    top: powerDropdownLayout.top,
                                    width: powerDropdownLayout.width,
                                  }}
                                >
                                  {powerSuggestions[`nv-re-${f}`].map((sug) => (
                                    <button
                                      key={sug}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        selectPowerValue(sug, "nv", "adl_re", f, true);
                                      }}
                                      className="w-full px-3 py-2 text-center text-xs font-mono font-bold hover:bg-black hover:text-white border-b border-gray-50 last:border-0"
                                    >
                                      {sug}
                                    </button>
                                  ))}
                                </div>
                              </>,
                              document.body
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {!tempPrescription.isSamePower && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-black uppercase tracking-widest border-l-2 border-black pl-3">
                      Left Eye (LE) Near
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {["sph", "cyl", "axis"].map((f) => (
                        <div key={f} className={!tempPrescription.isCylindrical && (f === "cyl" || f === "axis") ? "hidden" : ""}>
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block text-center">{f}</label>
                          <div className="relative">
                            <input
                              ref={(el) => (powerInputRefs.current[`nv-le-${f}`] = el)}
                              type="text"
                              value={tempPrescription.adl_le[f]}
                              onChange={(e) => handlePowerInputChange(e, "nv", "adl_le", f)}
                              className="w-full px-2 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:border-black text-center text-[11px] font-black font-mono"
                              placeholder="0.00"
                            />
                            {activePowerInput === `nv-le-${f}` &&
                              powerSuggestions[`nv-le-${f}`]?.length > 0 &&
                              createPortal(
                                <>
                                  <div className="fixed z-[9998]" style={OVERLAY_CHROME_STYLE} onMouseDown={() => setPowerSuggestions((p) => ({ ...p, [`nv-le-${f}`]: [] }))} />
                                  <div
                                    className="fixed z-[9999] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden min-w-[70px]"
                                    style={{
                                      left: powerDropdownLayout.left,
                                      top: powerDropdownLayout.top,
                                      width: powerDropdownLayout.width,
                                    }}
                                  >
                                    {powerSuggestions[`nv-le-${f}`].map((sug) => (
                                      <button
                                        key={sug}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectPowerValue(sug, "nv", "adl_le", f, true);
                                        }}
                                        className="w-full px-3 py-2 text-center text-xs font-mono font-bold hover:bg-black hover:text-white border-b border-gray-50 last:border-0"
                                      >
                                        {sug}
                                      </button>
                                    ))}
                                  </div>
                                </>,
                                document.body
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 pt-4 border-t border-gray-50">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes / Remarks</label>
              <textarea
                rows={2}
                value={tempPrescription.notes}
                onChange={(e) => setTempPrescription({ ...tempPrescription, notes: e.target.value })}
                placeholder="Optometrist notes, recommendation, etc."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all"
            >
              {saving ? "Recording..." : "Save Prescription"}
            </button>
          </div>
        </form>
      </SlideDrawer>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div
            className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === "success"
                ? "bg-black border-white/10 text-white"
                : "bg-red-50 border-red-100 text-red-600"
            }`}
          >
            {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
