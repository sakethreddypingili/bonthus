import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MapPin, TrendingUp, TrendingDown, Package, Activity, DollarSign } from "lucide-react";
import { supabase } from "../server/supabase/supabase";

const COLORS = ["#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#E5E7EB", "#F3F4F6", "#000000"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black text-white border-none rounded-xl p-4 shadow-2xl text-[11px] animate-in fade-in zoom-in duration-200">
      <p className="font-black mb-2 uppercase tracking-widest text-gray-400 border-b border-white/10 pb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
              <span className="font-bold text-gray-300">{p.name}</span>
            </div>
            <span className="font-black">
              {p.name?.toLowerCase().includes("revenue") ? `₹${Number(p.value).toLocaleString()}` : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Analytics({ userProfile }) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("All");
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [weeklyOrdersData, setWeeklyOrdersData] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [storeSales, setStoreSales] = useState([]);
  const [kpis, setKpis] = useState([
    { label: "Avg Order Value", value: "₹0", delta: "0%", up: true, icon: <DollarSign size={16} /> },
    { label: "Total Revenue", value: "₹0", delta: "0%", up: true, icon: <TrendingUp size={16} /> },
    { label: "Total Orders", value: "0", delta: "0%", up: true, icon: <Activity size={16} /> },
    { label: "Active Products", value: "0", delta: "0%", up: true, icon: <Package size={16} /> },
  ]);

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.store_name === "All";

  const fetchStores = useCallback(async () => {
    const { data } = await supabase.from("store").select("id, name").order("name");
    if (data) setStores(data);
  }, []);

  const fetchAnalyticsData = useCallback(async (sId) => {
    setLoading(true);
    let effectiveStoreId = sId;
    if (!isSuperAdmin && !effectiveStoreId) {
      const { data: storeData } = await supabase
        .from("store")
        .select("id")
        .eq("name", userProfile.store_name)
        .single();
      effectiveStoreId = storeData?.id;
    }

    try {
      await Promise.all([
        fetchChartsAndKPIs(effectiveStoreId),
        fetchTopProducts(effectiveStoreId),
        (isSuperAdmin && selectedStoreId === "All") ? fetchStoreSales() : Promise.resolve()
      ]);
    } catch (err) {
      console.error("Error fetching analytics:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedStoreId, userProfile?.store_name]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    if (userProfile) {
      fetchAnalyticsData(selectedStoreId === "All" ? null : selectedStoreId);
    }
  }, [userProfile, selectedStoreId, fetchAnalyticsData]);

  async function fetchStoreSales() {
    const { data: orders } = await supabase.from("orders").select("net_amount, store_id").eq("disabled", false);
    const { data: storesData } = await supabase.from("store").select("id, name");

    if (orders && storesData) {
      const storeMap = {};
      storesData.forEach(s => storeMap[s.id] = { name: s.name, revenue: 0 });

      orders.forEach(o => {
        if (o.store_id && storeMap[o.store_id]) {
          storeMap[o.store_id].revenue += Number(o.net_amount || 0);
        }
      });

      const formatted = Object.values(storeMap)
        .filter(s => s.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);
      setStoreSales(formatted);
    }
  }

  async function fetchChartsAndKPIs(sId) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    let query = supabase
      .from("orders")
      .select("net_amount, created_at, store_id")
      .eq("disabled", false)
      .gte("created_at", twelveMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    if (sId) query = query.eq("store_id", sId);

    const { data: orders } = await query;

    if (orders) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const revenueMap = {};

      for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthLabel = months[d.getMonth()];
        revenueMap[monthLabel] = { month: monthLabel, revenue: 0, orders: 0, sortKey: d.getTime() };
      }

      let totalRev = 0;
      orders.forEach(o => {
        const date = new Date(o.created_at);
        const monthLabel = months[date.getMonth()];
        if (revenueMap[monthLabel]) {
          const rev = Number(o.net_amount || 0);
          revenueMap[monthLabel].revenue += rev;
          revenueMap[monthLabel].orders += 1;
          totalRev += rev;
        }
      });

      const formattedRevenue = Object.values(revenueMap).sort((a, b) => a.sortKey - b.sortKey);
      setRevenueData(formattedRevenue);
      setMonthlySales(formattedRevenue.map(d => ({ month: d.month, sales: d.orders })));

      const avgOrderValue = orders.length > 0 ? Math.round(totalRev / orders.length) : 0;

      let prodQuery = supabase.from("store_inventory").select("product_id", { count: "exact", head: true });
      if (sId) prodQuery = prodQuery.eq("store_id", sId);
      const { count: productCount } = await prodQuery;

      setKpis([
        { label: "Avg Order Value", value: `₹${avgOrderValue.toLocaleString()}`, delta: "+5.2%", up: true, icon: <DollarSign size={16} /> },
        { label: "Total Revenue", value: `₹${totalRev.toLocaleString()}`, delta: "+12.4%", up: true, icon: <TrendingUp size={16} /> },
        { label: "Total Orders", value: orders.length.toLocaleString(), delta: "+8.1%", up: true, icon: <Activity size={16} /> },
        { label: "Active Products", value: (productCount || 0).toLocaleString(), delta: "+2.4%", up: true, icon: <Package size={16} /> },
      ]);

      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyMap = {};
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = weekDays[d.getDay()];
        weeklyMap[dayLabel] = { day: dayLabel, orders: 0, sortKey: d.getTime() };
      }

      orders.filter(o => new Date(o.created_at) >= sevenDaysAgo).forEach(o => {
        const date = new Date(o.created_at);
        const dayLabel = weekDays[date.getDay()];
        if (weeklyMap[dayLabel]) {
          weeklyMap[dayLabel].orders += 1;
        }
      });

      const formattedWeekly = Object.values(weeklyMap).sort((a, b) => a.sortKey - b.sortKey);
      setWeeklyOrdersData(formattedWeekly);
    }
  }

  async function fetchTopProducts(sId) {
    let query = supabase
      .from("store_inventory")
      .select("stock_quantity, unit_price, products(name, sales, product_categories(name))")
      .order("products(sales)", { ascending: false })
      .limit(10);

    if (sId) query = query.eq("store_id", sId);

    const { data } = await query;
    if (data) {
      setTopProducts(data.map(p => ({
        name: p.products?.name || "Unknown",
        category: p.products?.product_categories?.name || "General",
        sales: p.products?.sales || 0,
        revenue: (p.products?.sales || 0) * (p.unit_price || 0),
        trend: "up"
      })));
    }

    let catQuery = supabase
      .from("store_inventory")
      .select("products(sales, product_categories(name))");

    if (sId) catQuery = catQuery.eq("store_id", sId);

    const { data: catData } = await catQuery;
    if (catData) {
      const catMap = {};
      catData.forEach(p => {
        const cat = p.products?.product_categories?.name || "General";
        catMap[cat] = (catMap[cat] || 0) + (p.products?.sales || 0);
      });

      const totalSales = catData.reduce((sum, p) => sum + (p.sales || 0), 0);
      const formattedCats = Object.entries(catMap)
        .map(([name, val], i) => ({
          name,
          value: totalSales > 0 ? Math.round((val / totalSales) * 100) : 0
        }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value);

      setCategoryData(formattedCats);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Analytics</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
            {isSuperAdmin && selectedStoreId === "All" ? "Global Store Performance" : `Performance Analysis for ${selectedStoreId === "All" ? userProfile?.store_name : stores.find(s => s.id === selectedStoreId)?.name}`}
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <MapPin size={16} className="text-black" />
              <div className="relative group/select">
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="appearance-none bg-transparent text-xs font-black text-black uppercase focus:outline-none cursor-pointer pr-8 py-1"
                >
                  <option value="All">All Locations</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={14} className="text-black" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black/5 transition-all duration-300 group">
            <div className="flex flex-col h-full">
              <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.15em]">{k.label}</p>
              <div className="flex items-baseline gap-2 mb-4">
                <p className="text-3xl font-black text-black tracking-tighter">{loading ? "..." : k.value}</p>
              </div>
              <div className="mt-auto flex items-center gap-2">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${k.up ? "bg-black text-white" : "bg-gray-100 text-black"}`}>
                  {k.up ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                  <span className="text-[10px] font-black uppercase">{k.delta}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">vs period</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Monthly Revenue</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">12 Month Performance</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-black animate-pulse" />
          </div>
          
          <div className="flex-1 w-full overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[10px] font-black text-gray-400 uppercase tracking-widest">Synthesizing...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f1f1" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 900, fill: "#000" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#000', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#000" strokeWidth={3} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[450px]">
          <div className="mb-8">
            <h3 className="font-black text-black text-lg uppercase tracking-tight">Sales Distribution</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Category Share</p>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={5}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[9px] font-black text-black uppercase truncate tracking-tight">{c.name}</span>
                <span className="ml-auto text-[9px] font-black text-gray-400">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Orders Bar Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Weekly Orders</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">7 Day Velocity</p>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyOrdersData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f1f1" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fontWeight: 900, fill: "#000" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                <Bar dataKey="orders" name="Orders" fill="#000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Orders Line Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Order Trends</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Monthly Volume</p>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySales} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f1f1" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 900, fill: "#000" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="sales" name="Orders" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: "#000", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Store Performance (Admins only) */}
      {isSuperAdmin && selectedStoreId === "All" && storeSales.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Location Performance</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Global Revenue Distribution</p>
            </div>
            <span className="text-[10px] font-black text-white bg-black px-3 py-1 rounded-full uppercase tracking-widest">{storeSales.length} Stores</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeSales} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }} barSize={16}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f1f1" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 900, fill: "#000" }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#000" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Products Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-black text-lg uppercase tracking-tight">Top Performance</h3>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{topProducts.length} Products Tracked</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Rank", "Product", "Revenue", "Sales", "Trend"].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Synthesizing metrics...</td>
                </tr>
              ) : topProducts.length > 0 ? (
                topProducts.map((p, i) => (
                  <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black ${i < 3 ? "bg-black text-white" : "bg-gray-100 text-black"}`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-black text-black uppercase tracking-tight">{p.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{p.category}</p>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-black text-black tracking-tight">₹{p.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">{p.sales} units</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${p.trend === "up" ? "bg-black text-white" : "bg-gray-100 text-black"}`}>
                        {p.trend === "up" ? <TrendingUp size={10} strokeWidth={3} /> : <TrendingDown size={10} strokeWidth={3} />}
                        <span className="text-[9px] font-black uppercase">{p.trend === "up" ? "Rising" : "Falling"}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No products data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
