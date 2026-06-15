import React, { useState } from "react";
import { UserPlus, Shield, Send, Terminal, HelpCircle, RefreshCw } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

/**
 * Onboarding Component
 * Allows managers/admins to trigger automated onboarding email credentials
 * using the Supabase Edge Function.
 */
export function Onboarding({ userProfile, onComplete }) {
  // 1. STATE CONFIGURATION
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [role, setRole] = useState("Sales Associate");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [portalUrl, setPortalUrl] = useState(window.location.origin);

  // Status & Logs
  const [logs, setLogs] = useState([
    { timestamp: new Date().toLocaleTimeString(), status: "INFO", message: "Onboarding manager active." },
    { timestamp: new Date().toLocaleTimeString(), status: "INFO", message: "System configured for managed Supabase Edge Functions." }
  ]);
  const [dispatchStatus, setDispatchStatus] = useState("IDLE"); // IDLE, SENDING, SUCCESS, ERROR

  // 2. PASSWORD GENERATION HELPER
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTemporaryPassword(password);
    addLog("INFO", "Generated random temporary password vector.");
  };

  const addLog = (status, message) => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), status, message }
    ]);
  };

  const setConsoleLog = (message) => {
    const status = message.startsWith("ERROR") ? "ERROR" : "SUCCESS";
    addLog(status, message);
  };

  // 3. API DISPATCH HANDLER
  const handleSendMail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!employeeName || !employeeEmail || !role || !temporaryPassword) {
      addLog("ERROR", "Validation failed: All form fields are required.");
      return;
    }

    setDispatchStatus("SENDING...");
    addLog("PENDING", `Dispatching onboarding mailer to ${employeeEmail}...`);

    try {
      // Invoke the Supabase Edge Function (Production-ready mailing logic)
      const { data, error } = await supabase.functions.invoke('onboarding-mailer', {
        body: {
          employeeEmail,
          employeeName,
          role,
          temporaryPassword,
          portalUrl
        }
      });

      if (error) {
        throw new Error(error.message || "Edge Function failed to execute.");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setDispatchStatus("SUCCESS: Mail Dispatched");
      setConsoleLog("SUCCESS: Invitation email dispatched via Supabase + Resend official SDK.");
      
      if (onComplete) {
        setTimeout(() => onComplete(), 2000);
      }
    } catch (err) {
      setDispatchStatus("ERROR: Dispatch Failed");
      setConsoleLog(`ERROR: Mailer dispatch rejected: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Form Configuration */}
        <form onSubmit={handleSendMail} className="md:col-span-5 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              Employee Credentials Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Personal Email</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Clearance Level</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                  >
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Optometrist">Optometrist</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Temporary Vector</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="••••••••"
                      value={temporaryPassword}
                      className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-xs font-mono font-black text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <RefreshCw size={14} className="text-black" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Deployment Link</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Terminal size={14} className="text-gray-400" />
              <input
                type="text"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                className="bg-transparent text-[10px] font-mono font-bold text-gray-600 flex-1 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={dispatchStatus === "SENDING"}
            className={`w-full py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 ${dispatchStatus === "SENDING" ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-black text-white hover:scale-[1.02] active:scale-[0.98]"}`}
          >
            {dispatchStatus === "SENDING" ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            {dispatchStatus === "SENDING" ? "Dispatching..." : "Execute Onboarding"}
          </button>
        </form>

        {/* Right Status Log */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="bg-black rounded-3xl p-8 flex-1 shadow-2xl relative overflow-hidden flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live Execution Log</span>
              </div>
              <HelpCircle size={14} className="text-gray-700" />
            </div>

            <div className="flex-1 font-mono space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 text-[10px] leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 font-black ${log.status === "ERROR" ? "text-red-500" : log.status === "SUCCESS" ? "text-green-500" : "text-blue-500"}`}>
                    {log.status}:
                  </span>
                  <span className="text-neutral-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
