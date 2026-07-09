import { useState, useEffect } from "react";
import { 
  Package, ArrowRightLeft, Truck, AlertCircle, 
  Search, CheckCircle2, X, Plus, Filter, Download,
  ChevronLeft, ChevronRight, Eye, Warehouse as WarehouseIcon
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";

export default function Dashboard({ userProfile }) {
  const [stats, setStats] = useState([
    { label: "Total Units Stored", value: "0", icon: Package },
    { label: "Active Logistics", value: "0", icon: ArrowRightLeft },
    { label: "Shipment", value: "0", icon: Truck },
    { label: "Low Stock Alerts", value: "0", icon: AlertCircle },
  ]);
  const [deficits, setDeficits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // 1. Total Units Stored
        const { data: inventoryData } = await supabase
          .from("store_inventory")
          .select("stock_quantity, low_stock_threshold, product:products(name, id)");
        
        const totalUnits = inventoryData?.reduce((sum, item) => sum + (item.stock_quantity || 0), 0) || 0;
        const lowStockCount = inventoryData?.filter(item => item.stock_quantity <= item.low_stock_threshold).length || 0;

        // 2. Active Logistics (Store Requisitions)
        const { count: activeLogistics } = await supabase
          .from("store_requisitions")
          .select("*", { count: 'exact', head: true })
          .in('status', ['pending', 'processing']);

        // 3. Shipments
        const { count: activeShipments } = await supabase
          .from("shipments")
          .select("*", { count: 'exact', head: true })
          .in('status', ['Scheduled', 'In Transit']);

        setStats([
          { label: "Total Units Stored", value: totalUnits.toLocaleString(), icon: Package },
          { label: "Active Logistics", value: (activeLogistics || 0).toString(), icon: ArrowRightLeft },
          { label: "Shipment", value: (activeShipments || 0).toString(), icon: Truck },
          { label: "Low Stock Alerts", value: lowStockCount.toString(), icon: AlertCircle },
        ]);

        // 4. Inventory Deficits
        const deficitItems = inventoryData
          ?.filter(item => item.stock_quantity <= item.low_stock_threshold)
          .map(item => ({
            id: item.product?.id || 'Unknown',
            name: item.product?.name || 'Unknown Product',
            stock: item.stock_quantity,
            minStock: item.low_stock_threshold
          }))
          .slice(0, 6) || [];
        
        setDeficits(deficitItems);

      } catch (err) {
        console.error("Error fetching dashboard data:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
        Syncing Hub Operations...
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 animate-fast-slide px-3 sm:px-0">

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black group">
            <div className="flex justify-between items-start mb-3 sm:mb-6">
              <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.label}</p>
              <s.icon size={18} className="sm:w-5 sm:h-5 text-gray-300 group-hover:text-black" strokeWidth={3} />
            </div>
            <div className="text-2xl sm:text-4xl font-black text-black tracking-tighter">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Critical Insight Grid */}
      <div className="bg-white rounded-2xl sm:rounded-[40px] p-4 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 border-b border-gray-50 pb-3 sm:pb-6 gap-2">
          <div>
            <h3 className="text-base sm:text-xl font-black text-black uppercase tracking-tight sm:tracking-tighter">Inventory Deficits</h3>
            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 sm:mt-1">Items Below Safety Threshold</p>
          </div>
          <button className="text-[9px] sm:text-[10px] font-black text-black uppercase tracking-widest border-b-2 border-black hover:opacity-70 transition-opacity">Manage Stock</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          {deficits.length > 0 ? deficits.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 sm:p-6 bg-gray-50 rounded-xl sm:rounded-3xl border border-gray-100 hover:border-black transition-all">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-[11px] sm:text-[14px] font-black text-black uppercase tracking-tight truncate">{item.name}</p>
                <p className="text-[8px] sm:text-[10px] font-mono text-gray-400 mt-0.5 sm:mt-1 uppercase tracking-widest truncate">{item.id}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg sm:text-2xl font-black text-black tracking-tighter">{item.stock} <span className="text-[8px] sm:text-[10px] text-gray-400 uppercase">/ Min {item.minStock}</span></p>
                <span className="inline-block mt-0.5 sm:mt-1 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-black border-b border-black">Critical State</span>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-8 sm:py-12 text-center text-[9px] sm:text-[10px] font-black text-gray-300 uppercase tracking-widest">
              No Deficits Detected in Registry
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

