import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Building2, Users, Camera, ChevronDown, Check, X, Clock, ScanBarcode, QrCode } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";

const STATUS_OPTIONS = ["present", "absent", "leave"];

export default function Attendance({ userProfile }) {
  const role = userProfile?.role;
  const isSuperAdmin = role === "admin" || role === "super_admin";
  const isAdminOrManager = isSuperAdmin || role === "manager" || role === "store_manager";
  const isEmployeeOnly = !isAdminOrManager;

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('attendanceActiveTab');
    if (savedTab) return savedTab;
    return isEmployeeOnly ? "scan" : "users";
  });

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Date Filters
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [historyTo, setHistoryTo] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });

  // QR Logic
  const [qrType, setQrType] = useState("check_in");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Scan Logic
  const [isScanning, setIsScanning] = useState(false);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isProcessingQrRef = useRef(false);

  const [notice, setNotice] = useState({ type: "", message: "" });

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: sData } = await supabase.from("stores").select("id, name").order("name");
      setStores(sData || []);
      
      // Set default store: user's store or first store for admin
      const defaultStore = isAdminOrManager ? (userProfile?.store_id || sData?.[0]?.id || "") : userProfile?.store_id;
      setSelectedStoreId(defaultStore);
    } catch (err) {
      console.error("Error fetching initial data:", err.message);
    }
  }, [isAdminOrManager, userProfile?.store_id]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchStaff = useCallback(async () => {
    if (!selectedStoreId && !isSuperAdmin) return;
    setLoadingStaff(true);
    try {
      let query = supabase.from("users").select("id, name, role, email, is_active, store_id");
      if (!isSuperAdmin || (selectedStoreId && selectedStoreId !== "All")) {
        query = query.eq("store_id", selectedStoreId);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error("Error fetching staff:", err.message);
    } finally {
      setLoadingStaff(false);
    }
  }, [selectedStoreId, isSuperAdmin]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      let query = supabase
        .from("attendance")
        .select("*, user:users(id, name, store_id)")
        .gte("attendance_date", historyFrom)
        .lte("attendance_date", historyTo)
        .order("attendance_date", { ascending: false });

      if (isEmployeeOnly) {
        query = query.eq("user_id", userProfile?.id);
      } else if (selectedStoreId && selectedStoreId !== "All") {
        // We filter by store_id of the user linked to attendance
        query = query.filter('user.store_id', 'eq', selectedStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHistoryRows(data || []);
    } catch (err) {
      console.error("Error fetching history:", err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyFrom, historyTo, isEmployeeOnly, userProfile?.id, selectedStoreId]);

  useEffect(() => {
    if (activeTab === "users") fetchStaff();
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchStaff, fetchHistory]);

  useEffect(() => {
    localStorage.setItem('attendanceActiveTab', activeTab);
  }, [activeTab]);

  const handleGenerateQR = async () => {
    if (!selectedStoreId) {
      setNotice({ type: "error", message: "Select a store first." });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    setIsGenerating(true);
    try {
      const { data: existing } = await supabase
        .from("attendance_qr_codes")
        .select("*")
        .eq("store_id", selectedStoreId)
        .eq("valid_date", today)
        .eq("qr_type", qrType)
        .maybeSingle();

      if (existing) {
        setGeneratedCode(existing.qr_code_token);
      } else {
        const token = `ATT-${selectedStoreId.slice(0,4)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const { error } = await supabase.from("attendance_qr_codes").insert([{
          qr_code_token: token,
          store_id: selectedStoreId,
          qr_type: qrType,
          valid_date: today,
          expires_at: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString() // 16 hours
        }]);
        if (error) throw error;
        setGeneratedCode(token);
      }
      setNotice({ type: "success", message: "QR Generated Successfully" });
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Scanner cleanup:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setIsStartingScanner(false);
    isProcessingQrRef.current = false;
  }, []);

  const startCamera = async () => {
    setNotice({ type: "", message: "" });
    setIsStartingScanner(true);
    try {
      await stopCamera();
      html5QrCodeRef.current = new Html5Qrcode("reader");
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => processQRCode(decodedText),
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      setNotice({ type: "error", message: "Camera access failed." });
      await stopCamera();
    } finally {
      setIsStartingScanner(false);
    }
  };

  const processQRCode = async (token) => {
    if (isProcessingQrRef.current) return;
    isProcessingQrRef.current = true;
    try {
      const { data: qrData, error: qrErr } = await supabase
        .from("attendance_qr_codes")
        .select("*")
        .eq("qr_code_token", token)
        .maybeSingle();

      if (qrErr || !qrData) throw new Error("Invalid or unregistered QR code.");
      if (new Date() > new Date(qrData.expires_at)) throw new Error("QR code has expired.");
      
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      if (userProfile.store_id !== qrData.store_id && !isSuperAdmin) {
         throw new Error("This QR belongs to a different store.");
      }

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userProfile.id)
        .eq("attendance_date", today)
        .maybeSingle();

      if (qrData.qr_type === "check_in") {
        if (existing?.check_in) throw new Error("Already checked in for today.");
        if (existing) {
          await supabase.from("attendance").update({ check_in: now, status: 'present' }).eq("id", existing.id);
        } else {
          await supabase.from("attendance").insert([{ user_id: userProfile.id, attendance_date: today, check_in: now, status: 'present' }]);
        }
      } else {
        if (!existing) throw new Error("No check-in record found for today.");
        if (existing.check_out) throw new Error("Already checked out for today.");
        await supabase.from("attendance").update({ check_out: now }).eq("id", existing.id);
      }

      setNotice({ type: "success", message: `Successfully marked ${qrData.qr_type.replace('_', ' ')}!` });
      await stopCamera();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      isProcessingQrRef.current = false;
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const statusBadge = (status) => {
    const map = {
      "present": "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "absent": "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "leave": "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[status] || map["present"]}>{status}</span>;
  };

  return (
    <div className="space-y-6 animate-fast-slide pb-20">

      {notice.message && (
        <div className={`p-6 rounded-[2rem] border text-[11px] font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-4 ${notice.type === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-black text-white border-black"}`}>
          {notice.type === "error" ? <X size={20} /> : <Check size={20} />}
          {notice.message}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center bg-gray-50 border border-gray-100 p-1.5 rounded-[2rem] w-full md:w-max">
          {isAdminOrManager && (
            <button onClick={() => setActiveTab("users")} className={`flex-1 md:px-10 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "users" ? "bg-black text-white shadow-xl" : "text-gray-400 hover:text-black"}`}>Staff</button>
          )}
          <button onClick={() => setActiveTab("scan")} className={`flex-1 md:px-10 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "scan" ? "bg-black text-white shadow-xl" : "text-gray-400 hover:text-black"}`}>Scanner</button>
          <button onClick={() => setActiveTab("history")} className={`flex-1 md:px-10 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-black text-white shadow-xl" : "text-gray-400 hover:text-black"}`}>Ledger</button>
          {isAdminOrManager && (
            <button onClick={() => setActiveTab("qr")} className={`flex-1 md:px-10 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "qr" ? "bg-black text-white shadow-xl" : "text-gray-400 hover:text-black"}`}>Gen QR</button>
          )}
        </div>

        {isAdminOrManager && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit">
            <Building2 size={16} className="text-gray-400" />
            <select 
              value={selectedStoreId} 
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase text-black focus:outline-none cursor-pointer pr-4"
            >
              {isSuperAdmin && <option value="All">All Clusters</option>}
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Staff Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-10 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Cluster Registry</h2>
            <span className="px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">{staff.length} Active Nodes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                  <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Identify</th>
                  <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Vector</th>
                  <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingStaff ? (
                  <tr><td colSpan={3} className="px-10 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Syncing Nodes...</td></tr>
                ) : staff.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-10 py-6">
                      <div className="text-[12px] font-black text-black uppercase tracking-tight">{emp.name}</div>
                      <div className="text-[9px] font-black text-gray-400 uppercase font-mono mt-0.5">{emp.email}</div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="text-[10px] font-black text-black uppercase tracking-widest">{stores.find(s => s.id === emp.store_id)?.name || "Warehouse"}</div>
                      <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{emp.role}</div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${emp.is_active ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {emp.is_active ? 'Active' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ledger Tab */}
      {activeTab === "history" && (
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Audit Ledger</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Temporal attendance verification</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-black" />
                <span className="text-gray-300">→</span>
                <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-black" />
                <button onClick={fetchHistory} className="px-8 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all">Audit</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Timeline</th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Entry</th>
                    <th className="px-10 py-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Exit</th>
                    <th className="px-10 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingHistory ? (
                    <tr><td colSpan={5} className="px-10 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Retrieving Logs...</td></tr>
                  ) : historyRows.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-10 py-6">
                        <div className="text-[12px] font-black text-black uppercase tracking-tight">{record.user?.name || "System Node"}</div>
                      </td>
                      <td className="px-10 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">{new Date(record.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 text-[11px] font-black text-black">
                          <Clock size={12} className="text-gray-400" />
                          {record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 text-[11px] font-black text-black">
                          <Clock size={12} className="text-gray-400" />
                          {record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">{statusBadge(record.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QR Generation Tab */}
      {activeTab === "qr" && (
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-black uppercase tracking-tighter mb-2">Gatekeeper QR</h2>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-12">Initialize daily access vectors</p>
          
          <div className="flex bg-gray-50 p-2 rounded-[2rem] border border-gray-100 w-full mb-12">
            <button onClick={() => { setQrType("check_in"); setGeneratedCode(""); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${qrType === "check_in" ? "bg-black text-white shadow-2xl" : "text-gray-400"}`}>Check In</button>
            <button onClick={() => { setQrType("check_out"); setGeneratedCode(""); }} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${qrType === "check_out" ? "bg-black text-white shadow-2xl" : "text-gray-400"}`}>Check Out</button>
          </div>

          <div className="p-10 bg-white border border-gray-50 rounded-[4rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] animate-fast-zoom">
            {generatedCode ? (
              <QRCodeCanvas value={generatedCode} size={280} level="H" includeMargin={true} />
            ) : (
              <div className="w-72 h-72 flex flex-col items-center justify-center text-gray-200 gap-6">
                <QrCode size={80} strokeWidth={1} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Awaiting Vector Initialization</span>
              </div>
            )}
          </div>

          <button onClick={handleGenerateQR} disabled={isGenerating || !selectedStoreId} className="w-full mt-16 bg-black text-white font-black py-6 rounded-[2.5rem] text-[12px] uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20">
            {isGenerating ? "Synthesizing..." : "Initialize Session"}
          </button>
        </div>
      )}

      {/* Scanner Tab */}
      {activeTab === "scan" && (
        <div className="bg-white rounded-[4rem] border border-gray-100 shadow-sm p-16 flex flex-col items-center max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-black uppercase tracking-tighter mb-2">Auth Scanner</h2>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-12">Engage biometric store gateway</p>

          <div className="relative w-full aspect-square bg-black rounded-[4rem] overflow-hidden shadow-2xl border-[12px] border-gray-50 group">
            <div id="reader" className="w-full h-full"></div>
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 animate-pulse group-hover:scale-110 transition-transform">
                  <Camera size={40} className="text-white" />
                </div>
                <button onClick={startCamera} disabled={isStartingScanner} className="px-12 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-[2rem] hover:shadow-2xl transition-all disabled:opacity-50">
                  {isStartingScanner ? "Waking Sensor..." : "Engage Camera"}
                </button>
              </div>
            )}
            {isScanning && (
                <button onClick={stopCamera} className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-2xl hover:scale-105 transition-all">
                    Abort Session
                </button>
            )}
          </div>

          <div className="mt-16 p-8 bg-gray-50 border border-gray-100 rounded-[3rem] w-full flex items-center gap-6 text-left group hover:border-black transition-all">
            <div className="w-20 h-20 bg-black rounded-[2rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:rotate-6"><Users size={32} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Authenticated Identity</p>
              <p className="text-2xl font-black text-black uppercase tracking-tight">{userProfile?.name || "Syncing Matrix..."}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{userProfile?.role} — {userProfile?.store?.name || "Global Node"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
