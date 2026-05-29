import React, { useState } from 'react';
import { Store as StoreIcon, Building2, Package, ArrowRightLeft, Search } from 'lucide-react';

const MOCK_STORES = [
  { id: 'ST-001', name: 'Downtown Core', location: 'City Center', inventoryCount: 1450, pendingRequests: 4, status: 'Active' },
  { id: 'ST-002', name: 'Uptown Plaza', location: 'North District', inventoryCount: 820, pendingRequests: 12, status: 'Active' },
  { id: 'ST-003', name: 'Airport Terminal', location: 'Transit Hub', inventoryCount: 340, pendingRequests: 2, status: 'Active' },
  { id: 'ST-004', name: 'Westside Mall', location: 'West End', inventoryCount: 2100, pendingRequests: 0, status: 'Active' },
];

export default function StoreInsights() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Store Network</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Retail Unit Logistics & Tracking</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
          <StoreIcon size={16} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">{MOCK_STORES.length} Active Nodes</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative group w-full max-w-md">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" strokeWidth={3} />
          <input
            type="text"
            placeholder="Lookup Retail Unit..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Store Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {MOCK_STORES.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
          <div key={store.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden group hover:border-black transition-all duration-300">
            <div className="p-8 border-b border-gray-50 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
                  <Building2 size={24} strokeWidth={3} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tighter">{store.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{store.location}</p>
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">
                {store.id}
              </span>
            </div>
            
            <div className="p-8 bg-gray-50/50">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Package size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Local Inventory</span>
                  </div>
                  <p className="text-3xl font-black text-black tracking-tighter">{store.inventoryCount}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <ArrowRightLeft size={14} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Active Requests</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-black text-black tracking-tighter">{store.pendingRequests}</p>
                    {store.pendingRequests > 0 && (
                      <span className="mb-2 w-2 h-2 bg-black rounded-full animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-50 flex gap-2">
              <button className="flex-1 py-4 text-[10px] font-black text-black uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-colors">View Inventory</button>
              <button className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Manage Requests</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}