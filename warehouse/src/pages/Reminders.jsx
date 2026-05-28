import React from 'react';
import { Calendar, Plus } from 'lucide-react';

export default function Reminders({ userProfile }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Reminders</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage tasks and schedule</p>
        </div>
        <button className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
          <Plus size={16} strokeWidth={3} />
          Append Task
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Calendar size={40} className="text-gray-200" strokeWidth={3} />
        </div>
        <h3 className="text-2xl font-black text-black tracking-tighter uppercase">No Active Tasks</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 max-w-xs mx-auto">
          System registry is clear
        </p>
      </div>
    </div>
  );
}
