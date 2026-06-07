import { 
  BarChart2, Truck, Clock, AlertCircle, CheckCircle, 
  ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw
} from "lucide-react";

export default function ShipmentOverview() {
  const stats = [
    { label: 'Active', value: '12', trend: '+2', icon: Truck },
    { label: 'In Transit', value: '8', trend: '+1', icon: Clock },
    { label: 'Arrived', value: '4', trend: '0', icon: CheckCircle },
    { label: 'Delayed', value: '2', trend: '-1', icon: AlertCircle },
  ];

  const recent = [
    { id: 1, action: 'Shipment Received', ref: 'SH-4404', time: '2h ago' },
    { id: 2, action: 'Shipment Delayed', ref: 'SH-4403', time: '5h ago' },
    { id: 3, action: 'New Shipment', ref: 'SH-4405', time: '8h ago' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Overview</h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.25em]">Operational Intelligence Vector</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-2xl shadow-sm border border-neutral-900">
          <TrendingUp size={14} strokeWidth={2.5} className="text-white" />
          <span className="text-[10px] font-black uppercase tracking-widest">Efficiency: 94.2%</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:border-black hover:shadow-md transition-all duration-300 group flex flex-col justify-between h-36"
          >
            <div className="flex justify-between items-center">
              <div className="p-2.5 rounded-xl bg-black text-white transition-transform group-hover:scale-105 duration-300">
                <stat.icon size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[9px] font-mono font-black px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-full text-neutral-800">
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <h2 className="text-3xl font-mono font-black text-black tracking-tight">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Ledger */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-200 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-black uppercase tracking-tighter">Activity Ledger</h3>
              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Live Updates</span>
            </div>
            <div className="relative border-l border-neutral-200 ml-3 pl-8 space-y-8">
              {recent.map((activity) => (
                <div key={activity.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[38px] top-1 w-3.5 h-3.5 rounded-full bg-black border-4 border-white group-hover:scale-110 transition-all duration-200 shrink-0 shadow-sm" />
                  <div>
                    <div className="flex justify-between items-center gap-4">
                      <p className="text-[11px] font-black text-black uppercase tracking-tight truncate">{activity.action}</p>
                      <span className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest shrink-0">{activity.time}</span>
                    </div>
                    <p className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest mt-1">Ref: {activity.ref}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Network Integrity */}
        <div className="bg-black rounded-3xl shadow-xl p-8 text-white flex flex-col justify-between border border-neutral-900">
          <div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black uppercase tracking-tighter">Network Integrity</h3>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
            <div className="space-y-6">
              {[
                { name: 'Vision One', score: 98 },
                { name: 'Apex Optical', score: 85 },
                { name: 'ClearView', score: 72 },
              ].map((carrier, i) => (
                <div key={i} className="space-y-2.5">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-neutral-400">
                    <span>{carrier.name}</span>
                    <span className="text-white font-mono">{carrier.score}%</span>
                  </div>
                  <div className="h-[3px] w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${carrier.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full mt-10 py-4 bg-white text-black hover:bg-neutral-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2">
            <RefreshCw size={12} strokeWidth={3} className="animate-spin-slow" /> Sync Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
