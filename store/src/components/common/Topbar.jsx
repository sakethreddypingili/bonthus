import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronDown, User, Settings, LogOut, X } from "lucide-react";
const titles = {
  "/": { title: "Dashboard", subtitle: "Welcome back, here's what's happening today" },
  "/orders": { title: "Orders", subtitle: "Manage and track all customer orders" },
  "/products": { title: "Products", subtitle: "Manage your eyewear product catalogue" },
  "/customers": { title: "Customers", subtitle: "View and manage customer accounts" },
  "/attendance": { title: "Attendance", subtitle: "Manage attendance and QR check-ins" },
  "/analytics": { title: "Analytics", subtitle: "Sales trends, revenue insights & performance" },
  "/store-management": { title: "Store", subtitle: "Manage stores and their access" },
  "/settings": { title: "Settings", subtitle: "Configure your store preferences" },
  "/reminders": { title: "Reminders", subtitle: "Manage your tasks and upcoming events" },
  "/notifications": { title: "Notifications", subtitle: "Stay updated with the latest alerts" },
};

export default function Topbar({ onToggleSidebar, userProfile, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const page = titles[location.pathname] || titles["/"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-3.5 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-bold text-[#000000] text-base leading-tight">{page.title}</h1>
          <p className="text-xs text-gray-400">{page.subtitle}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block group">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-52 transition-all placeholder:text-gray-300"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            className={`relative p-2.5 rounded-xl transition-all ${showNotifications ? 'bg-black text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-100 hover:text-black'}`}
          >
            <Bell size={18} strokeWidth={2.5} />
            <span className={`absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white ${showNotifications ? 'bg-white' : 'bg-black'}`}></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-black uppercase tracking-widest">Notifications</h3>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-black transition-colors"><X size={16} strokeWidth={3} /></button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell size={24} className="text-gray-200" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Clear</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
            className={`flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-xl transition-all ${showProfileMenu ? 'bg-black text-white shadow-lg' : 'hover:bg-gray-50 border border-transparent hover:border-gray-100'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black uppercase transition-colors ${showProfileMenu ? 'bg-white text-black' : 'bg-black text-white'}`}>
              {userProfile?.name ? userProfile.name.split(' ').map(n => n[0]).join('').substring(0,2) : "SA"}
            </div>
            <div className="hidden md:block text-left">
              <div className={`text-[11px] font-black uppercase tracking-tight transition-colors ${showProfileMenu ? 'text-white' : 'text-black'}`}>{userProfile?.name || "Store Admin"}</div>
              <div className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${showProfileMenu ? 'text-gray-400' : 'text-gray-400'}`}>{userProfile?.role || "Administrator"}</div>
            </div>
            <ChevronDown size={14} strokeWidth={3} className={`transition-transform duration-300 ${showProfileMenu ? 'rotate-180 text-white' : 'text-gray-300'}`} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                <p className="text-[11px] font-black text-black uppercase tracking-tight">{userProfile?.name || "Store Admin"}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{userProfile?.email || "admin@lenscare.in"}</p>
              </div>
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => { setShowProfileMenu(false); navigate("/settings"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black text-gray-600 uppercase tracking-widest hover:bg-black hover:text-white rounded-xl transition-all group"
                >
                  <Settings size={16} className="text-gray-400 group-hover:text-white" />
                  Preferences
                </button>
              </div>
              <div className="p-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    void onLogout?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black text-red-600 uppercase tracking-widest hover:bg-red-600 hover:text-white rounded-xl transition-all group"
                >
                  <LogOut size={16} className="text-red-400 group-hover:text-white" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
