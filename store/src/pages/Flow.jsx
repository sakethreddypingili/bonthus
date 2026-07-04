import { useState, useEffect } from "react";
import { supabase } from "../server/supabase/supabase";
import { Search, UserPlus, CheckCircle, AlertCircle, Lock } from "lucide-react";
import CommandDialog from "../components/common/CommandDialog";

export default function Flow({ userProfile }) {
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modal and Registration Wizard states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [registeringCustomer, setRegisteringCustomer] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [checkinStep, setCheckinStep] = useState(1);

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setIsRegistering(false);
    setRegistrationStep(1);
    setShowFinalConfirm(false);
    setRegisteringCustomer(false);
    setSearchAttempted(false);
    setPhone("");
    setProfiles([]);
    setCheckinStep(1);
  };

  // Flow History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Recent visits list for default view
  const [recentVisits, setRecentVisits] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Visit logging form state
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  // Customer registration state
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    town: "",
    district: "",
    state: "",
    postal_code: "",
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setSearching(true);
    setSearchAttempted(true);
    setCustomer(null);
    setProfiles([]);
    setSelectedProfile(null);
    setShowRegForm(false);

    try {
      const { data: matchedCustomers, error: primaryError } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim());

      if (primaryError) throw primaryError;

      const primaryData = matchedCustomers && matchedCustomers.length > 0
        ? (matchedCustomers.find(c => !c.parent_id) || matchedCustomers[0])
        : null;

      if (primaryData) {
        setCustomer(primaryData);
        // Load the primary profile + its dependents
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
      } else {
        setProfiles([]);
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSearching(false);
    }
  };

  const selectProfileFromModal = (p) => {
    setSelectedProfile(p);
    fetchVisitHistory(p.id);
    setCheckinStep(2);
  };

  const fetchVisitHistory = async (profileId) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("customer_visits")
        .select("*")
        .eq("customer_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRecentVisits = async () => {
    setLoadingRecent(true);
    try {
      const { data, error } = await supabase
        .from("customer_visits")
        .select(`
          *,
          customers ( name, phone )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentVisits(data || []);
    } catch (err) {
      console.error("Error fetching recent visits:", err.message);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchRecentVisits();
    }
  }, [userProfile]);

  const handleProfileSelect = (p) => {
    setSelectedProfile(p);
    fetchVisitHistory(p.id);
  };

  const handleRegisterFlowCustomer = async () => {
    if (!regForm.name) return;
    setRegisteringCustomer(true);
    try {
      const payload = {
        name: regForm.name.trim(),
        phone: phone.trim(),
        email: regForm.email.trim() || null,
        town: regForm.town.trim() || null,
        age: regForm.age ? Number(regForm.age) : null
      };

      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showNotification("Customer profile created!");
      setCustomer(data);
      const initialProfile = { ...data, label: "Primary Profile" };
      setProfiles([initialProfile]);
      setSelectedProfile(initialProfile);
      setHistory([]);
      setCheckinStep(2);
      setIsRegistering(false);
      setRegistrationStep(1);
      setShowFinalConfirm(false);
      setSearchAttempted(false);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setRegisteringCustomer(false);
    }
  };

  const handleLogVisit = async (e) => {
    e.preventDefault();
    if (!selectedProfile || !purpose) {
      showNotification("Please select a profile and purpose.", "error");
      return;
    }

    setLoading(true);
    try {
      const visitPayload = {
        customer_id: selectedProfile.id,
        purpose,
        notes,
        employee_id: userProfile?.id,
        store_id: userProfile?.store_id,
      };

      const { error } = await supabase
        .from("customer_visits")
        .insert([visitPayload]);

      if (error) throw error;

      showNotification("Visit logged successfully!");
      fetchRecentVisits();
      setPurpose("");
      setNotes("");
      closeSearchModal();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Customer Flow</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Check-in & Visit Purpose Log</p>
        </div>
        <button
          onClick={() => setShowSearchModal(true)}
          className="px-6 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-2"
        >
          <Search size={14} strokeWidth={3} /> New Check-In
        </button>
      </div>

      {/* Unconditional Recent Check-ins list always displayed at bottom of page */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-black">
          Recent Check-ins
        </h3>
        <div className="overflow-x-auto border border-gray-50 rounded-[24px]">
          {loadingRecent ? (
            <div className="p-10 text-center flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading check-ins...</span>
            </div>
          ) : recentVisits.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Purpose</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[11px] font-black">
                {recentVisits.map((v) => {
                  const purposeLabels = {
                    shopping: "Shopping",
                    eye_test: "Eye Test",
                    pickup: "Pick Up",
                    repair: "Repair",
                    epair: "Repair",
                    buy: "Buy Products",
                    eye_checkup: "Eye Checkup",
                    followup: "Order Followup",
                    other: "Other Reasons"
                  };
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <span className="block text-xs font-black uppercase text-black">{v.customers?.name || "Unknown"}</span>
                        <span className="block text-[9px] font-mono text-gray-400 mt-0.5">{v.customers?.phone}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">
                        {new Date(v.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4 text-black uppercase tracking-tight">
                        <span className="px-2.5 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase">
                          {purposeLabels[v.purpose] || v.purpose}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-sans italic max-w-[300px]">
                        {v.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-gray-400 italic">No recent check-ins recorded.</div>
          )}
        </div>
      </div>

      <CommandDialog
        isOpen={showSearchModal}
        onClose={closeSearchModal}
        title="Check-In Customer"
        subtitle={checkinStep === 2 ? `Log Visit Purpose for ${selectedProfile?.name}` : (isRegistering ? (registrationStep === 1 ? "Register New Profile" : "Verify Profile Details") : "Find Customer")}
        maxWidth={checkinStep === 2 ? "max-w-xl" : (isRegistering ? "max-w-xl" : (searchAttempted && !searching ? "max-w-3xl" : "max-w-md"))}
      >
        {checkinStep === 2 ? (
          /* Step 2: Log Check-In Details */
          <form onSubmit={handleLogVisit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Purpose of Visit
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: "shopping", label: "Shopping" },
                  { id: "eye_test", label: "Eye Test" },
                  { id: "pickup", label: "Pick Up" },
                  { id: "repair", label: "Repair" },
                ].map((pOpt) => {
                  const isSelected = purpose === pOpt.id;
                  return (
                    <button
                      key={pOpt.id}
                      type="button"
                      onClick={() => setPurpose(pOpt.id)}
                      className={`py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                        isSelected
                          ? "bg-black border-black text-white shadow-lg"
                          : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-black"
                      }`}
                    >
                      {pOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Optional Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter details like referral details, order numbers, issues, etc."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCheckinStep(1);
                  setSelectedProfile(null);
                }}
                className="flex-1 py-4 text-xs font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
              >
                Change Customer
              </button>
              <button
                type="submit"
                disabled={loading || !purpose}
                className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "Logging..." : "Log Check-in"}
              </button>
            </div>
          </form>
        ) : (
          isRegistering ? (
            <div className="space-y-6">
              {registrationStep === 1 ? (
                /* Step 1: Form */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input
                      required
                      type="text"
                      autoFocus
                      value={regForm.name}
                      onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-300"
                      placeholder="Customer's Full Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                    <input
                      disabled
                      type="text"
                      value={phone}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black tracking-tight opacity-60 cursor-not-allowed text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={regForm.email}
                      onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-300"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">City / Town</label>
                      <input
                        type="text"
                        value={regForm.town}
                        onChange={e => setRegForm({ ...regForm, town: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-300"
                        placeholder="City or Town"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Age</label>
                      <input
                        type="number"
                        value={regForm.age}
                        onChange={e => setRegForm({ ...regForm, age: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-300"
                        placeholder="Age"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(false);
                        setRegistrationStep(1);
                      }}
                      className="flex-1 py-4 text-xs font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      disabled={!regForm.name}
                      onClick={() => setRegistrationStep(2)}
                      className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg disabled:opacity-40"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Summary / Confirm */
                <div className="space-y-6">
                  {!showFinalConfirm ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-4 text-left">
                        <div>
                          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</span>
                          <span className="text-[12px] font-black text-black uppercase tracking-tight">{regForm.name}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile Number</span>
                          <span className="text-[12px] font-black text-black tracking-tight">{phone}</span>
                        </div>
                        {regForm.email && (
                          <div>
                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</span>
                            <span className="text-[12px] font-bold text-black">{regForm.email}</span>
                          </div>
                        )}
                        {regForm.town && (
                          <div>
                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">City / Town</span>
                            <span className="text-[12px] font-black text-black uppercase tracking-tight">{regForm.town}</span>
                          </div>
                        )}
                        {regForm.age && (
                          <div>
                            <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Age</span>
                            <span className="text-[12px] font-bold text-black">{regForm.age}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setRegistrationStep(1)}
                          className="flex-1 py-4 text-xs font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                        >
                          Go Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFinalConfirm(true)}
                          className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Step 3: Small Confirmation Alert Dialog Inline */
                    <div className="p-6 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-neutral-900 uppercase tracking-tight">Confirm Registration?</p>
                        <p className="text-[10px] text-neutral-500 font-medium">Create a new customer profile for this shopper?</p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowFinalConfirm(false)}
                          className="flex-1 py-3 text-[10px] font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={registeringCustomer}
                          onClick={handleRegisterFlowCustomer}
                          className="flex-1 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow animate-pulse"
                        >
                          {registeringCustomer ? 'Registering...' : 'Yes, Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className={`transition-all duration-300 ${searchAttempted && !searching ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : 'space-y-6'}`}>
              
              {/* Search Controls */}
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1 h-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</label>
                      {searchAttempted && !searching && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchAttempted(false);
                            setProfiles([]);
                            setPhone("");
                          }}
                          className="text-[9px] font-black text-black border border-neutral-300 hover:border-black rounded-lg px-2.5 py-1 uppercase tracking-widest flex items-center gap-1 transition-all"
                        >
                          ✕ Clear Search
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        required
                        type="tel"
                        autoFocus
                        disabled={searching || searchAttempted}
                        placeholder="+91 MOBILE"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base font-black tracking-tight focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed pr-12"
                      />
                      {searchAttempted && !searching && (
                        <Lock size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      )}
                    </div>
                    {searchAttempted && !searching && (
                      <p className="text-[9px] text-neutral-500 font-bold ml-1 flex items-center gap-1.5 animate-in fade-in duration-200">
                        <Lock size={10} /> Search locked. Click "Clear Search" to modify.
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={searching || searchAttempted} 
                    className="w-full px-6 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-neutral-900 active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:bg-black flex items-center justify-center gap-2"
                  >
                    {searching ? 'Verifying...' : (searchAttempted ? <><Lock size={13} strokeWidth={3} /> Search Locked</> : 'Search')}
                  </button>
                </form>
              </div>

              {/* Results Side-by-Side */}
              {searchAttempted && !searching && (
                <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center min-h-[220px]">
                  {profiles.length > 0 ? (
                    <div className="space-y-3 h-full flex flex-col justify-start">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Select Profile</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar flex-1">
                        {profiles.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectProfileFromModal(p)}
                            className="w-full text-left px-5 py-4 border border-gray-100 hover:border-black bg-gray-50 hover:bg-white rounded-2xl transition-all flex items-center justify-between shadow-sm group animate-in fade-in slide-in-from-bottom-2 duration-200"
                          >
                            <div>
                              <span className="block text-xs font-black uppercase tracking-tight text-neutral-900">{p.name}</span>
                              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{p.label}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-neutral-500">{p.phone}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 my-auto animate-in fade-in duration-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching customer profile found</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(true);
                          setRegistrationStep(1);
                        }}
                        className="w-full px-5 py-4 bg-white border border-neutral-200 hover:border-black text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                      >
                        Register New Profile
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )
        )}
      </CommandDialog>

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
