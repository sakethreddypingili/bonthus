import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Bell, ChevronRight, Layout, Info } from 'lucide-react';

export default function BoardSidebar() {
  const location = useLocation();

  const menuItems = [
    { to: '/reminders', label: 'Reminders', icon: Calendar, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
    { to: '/notifications', label: 'Notifications', icon: Bell, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full animate-in slide-in-from-left-4 duration-300">
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3 text-[#000000]">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shadow-sm">
            <Layout size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">Board</h2>
            <p className="text-[10px] text-gray-400 font-bold">Workspace Center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Operations</p>
        
        {menuItems.map(({ to, label, icon: Icon, color, bgColor }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`
                flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all
                ${isActive 
                  ? `${bgColor} ${color} shadow-sm border border-${color.split('-')[1]}-100` 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? color : 'text-gray-400'} />
                <span>{label}</span>
              </div>
              {isActive && <ChevronRight size={14} />}
            </NavLink>
          );
        })}
      </nav>

    </div>
  );
}
