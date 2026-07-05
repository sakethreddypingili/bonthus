import { useState, useEffect } from "react";
import { supabase } from "../server/supabase/supabase";
import { UserPlus, CheckCircle, Wrench, ShieldAlert, Clock, RefreshCw, Plus, Search, Lock, AlertCircle } from "lucide-react";
import SlideDrawer from "../components/common/SlideDrawer";
import CommandDialog from "../components/common/CommandDialog";

export default function Repairs({ userProfile }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  
  // Repair History State
  const [repairsHistory, setRepairsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Drawer & lookup states
  const [showRepairDrawer, setShowRepairDrawer] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [registeringCustomer, setRegisteringCustomer] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const closeRepairDrawer = () => {
    setShowRepairDrawer(false);
    setIsRegistering(false);
    setRegistrationStep(1);
    setShowFinalConfirm(false);
    setRegisteringCustomer(false);
    setSearchAttempted(false);
    setPhone("");
    setProfiles([]);
    setSelectedProfile(null);
    setCustomer(null);
    setStep(1);
    setProductName("");
    setProductBrand("");
    setRepairType("Frame Repair");
    setNotes("");
    setCost("");
  };

  // Inline customer form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    email: "",
    town: "",
    age: ""
  });
  const [registering, setRegistering] = useState(false);

  // Step 2 Form details
  const [productName, setProductName] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [repairType, setRepairType] = useState("Frame Repair");
  const [notes, setNotes] = useState("");

  // Step 3 Financials
  const [cost, setCost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRepairsHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          id,
          product_name,
          product_brand,
          repair_type,
          cost,
          status,
          created_at,
          customer:customers(name, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRepairsHistory(data || []);
    } catch (err) {
      console.error("Error fetching repair history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchRepairsHistory();
  }, []);

  // Step 1: Search Customer using Supabase directly
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
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim());

      if (error) throw error;

      if (data && data.length > 0) {
        const primaryData = data.find(c => !c.parent_id) || data[0];
        setCustomer(primaryData);
        
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
      showNotification(err.message || "Failed to search customer", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleRegisterRepairCustomer = async () => {
    if (!regForm.name) return;
    setRegisteringCustomer(true);
    try {
      const payload = {
        name: regForm.name.trim(),
        phone: phone.trim(),
        email: regForm.email.trim() || null,
        town: regForm.town.trim() || null,
        age: regForm.age ? Number(regForm.age) : null,
        store_id: userProfile?.store_id || null
      };

      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      showNotification("Customer profile created!");
      setCustomer(data);
      setSelectedProfile({ ...data, label: "Primary Profile" });
      
      // Reset wizard lookup state to transition to repair intake forms
      setIsRegistering(false);
      setRegistrationStep(1);
      setShowFinalConfirm(false);
      setSearchAttempted(false);
      setShowSearchModal(false);
      setShowRepairDrawer(true);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setRegisteringCustomer(false);
    }
  };

  // Step 3: Submit Repair using Supabase directly
  const handleSubmitRepair = async (e) => {
    e.preventDefault();
    if (!customer) {
      showNotification("Please select or register a customer first.", "error");
      setStep(1);
      return;
    }

    if (!productName || !repairType || cost === "") {
      showNotification("Missing required repair fields", "error");
      return;
    }

    const numericCost = Number(cost);
    if (isNaN(numericCost) || numericCost < 0) {
      showNotification("Cost must be a positive number", "error");
      return;
    }

    setSubmitting(true);
    try {
      let targetStoreId = userProfile?.store_id;
      if (!targetStoreId || targetStoreId === "00000000-0000-0000-0000-000000000000") {
        const { data: storeList, error: storeError } = await supabase
          .from("stores")
          .select("id")
          .limit(1);
        if (storeError) throw storeError;
        if (storeList && storeList.length > 0) {
          targetStoreId = storeList[0].id;
        } else {
          throw new Error("No active store found in database to link the repair order to.");
        }
      }

      const { error } = await supabase
        .from("repairs")
        .insert([
          {
            customer_id: customer.id,
            store_id: targetStoreId,
            product_name: productName,
            product_brand: productBrand || null,
            repair_type: repairType,
            notes: notes || null,
            cost: numericCost
          }
        ]);

      if (error) throw error;

      showNotification("Repair order registered successfully!");
      fetchRepairsHistory();
      closeRepairDrawer();
    } catch (err) {
      showNotification(err.message || "Failed to create repair order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const [flowCustomers, setFlowCustomers] = useState([]);
  const [loadingFlow, setLoadingFlow] = useState(false);

  const fetchFlowCustomers = async () => {
    if (!userProfile) return;
    setLoadingFlow(true);
    try {
      let query = supabase
        .from('customer_visits')
        .select(`
          id,
          customer_id,
          purpose,
          status,
          created_at,
          customers (
            id,
            name,
            phone,
            email,
            town,
            age
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // Only filter by store_id when the user actually has one (admins may have null)
      if (userProfile.store_id) {
        query = query.eq('store_id', userProfile.store_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const unique = [];
      const seen = new Set();
      (data || []).forEach(v => {
        if (v.customers && !seen.has(v.customers.id)) {
          seen.add(v.customers.id);
          unique.push({
            ...v.customers,
            purpose: v.purpose,
            status: v.status,
            created_at: v.created_at
          });
        }
      });
      setFlowCustomers(unique);
    } catch (err) {
      console.error("Error loading flow customers:", err);
    } finally {
      setLoadingFlow(false);
    }
  };

  useEffect(() => {
    if (showSearchModal) {
      fetchFlowCustomers();
    }
  }, [showSearchModal]);

  const selectProfileFromDrawer = (p) => {
    setSelectedProfile(p);
    setCustomer(p);
    setShowSearchModal(false);
    setShowRepairDrawer(true);
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setIsRegistering(false);
    setRegistrationStep(1);
    setShowFinalConfirm(false);
    setRegisteringCustomer(false);
    setSearchAttempted(false);
    setPhone("");
    setProfiles([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2 flex items-center gap-2">
            <Wrench className="text-black" size={28} /> Repairs
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Process and track custom repair entities</p>
        </div>
        <button
          onClick={() => setShowSearchModal(true)}
          className="px-6 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={14} strokeWidth={3} /> New Repair
        </button>
      </div>

      <CommandDialog
        isOpen={showSearchModal}
        onClose={closeSearchModal}
        title="Find Customer Profile"
      >
        <div className="p-8 space-y-6 bg-white min-h-[400px]">
            {isRegistering ? (
              /* Inline Registration Wizard inside Drawer */
              <div className="space-y-6 max-w-xl mx-auto">
                {registrationStep === 1 ? (
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
                            onClick={handleRegisterRepairCustomer}
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
              <div className="space-y-6 max-w-xl mx-auto">
                {/* 1. Today's Flow checked-in customers */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Today's Checked-in (Flow) Customers</p>
                  {loadingFlow ? (
                    <div className="text-[10px] text-gray-400 font-bold py-2 ml-1">Loading today's flow...</div>
                  ) : flowCustomers.length === 0 ? (
                    <div className="p-4 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">
                      No customer checked-in today yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                      {flowCustomers.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectProfileFromDrawer(p)}
                          className="w-full text-left px-5 py-3.5 border border-gray-150 hover:border-black bg-gray-50 hover:bg-white rounded-2xl transition-all flex items-center justify-between shadow-sm group"
                        >
                          <div>
                            <span className="block text-[11px] font-black uppercase tracking-tight text-neutral-900 truncate max-w-[120px]">{p.name}</span>
                            <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{p.purpose || "Walk-in"}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-neutral-500">{p.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 my-4" />

                {/* 2. Search / Register Customer */}
                <div className="space-y-4">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1 h-6">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Search Directory (Mobile Number)</label>
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

                {/* 3. Search Results */}
                {searchAttempted && !searching && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    {profiles.length > 0 ? (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Select Profile</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                          {profiles.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectProfileFromDrawer(p)}
                              className="w-full text-left px-5 py-3.5 border border-gray-150 hover:border-black bg-gray-50 hover:bg-white rounded-2xl transition-all flex items-center justify-between shadow-sm group"
                            >
                              <div>
                                <span className="block text-[11px] font-black uppercase tracking-tight text-neutral-900 truncate max-w-[120px]">{p.name}</span>
                                <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{p.label}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-neutral-500">{p.phone}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4 py-4">
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
            )}
          </div>
        </CommandDialog>

        {selectedProfile && (
          <SlideDrawer
            isOpen={showRepairDrawer}
            onClose={closeRepairDrawer}
            title="New Repair Order"
            subtitle={`Process repair for ${selectedProfile.name}`}
            width="max-w-xl"
          >
            <div className="p-8 space-y-6 bg-white min-h-[500px]">
            {/* Top Step Indicators */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
              {["Customer Details", "Product Specs", "Financials"].map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const isCompleted = step > stepNum;
                const isActive = step === stepNum;
                return (
                  <div key={stepLabel} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all ${
                      isCompleted ? "bg-black border-black text-white" :
                      isActive ? "bg-black border-black text-white ring-4 ring-neutral-100" : "bg-white border-neutral-200 text-neutral-400"
                    }`}>
                      {stepNum}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? "text-black" : "text-neutral-300"}`}>
                      {stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* STEP 1: Customer Details confirmation */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 space-y-3">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Customer Name</span>
                    <span className="text-sm font-black text-black uppercase">{selectedProfile.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Phone</span>
                    <span className="text-xs font-bold text-black font-mono">{selectedProfile.phone}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedProfile(null)}
                    className="flex-1 py-4 text-xs font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                  >
                    Change Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Product Specs */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Aviator Frame, Progressive Lens"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Brand (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ray-Ban, Oakleys"
                      value={productBrand}
                      onChange={(e) => setProductBrand(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Repair Type</label>
                    <select
                      value={repairType}
                      onChange={(e) => setRepairType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none"
                    >
                      <option value="Frame Repair">Frame Repair</option>
                      <option value="Lens Alignment">Lens Alignment</option>
                      <option value="Screw Replacement">Screw Replacement</option>
                      <option value="Cleaning & Buffing">Cleaning & Buffing</option>
                      <option value="Nosepad Replacement">Nosepad Replacement</option>
                      <option value="Other">Other Services</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Detail the issues, damages, or custom requests..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-xs font-bold outline-none resize-none focus:bg-white focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 text-xs font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={!productName}
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Financials & Review */}
            {step === 3 && (
              <form onSubmit={handleSubmitRepair} className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4 text-left">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review Repair Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block">Customer</span>
                      <span className="text-black uppercase">{selectedProfile.name} ({selectedProfile.phone})</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block">Product</span>
                      <span className="text-black uppercase">{productName} {productBrand ? `[${productBrand}]` : ''}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block">Repair Type</span>
                      <span className="text-black uppercase">{repairType}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block">Notes</span>
                      <span className="text-gray-600 font-normal italic">{notes || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Repair Cost (₹)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 250.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-black focus:bg-white outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 text-xs font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || cost === ""}
                    className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-900 transition-all shadow-lg disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Repair Order"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </SlideDrawer>
      )}

      {/* Repair History Section */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} /> Recent Repair History
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">View and monitor recently submitted repair orders</p>
          </div>
          <button
            onClick={fetchRepairsHistory}
            disabled={loadingHistory}
            className="text-gray-400 hover:text-black transition-colors p-2 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            title="Refresh history"
          >
            <RefreshCw size={14} className={loadingHistory ? "animate-spin" : ""} />
          </button>
        </div>

        {loadingHistory && repairsHistory.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
            Loading repair records...
          </div>
        ) : repairsHistory.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
            No repair records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Date</th>
                  <th className="py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Customer</th>
                  <th className="py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Product / Brand</th>
                  <th className="py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Type</th>
                  <th className="py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Cost</th>
                  <th className="py-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {repairsHistory.map((repair) => (
                  <tr key={repair.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 text-xs font-mono text-gray-500">
                      {new Date(repair.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4">
                      <div className="text-xs font-black text-black uppercase">{repair.customers?.name || "Unknown"}</div>
                      <div className="text-[10px] font-mono text-gray-400">{repair.customers?.phone || "—"}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-xs font-bold text-black uppercase">{repair.product_name}</div>
                      {repair.product_brand && (
                        <div className="text-[10px] font-mono text-gray-400 uppercase">{repair.product_brand}</div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="text-[10px] font-black bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {repair.repair_type}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-black text-black">
                      ₹{Number(repair.cost).toFixed(2)}
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                        repair.status === "delivered" ? "bg-black text-white" :
                        repair.status === "ready" ? "bg-black text-white" :
                        repair.status === "in_progress" ? "bg-gray-200 text-black" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        {repair.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
