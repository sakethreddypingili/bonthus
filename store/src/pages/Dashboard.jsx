import { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowUpRight, ArrowDownRight, Circle, MapPin, ChevronDown, LayoutDashboard } from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { supabase } from "../server/supabase/supabase";

// Monochromatic color palette - chart data
const COLORS = ["#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#E5E7EB", "#F3F4F6", "#000000"];

const statusBadge = (status) => {
  const map = {
    Delivered: "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    Shipped: "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    Processing: "bg-gray-100 text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    Cancelled: "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    Paid: "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    Pending: "border border-gray-200 text-gray-400 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
  };
  return <span className={map[status] || "bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"}>{status}</span>;
};

const StatCard = ({ label, value, trend, up = true, loading, isComparison = true }) => (
  <div className="stat-card bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black/5 transition-all duration-300 group">
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.15em]">{label}</p>
      <div className="flex items-baseline gap-2 mb-4">
        <p className="text-3xl font-black text-black tracking-tighter">{loading ? "..." : value}</p>
      </div>
      <div className="mt-auto flex items-center gap-2">
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${up ? "bg-black text-white" : "bg-gray-100 text-black"}`}>
          {isComparison && (up ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />)}
          <span className="text-[10px] font-black uppercase">{trend}</span>
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">vs previous</span>
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-black text-white border-none rounded-xl p-4 shadow-2xl text-[11px] animate-in fade-in zoom-in duration-200">
      <p className="font-black mb-2 uppercase tracking-widest text-gray-400 border-b border-white/10 pb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fill }} />
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

const NoDataOverlay = ({ message = "No data available for this selection" }) => (
  <div className="flex flex-col items-center justify-center h-full w-full py-12">
    <div className="p-4 bg-gray-100 rounded-2xl mb-3">
      <LayoutDashboard size={24} className="text-gray-400" />
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center px-4">{message}</p>
  </div>
);

export default function Dashboard({ userProfile }) {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("All");
  const [stats, setStats] = useState({ 
    revenueToday: 0, 
    ordersToday: 0, 
    revenueLast30Days: 0,
    ordersLast30Days: 0,
    revenueThisMonth: 0,
    ordersThisMonth: 0,
    revenueYesterday: 0,
    ordersYesterday: 0,
    trendRevenueToday: 0,
    trendOrdersToday: 0,
    trendRevenueMonth: 0,
    trendOrdersMonth: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [weeklyOrdersData, setWeeklyOrdersData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [yesterdayStatusData, setYesterdayStatusData] = useState([]);
  const [todayOrdersData, setTodayOrdersData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [todayOrderHistory, setTodayOrderHistory] = useState([]);
  const [storeSales, setStoreSales] = useState([]);
  const [topShapes, setTopShapes] = useState([]);

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.store_name === "All";

  const fetchStores = useCallback(async () => {
    const { data } = await supabase.from("store").select("id, name").order("name");
    if (data) setStores(data);
  }, []);

  const getDashboardStoreScope = useCallback(() => {
    if (isSuperAdmin) {
      return selectedStoreId === "All" ? null : selectedStoreId;
    }

    return userProfile?.store_id || null;
  }, [isSuperAdmin, selectedStoreId, userProfile?.store_id]);

  async function fetchTodayOrdersData(sId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndISO = todayEnd.toISOString();

    let query = supabase
      .from("orders")
      .select("created_at")
      .eq("disabled", false)
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO);

    if (sId) query = query.eq("store_id", sId);

    const { data: todayOrders } = await query;

    if (todayOrders) {
      // Group by hour
      const hourMap = {};
      for (let i = 0; i < 24; i++) {
        const hour = i < 10 ? `0${i}` : `${i}`;
        hourMap[hour] = { hour: `${hour}:00`, orders: 0, sortKey: i };
      }

      todayOrders.forEach(o => {
        const date = new Date(o.created_at);
        const hour = date.getHours() < 10 ? `0${date.getHours()}` : `${date.getHours()}`;
        if (hourMap[hour]) {
          hourMap[hour].orders += 1;
        }
      });

      const formattedToday = Object.values(hourMap).sort((a, b) => a.sortKey - b.sortKey);
      setTodayOrdersData(formattedToday);
    }
  }

  async function fetchYesterdayStatusData(sId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = yesterday.toISOString();
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yesterdayEndISO = yesterdayEnd.toISOString();

    let query = supabase
      .from("orders")
      .select("status")
      .eq("disabled", false)
      .gte("created_at", yesterdayStart)
      .lte("created_at", yesterdayEndISO);

    if (sId) query = query.eq("store_id", sId);

    const { data: yesterdayOrders } = await query;

    // Process status data - include all possible statuses
    const allStatuses = ["Processing", "Delivered", "Due", "Cancelled"];
    const statusMap = {};
    allStatuses.forEach(status => {
      statusMap[status] = 0;
    });
    (yesterdayOrders || []).forEach(o => {
      const status = o.status || "Pending";
      if (statusMap.hasOwnProperty(status)) {
        statusMap[status] = (statusMap[status] || 0) + 1;
      }
    });
    const formattedStatus = Object.entries(statusMap).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[(i + 4) % COLORS.length]
    })).sort((a, b) => b.value - a.value);
    setYesterdayStatusData(formattedStatus);
  }

  async function fetchTopCustomers(sId) {
    let query = supabase
      .from("customers")
      .select("id, name, orders(gross_amount)")
      .order('name');

    if (sId) query = query.eq("store_id", sId);

    const { data } = await query;

    if (data) {
      const customersWithSpent = data.map(c => ({
        id: c.id,
        name: c.name || 'Anonymous',
        spent: c.orders?.reduce((sum, o) => sum + Number(o.gross_amount || 0), 0) || 0,
        orderCount: c.orders?.length || 0,
        avgOrderValue: c.orders && c.orders.length > 0 ? Math.round((c.orders.reduce((sum, o) => sum + Number(o.gross_amount || 0), 0) / c.orders.length)) : 0
      }));
      
      const sorted = customersWithSpent
        .filter(c => c.spent > 0)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 8);
      setTopCustomers(sorted);
    }
  }

  async function fetchTodayOrderHistory(sId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndISO = todayEnd.toISOString();

    let query = supabase
      .from("orders")
      .select("id, status, gross_amount, created_at, customers(name)")
      .eq("disabled", false)
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO)
      .order("created_at", { ascending: false })
      .limit(10);

    if (sId) query = query.eq("store_id", sId);

    const { data } = await query;

    if (data) {
      const formatted = data.map(o => ({
        id: o.id,
        customer: o.customers?.name || 'Unknown',
        amount: o.gross_amount,
        status: o.status,
        time: new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }));
      setTodayOrderHistory(formatted);
    }
  }

  const fetchData = useCallback(async (sId) => {
    setLoading(true);
    try {
      // Always use the provided sId - for managers it's locked, for admins it's user-selected
      await Promise.all([
        fetchOverviewStats(sId),
        fetchChartData(sId),
        fetchRecentOrders(sId),
        fetchTopProducts(sId),
        fetchTodayOrdersData(sId),
        fetchYesterdayStatusData(sId),
        fetchTopCustomers(sId),
        fetchTodayOrderHistory(sId),
        // Only fetch store sales if admin viewing all stores (sId is null)
        isSuperAdmin && !sId ? fetchStoreSales() : Promise.resolve()
      ]);
    } catch (err) {
      console.error("Error in dashboard fetch:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // CRITICAL: Manager store ID fetching - for managers, lock to their assigned store
  useEffect(() => {
    if (!isSuperAdmin) {
      // For store managers: use their assigned store_id from userProfile
      if (userProfile?.store_id) {
        console.log("Manager store ID from profile:", userProfile.store_id);
        setSelectedStoreId(userProfile.store_id);
        fetchData(userProfile.store_id);
      } else {
        console.warn("Manager profile missing store_id");
      }
    }
  }, [userProfile?.store_id, isSuperAdmin, fetchData]);

  // Admin store selection: triggers when admin changes selectedStoreId
  useEffect(() => {
    if (isSuperAdmin) {
      fetchData(getDashboardStoreScope());
    }
  }, [isSuperAdmin, selectedStoreId, fetchData, getDashboardStoreScope]);

  async function fetchOverviewStats(sId) {
    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndISO = todayEnd.toISOString();

    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = yesterday.toISOString();
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yesterdayEndISO = yesterdayEnd.toISOString();

    // 30 days ago (same day, previous month)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStart = thirtyDaysAgo.toISOString();
    
    const thirtyDaysAgoEnd = new Date(thirtyDaysAgo);
    thirtyDaysAgoEnd.setHours(23, 59, 59, 999);
    const thirtyDaysAgoEndISO = thirtyDaysAgoEnd.toISOString();

    // This month start to today
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    // Build queries based on role
    let baseTodayQuery = supabase
      .from("orders")
      .select("gross_amount, status, customer_id, created_at", { count: "exact" })
      .eq("disabled", false)
      .gte("created_at", todayStart)
      .lte("created_at", todayEndISO);

    let baseYesterdayQuery = supabase
      .from("orders")
      .select("gross_amount", { count: "exact" })
      .eq("disabled", false)
      .gte("created_at", yesterdayStart)
      .lte("created_at", yesterdayEndISO);

    let base30DaysQuery = supabase
      .from("orders")
      .select("gross_amount", { count: "exact" })
      .eq("disabled", false)
      .gte("created_at", thirtyDaysAgoStart)
      .lte("created_at", thirtyDaysAgoEndISO);

    let baseMonthQuery = supabase
      .from("orders")
      .select("gross_amount", { count: "exact" })
      .eq("disabled", false)
      .gte("created_at", monthStartISO)
      .lte("created_at", todayEndISO);

    // Apply store filter if not admin viewing all stores
    if (sId) {
      baseTodayQuery = baseTodayQuery.eq("store_id", sId);
      baseYesterdayQuery = baseYesterdayQuery.eq("store_id", sId);
      base30DaysQuery = base30DaysQuery.eq("store_id", sId);
      baseMonthQuery = baseMonthQuery.eq("store_id", sId);
    }

    const [
      { data: todayOrders, count: todayOrdersCount },
      { data: yesterdayOrders, count: yesterdayOrdersCount },
      { data: thirtyDaysOrders, count: thirtyDaysOrdersCount },
      { data: monthOrders, count: monthOrdersCount }
    ] = await Promise.all([
      baseTodayQuery,
      baseYesterdayQuery,
      base30DaysQuery,
      baseMonthQuery
    ]);

    // Calculate revenues
    const todayRevenue = (todayOrders || []).reduce((sum, o) => sum + (o.gross_amount || 0), 0);
    const yesterdayRevenue = (yesterdayOrders || []).reduce((sum, o) => sum + (o.gross_amount || 0), 0);
    const thirtyDaysRevenue = (thirtyDaysOrders || []).reduce((sum, o) => sum + (o.gross_amount || 0), 0);
    const monthRevenue = (monthOrders || []).reduce((sum, o) => sum + (o.gross_amount || 0), 0);

    // Calculate trends (percentage change)
    const trendRevenueToday = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100) : 0;
    const trendOrdersToday = yesterdayOrdersCount > 0 ? ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount * 100) : 0;
    const trendRevenueMonth = thirtyDaysRevenue > 0 ? ((monthRevenue - thirtyDaysRevenue) / thirtyDaysRevenue * 100) : 0;
    const trendOrdersMonth = thirtyDaysOrdersCount > 0 ? ((monthOrdersCount - thirtyDaysOrdersCount) / thirtyDaysOrdersCount * 100) : 0;

    setStats({
      revenueToday: todayRevenue,
      ordersToday: todayOrdersCount || 0,
      revenueLast30Days: thirtyDaysRevenue,
      ordersLast30Days: thirtyDaysOrdersCount || 0,
      revenueThisMonth: monthRevenue,
      ordersThisMonth: monthOrdersCount || 0,
      revenueYesterday: yesterdayRevenue,
      ordersYesterday: yesterdayOrdersCount || 0,
      trendRevenueToday: trendRevenueToday.toFixed(1),
      trendOrdersToday: trendOrdersToday.toFixed(1),
      trendRevenueMonth: trendRevenueMonth.toFixed(1),
      trendOrdersMonth: trendOrdersMonth.toFixed(1)
    });

    // Process status data - include all possible statuses
    const allStatuses = ["Processing", "Delivered", "Due", "Cancelled"];
    const statusMap = {};
    allStatuses.forEach(status => {
      statusMap[status] = 0;
    });
    (todayOrders || []).forEach(o => {
      const status = o.status || "Pending";
      if (statusMap.hasOwnProperty(status)) {
        statusMap[status] = (statusMap[status] || 0) + 1;
      }
    });
    const formattedStatus = Object.entries(statusMap).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[(i + 4) % COLORS.length]
    })).sort((a, b) => b.value - a.value);
    setStatusData(formattedStatus);
  }

  async function fetchChartData(sId) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    let query = supabase
      .from("orders")
      .select("gross_amount, created_at")
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

      orders.forEach(o => {
        const date = new Date(o.created_at);
        const monthLabel = months[date.getMonth()];
        if (revenueMap[monthLabel]) {
          revenueMap[monthLabel].revenue += Number(o.gross_amount || 0);
          revenueMap[monthLabel].orders += 1;
        }
      });

      const formattedRevenue = Object.values(revenueMap).sort((a, b) => a.sortKey - b.sortKey);
      setRevenueData(formattedRevenue);

      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weeklyMap = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dayLabel = weekDays[d.getDay()];
        weeklyMap[dayLabel] = { day: dayLabel, orders: 0, sortKey: d.getTime() };
      }

      orders
        .filter(o => {
          const date = new Date(o.created_at);
          return date >= startOfWeek && date <= endOfWeek;
        })
        .forEach(o => {
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

  async function fetchRecentOrders(sId) {
    // Calculate yesterday's date range: yesterday 00:00 <= created_at < today 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStart = new Date(today);

    let query = supabase
      .from("orders")
      .select("id, status, gross_amount, created_at, customers(name)")
      .eq("disabled", false)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(8);

    if (sId) query = query.eq("store_id", sId);

    const { data } = await query;
    if (data) {
      setRecentOrders(data.map(o => ({
        id: o.id,
        customer: o.customers?.name || "Unknown",
        amount: o.gross_amount,
        status: o.status,
        date: new Date(o.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })
      })));
    }
  }

  async function fetchStoreSales() {
    const { data: orders } = await supabase.from("orders").select("gross_amount, store_id").eq("disabled", false);
    const { data: storesData } = await supabase.from("store").select("id, name");

    if (orders && storesData) {
      const storeMap = {};
      storesData.forEach(s => storeMap[s.id] = { name: s.name, value: 0 });
      
      orders.forEach(o => {
        if (o.store_id && storeMap[o.store_id]) {
          storeMap[o.store_id].value += Number(o.gross_amount || 0);
        }
      });

      const totalRevenue = Object.values(storeMap).reduce((sum, s) => sum + s.value, 0);
      const formatted = Object.values(storeMap)
        .filter(s => s.value > 0)
        .map((s, i) => ({
          ...s,
          percentage: totalRevenue > 0 ? Math.round((s.value / totalRevenue) * 100) : 0,
          color: COLORS[i % COLORS.length]
        }))
        .sort((a, b) => b.value - a.value);
      setStoreSales(formatted);
    }
  }

  async function fetchTopProducts(sId) {
    let query = supabase
      .from("products_list")
      .select("name, price, sales, products_category(name)")
      .order("sales", { ascending: false });

    if (sId) query = query.eq("store_id", sId);

    const { data } = await query;
    if (data) {
      setTopProducts(data.slice(0, 5).map(p => ({
        name: p.name,
        category: p.products_category?.name || "General",
        sales: p.sales || 0,
        revenue: (p.sales || 0) * (p.price || 0),
        trend: "up"
      })));

      // Process Frame Shapes
      const shapes = ["Aviator", "Wayfarer", "Round", "Rectangle", "Square", "Cat Eye", "Oval", "Clubmaster", "Geometric"];
      const shapeMap = {};
      
      data.forEach(p => {
        const name = p.name || "";
        const foundShape = shapes.find(s => name.toLowerCase().includes(s.toLowerCase())) || "Other";
        if (!shapeMap[foundShape]) shapeMap[foundShape] = { name: foundShape, sales: 0, revenue: 0 };
        shapeMap[foundShape].sales += (p.sales || 0);
        shapeMap[foundShape].revenue += (p.sales || 0) * (p.price || 0);
      });

      const formattedShapes = Object.values(shapeMap)
        .filter(s => s.sales > 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      setTopShapes(formattedShapes);
    }

    let catQuery = supabase
      .from("products_list")
      .select("sales, products_category(name)");
    
    if (sId) catQuery = catQuery.eq("store_id", sId);

    const { data: catData } = await catQuery;
    if (catData) {
      const catMap = {};
      catData.forEach(p => {
        const cat = p.products_category?.name || "General";
        catMap[cat] = (catMap[cat] || 0) + (p.sales || 0);
      });
      
      const totalSales = catData.reduce((sum, p) => sum + (p.sales || 0), 0);
      const formattedCats = Object.entries(catMap)
        .map(([name, val], i) => ({
          name,
          value: totalSales > 0 ? Math.round((val / totalSales) * 100) : 0,
          color: COLORS[i % COLORS.length]
        }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value);

      setCategoryData(formattedCats);
    }
  }

  const formatCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${Number(val).toLocaleString()}`;
  };

  const sharedBarSize = 30;
  const revenueChartData = useMemo(
    () => revenueData.filter((d) => d.revenue > 0 || d.orders > 0),
    [revenueData]
  );
  const todayOrdersChartData = useMemo(
    () => todayOrdersData.filter((d) => d.orders > 0),
    [todayOrdersData]
  );

  const isRevenueDataEmpty = useMemo(() => revenueData.every(d => d.revenue === 0 && d.orders === 0), [revenueData]);
  const isWeeklyDataEmpty = useMemo(() => weeklyOrdersData.every(d => d.orders === 0), [weeklyOrdersData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Role-based Header / Store Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">
            Dashboard
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
            {isSuperAdmin ? "System-wide Overview" : (selectedStoreId ? `Managing: ${stores.find(s => s.id === selectedStoreId)?.name}` : "Workspace Center")}
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
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg">
            <MapPin size={16} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-widest">{stores.find(s => s.id === selectedStoreId)?.name || "Store Manager"}</span>
          </div>
        )}
      </div>

      {/* Stats - Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Revenue Today" value={formatCurrency(stats.revenueToday)} trend={`${stats.trendRevenueToday}%`} up={parseFloat(stats.trendRevenueToday) >= 0} loading={loading} />
        <StatCard label="30D Revenue" value={formatCurrency(stats.revenueLast30Days)} trend="Historical" isComparison={false} loading={loading} />
        <StatCard label="Orders Today" value={stats.ordersToday.toLocaleString()} trend={`${stats.trendOrdersToday}%`} up={parseFloat(stats.trendOrdersToday) >= 0} loading={loading} />
        <StatCard label="This Month Revenue" value={formatCurrency(stats.revenueThisMonth)} trend={`${stats.trendRevenueMonth}%`} up={parseFloat(stats.trendRevenueMonth) >= 0} loading={loading} />
      </div>

      {/* Revenue & Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart - 50% width on large screens */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Revenue Overview</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">12 Month Performance</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-black animate-pulse" />
          </div>
          
          <div className="flex-1 w-full overflow-hidden relative min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[10px] font-black text-gray-400 uppercase tracking-widest">Synthesizing...</div>
            ) : isRevenueDataEmpty ? (
              <NoDataOverlay message="No Revenue Data Found" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={24}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f1f1" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 900, fill: "#000" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="revenue" tick={{ fontSize: 9, fontWeight: 700, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                  <Bar dataKey="revenue" fill="#000" radius={[4, 4, 0, 0]} yAxisId="revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Distribution Chart - 1/3 width */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-[450px]">
          <div className="mb-8">
            <h3 className="font-black text-black text-lg uppercase tracking-tight">
              {isSuperAdmin && selectedStoreId === "All" ? "Store Share" : "Category Share"}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Revenue Distribution</p>
          </div>
          
          <div className="flex-1 w-full relative min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Calculating...</div>
            ) : (isSuperAdmin && selectedStoreId === "All" ? storeSales.length === 0 : categoryData.length === 0) ? (
              <NoDataOverlay message="No Share Data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={isSuperAdmin && selectedStoreId === "All" ? storeSales : categoryData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }} barSize={16}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: "#000" }} axisLine={false} tickLine={false} width={170} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                  <Bar dataKey="value" fill="#000" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Grid for small charts and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today Hourly Performance */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Hourly Pulse</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Today Order Velocity</p>
            </div>
            <div className="px-2 py-1 bg-black text-white text-[9px] font-black uppercase rounded">Live</div>
          </div>
          <div className="flex-1 w-full relative">
            {todayOrdersChartData.length === 0 ? (
              <NoDataOverlay message="No Order Activity Today" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayOrdersChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f1f1" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 8, fontWeight: 900, fill: "#000" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9f9f9' }} />
                  <Bar dataKey="orders" fill="#000" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-[400px] flex flex-col">
          <div className="mb-6">
            <h3 className="font-black text-black text-lg uppercase tracking-tight">Order Pipeline</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Today's Lifecycle</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2">
            {statusData.map((s) => (
              <div key={s.name} className="flex flex-col p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-black transition-colors group">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 group-hover:text-black">{s.name}</span>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-black text-black">{s.value}</span>
                  <div className="h-1.5 w-8 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-black" style={{ width: `${(s.value / (statusData.reduce((a,b)=>a+b.value,0)||1))*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        {/* Today's Transactions */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-black text-lg uppercase tracking-tight text-outline-black">Today's Flow</h3>
            <button className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black">Full Ledger</button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Value</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayOrderHistory.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 bg-black rounded-2xl mb-3 shadow-lg transform rotate-3 inline-block">
                          <LayoutDashboard size={24} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                          No transactions recorded today
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  todayOrderHistory.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase">{o.time}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-black">{o.customer}</td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-black tracking-tight">₹{o.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">{statusBadge(o.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Yesterday's Ledger */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-black text-black text-lg uppercase tracking-tight">Past 24H</h3>
            <button className="text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black">Archive</button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Value</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-4 bg-black rounded-2xl mb-3 shadow-lg transform rotate-3 inline-block">
                          <LayoutDashboard size={24} className="text-white" />
                        </div>
                        <p className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                          No orders in the past 24 hours
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[10px] font-black text-gray-400">#{o.id.substring(0, 6)}</td>
                      <td className="px-6 py-4 text-[11px] font-bold text-black">{o.customer}</td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-black tracking-tight">₹{o.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">{statusBadge(o.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}




