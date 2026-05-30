import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, Users, Clock, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../server/supabase/supabase';

export default function Reminders({ userProfile }) {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  
  const [newTask, setNewTask] = useState({
    title: '',
    date: '',
    time: '',
    assigned_to: '',
    type: 'meeting' // 'meeting' or 'task'
  });

  useEffect(() => {
    // Fetch employees for assignment
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, role, department')
          .eq('status', 'active');
        if (!error && data) {
          setEmployees(data);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();

    // Mock initial tasks
    setTasks([
      { id: 1, title: 'Weekly Operational Sync', date: '2026-05-28', time: '10:00 AM', assigned_to: 'Store Manager', type: 'meeting', status: 'pending' },
      { id: 2, title: 'Inventory Audit', date: '2026-05-29', time: '02:00 PM', assigned_to: 'Warehouse Staff', type: 'task', status: 'completed' },
    ]);
  }, []);

  const handleAddTask = (e) => {
    e.preventDefault();
    const assignedEmp = employees.find(emp => emp.id === newTask.assigned_to) || { name: 'Unassigned' };
    
    const taskRecord = {
      id: Date.now(),
      title: newTask.title,
      date: newTask.date,
      time: newTask.time,
      assigned_to: assignedEmp.name,
      type: newTask.type,
      status: 'pending'
    };
    
    setTasks([taskRecord, ...tasks]);
    setShowModal(false);
    setNewTask({ title: '', date: '', time: '', assigned_to: '', type: 'meeting' });
  };

  const toggleTaskStatus = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t));
  };

  return (
    <div className="space-y-8 animate-fast-slide pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Board</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Meetings & Operational Scheduling</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={16} strokeWidth={3} />
          Append Schedule
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Calendar size={40} className="text-gray-200" strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-black text-black tracking-tighter uppercase">No Active Schedules</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 max-w-xs mx-auto">
            System registry is clear
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <div key={task.id} className={`bg-white rounded-[32px] p-8 border ${task.status === 'completed' ? 'border-gray-100 opacity-60 grayscale' : 'border-gray-200 shadow-xl hover:border-black'} transition-all duration-300 relative overflow-hidden group`}>
              <div className="flex justify-between items-start mb-6 border-b border-gray-50 pb-4">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${task.type === 'meeting' ? 'bg-black text-white' : 'border border-black text-black'}`}>
                  {task.type}
                </div>
                <button onClick={() => toggleTaskStatus(task.id)} className="text-black hover:scale-110 transition-transform">
                  {task.status === 'completed' ? <CheckCircle2 size={24} strokeWidth={3} /> : <Circle size={24} strokeWidth={3} className="text-gray-300 group-hover:text-black" />}
                </button>
              </div>
              <h3 className={`text-xl font-black text-black tracking-tighter uppercase mb-4 ${task.status === 'completed' && 'line-through'}`}>{task.title}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-500">
                  <Clock size={14} strokeWidth={3} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{task.date} @ {task.time}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <Users size={14} strokeWidth={3} />
                  <span className="text-[10px] font-bold uppercase tracking-widest truncate">{task.assigned_to}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Append Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Configure Schedule</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Assign personnel & timing</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="p-8 space-y-6">
              <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setNewTask({...newTask, type: 'meeting'})}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newTask.type === 'meeting' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  Meeting
                </button>
                <button 
                  type="button" 
                  onClick={() => setNewTask({...newTask, type: 'task'})}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${newTask.type === 'task' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  Task Directive
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Directive Title</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="E.G. QUARTERLY AUDIT"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newTask.date}
                    onChange={e => setNewTask({ ...newTask, date: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Time</label>
                  <input
                    type="time"
                    required
                    value={newTask.time}
                    onChange={e => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assign Personnel</label>
                <select
                  required
                  value={newTask.assigned_to}
                  onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Operator...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                  ))}
                </select>
              </div>

              <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
                <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Commit Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
