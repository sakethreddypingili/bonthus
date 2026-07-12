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
  Store,
  QrCode,
  Tags,
  Plus,
  List,
  Truck,
  ClipboardList,
  ArrowRightLeft,
  Sparkles,
  Printer,
  FolderSync,
  FilePlus,
  PackagePlus,
  FlaskConical,
  Globe,
  FolderOpen
} from"lucide-react";
import { useState } from"react";
const logoImg = '/assets/images/logo.webp';
const iconImg = '/assets/images/icon.webp';

const navItems = [
  { to:"/", label:"Overview", role: ["admin","super_admin","store_manager"], icon: LayoutDashboard },
  { to:"/products", label:"Products", role: ["admin","super_admin","store_manager"], icon: Package },
  { to:"/products?tab=quick-add", label:"Intake", role: ["admin","super_admin","store_manager"], icon: FolderSync },
  { to:"/products?tab=review-queue", label:"Review Queue", role: ["admin","super_admin","store_manager"], icon: ClipboardList },
  { to:"/barcode-creator", label:"Labels", role: ["admin","super_admin","store_manager"], icon: QrCode },
  { to:"/visualise", label:"Visualise", role: ["admin","super_admin","store_manager","employee"], icon: Sparkles },
  { to:"/barcode-printer", label:"Barcode Printer", role: ["admin","super_admin","store_manager","employee"], icon: Printer },
  { to:"/shipments", label:"Shipments", role: ["admin","super_admin","store_manager"], icon: Truck },
  { to:"/labs", label:"Labs", role: ["admin","super_admin","store_manager","employee"], icon: FlaskConical },
  { to:"/reminders", label:"Board", role: ["admin","super_admin","store_manager","employee"], icon: Layout },
  { to:"/store-intelligence", label:"Store Intelligence", role: ["admin","super_admin","store_manager"], icon: Store },
  { to:"/analytics", label:"Analytics", role: ["admin","super_admin","store_manager"], icon: BarChart2 },
  { to:"/lens-stock", label:"Lens Stock", role: ["admin","super_admin","store_manager"], icon: FolderOpen },
  { to:"/ecom", label:"Ecom", role: ["admin","super_admin","store_manager"], icon: Globe },
  { to:"/attendance", label:"Attendance", role: ["admin","super_admin","store_manager","employee"], icon: ClipboardCheck },
];

