import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { PackageSearch, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from "../server/supabase/supabase";

const MOCK_STOCK_TRENDS = [
  { month: 'Jan', stockValue: 1200000, requests: 45 },
  { month: 'Feb', stockValue: 1150000, requests: 52 },
  { month: 'Mar', stockValue: 1300000, requests: 38 },
  { month: 'Apr', stockValue: 1250000, requests: 65 },
  { month: 'May', stockValue: 1400000, requests: 48 },
  { month: 'Jun', stockValue: 1350000, requests: 55 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black text-white rounded-xl p-4 shadow-2xl text-[11px] border border-white/10">
      <p className="font-black mb-2 uppercase tracking-widest text-gray-400 border-b border-white/10 pb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <span className="font-bold text-gray-300 uppercase">{p.name}</span>
            <span className="font-black">
              {p.name.toLowerCase().includes('value') ? `₹${Number(p.value).toLocaleString()}` : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function InventoryAnalytics() {
  const [timeRange, setTimeRange] = useState('6M');
  const [metrics, setMetrics] = useState([
    { label: "Total Inventory Value", value: "₹0", trend: "0%", icon: PackageSearch },
    { label: "Requisition Fulfillment", value: "0%", trend: "0%", icon: TrendingUp },
    { label: "Critical Stock Alerts", value: "0", trend: "0", icon: AlertTriangle },
    { label: "Avg. Transfer Time", value: "0 hrs", trend: "0 hrs", icon: Clock },
  ]);
  const [storeRequests, setStoreRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Total Inventory Value
      const { data: invData } = await supabase.from('store_inventory').select('stock_quantity, unit_price');
      const totalValue = invData?.reduce((sum, item) => sum + (item.stock_quantity * (item.unit_price || 0)), 0) || 0;

      // 2. Requisition Fulfillment
      const { data: reqData } = await supabase.from('store_requisitions').select('status');
      const totalReqs = reqData?.length || 0;
      const fulfilledReqs = reqData?.filter(r => r.status === 'fulfilled').length || 0;
      const fulfillmentRate = totalReqs > 0 ? (fulfilledReqs / totalReqs) * 100 : 0;

      // 3. Critical Stock Alerts
      const { data: alertData } = await supabase.from('store_inventory').select('stock_quantity, low_stock_threshold');
      const criticalCount = alertData?.filter(item => item.stock_quantity <= item.low_stock_threshold).length || 0;

      setMetrics([
        { label: "Total Inventory Value", value: `₹${totalValue.toLocaleString()}`, trend: "+0%", icon: PackageSearch },
        { label: "Requisition Fulfillment", value: `${fulfillmentRate.toFixed(1)}%`, trend: "+0%", icon: TrendingUp },
        { label: "Critical Stock Alerts", value: criticalCount.toString(), trend: "0", icon: AlertTriangle },
        { label: "Avg. Transfer Time", value: "4.2 hrs", trend: "0", icon: Clock },
      ]);

      // 4. Requisitions by Store
      const { data: storeReqData } = await supabase
        .from('store_requisitions')
        .select('from_store:stores(name)');
      
      const counts = storeReqData?.reduce((acc, r) => {
        const name = r.from_store?.name || 'Unknown';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {}) || {};

      const mappedStoreRequests = Object.entries(counts).map(([name, count]) => ({
        store: name,
        requests: count
      })).sort((a, b) => b.requests - a.requests);

      setStoreRequests(mappedStoreRequests);

    } catch (err) {
      console.error("Error fetching analytics:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Analytics</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Warehouse Operational Insights</p>
        </div>
        <div className="flex gap-2">
          {['1M', '3M', '6M', '1Y'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest  ${
                timeRange === range ? 'bg-black text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black   group">
            <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{m.label}</p>
              <m.icon size={20} className="text-gray-300 group-hover:text-black" strokeWidth={3} />
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-black text-black tracking-tighter">{m.value}</div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${m.trend.startsWith('+') ? 'text-black' : 'text-gray-400'}`}>
                {m.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventory Value Trend */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
          <div className="mb-8 border-b border-gray-50 pb-6">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Inventory Valuation Trend</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Capital locked in storage over time</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_STOCK_TRENDS} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#999' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#999' }} tickFormatter={v => `₹${v/100000}L`} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#f1f1f1', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="stockValue" name="Total Value" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requisitions by Store */}
        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm">
          <div className="mb-8 border-b border-gray-50 pb-6">
            <h3 className="text-xl font-black text-black uppercase tracking-tighter">Requisitions By Unit</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Store demand distribution</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={storeRequests.length > 0 ? storeRequests : [{store: 'No Data', requests: 0}]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="store" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#000' }} width={80} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                <Bar dataKey="requests" name="Requests" fill="#000000" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
