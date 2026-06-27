import { useState, useEffect } from "react";
import { supabase } from "../server/supabase/supabase";
import { UserPlus, CheckCircle, Wrench, ShieldAlert, Clock, RefreshCw } from "lucide-react";

export default function Repairs({ userProfile }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState(null);
  
  // Repair History State
  const [repairsHistory, setRepairsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Inline customer form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    email: ""
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
    setCustomer(null);
    setShowRegForm(false);

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone.trim());

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomer(data[0]);
        showNotification("Customer found!");
      } else {
        setRegForm({
          name: "",
          phone: phone.trim(),
          email: ""
        });
        setShowRegForm(true);
        showNotification("No customer found. Please register inline.", "info");
      }
    } catch (err) {
      showNotification(err.message || "Failed to search customer", "error");
    } finally {
      setSearching(false);
    }
  };

  // Inline Register Customer
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      showNotification("Name and phone are required", "error");
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            name: regForm.name.trim(),
            phone: regForm.phone.trim(),
            email: regForm.email.trim() || null,
            store_id: userProfile?.store_id || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setCustomer(data);
      setShowRegForm(false);
      showNotification("New customer registered successfully!");
    } catch (err) {
      showNotification(err.message || "Registration failed", "error");
    } finally {
      setRegistering(false);
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
      // Reset state & go to step 1
      setCustomer(null);
      setPhone("");
      setProductName("");
      setProductBrand("");
      setRepairType("Frame Repair");
      setNotes("");
      setCost("");
      setStep(1);
    } catch (err) {
      showNotification(err.message || "Failed to create repair order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fast-slide pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black tracking-tighter uppercase mb-2 flex items-center gap-2">
          <Wrench className="text-black" size={28} /> Repair
        </h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Process and track custom repair entities</p>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-wider ${
          notification.type === "error" ? "bg-red-50 text-red-600 border border-red-100" :
          notification.type === "info" ? "bg-gray-50 text-gray-500 border border-gray-100" :
          "bg-black text-white"
        }`}>
          {notification.type === "error" ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Form Content Card */}
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
        
        {/* STEP 1: CUSTOMER LOOKUP */}
        {step === 1 && (
          <div className="space-y-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Search Customer by Phone Number
              </label>
              <div className="flex gap-4">
                <input
                  required
                  type="tel"
                  placeholder="Enter Phone Number..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            {customer && (
              <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Selected Customer</span>
                  <h4 className="text-base font-black uppercase tracking-tight text-black mt-1">{customer.name}</h4>
                  <p className="text-[10px] font-mono text-gray-400 mt-1">Phone: {customer.phone} {customer.email ? `• ${customer.email}` : ''}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  Continue to Step 2
                </button>
              </div>
            )}

            {showRegForm && (
              <div className="border-t border-gray-100 pt-6 space-y-6">
                <div className="flex items-center gap-2 text-gray-800">
                  <UserPlus size={18} />
                  <h3 className="text-sm font-black uppercase tracking-wider">Inline Register New Customer</h3>
                </div>
                <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                    <input
                      required
                      type="tel"
                      placeholder="Phone Number"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={registering}
                    className="md:col-span-3 w-full py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                  >
                    {registering ? "Registering..." : "Create Account & Select"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PRODUCT & REPAIR SPECIFICATIONS */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Aviator Frame, Progressive Lens"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Brand (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ray-Ban, Oakleys"
                  value={productBrand}
                  onChange={(e) => setProductBrand(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Repair Type</label>
              <select
                value={repairType}
                onChange={(e) => setRepairType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none"
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
                rows={4}
                placeholder="Detail the issues, damages, or custom requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none resize-none focus:bg-white"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!productName}
                onClick={() => setStep(3)}
                className="bg-black text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                Continue to Step 3
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FINANCIALS & REVIEW */}
        {step === 3 && (
          <form onSubmit={handleSubmitRepair} className="space-y-6">
            <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review Repair Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase block">Customer</span>
                  <span className="text-black uppercase">{customer?.name} ({customer?.phone})</span>
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
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-black focus:bg-white outline-none"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || cost === ""}
                className="bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Repair Order"}
              </button>
            </div>
          </form>
        )}

      </div>

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
                      <div className="text-xs font-black text-black uppercase">{repair.customer?.name || "Unknown"}</div>
                      <div className="text-[10px] font-mono text-gray-400">{repair.customer?.phone || "—"}</div>
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
