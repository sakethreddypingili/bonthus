import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Package, Users,
  BarChart2, Settings, ChevronLeft, ChevronRight, LogOut,
  ClipboardCheck,
  UserPlus,
  Layout,
  Bell,
  Calendar,
  ChevronDown,
  Store
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../../server/supabase/supabase";

const logoImg = '/assets/images/logo.webp';
const iconImg = '/assets/images/icon.webp';

const navItems = [
  { to: "/warehouse", label: "Warehouse", role: ["admin", "super_admin", "store_manager"], icon: Package },
  { to: "/store", label: "Store Insight", role: ["admin", "super_admin", "store_manager"], icon: Store },
  { to: "/products", label: "Master Catalog", role: ["admin", "super_admin", "store_manager"], icon: Package },
  { to: "/analytics", label: "Analytics", role: ["admin", "super_admin", "store_manager"], icon: BarChart2 },
  { to: "/staff", label: "Staff", role: ["admin", "super_admin"], icon: Users },
  { to: "/reminders", label: "Board", role: ["admin", "super_admin", "store_manager", "employee"], icon: Layout },
  { to: "/attendance", label: "Attendance", role: ["admin", "super_admin", "store_manager", "employee"], icon: ClipboardCheck },
];

export default function Sidebar({ collapsed, setCollapsed, userProfile, isMobile }) {
  const location = useLocation();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const isEmployee = userProfile?.role === 'employee';

  return (
    <aside
      className="flex flex-col bg-white text-black border-r border-gray-200 transition-all duration-300 w-full h-full tracking-wide"
    >
      {/* Logo */}
      <div className={`flex items-center justify-center border-b border-gray-100 transition-all duration-300 ${
        collapsed ? "py-1 px-0 min-h-[80px] overflow-visible" : "py-1 px-2 min-h-[120px]"
      }`}>
        {collapsed ? (
          <img src={iconImg} alt="LensCare Icon" className="w-[73px] h-[73px] object-contain flex-shrink-0 max-w-none" />
        ) : (
          <img src={logoImg} alt="LensCare Logo" className="h-[112px] w-full object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Menu</p>
        )}
        {navItems.filter(item => item.role.includes(userProfile?.role)).map(({ to, label, icon: Icon }) => {
          const isActive = to === "/warehouse"
            ? location.pathname === "/warehouse" || location.pathname === "/"
            : (to === "/reminders" 
                ? (location.pathname === "/reminders" || location.pathname === "/notifications")
                : location.pathname.startsWith(to)
              );
          
          return (
            <div key={to} className="w-full">
              <NavLink
                to={to}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? "bg-black text-white shadow-md"
                    : "text-gray-600 hover:text-black hover:bg-gray-100"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>

              {/* Sub-menu for Board */}
              {label === "Board" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to: "/reminders", label: "Reminders", icon: Calendar },
                    { to: "/notifications", label: "Notifications", icon: Bell }
                  ].map((sub) => {
                    const isSubActive = location.pathname === sub.to;
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all w-full
                          ${isSubActive
                            ? "bg-black text-white shadow-sm"
                            : "text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                        title={collapsed ? sub.label : undefined}
                      >
                        <SubIcon size={15} className="flex-shrink-0" />
                        {!collapsed && <span>{sub.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        {!isEmployee && (
          <NavLink
            to="/settings"
            className={`
              flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100
              transition-all text-sm font-medium
              ${location.pathname.startsWith("/settings") ? "bg-black text-white" : ""}
              ${collapsed ? "justify-center" : ""}
            `}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        )}

        <button
          onClick={() => supabase.auth.signOut()}
          className={`
            w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50
            transition-all text-sm font-medium
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => isMobile ? setCollapsed(true) : setCollapsed(!collapsed)}
          className={`
            w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100
            transition-all text-sm font-[400]
            ${collapsed ? "justify-center" : ""}
          `}
        >
          {collapsed
            ? <ChevronRight size={18} />
            : <><ChevronLeft size={18} /><span>{isMobile ? "Close" : "Collapse"}</span></>
          }
        </button>
      </div>
    </aside>
  );
}
