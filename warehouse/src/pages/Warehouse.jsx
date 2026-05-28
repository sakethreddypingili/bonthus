import { useState } from "react";
import { 
  Package, ArrowRightLeft, Truck, AlertCircle, 
  Search, CheckCircle2, X, Plus, Filter, Download,
  ChevronLeft, ChevronRight, Eye, Warehouse as WarehouseIcon
} from "lucide-react";

const MOCK_INVENTORY = [
  { id: "W-10492", name: "RayBan Aviator Classic", category: "Frame", stock: 1240, minStock: 200, status: "Healthy" },
  { id: "W-10493", name: "Acuvue Oasys Monthly", category: "Contact Lens", stock: 85, minStock: 100, status: "Low Stock" },
  { id: "W-10494", name: "Zeiss Anti-Reflective Lens", category: "Lens", stock: 450, minStock: 150, status: "Healthy" },
  { id: "W-10495", name: "Oakley Wayfarer", category: "Frame", stock: 12, minStock: 50, status: "Critical" },
  { id: "W-10496", name: "Bausch & Lomb Biotrue", category: "Contact Lens", stock: 500, minStock: 200, status: "Healthy" },
];

const MOCK_REQUESTS = [
  { id: "REQ-8821", store: "Downtown Core (Store A)", items: 4, status: "Pending", priority: "High", date: "Today, 09:41 AM" },
  { id: "REQ-8822", store: "Uptown Plaza (Store B)", items: 12, status: "Processing", priority: "Normal", date: "Yesterday, 04:20 PM" },
  { id: "REQ-8823", store: "Airport Terminal (Store C)", items: 2, status: "Fulfilled", priority: "Normal", date: "Oct 24, 11:00 AM" },
];

export default function Warehouse({ userProfile }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const stats = [
    { label: "Total Units Stored", value: "24,892", icon: Package },
    { label: "Pending Requisitions", value: "14", icon: ArrowRightLeft },
    { label: "Inbound Shipments", value: "3", icon: Truck },
    { label: "Low Stock Alerts", value: "8", icon: AlertCircle },
  ];

  const handleAdjustStock = (item) => {
    setSelectedItem(item);
    setShowAdjustModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Warehouse</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Central Inventory & Distribution</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
          <WarehouseIcon size={16} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Hub</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {['overview', 'inventory', 'requests', 'inbound'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-black text-white shadow-xl scale-105"
                : "bg-white text-gray-400 border border-gray-100 hover:border-black hover:text-black hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black transition-all duration-300 group">
                <div className="flex justify-between items-start mb-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</p>
                  <s.icon size={20} className="text-gray-300 group-hover:text-black transition-colors" strokeWidth={3} />
                </div>
                <div className="text-4xl font-black text-black tracking-tighter">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                <div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tighter">Action Required</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pending Store Requests</p>
                </div>
                <button onClick={() => setActiveTab('requests')} className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black hover:opacity-70 transition-opacity">View All</button>
              </div>
              <div className="space-y-4">
                {MOCK_REQUESTS.filter(r => r.status === 'Pending').map(req => (
                  <div key={req.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-black transition-colors">
                    <div>
                      <p className="text-[12px] font-black text-black uppercase tracking-tight">{req.store}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">Ref: {req.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">{req.items} Items</span>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">{req.priority} Priority</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
                <div>
                  <h3 className="text-xl font-black text-black uppercase tracking-tighter">Stock Deficits</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Items Below Threshold</p>
                </div>
                <button onClick={() => setActiveTab('inventory')} className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black hover:opacity-70 transition-opacity">View All</button>
              </div>
              <div className="space-y-4">
                {MOCK_INVENTORY.filter(i => i.status !== 'Healthy').map(item => (
                  <div key={item.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-black transition-colors">
                    <div>
                      <p className="text-[12px] font-black text-black uppercase tracking-tight">{item.name}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">{item.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-black text-black tracking-tighter">{item.stock} <span className="text-[10px] text-gray-400">/ {item.minStock}</span></p>
                      <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest ${item.status === 'Critical' ? 'text-black border-b border-black' : 'text-gray-500'}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="relative group w-full sm:w-96">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" strokeWidth={3} />
              <input
                type="text"
                placeholder="Lookup Inventory Entity..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="p-4 rounded-2xl border border-gray-100 text-black hover:bg-black hover:text-white transition-all shadow-sm">
                <Filter size={18} strokeWidth={3} />
              </button>
              <button className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus size={16} strokeWidth={3} /> Append Item
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity Code</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_INVENTORY.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{item.id}</td>
                    <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">{item.name}</td>
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.category}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-[14px] font-black text-black tracking-tighter">{item.stock}</span>
                      <span className="text-[9px] text-gray-400 ml-1">/ {item.minStock}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        item.status === 'Healthy' ? 'bg-black text-white' : 
                        item.status === 'Low Stock' ? 'bg-gray-100 text-black border border-gray-200' : 
                        'border border-black text-black'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleAdjustStock(item)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-black uppercase tracking-widest border-b border-black transition-opacity"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Store Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
           <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Requisition Ledger</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cross-unit operational transfers</p>
              </div>
           </div>
           <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Manifest Code</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Origin Store</th>
                  <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Date / Time</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_REQUESTS.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{req.id}</td>
                    <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">{req.store}</td>
                    <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{req.date}</td>
                    <td className="px-8 py-6 text-center text-[12px] font-black text-black">{req.items}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        req.status === 'Pending' ? 'bg-gray-100 text-black border border-gray-200' : 
                        req.status === 'Processing' ? 'border border-black text-black' : 
                        'bg-black text-white'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button className="p-3 bg-black text-white rounded-xl shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100">
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

      {/* Adjust Modal */}
      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Adjust Vector</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref: {selectedItem.id}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="mb-4">
                <p className="text-[14px] font-black text-black uppercase tracking-tight">{selectedItem.name}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Current Volume: {selectedItem.stock}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">New Volume Value</label>
                <input 
                  type="number" 
                  defaultValue={selectedItem.stock}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] font-mono font-black focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all" 
                />
              </div>
              <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Commit Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
