import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, ShieldCheck, Mail, Edit2, AlertCircle } from 'lucide-react';
import { supabase } from '../server/supabase/supabase';
import { supabaseAdmin } from '../server/supabase/supabaseAdmin';

export default function Staff({ userProfile }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    emailPrefix: '',
    domain: '@lenscare.in',
    password: 'Welcome@123',
    role: 'employee',
    department: 'warehouse'
  });

  const [notification, setNotification] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('department', 'warehouse')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const email = `${newStaff.emailPrefix}${newStaff.domain}`.toLowerCase();
      
      // Create user in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: newStaff.password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Ensure employee record is created (if not handled by trigger) or update it
      const { error: insertError } = await supabaseAdmin
        .from('employees')
        .upsert({
          user_id: authData.user.id,
          name: newStaff.name,
          email: email,
          role: newStaff.role,
          department: newStaff.department,
          store_id: null, // Warehouse staff
          must_reset_password: true,
          status: 'active'
        }, { onConflict: 'user_id' });

      if (insertError) throw insertError;

      // Update auth_users table role
      const { error: authUserError } = await supabaseAdmin
        .from('auth_users')
        .update({ role: newStaff.role, store_id: null })
        .eq('id', authData.user.id);
        
      if (authUserError) console.error("Could not set auth_users role:", authUserError);

      showNotification(`Staff account ${email} created successfully!`, 'success');
      setShowAddModal(false);
      setNewStaff({
        name: '',
        emailPrefix: '',
        domain: '@lenscare.in',
        password: 'Welcome@123',
        role: 'employee',
        department: 'warehouse'
      });
      fetchStaff();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const filteredStaff = staff.filter(s => 
    (s.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (s.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Staff Registry</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Warehouse Personnel Management</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={16} strokeWidth={3} />
          Register Personnel
        </button>
      </div>

      {notification && (
        <div className="bg-black text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
          {notification.message}
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative group w-full max-w-md">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" strokeWidth={3} />
          <input
            type="text"
            placeholder="Lookup Operator..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Operator Name</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Access Identity</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Syncing Personnel Data...</td></tr>
              ) : filteredStaff.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching personnel found</td></tr>
              ) : filteredStaff.map(person => (
                <tr key={person.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-[11px] font-black text-black uppercase tracking-tight">{person.name}</p>
                    <p className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase tracking-tighter">ID: {person.id.slice(0, 12)}</p>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest lowercase">
                    {person.email}
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black text-black uppercase tracking-widest">{person.role}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      person.status === 'active' ? 'bg-black text-white' : 'border border-gray-200 text-gray-400 line-through'
                    }`}>
                      {person.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Register Personnel</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Issue Warehouse Credentials</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={handleCreateStaff} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="JOHN DOE"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email Designation</label>
                <div className="flex bg-gray-50 border border-gray-100 rounded-2xl focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black focus-within:bg-white transition-all overflow-hidden">
                  <input
                    type="text"
                    required
                    value={newStaff.emailPrefix}
                    onChange={e => setNewStaff({ ...newStaff, emailPrefix: e.target.value })}
                    placeholder="john.doe"
                    className="w-full px-6 py-4 bg-transparent text-[11px] font-bold tracking-widest outline-none"
                  />
                  <div className="bg-gray-100 px-4 py-4 flex items-center justify-center border-l border-gray-200">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                      {newStaff.domain}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Domain</label>
                <select
                  value={newStaff.domain}
                  onChange={e => setNewStaff({ ...newStaff, domain: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="@lenscare.in">@lenscare.in</option>
                  <option value="@warehouse.lenscare.in">@warehouse.lenscare.in</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Initial Vector (Password)</label>
                <input
                  type="text"
                  required
                  value={newStaff.password}
                  onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                />
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight ml-1 italic">Forces reset on first login.</p>
              </div>

              <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
                <button type="submit" disabled={creating} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20">
                  {creating ? 'Syncing...' : 'Deploy Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
