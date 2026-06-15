import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Users, UserPlus, Search, Edit2, 
  Trash2, Mail, Phone, MapPin, 
  Shield, Building2, Calendar, 
  ChevronDown, X, CheckCircle2, 
  AlertCircle, Loader2, List, 
  Plus, Contact2
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { supabaseAdmin } from "../server/supabase/supabaseAdmin";
import { ROLES_FOR_SUPER_ADMIN, ROLES_FOR_ADMIN } from "../server/database/mocks/constants";
import SlideDrawer from '../components/common/SlideDrawer';
import { Onboarding } from "./Onboarding";
import Attendance from "./Attendance";

export default function EmployeeManagement({ userProfile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const [activeTab, setActiveTab] = useState(searchParams.get("feature") || "list"); // "list", "onboarding", "attendance"

  useEffect(() => {
    const feature = searchParams.get("feature") || "list";
    setActiveTab(feature);
  }, [location.search]);

  const setParams = (feature) => {
    navigate(`/employees?feature=${feature}`);
  };

  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [notification, setNotification] = useState(null);

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = userProfile?.role === 'admin' || isSuperAdmin;
  const availableRoles = isSuperAdmin ? ROLES_FOR_SUPER_ADMIN : (isAdmin ? ROLES_FOR_ADMIN : []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchEmployees();
    fetchStores();
  }, []);

  async function fetchStores() {
    const { data, error } = await supabaseAdmin.from('stores').select('*').order('name');
    if (!error) setStores(data || []);
  }

  async function fetchEmployees() {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          name: editingEmployee.name,
          role: editingEmployee.role,
          store_id: editingEmployee.store_id || null,
          is_active: editingEmployee.is_active,
          phone: editingEmployee.phone,
          personal_email: editingEmployee.personal_email,
          address: editingEmployee.address,
          emergency_contact: editingEmployee.emergency_contact,
          designation: editingEmployee.designation
        })
        .eq('id', editingEmployee.id);

      if (error) throw error;
      showNotification("Employee updated successfully!", "success");
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-black tracking-tighter uppercase mb-1">Employees</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Human Resource & Access Control</p>
        </div>
      </div>

      {activeTab === "onboarding" ? (
        <Onboarding userProfile={userProfile} onComplete={() => { setParams("list"); fetchEmployees(); }} />
      ) : activeTab === "attendance" ? (
        <Attendance userProfile={userProfile} />
      ) : (
        <div className="space-y-6">
          {/* Search & Stats */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search by name, email, or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none"
              />
            </div>
          </div>

          {/* Employee Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-[32px] p-6 animate-pulse space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                    <div className="space-y-2">
                      <div className="w-32 h-3 bg-gray-100 rounded-full" />
                      <div className="w-24 h-2 bg-gray-50 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredEmployees.map((emp) => (
              <div key={emp.id} className="bg-white border border-gray-100 rounded-[32px] p-6 hover:shadow-xl hover:border-black/5 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingEmployee(emp)}
                    className="p-2 bg-black text-white rounded-xl shadow-lg hover:scale-110 transition-all"
                  >
                    <Edit2 size={14} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 text-black">
                    <Contact2 size={24} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-black uppercase tracking-tight truncate">{emp.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{emp.designation || emp.role?.replace('_', ' ')}</p>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${emp.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                      <div className={`w-1 h-1 rounded-full ${emp.is_active ? "bg-green-600 animate-pulse" : "bg-red-600"}`} />
                      {emp.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                    <Mail size={12} className="text-gray-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                      <Phone size={12} className="text-gray-400" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                    <Building2 size={12} className="text-gray-400" />
                    <span className="truncate">{stores.find(s => s.id === emp.store_id)?.name || "Global Command"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      <SlideDrawer
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        title="Edit Profile"
        subtitle={editingEmployee?.name}
      >
        {editingEmployee && (
          <form onSubmit={handleUpdateEmployee} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
              <input 
                type="text" 
                value={editingEmployee.name}
                onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</label>
                <select 
                  value={editingEmployee.role}
                  onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
                >
                  {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit</label>
                <select 
                  value={editingEmployee.store_id || ''}
                  onChange={e => setEditingEmployee({...editingEmployee, store_id: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
                >
                  <option value="">Global</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</label>
              <input 
                type="text" 
                value={editingEmployee.designation || ''}
                onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})}
                placeholder="e.g. Senior Optometrist"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                <input 
                  type="text" 
                  value={editingEmployee.phone || ''}
                  onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                <select 
                  value={editingEmployee.is_active ? "active" : "inactive"}
                  onChange={e => setEditingEmployee({...editingEmployee, is_active: e.target.value === "active"})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-50 flex gap-4">
              <button 
                type="button" 
                onClick={() => setEditingEmployee(null)}
                className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
              >
                Abort
              </button>
              <button 
                type="submit"
                className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
              >
                Update Profile
              </button>
            </div>
          </form>
        )}
      </SlideDrawer>

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-5">
          <div className={`px-6 py-4 rounded-[20px] shadow-2xl flex items-center gap-3 border ${notification.type === 'success' ? 'bg-black border-white/10 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
