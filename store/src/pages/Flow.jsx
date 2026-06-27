import { useState, useEffect } from "react";
import { supabase } from "../server/supabase/supabase";
import { Search, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

export default function Flow({ userProfile }) {
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showRegForm, setShowRegForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

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
        if (allProfiles.length === 1) {
          setSelectedProfile(allProfiles[0]);
          fetchVisitHistory(allProfiles[0].id);
        } else {
          setSelectedProfile(null);
          setHistory([]);
        }
      } else {
        // Prepare registration form with the entered phone number
        setRegForm({
          name: "",
          phone: phone.trim(),
          email: "",
          street: "",
          town: "",
          district: "",
          state: "",
          postal_code: "",
        });
        setShowRegForm(true);
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSearching(false);
    }
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...regForm,
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
      setShowRegForm(false);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
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
      if (selectedProfile) {
        fetchVisitHistory(selectedProfile.id);
      }
      fetchRecentVisits();
      setPurpose("");
      setNotes("");
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black tracking-tighter uppercase mb-2">Customer Flow</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Check-in & Visit Purpose Log</p>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
        {/* Search Section */}
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

        {/* Customer Registration Form */}
        {showRegForm && (
          <div className="border-t border-gray-50 pt-8 space-y-6">
            <div className="flex items-center gap-2 text-gray-800">
              <UserPlus size={18} />
              <h3 className="text-sm font-black uppercase tracking-wider">New Customer Registration</h3>
            </div>
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</label>
                <input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Street Address</label>
                <input
                  type="text"
                  placeholder="Street"
                  value={regForm.street}
                  onChange={(e) => setRegForm({ ...regForm, street: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Town / City</label>
                <input
                  type="text"
                  placeholder="Town"
                  value={regForm.town}
                  onChange={(e) => setRegForm({ ...regForm, town: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Postal Code</label>
                <input
                  type="text"
                  placeholder="Pin Code"
                  value={regForm.postal_code}
                  onChange={(e) => setRegForm({ ...regForm, postal_code: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="md:col-span-2 w-full py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                {loading ? "Registering..." : "Create Account & Check In"}
              </button>
            </form>
          </div>
        )}

        {/* Profiles and Visit Log Form */}
        {customer && (
          <div className="border-t border-gray-50 pt-8 space-y-6">
            {!selectedProfile && profiles.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Select Profile checking in
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {profiles.map((p) => {
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProfileSelect(p)}
                        className="flex flex-col text-left p-5 rounded-2xl border border-gray-100 bg-gray-50/50 text-black hover:bg-gray-50 transition-all hover:scale-[1.01]"
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
            )}

            {selectedProfile && (
              <>
                {/* Active Selected Profile Summary */}
                <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-3xl p-6 shadow-sm">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Active Profile</span>
                    <h4 className="text-base font-black uppercase tracking-tight text-black mt-1">{selectedProfile.name}</h4>
                    <p className="text-[10px] font-mono text-gray-400 mt-1">
                      Phone: {selectedProfile.phone || customer.phone} {selectedProfile.parent_id ? `• Dependent (${selectedProfile.relationship || "Family"})` : "• Primary Profile"}
                    </p>
                  </div>
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfile(null);
                        setHistory([]);
                      }}
                      className="px-5 py-2.5 border border-black hover:bg-black hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Change Profile
                    </button>
                  )}
                </div>

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

                  <button
                    type="submit"
                    disabled={loading || !purpose}
                    className="w-full py-4 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:pointer-events-none"
                  >
                    {loading ? "Logging..." : "Log Check-in"}
                  </button>
                </form>

                {/* Visit History Section */}
                <div className="space-y-4 border-t border-gray-50 pt-8">
                  <h3 className="text-sm font-black uppercase tracking-wider text-black">
                    Visit History for {selectedProfile.name}
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
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Purpose</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px] font-black">
                          {history.map((v) => {
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
                      <div className="p-10 text-center text-gray-400 italic">No visit history found for this profile.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
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
