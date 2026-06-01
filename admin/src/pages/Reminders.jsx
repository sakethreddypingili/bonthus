import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, X, Users, Clock, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '../server/supabase/supabase';
import SlideDrawer from '../components/common/SlideDrawer';

export default function Reminders({ userProfile }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [users, setEmployees] = useState([]);
  
  const [newTask, setNewTask] = useState({
    title: '',
    date: '',
    time: '',
    assigned_to: '',
    type: 'task' // Default to 'task' as per new schema constraints
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, users(name)')
        .order('scheduled_date', { ascending: true });
      
      if (!error && data) {
        setTasks(data.map(t => ({
          id: t.id,
          title: t.title,
          date: t.scheduled_date,
          time: t.scheduled_time,
          assigned_to: t.users?.name || 'Unassigned',
          type: t.type,
          status: t.status
        })));
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('is_active', true);
      if (!error && data) {
        setEmployees(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
  }, [fetchEmployees, fetchTasks]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('schedules').insert([{
        title: newTask.title,
        scheduled_date: newTask.date,
        scheduled_time: newTask.time,
        assigned_to_id: newTask.assigned_to || null,
        type: newTask.type,
        status: 'pending',
        store_id: userProfile?.store_id
      }]);

      if (error) throw error;
      
      setShowModal(false);
      setNewTask({ title: '', date: '', time: '', assigned_to: '', type: 'task' });
      fetchTasks();
    } catch (err) {
      alert('Failed to add schedule: ' + err.message);
    }
  };

  const toggleTaskStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', id);
      
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : tasks.length === 0 ? (
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
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${task.type === 'staff_meeting' || task.type === 'eye_test' ? 'bg-black text-white' : 'border border-black text-black'}`}>
                  {task.type.replace('_', ' ')}
                </div>
                <button onClick={() => toggleTaskStatus(task.id, task.status)} className="text-black hover:scale-110 transition-transform">
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
      <SlideDrawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Configure Schedule"
        subtitle="Assign personnel & timing"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleAddTask} className="space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
              {['eye_test', 'follow_up', 'staff_meeting', 'task'].map(type => (
                <button 
                  key={type}
                  type="button" 
                  onClick={() => setNewTask({...newTask, type: type})}
                  className={`flex-1 min-w-[120px] py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${newTask.type === type ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
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
                {users.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                ))}
              </select>
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                Commit Schedule
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>
    </div>
  );
}
