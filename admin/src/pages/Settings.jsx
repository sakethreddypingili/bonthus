import { useState, useEffect } from "react";
import { Save, Bell, Eye, EyeOff, LogOut, Check } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

export default function Settings({ userProfile }) {
  const isSuperAdmin = userProfile?.role === 'super_admin';

  const [storeInfo, setStoreInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (userProfile?.store_id) {
      supabase.from('store').select('*').eq('id', userProfile.store_id).single().then(({ data }) => {
        if (data) setStoreInfo(data);
      });
    }
  }, [userProfile]);

  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailLowStock: true,
    emailCustomers: false,
    emailMarketing: true,
    smsOrders: false,
    pushNotifications: true,
  });

  const [appearance, setAppearance] = useState({
    theme: "light",
    compactLayout: false,
    showNotifications: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Settings</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Configure your workspace and preferences</p>
        </div>
      </div>

      {/* Save notification */}
      {saved && (
        <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 z-50">
          <Check size={18} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-widest">Preferences Saved</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Store Information */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Store Profile</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Public identity and contact data</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Store Name</label>
              <input
                type="text"
                value={storeInfo.name}
                onChange={e => setStoreInfo({ ...storeInfo, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={storeInfo.email}
                  onChange={e => setStoreInfo({ ...storeInfo, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Phone</label>
                <input
                  type="tel"
                  value={storeInfo.phone}
                  onChange={e => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Address</label>
              <textarea
                value={storeInfo.address}
                onChange={e => setStoreInfo({ ...storeInfo, address: e.target.value })}
                rows="3"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black uppercase tracking-tight resize-none"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter flex items-center gap-3">
              <Bell size={20} /> Alerts
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage system communications</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Channels</p>
              {[
                { key: "emailOrders", label: "Email: New Orders" },
                { key: "emailLowStock", label: "Email: Inventory Alerts" },
                { key: "pushNotifications", label: "Push: System Alerts" },
              ].map(n => (
                <label key={n.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group hover:bg-black transition-all">
                  <span className="text-[11px] font-black text-black uppercase tracking-tight group-hover:text-white transition-colors">{n.label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[n.key]}
                    onChange={e => setNotifications({ ...notifications, [n.key]: e.target.checked })}
                    className="w-5 h-5 rounded-lg accent-black cursor-pointer border-gray-200"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Interface</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customize your visual experience</p>
          </div>

          <div className="space-y-4">
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              {["light", "dark"].map(t => (
                <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all ${appearance.theme === t ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"}`}>
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={appearance.theme === t}
                    onChange={e => setAppearance({ ...appearance, theme: e.target.value })}
                    className="hidden"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t} Mode</span>
                </label>
              ))}
            </div>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer group hover:bg-black transition-all">
              <span className="text-[11px] font-black text-black uppercase tracking-tight group-hover:text-white transition-colors">Compact Layout</span>
              <input
                type="checkbox"
                checked={appearance.compactLayout}
                onChange={e => setAppearance({ ...appearance, compactLayout: e.target.checked })}
                className="w-5 h-5 rounded-lg accent-black cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Security</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Update credentials and access</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-black transition-all text-[11px] font-black tracking-widest"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="w-full py-4 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all">Update Credentials</button>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-100">
        <button className="px-8 py-4 bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black hover:text-white transition-all flex items-center gap-2">
          <LogOut size={16} /> Sign Out
        </button>
        <button onClick={handleSave} className="px-12 py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-2xl transition-all flex items-center gap-2">
          <Save size={16} /> Commit Changes
        </button>
      </div>
    </div>
  );
}
