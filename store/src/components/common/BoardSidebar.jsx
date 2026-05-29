import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Bell, ChevronLeft, ChevronRight, Layout } from 'lucide-react';

export default function BoardSidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  const menuItems = [
    { to: '/reminders', label: 'Reminders', icon: Calendar },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full animate-in slide-in-from-left-4 duration-300 transition-all ${collapsed ? 'w-[66px]' : 'w-64'}`}>
      <div className={`p-6 border-b border-gray-50 flex items-center ${collapsed ? 'justify-center' : 'gap-3'} text-[#000000]`}>
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shadow-sm flex-shrink-0">
          <Layout size={20} />
        </div>
        {!collapsed && (
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest leading-none">Board</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Workspace Center</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {!collapsed && (
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Operations</p>
        )}
        
        {menuItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`
                flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-2xl text-sm font-bold transition-all
                ${isActive 
                  ? 'bg-black text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                }
              `}
              title={collapsed ? label : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </div>
              {!collapsed && isActive && <ChevronRight size={14} />}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Action */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100
            transition-all text-sm font-[400]
            ${collapsed ? "justify-center" : ""}
          `}
        >
          {collapsed
            ? <ChevronRight size={18} />
            : <><ChevronLeft size={18} /><span>Collapse</span></>
          }
        </button>
      </div>
    </div>
  );
}
