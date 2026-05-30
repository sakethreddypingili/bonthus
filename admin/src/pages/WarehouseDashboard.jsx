import { useState } from"react";
import { 
  Package, ArrowRightLeft, Truck, AlertCircle, 
  Search, CheckCircle2, X, Plus, Filter, Download,
  ChevronLeft, ChevronRight, Eye, Warehouse as WarehouseIcon
} from"lucide-react";

const MOCK_INVENTORY = [
  { id:"W-10492", name:"RayBan Aviator Classic", category:"Frame", stock: 12, minStock: 50, status:"Critical" },
  { id:"W-10493", name:"Acuvue Oasys Monthly", category:"Contact Lens", stock: 85, minStock: 100, status:"Low Stock" },
];

export default function Dashboard({ userProfile }) {
  const stats = [
    { label:"Total Units Stored", value:"24,892", icon: Package },
    { label:"Active Logistics", value:"14", icon: ArrowRightLeft },
    { label:"Shipment", value:"3", icon: Truck },
    { label:"Low Stock Alerts", value:"8", icon: AlertCircle },
  ];

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Dashboard</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Overview & Analytics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
          <WarehouseIcon size={16} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">Global Hub</span>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black   group">
            <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</p>
              <s.icon size={20} className="text-gray-300 group-hover:text-black" strokeWidth={3} />
            </div>
            <div className="text-4xl font-black text-black tracking-tighter">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Critical Insight Grid */}
      <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
          <div>
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Inventory Deficits</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Items Below Safety Threshold</p>
          </div>
          <button className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black hover:opacity-70 transition-opacity">Manage Stock</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MOCK_INVENTORY.map(item => (
            <div key={item.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-black transition-all">
              <div>
                <p className="text-[14px] font-black text-black uppercase tracking-tight">{item.name}</p>
                <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">{item.id}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-black tracking-tighter">{item.stock} <span className="text-[10px] text-gray-400 uppercase">/ Min {item.minStock}</span></p>
                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest text-black border-b border-black">Critical State</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
