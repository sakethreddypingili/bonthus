import React, { useState, useEffect, useCallback } from 'react';
import { Tags, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import SlideDrawer from '../components/common/SlideDrawer';
import { supabase } from '../server/supabase/supabase';
import { isValidUUID } from '../utils/securityUtils';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products(count)
        `)
        .order('name');
      
      if (error) throw error;

      if (data) {
        setCategories(data.map(c => ({
          ...c,
          items: c.products?.[0]?.count || 0
        })));
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('categories').insert([{
        name: newCat.name,
        description: newCat.description
      }]);

      if (error) throw error;
      
      setShowModal(false);
      setNewCat({ name: '', description: '' });
      fetchCategories();
    } catch (err) {
      alert("Failed to create category: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!isValidUUID(id)) return;
    if (!window.confirm("Are you sure you want to delete this category? All linked entities will be uncategorized.")) return;

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err) {
      alert("Failed to delete category: " + err.message);
    }
  };

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Categories</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Inventory Classification Logic</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={3} /> Register Category
        </button>
      </div>

      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative group w-full max-w-md">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Lookup Category Entity..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Entities Linked</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && categories.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Syncing Classifications...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">No Classifications Found</td></tr>
              ) : filtered.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50  group transition-colors">
                  <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{cat.id.slice(0,8)}</td>
                  <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                      <Tags size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                      {cat.name}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest max-w-xs truncate">{cat.description || "No description provided"}</td>
                  <td className="px-8 py-6 text-center text-[12px] font-black text-black">{cat.items}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlideDrawer
        isOpen={showModal}
        onClose={() => { setShowModal(false); setNewCat({ name: '', description: '' }); }}
        title="New Classification"
        subtitle="Append inventory structure"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleCreateCategory} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Classification Designation</label>
              <input
                type="text"
                required
                value={newCat.name}
                onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="E.g. Sunglasses"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Structural Description</label>
              <textarea
                rows="3"
                value={newCat.description}
                onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none resize-none transition-all"
                placeholder="Define the bounds of this entity..."
              />
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
              <button type="submit" disabled={saving} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                {saving ? "Syncing..." : "Commit Registration"}
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>
    </div>
  );
}
