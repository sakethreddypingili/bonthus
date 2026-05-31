import React, { useState } from 'react';
import { 
  Store as StoreIcon, Building2, Package, ArrowRightLeft, 
  Search, Eye, X, CheckCircle2, Clock, MapPin, Filter 
} from 'lucide-react';
import SlideDrawer from '../components/common/SlideDrawer';

const MOCK_STORES = [
  { id: 'ST-001', name: 'Downtown Core', location: 'City Center', inventoryCount: 1450, pendingRequests: 4, status: 'Active' },
  { id: 'ST-002', name: 'Uptown Plaza', location: 'North District', inventoryCount: 820, pendingRequests: 12, status: 'Active' },
  { id: 'ST-003', name: 'Airport Terminal', location: 'Transit Hub', inventoryCount: 340, pendingRequests: 2, status: 'Active' },
  { id: 'ST-004', name: 'Westside Mall', location: 'West End', inventoryCount: 2100, pendingRequests: 0, status: 'Active' },
];

const MOCK_REQUESTS = [
  { id:"REQ-8821", store:"Downtown Core", items: 4, status:"Pending", priority:"High", date:"Today, 09:41 AM", type:"Urgent Restock" },
  { id:"REQ-8822", store:"Uptown Plaza", items: 12, status:"Processing", priority:"Normal", date:"Yesterday, 04:20 PM", type:"Regular Refill" },
  { id:"REQ-8823", store:"Airport Terminal", items: 2, status:"Fulfilled", priority:"Normal", date:"Oct 24, 11:00 AM", type:"Single Item" },
  { id:"REQ-8824", store:"Westside Mall", items: 25, status:"Pending", priority:"Normal", date:"Today, 10:15 AM", type:"Bulk Replenishment" },
];

export default function StoreInsights() {
  const [activeView, setActiveTab] = useState("network"); //"network" or"requisitions"
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const filteredRequests = MOCK_REQUESTS.filter(r => 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.store.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Store Intelligence</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Retail Logistics & Demand Management</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
          <StoreIcon size={16} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Hub</span>
        </div>
      </div>

      {/* View Switcher & Search */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1">
          <button 
            onClick={() => setActiveTab("network")}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeView ==="network" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
          >
            Unit Network
          </button>
          <button 
            onClick={() => setActiveTab("requisitions")}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest  ${activeView ==="requisitions" ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
          >
            Requisition Ledger
          </button>
        </div>

        <div className="relative group w-full lg:w-96">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder={activeView ==="network" ?"Lookup Retail Unit..." :"Lookup Manifest..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Network View */}
      {activeView ==="network" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {MOCK_STORES.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(store => (
            <div key={store.id} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden group hover:border-black">
              <div className="p-8 border-b border-gray-50 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white">
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
                <button className="flex-1 py-4 text-[10px] font-black text-black uppercase tracking-widest hover:bg-gray-50 rounded-2xl">View Inventory</button>
                <button 
                  onClick={() => { setActiveTab("requisitions"); setSearchQuery(store.name); }}
                  className="flex-1 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  Manage Requests
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requisitions View */}
      {activeView ==="requisitions" && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden    min-h-[600px]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Manifest Code</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Origin Unit</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Request Vector</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50  group">
                    <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{req.id}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-gray-300" />
                          <span className="text-[11px] font-black text-black uppercase tracking-tight">{req.store}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{req.type}</td>
                    <td className="px-8 py-6 text-center text-[12px] font-black text-black">{req.items}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        req.status === 'Fulfilled' ? 'bg-black text-white shadow-lg' : 
                        req.status === 'Processing' ? 'border border-black text-black' : 
                        'bg-gray-100 text-black border border-gray-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                        className="p-3 bg-black text-white rounded-xl shadow-lg hover:scale-110  opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={14} strokeWidth={3} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <SlideDrawer
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Manifest Detail"
        subtitle={`Ref: ${selectedRequest?.id}`}
      >
        {selectedRequest && (
          <div className="flex flex-col h-full">
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Origin Unit</span>
                    <p className="text-[14px] font-black text-black uppercase tracking-tight">{selectedRequest.store}</p>
                </div>
                <div>
                    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Timeline</span>
                    <p className="text-[14px] font-black text-black uppercase tracking-tight">{selectedRequest.date}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                <p className="text-[10px] font-black text-black uppercase tracking-[0.2em] border-b border-gray-200 pb-3">Requested Inventory</p>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-gray-500">RayBan Aviator Classic</span>
                        <span className="text-black font-black">2 Units</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest">
                        <span className="text-gray-500">Zeiss Anti-Reflective Lens</span>
                        <span className="text-black font-black">2 Units</span>
                    </div>
                </div>
              </div>
            </div>

            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button onClick={() => setShowDetailModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Discard</button>
              <button className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95  flex items-center justify-center gap-2">
                <CheckCircle2 size={16} strokeWidth={3} /> Authorize Fulfillment
              </button>
            </div>
          </div>
        )}
      </SlideDrawer>
    </div>
  );
}
