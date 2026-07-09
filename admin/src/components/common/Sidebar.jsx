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
  Warehouse,
  Truck,
  Store,
  Building2,
  QrCode,
  Plus,
  List,
  Tags,
  ClipboardList,
  FlaskConical,
  Wrench,
  ScanBarcode,
  FileText,
  Mail
} from "lucide-react";
import { useState } from "react";
const logoImg = '/assets/images/logo.webp';
const iconImg = '/assets/images/icon.webp';

const navItems = [
  { to: "/", label: "Dashboard", role: ["admin", "super_admin", "store_manager"], icon: LayoutDashboard },
  { to: "/orders", label: "Orders", role: ["admin", "super_admin", "store_manager"], icon: ShoppingBag },
  { to: "/products", label: "Products", role: ["admin", "super_admin", "store_manager"], icon: Package },
  { to: "/inventory", label: "Inventory", role: ["admin", "super_admin"], icon: Warehouse },
  { to: "/customers", label: "Customers", role: ["admin", "super_admin", "store_manager"], icon: Users },
  { to: "/employees", label: "Employees", role: ["admin", "super_admin"], icon: UserPlus },
  { to: "/reminders", label: "Board", role: ["admin", "super_admin", "store_manager", "employee"], icon: Layout },
  { to: "/power", label: "Power", role: ["admin", "super_admin", "store_manager"], icon: FileText },
  { to: "/repairs", label: "Repairs", role: ["admin", "super_admin", "store_manager"], icon: Wrench },
  { to: "/analytics", label: "Analytics", role: ["admin", "super_admin", "store_manager"], icon: BarChart2 },
];

export default function Sidebar({ collapsed, setCollapsed, userProfile, isMobile, onLogout }) {
  const location = useLocation();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const isEmployee = userProfile?.role === 'employee';

  return (
    <aside
      className="flex flex-col bg-white text-black border-r border-gray-200 transition-all duration-300 w-full h-full tracking-wide"
    >
      {/* Logo */}
      <div className={`flex items-center justify-center border-b border-gray-100 transition-all duration-300 ${collapsed ? "py-1 px-0 min-h-[80px] overflow-visible" : "py-1 px-2 min-h-[120px]"
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
          const isActive = to === "/"
            ? location.pathname === "/"
            : (to === "/reminders"
              ? (location.pathname === "/reminders" || location.pathname === "/notifications")
              : (to === "/inventory"
                ? (location.pathname === "/inventory" || location.pathname === "/inventory/analytics" || location.pathname === "/inventory/store" || location.pathname === "/inventory/shipment" || location.pathname === "/inventory/provisioning" || location.pathname === "/inventory/vendors")
                : (to === "/products"
                  ? (location.pathname === "/products" || location.pathname === "/products/:id" || location.pathname === "/categories" || location.pathname === "/barcode-creator" || location.pathname === "/barcodes" || location.pathname === "/products/scan")
                  : (to === "/employees"
                    ? (location.pathname.startsWith("/employees") || location.pathname.startsWith("/onboarding"))
                    : location.pathname.startsWith(to)
                  )
                )
              )
            );

          return (
            <div key={to} className="w-full">
              <NavLink
                to={to}
                onClick={() => { if (isMobile && !["Products","Inventory","Employees","Board"].includes(label)) setCollapsed(true); }}
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

              {/* Sub-menu for Products */}
              {label === "Products" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to: "/products", label: "Product List", icon: List },
                    { to: "/categories", label: "Categories", icon: Tags },
                    { to: "/barcode-creator", label: "Barcode Creator", icon: Plus },
                    { to: "/barcodes", label: "Barcode Studio", icon: QrCode },
                    { to: "/products/scan", label: "Scan Barcode", icon: ScanBarcode }
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
                            : "text-gray-500 hover:text-black hover:bg-gray-100"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                        title={collapsed ? sub.label : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
                      >
                        <SubIcon size={15} className="flex-shrink-0" />
                        {!collapsed && <span>{sub.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}

              {/* Sub-menu for Inventory */}
              {label === "Inventory" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to: "/inventory", label: "Overview", icon: Warehouse },
                    { to: "/inventory/shipment", label: "Shipment", icon: Truck },
                    { to: "/inventory/provisioning", label: "Provisioning", icon: ClipboardList },
                    { to: "/inventory/vendors", label: "Vendors", icon: Users },
                    { to: "/inventory/store", label: "Store Intelligence", icon: Store },
                    { to: "/inventory/analytics", label: "Inventory Data", icon: BarChart2 },
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
                            : "text-gray-500 hover:text-black hover:bg-gray-100"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                        title={collapsed ? sub.label : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
                      >
                        <SubIcon size={15} className="flex-shrink-0" />
                        {!collapsed && <span>{sub.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}

              {/* Sub-menu for Employees */}
              {label === "Employees" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to: "/employees?feature=list", label: "Directory", icon: List },
                    { to: "/employees?feature=onboarding", label: "Onboarding", icon: UserPlus },
                    { to: "/employees?feature=attendance", label: "Attendance", icon: ClipboardCheck }
                  ].map((sub) => {
                    const isSubActive = location.pathname + location.search === sub.to || (sub.to === "/employees?feature=list" && location.pathname === "/employees" && !location.search);
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all w-full
                          ${isSubActive
                            ? "bg-black text-white shadow-sm"
                            : "text-gray-500 hover:text-black hover:bg-gray-100"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                        title={collapsed ? sub.label : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
                      >
                        <SubIcon size={15} className="flex-shrink-0" />
                        {!collapsed && <span>{sub.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}

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
                        title={collapsed ? sub.label : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
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

        {/* Admin Features */}
        {isAdmin && (
          <div className="space-y-0.5 mt-4">
            <NavLink
              to="/infrastructure"
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${location.pathname.startsWith("/infrastructure")
                  ? "bg-black text-white shadow-md"
                  : "text-gray-600 hover:text-black hover:bg-gray-100"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? "Infrastructure" : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
            >
              <Building2 size={18} className="flex-shrink-0" />
              {!collapsed && <span>Infrastructure</span>}
            </NavLink>
            <NavLink
              to="/email-engine"
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${location.pathname.startsWith("/email-engine")
                  ? "bg-black text-white shadow-md"
                  : "text-gray-600 hover:text-black hover:bg-gray-100"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? "Email Engine" : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
            >
              <Mail size={18} className="flex-shrink-0" />
              {!collapsed && <span>Email Engine</span>}
            </NavLink>
          </div>
        )}
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
            title={collapsed ? "Settings" : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        )}

        <button
          type="button"
          onClick={() => void onLogout?.()}
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
