import React, { useState } from 'react';
import { Tags, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import SlideDrawer from '../components/common/SlideDrawer';

const MOCK_CATEGORIES = [
  { id: 'CAT-001', name: 'Frames', description: 'Spectacle frames and eyewear rims', items: 1450 },
  { id: 'CAT-002', name: 'Lenses', description: 'Ophthalmic lenses (Single, Progressive)', items: 3200 },
  { id: 'CAT-003', name: 'Contact Lenses', description: 'Soft, RGP, and cosmetic contact lenses', items: 850 },
  { id: 'CAT-004', name: 'Accessories', description: 'Cases, cleaning solutions, cloths', items: 560 },
];

export default function Categories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  
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

      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex items-center justify-between">
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
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Entities Linked</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_CATEGORIES.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50  group">
                  <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{cat.id}</td>
                  <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">
                    <div className="flex items-center gap-2">
                      <Tags size={14} className="text-gray-400" />
                      {cat.name}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{cat.description}</td>
                  <td className="px-8 py-6 text-center text-[12px] font-black text-black">{cat.items}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100">
                      <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg">
                        <Edit2 size={16} strokeWidth={3} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg">
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
        onClose={() => setShowModal(false)}
        title="New Classification"
        subtitle="Append inventory structure"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={e => { e.preventDefault(); setShowModal(false); }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Classification Designation</label>
              <input
                type="text"
                required
                placeholder="E.g. Sunglasses"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Structural Description</label>
              <textarea
                required
                rows="3"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none  resize-none"
                placeholder="Define the bounds of this entity..."
              />
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Abort</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95">
                Commit Registration
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>
    </div>
  );
}