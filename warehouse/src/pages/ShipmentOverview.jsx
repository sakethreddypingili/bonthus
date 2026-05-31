import { 
  BarChart2, Truck, Clock, AlertCircle, CheckCircle, 
  ArrowUpRight, ArrowDownRight, TrendingUp 
} from "lucide-react";

export default function ShipmentOverview() {
  const stats = [
    { label: 'Active', value: '12', trend: '+2', icon: Truck },
    { label: 'In Transit', value: '8', trend: '+1', icon: Clock },
    { label: 'Arrived', value: '4', trend: '0', icon: CheckCircle },
    { label: 'Delayed', value: '2', trend: '-1', icon: AlertCircle },
  ];

  const recent = [
    { id: 1, action: 'Shipment Received', ref: 'SH-4404', time: '2h ago', type: 'success' },
    { id: 2, action: 'Shipment Delayed', ref: 'SH-4403', time: '5h ago', type: 'error' },
    { id: 3, action: 'New Shipment', ref: 'SH-4405', time: '8h ago', type: 'info' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Overview</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Operational Intelligence Vector</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <TrendingUp size={16} className="text-black" />
            <span className="text-[10px] font-black text-black uppercase tracking-widest">Efficiency: 94.2%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 rounded-3xl bg-black text-white shadow-lg group-hover:scale-110 transition-transform">
                <stat.icon size={20} strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black bg-gray-50 text-black">
                {stat.trend}
              </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h2 className="text-3xl font-black text-black tracking-tight">{stat.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
          <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-8">Activity Ledger</h3>
          <div className="space-y-6">
            {recent.map((activity) => (
              <div key={activity.id} className="flex items-center gap-6 p-4 rounded-3xl hover:bg-gray-50 transition-colors group">
                <div className="w-2 h-2 rounded-full bg-black group-hover:scale-150 transition-transform" />
                <div className="flex-1">
                  <p className="text-[11px] font-black text-black uppercase tracking-tight">{activity.action}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ref: {activity.ref}</p>
                </div>
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-black rounded-[40px] shadow-2xl p-8 text-white relative overflow-hidden">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 relative z-10">Network Integrity</h3>
            <div className="space-y-6 relative z-10">
                {[
                    { name: 'Vision One', score: 98 },
                    { name: 'Apex Optical', score: 85 },
                    { name: 'ClearView', score: 72 },
                ].map((carrier, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span>{carrier.name}</span>
                            <span>{carrier.score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full" style={{ width: `${carrier.score}%` }} />
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full mt-12 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">
                Sync Ledger
            </button>
        </div>
      </div>
    </div>
  );
}