export default function Sidebar({ collapsed, setCollapsed, userProfile, isMobile, onLogout }) {
  const location = useLocation();
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'warehouse';
  const isEmployee = userProfile?.role === 'employee';

  return (
    <aside
      className="flex flex-col bg-white text-black border-r border-gray-200 transition-all duration-150 w-full h-full tracking-wide"
    >
      {/* Logo */}
      <div className={`flex items-center justify-center border-b border-gray-100 transition-all duration-150 ${
        collapsed ?"py-1 px-0 min-h-[80px] overflow-visible" :"py-1 px-2 min-h-[120px]"
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
        {navItems.filter(item => {
          const userRole = userProfile?.role;
          const allowedRoles = [...item.role];
          if (allowedRoles.includes("admin") || allowedRoles.includes("super_admin") || allowedRoles.includes("store_manager")) {
            allowedRoles.push("warehouse");
          }
          return allowedRoles.includes(userRole);
        }).map(({ to, label, icon: Icon }) => {
          const isActive = to ==="/"
            ? location.pathname ==="/"
            : (to ==="/reminders" 
                ? (location.pathname ==="/reminders" || location.pathname ==="/notifications")
                : (label ==="Intake"
                    ? (location.pathname ==="/products" && (location.search.includes("quick-add") || location.search.includes("batch-load")))
                    : (label ==="Review Queue"
                        ? (location.pathname ==="/products" && location.search.includes("review-queue"))
                        : (label ==="Labels"
                            ? (location.pathname ==="/visual-ingest" || location.pathname ==="/barcode-creator" || location.pathname ==="/barcodes")
                            : (to ==="/products"
                                ? ((location.pathname ==="/products" && (!location.search || location.search.includes("stock") || !location.search.includes("tab="))) || location.pathname ==="/categories")
                                : (to ==="/shipments"
                                    ? (location.pathname ==="/shipments" || location.pathname ==="/shipment-overview" || location.pathname ==="/vendors" || location.pathname ==="/provisioning")
                                    : (to ==="/labs"
                                        ? location.pathname ==="/labs"
                                        : (to === "/ecom"
                                            ? location.pathname.startsWith("/ecom")
                                            : location.pathname.startsWith(to)
                                          )
                                      )
                                  )
                              )
                          )
                      )
                  )
              );
          
          return (
            <div key={to} className="w-full">
              <NavLink
                to={to}
                onClick={() => { if (isMobile && !["Products","Intake","Labels","Visualise","Shipments","Labs","Board","Ecom"].includes(label)) setCollapsed(true); }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium 
                  ${isActive
                    ?"bg-black text-white shadow-md"
                    :"text-gray-600 hover:text-black hover:bg-gray-100"
                  }
                  ${collapsed ?"justify-center" :""}
`}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>

              {/* Sub-menu for Intake */}
              {label ==="Intake" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/products?tab=quick-add", label:"Quick Add", icon: FilePlus },
                    { to:"/products?tab=batch-load", label:"Batch Load", icon: PackagePlus }
                  ].map((sub) => {
                    const isSubActive = location.pathname === "/products" && location.search.includes(sub.to.split("=")[1]);
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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

              {/* Sub-menu for Labels */}
              {label ==="Labels" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/barcode-creator", label:"Barcode Creator", icon: Plus },
                    { to:"/visual-ingest", label:"Visual Ingest", icon: Sparkles },
                    { to:"/barcodes", label:"Barcode Studio", icon: QrCode }
                  ].map((sub) => {
                    const isSubActive = location.pathname === sub.to;
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold  w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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

              {/* Sub-menu for Visualise */}
              {label ==="Visualise" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/visualise?tab=scan", label:"Scan", icon: QrCode },
                    { to:"/visualise?tab=history", label:"History", icon: ClipboardList }
                  ].map((sub) => {
                    const isSubActive = sub.to === "/visualise?tab=scan" 
                      ? (location.search === "" || location.search.includes("tab=scan"))
                      : location.search.includes("tab=history");
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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

              {/* Sub-menu for Shipments */}
              {label ==="Shipments" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/shipment-overview", label:"Overview", icon: BarChart2 },
                    { to:"/shipments", label:"Registry", icon: List },
                    { to:"/provisioning", label:"Provisioning", icon: ClipboardList },
                    { to:"/vendors", label:"Vendors", icon: Users }
                  ].map((sub) => {
                    const isSubActive = location.pathname === sub.to;
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold  w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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

              {/* Sub-menu for Products */}
              {label ==="Products" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/products", label:"Product List", icon: List },
                    { to:"/categories", label:"Categories", icon: Tags }
                  ].map((sub) => {
                    const isSubActive = (location.pathname === sub.to) && (!location.search || !location.search.includes("tab="));
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold  w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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

              {/* Sub-menu for Labs */}
              {label ==="Labs" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/labs", label:"Packing Requests", icon: ClipboardList },
                    { to:"/labs?tab=stock", label:"Stock", icon: Package },
                    { to:"/labs?tab=analytics", label:"Analytics", icon: BarChart2 },
                  ].map((sub) => {
                    const isSubActive = location.pathname === "/labs" && (
                      sub.to === "/labs" ? !location.search || !location.search.includes("tab=")
                      : location.search.includes(sub.to.split("=")[1])
                    );
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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
              {label ==="Board" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/reminders", label:"Reminders", icon: Calendar },
                    { to:"/notifications", label:"Notifications", icon: Bell }
                  ].map((sub) => {
                    const isSubActive = location.pathname === sub.to;
                    const SubIcon = sub.icon;
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold  w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
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

              {/* Sub-menu for Ecom */}
              {label ==="Ecom" && isActive && (
                <div className={`flex flex-col mt-1 mb-2 ${collapsed ? 'items-center pl-0' : 'pl-4 border-l border-gray-200 ml-5'} space-y-1`}>
                  {[
                    { to:"/ecom?tab=catalog", label:"Ecom Catalog" },
                    { to:"/ecom?tab=promotions", label:"Promotions" },
                    { to:"/ecom?tab=policies", label:"Policy Center" },
                    { to:"/ecom?tab=support", label:"Customer Support" },
                    { to:"/ecom?tab=specifications", label:"Product Specs" }
                  ].map((sub) => {
                    const isSubActive = location.pathname === "/ecom" && (
                      location.search.includes(sub.to.split("=")[1]) ||
                      (sub.to === "/ecom?tab=catalog" && (!location.search || location.search === "" || location.search.includes("tab=catalog")))
                    );
                    return (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold w-full
                          ${isSubActive
                            ?"bg-black text-white shadow-sm"
                            :"text-gray-500 hover:text-black hover:bg-gray-50"
                          }
                          ${collapsed ?"justify-center" :""}
                        `}
                        title={collapsed ? sub.label : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
                      >
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
               text-sm font-medium
              ${location.pathname.startsWith("/settings") ?"bg-black text-white" :""}
              ${collapsed ?"justify-center" :""}
`}
            title={collapsed ?"Settings" : undefined} onClick={() => { if (isMobile) setCollapsed(true); }}
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
             text-sm font-medium
            ${collapsed ?"justify-center" :""}
`}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => isMobile ? setCollapsed(true) : setCollapsed(!collapsed)}
          className={`
            w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100
             text-sm font-[400]
            ${collapsed ?"justify-center" :""}
`}
        >
          {collapsed
            ? <ChevronRight size={18} />
            : <><ChevronLeft size={18} /><span>{isMobile ?"Close" :"Collapse"}</span></>
          }
        </button>
      </div>
    </aside>
  );
}
