import React, { useState, useEffect } from "react";
import { Shield, Send, RefreshCw, MapPin } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { OPERATION_TYPES, ROLES_BY_OPERATION, UNIT_BASED_OPERATIONS } from "../server/database/mocks/constants";

/**
 * Onboarding Component
 */
export function Onboarding({ userProfile, onComplete }) {
  // 1. STATE CONFIGURATION
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [operationType, setOperationType] = useState("retail_ops");
  const [primaryRole, setPrimaryRole] = useState("");
  const [secondaryRole, setSecondaryRole] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [stores, setStores] = useState([]);
  const [labs, setLabs] = useState([]);
  const [dispatchStatus, setDispatchStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR
  const [notification, setNotification] = useState(null);

  // Initial Data Fetch
  useEffect(() => {
    async function fetchData() {
      const [{ data: sData }, { data: lData }] = await Promise.all([
        supabase.from('stores').select('*').order('name'),
        supabase.from('labs').select('*').order('name')
      ]);
      if (sData) setStores(sData);
      if (lData) setLabs(lData);
    }
    fetchData();
  }, []);

  // Sync Primary Role when Operation Domain changes
  useEffect(() => {
    if (ROLES_BY_OPERATION[operationType]) {
      setPrimaryRole(ROLES_BY_OPERATION[operationType][0].value);
    }
    setSecondaryRole("");
    setSelectedUnit("");
  }, [operationType]);

  // Sync Secondary Role when Primary Role is unit-based
  useEffect(() => {
    if (UNIT_BASED_OPERATIONS.includes(primaryRole)) {
      if (ROLES_BY_OPERATION[primaryRole]) {
        setSecondaryRole(ROLES_BY_OPERATION[primaryRole][0].value);
      }
    } else {
      setSecondaryRole("");
    }
    setSelectedUnit("");
  }, [primaryRole]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSendMail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // Validation
    const isUnitBased = UNIT_BASED_OPERATIONS.includes(primaryRole);
    const finalRole = isUnitBased ? secondaryRole : primaryRole;
    const finalOpType = isUnitBased ? primaryRole : operationType;

    if (!employeeName || !finalRole) {
      showNotification("Missing required profile fields.", "error");
      return;
    }

    if (isUnitBased && !selectedUnit) {
      showNotification(`Please select a specific ${primaryRole === 'store' ? 'Store' : 'Lab'} unit.`, "error");
      return;
    }

    const tempPassword = generateRandomPassword();
    setDispatchStatus("SENDING");

    try {
      // 1. Create account
      const { data: userData, error: userError } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'create',
          email: employeeEmail || `${employeePhone || Date.now()}@bonthus.internal`,
          password: tempPassword,
          role: finalRole,
          operation_type: finalOpType,
          store_id: primaryRole === 'store' ? selectedUnit : null,
          lab_id: primaryRole === 'lab' ? selectedUnit : null,
          name: employeeName,
          phone: employeePhone,
          current_address: currentAddress,
          permanent_address: permanentAddress
        }
      });

      if (userError || (userData && userData.error)) {
        throw new Error(userError?.message || userData?.error || "Onboarding rejection.");
      }

      // 2. Optional Mail
      if (employeeEmail) {
        await supabase.functions.invoke('onboarding-mailer', {
          body: {
            employeeEmail,
            employeeName,
            operationType: finalOpType,
            role: finalRole,
            temporaryPassword: tempPassword,
            portalUrl: window.location.origin
          }
        });
        showNotification("Success: Account created and credentials dispatched.", "success");
      } else {
        showNotification(`Profile created! Manual Credentials: ${tempPassword}`, "success");
      }
      
      setDispatchStatus("SUCCESS");
      if (onComplete) setTimeout(() => onComplete(), 3000);
    } catch (err) {
      setDispatchStatus("ERROR");
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <form onSubmit={handleSendMail} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <Shield className="w-4 h-4 text-black" />
              Employee Deployment Vector
            </h2>
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${dispatchStatus === 'SUCCESS' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
              STATUS: {dispatchStatus}
            </div>
          </div>

          <div className="space-y-6">
            {/* Identity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Employee Legal Name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-wider focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="Primary Mobile Number"
                  value={employeePhone}
                  onChange={(e) => setEmployeePhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="For automated credential dispatch"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>

            {/* Address Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Residence</label>
                <textarea
                  rows={2}
                  placeholder="Complete current address..."
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Permanent Residence</label>
                <textarea
                  rows={2}
                  placeholder="Complete permanent address..."
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Hierarchy Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Operation Domain</label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                >
                  {OPERATION_TYPES.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Designation</label>
                <select
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                >
                  {(ROLES_BY_OPERATION[operationType] || []).map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {UNIT_BASED_OPERATIONS.includes(primaryRole) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MapPin size={10} />
                    Deployment {primaryRole === 'store' ? 'Store' : 'Lab'} Unit
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Choose Location...</option>
                    {(primaryRole === 'store' ? stores : labs).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Specific Role</label>
                  <select
                    value={secondaryRole}
                    onChange={(e) => setSecondaryRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {(ROLES_BY_OPERATION[primaryRole] || []).map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={dispatchStatus === "SENDING"}
              className={`w-full py-5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-3 ${dispatchStatus === "SENDING" ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:scale-[1.02] active:scale-[0.98]"}`}
            >
              {dispatchStatus === "SENDING" ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {dispatchStatus === "SENDING" ? "Deploying User Profile..." : "Initialize Onboarding"}
            </button>
          </div>
        </div>
      </form>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${notification.type === 'success' ? 'bg-black border-white/10 text-white' : notification.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
