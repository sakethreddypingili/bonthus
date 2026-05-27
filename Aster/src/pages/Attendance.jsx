import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Building2, Users, Camera, ChevronDown, Check, X, Clock } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";

const STATUS_OPTIONS = ["present", "absent", "leave"];

function normalizeStatus(status) {
  const normalized = (status || "present").toLowerCase();
  return STATUS_OPTIONS.includes(normalized) ? normalized : "present";
}

export default function Attendance({ userProfile }) {
  const isSuperAdmin = userProfile?.role === "admin" || userProfile?.role === "super_admin" || userProfile?.store_name === "All";
  const isEmployee = userProfile?.role === "employee";

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('attendanceActiveTab');
    if (savedTab) return savedTab;
    return isEmployee ? "history" : "employees";
  });
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("All");

  const [currentUserEmployee, setCurrentUserEmployee] = useState(null);
  const [employeeStoreName, setEmployeeStoreName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const generateSecurePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@#$%^&*!';
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
    for (let i = 4; i < 16; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active",
    joined_on: new Date().toISOString().split("T")[0],
    password: generateSecurePassword(),
    useDefaultPassword: true,
  });
  const [employeeSaving, setEmployeeSaving] = useState(false);

  const [selectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [historyTo, setHistoryTo] = useState(() => {
    const d = new Date();
    d.setDate(32);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [qrType, setQrType] = useState("check_in");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isProcessingQrRef = useRef(false);

  const [notice, setNotice] = useState({ type: "", message: "" });

  const resolvedStoreId = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStoreId === "All" ? null : selectedStoreId;
    }
    return userProfile?.store_id || null;
  }, [isSuperAdmin, selectedStoreId, userProfile?.store_id]);

  const fetchStores = useCallback(async () => {
    if (!isSuperAdmin) return;
    const { data, error } = await supabase.from("store").select("id, name").order("name");
    if (!error) setStores(data || []);
  }, [isSuperAdmin]);

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      let query = supabase.from("employees").select("id, name, employee_id, store_id, department, role, email, phone, status, joined_on, user_id, created_at").order("created_at", { ascending: false });
      if (resolvedStoreId) query = query.eq("store_id", resolvedStoreId);
      const { data, error } = await query;
      if (!error) setEmployees(data || []);
    } finally {
      setEmployeesLoading(false);
    }
  }, [resolvedStoreId]);

  useEffect(() => {
    if (!isEmployee) {
      fetchStores();
      fetchEmployees();
    }
  }, [fetchStores, fetchEmployees, isEmployee]);

  useEffect(() => {
    localStorage.setItem('attendanceActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (userProfile?.email || userProfile?.employee_id) {
      const fetchEmployeeData = async () => {
        try {
          let employee = null;
          const normalizedEmail = userProfile?.email?.trim().toLowerCase();
          
          if (normalizedEmail) {
            const { data: emailData } = await supabase.from("employees").select("*").ilike("email", normalizedEmail).maybeSingle();
            employee = emailData;
          }
          
          if (!employee && userProfile.employee_id) {
            const { data: idData } = await supabase.from("employees").select("*").eq("employee_id", userProfile.employee_id).maybeSingle();
            employee = idData;
          }
          
          if (employee) {
            setCurrentUserEmployee(employee);
            if (employee.store_id) {
              const { data: storeData } = await supabase.from("store").select("name").eq("id", employee.store_id).maybeSingle();
              if (storeData) {
                setEmployeeStoreName(storeData.name);
              }
            }
          } else if (isEmployee) {
            setCurrentUserEmployee(null);
            setNotice({ type: "error", message: "Employee profile not mapped. Contact admin." });
          }
        } catch (err) {
          console.error("Error fetching employee data:", err);
        }
      };
      
      fetchEmployeeData();
    }
  }, [userProfile, isEmployee]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setNotice({ type: "", message: "" });

    const name = employeeForm.name.trim();
    const targetStoreId = isSuperAdmin ? employeeForm.store_id : userProfile?.store_id;

    if (!name || !employeeForm.email || !employeeForm.phone) {
      setNotice({ type: "error", message: "Required fields missing." });
      return;
    }

    setEmployeeSaving(true);
    try {
      const { supabaseAdmin } = await import("../server/supabase/supabaseAdmin");
      if (!supabaseAdmin || !supabaseAdmin.auth.admin) throw new Error("Admin credentials missing.");

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: employeeForm.email,
        password: employeeForm.password,
        email_confirm: true,
        user_metadata: { name: name }
      });

      if (authError) throw authError;

      const randomId = Math.floor(100000 + Math.random() * 900000).toString();
      const { error: empError } = await supabase.from("employees").insert([{
        name,
        employee_id: randomId,
        store_id: targetStoreId,
        department: employeeForm.department,
        role: employeeForm.role,
        email: employeeForm.email,
        phone: employeeForm.phone.trim(),
        status: employeeForm.status,
        joined_on: employeeForm.joined_on,
        user_id: authData.user.id,
        must_reset_password: true,
      }]);

      if (empError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw empError;
      }

      setEmployeeForm({
        name: "", store_id: isSuperAdmin ? employeeForm.store_id : "", department: "", role: "",
        email: "", phone: "", status: "active", joined_on: new Date().toISOString().split("T")[0],
        password: generateSecurePassword(), useDefaultPassword: true
      });

      setNotice({ type: "success", message: `Employee account created successfully.` });
      fetchEmployees();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      setEmployeeSaving(false);
    }
  };

  const handleGenerateQR = async () => {
    const targetStoreId = isSuperAdmin ? selectedStoreId : userProfile?.store_id;
    if (!targetStoreId || targetStoreId === "All") {
      setNotice({ type: "error", message: "Select a store first." });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    setIsGenerating(true);
    try {
      const { data: existingQR } = await supabase
        .from("attendance_qr_codes")
        .select("*")
        .eq("store_id", targetStoreId)
        .eq("valid_date", today)
        .eq("qr_type", qrType)
        .limit(1);

      if (existingQR && existingQR.length > 0) {
        setGeneratedCode(existingQR[0].code);
      } else {
        const code = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
        const { error: insertError } = await supabase.from("attendance_qr_codes").insert([{
          code, store_id: targetStoreId, qr_type: qrType, valid_date: today,
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        }]);
        if (insertError) throw insertError;
        setGeneratedCode(code);
      }
      setNotice({ type: "success", message: "QR Ready." });
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const stopCamera = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) {
      setIsScanning(false);
      setIsStartingScanner(false);
      isProcessingQrRef.current = false;
      return;
    }
    try { await scanner.stop(); } catch (err) {}
    try { await scanner.clear(); } catch (err) {}
    html5QrCodeRef.current = null;
    setIsScanning(false);
    setIsStartingScanner(false);
    isProcessingQrRef.current = false;
  }, []);

  const startCamera = async () => {
    if (isScanning || isStartingScanner || !currentUserEmployee) return;
    setNotice({ type: "", message: "" });
    setIsStartingScanner(true);
    try {
      await stopCamera();
      html5QrCodeRef.current = new Html5Qrcode("reader");
      const scannerConfig = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      await html5QrCodeRef.current.start({ facingMode: "environment" }, scannerConfig, (decodedText) => processQRCode(decodedText), () => {});
      setIsScanning(true);
    } catch (err) {
      setNotice({ type: "error", message: `Camera error: ${err.message}` });
      await stopCamera();
    } finally {
      setIsStartingScanner(false);
    }
  };

  const processQRCode = async (decodedText) => {
    if (isProcessingQrRef.current || !currentUserEmployee) return;
    isProcessingQrRef.current = true;
    try {
      const scannedCode = (decodedText || "").trim();
      const { data: qrData } = await supabase.from("attendance_qr_codes").select("*").eq("code", scannedCode).limit(1);
      if (!qrData?.length) throw new Error("Invalid QR.");

      const qrRecord = qrData[0];
      if (new Date() > new Date(qrRecord.expires_at)) throw new Error("QR Expired.");
      if (qrRecord.store_id !== currentUserEmployee.store_id) throw new Error("Wrong Store.");

      const nowIso = new Date().toISOString();
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase.from("attendance").select("id").eq("employee_id", currentUserEmployee.id).eq("attendance_date", today).maybeSingle();

      if (qrRecord.qr_type === "check_in") {
        if (existing) await supabase.from("attendance").update({ check_in: nowIso }).eq("id", existing.id);
        else await supabase.from("attendance").insert([{ employee_id: currentUserEmployee.id, attendance_date: today, status: "present", check_in: nowIso }]);
      } else {
        if (!existing) throw new Error("Check-in first!");
        await supabase.from("attendance").update({ check_out: nowIso }).eq("id", existing.id);
      }
      setNotice({ type: "success", message: `Marked ${qrRecord.qr_type}!` });
      await stopCamera();
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      isProcessingQrRef.current = false;
    }
  };

  useEffect(() => { if (activeTab !== "scan") stopCamera(); }, [activeTab, stopCamera]);
  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const targetStoreId = isSuperAdmin ? selectedStoreId : userProfile?.store_id;
      let query = supabase.from("attendance").select("*, employees(*)").gte("attendance_date", historyFrom).lte("attendance_date", historyTo).order("attendance_date", { ascending: false });
      
      if (isEmployee && currentUserEmployee) {
        query = query.eq("employee_id", currentUserEmployee.id);
      } else if (targetStoreId && targetStoreId !== "All") {
        // Since store_id is on employees table, we filter after fetching or use a join if schema allows
        // For now, filtering after fetch as per existing logic
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (!isEmployee && targetStoreId && targetStoreId !== "All") {
        filtered = filtered.filter(r => r.employees?.store_id === targetStoreId);
      }
      
      setHistoryRows(filtered.map(r => ({ ...r, employee: r.employees })));
    } catch (err) {
      setNotice({ type: "error", message: err.message });
    } finally {
      setHistoryLoading(false);
    }
  }, [isSuperAdmin, isEmployee, currentUserEmployee, historyFrom, historyTo, selectedStoreId, userProfile?.store_id]);

  useEffect(() => { if (activeTab === "history") fetchHistory(); }, [activeTab, fetchHistory]);

  const statusBadge = (status) => {
    const map = {
      "present": "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "half-day": "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "absent": "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[status] || map["present"]}>{status}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Attendance</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Manage staff registry and QR tracking</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <Building2 size={16} className="text-black" />
            {isEmployee ? (
              <span className="text-[10px] font-black uppercase text-black">{employeeStoreName || "Loading..."}</span>
            ) : (
              <div className="relative group/select">
                <select 
                  value={selectedStoreId} 
                  onChange={(e) => setSelectedStoreId(e.target.value)} 
                  className="appearance-none bg-transparent text-xs font-black text-black uppercase focus:outline-none cursor-pointer pr-8 py-1"
                >
                  <option value="All">All Locations</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-black" />
              </div>
            )}
          </div>
        </div>
      </div>

      {notice.message && (
        <div className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-2 ${notice.type === "error" ? "bg-gray-100 text-black border-black" : "bg-black text-white border-black"}`}>
          {notice.type === "error" ? <X size={16} /> : <Check size={16} />}
          {notice.message}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-50 p-1.5 rounded-2xl border border-gray-100 inline-flex w-full md:w-auto">
        {!isEmployee && (
          <button onClick={() => setActiveTab("employees")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "employees" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}>Staff</button>
        )}
        <button onClick={() => setActiveTab("scan")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "scan" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}>Scan</button>
        <button onClick={() => setActiveTab("history")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "history" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}>Ledger</button>
        {!isEmployee && (
          <button onClick={() => setActiveTab("qr")} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "qr" ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}>QR Gen</button>
        )}
      </div>

      {activeTab === "employees" && !isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isSuperAdmin && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
              <h2 className="text-2xl font-black text-black uppercase tracking-tighter mb-6">Onboard Staff</h2>
              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input type="text" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email</label>
                    <input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Phone</label>
                      <input type="tel" value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase" required />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Store</label>
                      <select value={employeeForm.store_id} onChange={(e) => setEmployeeForm({ ...employeeForm, store_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase" required>
                        <option value="" disabled>Select</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={employeeSaving} className="w-full mt-4 bg-black text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:shadow-xl transition disabled:opacity-50">
                  {employeeSaving ? "Processing..." : "Create Account"}
                </button>
              </form>
            </div>
          )}

          <div className={`${isSuperAdmin ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]`}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Registry</h2>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{employees.length} Active Staff</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-black text-black uppercase tracking-tight">{emp.name}</div>
                        <div className="text-[9px] font-black text-gray-400 uppercase font-mono mt-0.5">#{emp.employee_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-black text-black uppercase tracking-widest">{stores.find(s => s.id === emp.store_id)?.name || "Warehouse"}</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{emp.role || "Staff"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-black text-black uppercase">{emp.phone}</div>
                        <div className="text-[9px] font-bold text-gray-400 lowercase mt-0.5">{emp.email}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Attendance Ledger</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Historical attendance records</p>
            </div>
            {!isEmployee && (
              <div className="flex items-center gap-3">
                <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase focus:outline-none focus:border-black" />
                <span className="text-gray-300">→</span>
                <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase focus:outline-none focus:border-black" />
                <button onClick={fetchHistory} disabled={historyLoading} className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition disabled:opacity-50">Filter</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center group hover:border-black transition-all">
              <div className="text-3xl font-black text-black tracking-tighter mb-1">{historyRows.length}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-black">Total Days</div>
            </div>
            <div className="bg-black border border-black rounded-2xl p-6 text-center shadow-lg shadow-black/10">
              <div className="text-3xl font-black text-white tracking-tighter mb-1">{historyRows.filter(r => r.status === 'present').length}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Present</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center hover:border-black transition-all">
              <div className="text-3xl font-black text-black tracking-tighter mb-1">{historyRows.filter(r => r.status === 'half-day').length}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Half Days</div>
            </div>
            <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 text-center opacity-50">
              <div className="text-3xl font-black text-gray-400 tracking-tighter mb-1">{historyRows.filter(r => r.status === 'absent').length}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest line-through">Absent</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {!isEmployee && <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff</th>}
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Check In</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Check Out</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historyRows.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition">
                    {!isEmployee && (
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-black text-black uppercase tracking-tight">{record.employee?.name || "Unknown"}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase">{new Date(record.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-black">
                        <Clock size={12} className="text-gray-400" />
                        {record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-black text-black">
                        <Clock size={12} className="text-gray-400" />
                        {record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{statusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "qr" && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 flex flex-col items-center max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-2">Gatekeeper QR</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Generate daily access tokens for staff</p>
          
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full mb-8">
            <button onClick={() => setQrType("check_in")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${qrType === "check_in" ? "bg-black text-white shadow-lg" : "text-gray-400"}`}>Check In</button>
            <button onClick={() => setQrType("check_out")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${qrType === "check_out" ? "bg-black text-white shadow-lg" : "text-gray-400"}`}>Check Out</button>
          </div>

          <div className="p-8 bg-white border border-gray-100 rounded-[3rem] shadow-2xl animate-in zoom-in duration-500">
            {generatedCode ? (
              <QRCodeCanvas value={generatedCode} size={256} level="H" includeMargin={true} />
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center text-gray-300 gap-4">
                <Camera size={48} strokeWidth={1} />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Ready to Initialize</span>
              </div>
            )}
          </div>

          <button onClick={handleGenerateQR} disabled={isGenerating || (isSuperAdmin && selectedStoreId === "All")} className="w-full mt-12 bg-black text-white font-black py-5 rounded-[2rem] text-[11px] uppercase tracking-[0.2em] hover:shadow-2xl transition-all disabled:opacity-50">
            {isGenerating ? "Synthesizing..." : "Initialize Session"}
          </button>
        </div>
      )}

      {activeTab === "scan" && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 flex flex-col items-center max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-2">Auth Scanner</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8">Authenticate with store gateway</p>

          <div className="relative w-full aspect-square bg-black rounded-[3rem] overflow-hidden shadow-2xl border-8 border-gray-50">
            <div id="reader" className="w-full h-full"></div>
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 animate-pulse">
                  <Camera size={32} className="text-white" />
                </div>
                <button onClick={startCamera} disabled={isStartingScanner || !currentUserEmployee} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:shadow-xl transition-all disabled:opacity-50">
                  {isStartingScanner ? "Waking Sensor..." : "Engage Camera"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-12 p-6 bg-gray-50 border border-gray-100 rounded-[2rem] w-full flex items-center gap-4 text-left group hover:border-black transition-all">
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg"><Users size={24} /></div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Identity Verified</p>
              <p className="text-lg font-black text-black uppercase tracking-tight">{currentUserEmployee?.name || userProfile?.name || "Authenticating..."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
