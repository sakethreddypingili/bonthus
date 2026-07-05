import { useState, useEffect, useCallback } from "react";
import { supabase } from "../server/supabase/supabase";
import {
  FlaskConical, Package, ClipboardList, BarChart2,
  Plus, X, CheckCircle, RefreshCw, Search, AlertCircle, ArrowRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const TABS = ["Packing Requests", "Stock", "Analytics"];
const TAB_ICONS = { "Stock": Package, "Packing Requests": ClipboardList, "Analytics": BarChart2 };

const STATUS_CONFIG = {
  pending:     { label: "Pending",     color: "bg-amber-100 text-amber-800",    dot: "bg-amber-500" },
  received:    { label: "Received",    color: "bg-blue-100 text-blue-800",       dot: "bg-blue-500" },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-800",   dot: "bg-purple-500" },
  ready:       { label: "Ready",       color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  dispatched:  { label: "Dispatched",  color: "bg-gray-100 text-gray-600",       dot: "bg-gray-400" },
};

const STATUS_FLOW = ["pending", "received", "in_progress", "ready", "dispatched"];
const CHART_COLORS = ["#000000", "#374151", "#6B7280", "#9CA3AF", "#D1D5DB"];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── STOCK TAB ────────────────────────────────────────────────────────────────
function StockTab({ userProfile }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("all");

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      setCategories(catData || []);

      let query = supabase
        .from("products")
        .select(`id, name, sku, brand, base_price, category:categories(id, name)`)
        .order("name");

      if (selectedCat !== "all") {
        query = query.eq("category_id", selectedCat);
      }

      const { data, error } = await query;
      if (error) throw error;

      const { data: invData } = await supabase
        .from("store_inventory")
        .select("product_id, stock_quantity");

      const invMap = {};
      (invData || []).forEach(i => {
        invMap[i.product_id] = (invMap[i.product_id] || 0) + i.stock_quantity;
      });

      setProducts((data || []).map(p => ({ ...p, totalStock: invMap[p.id] || 0 })));
    } catch (err) {
      console.error("Error fetching lab stock:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCat]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products, barcode, brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-black bg-white transition-all"
          />
        </div>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-black transition-all"
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={fetchStock}
          className="px-4 py-3 border border-gray-200 rounded-xl hover:border-black hover:bg-black hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading stock...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl">
          <Package size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No products found</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-gray-100 rounded-2xl">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["Barcode", "Name", "Brand", "Category", "Price", "Total Stock"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono text-[10px] text-gray-500">{p.sku || "—"}</td>
                  <td className="px-5 py-4 text-xs font-black uppercase tracking-tight text-black">{p.name}</td>
                  <td className="px-5 py-4 text-xs font-bold text-gray-600">{p.brand || "—"}</td>
                  <td className="px-5 py-4 text-[10px] font-bold text-gray-500">{p.category?.name || "—"}</td>
                  <td className="px-5 py-4 text-xs font-black text-black">₹{p.base_price?.toLocaleString() || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                      p.totalStock === 0 ? "bg-red-50 text-red-600" :
                      p.totalStock <= 5 ? "bg-amber-50 text-amber-700" :
                      "bg-emerald-50 text-emerald-700"
                    }`}>
                      {p.totalStock} units
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PACKING REQUESTS TAB ─────────────────────────────────────────────────────
const EMPTY_FORM = {
  customer_name: "", customer_phone: "", store_id: "",
  lens_type: "", coating: "", frame_details: "", notes: "",
  power_details: {
    sph_re: "", cyl_re: "", axis_re: "",
    sph_le: "", cyl_le: "", axis_le: "",
    add_re: "", add_le: ""
  }
};

function PackingRequestsTab({ userProfile }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stores, setStores] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  const showNotif = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("lab_packing_requests")
        .select(`*, stores(name)`)
        .order("requested_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching packing requests:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    supabase.from("stores").select("id, name").order("name").then(({ data }) => setStores(data || []));
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lab_packing_requests").insert([{
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        store_id: form.store_id || null,
        lens_type: form.lens_type,
        coating: form.coating,
        frame_details: form.frame_details,
        notes: form.notes,
        power_details: form.power_details,
        requested_by: userProfile?.id || null,
        status: "pending",
      }]);
      if (error) throw error;
      showNotif("Packing request created!");
      setShowDrawer(false);
      setForm(EMPTY_FORM);
      fetchRequests();
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStatus = async (req) => {
    const currentIdx = STATUS_FLOW.indexOf(req.status);
    if (currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    setUpdatingId(req.id);
    try {
      const updates = { status: nextStatus, updated_at: new Date().toISOString() };
      if (nextStatus === "dispatched") updates.dispatched_at = new Date().toISOString();
      const { error } = await supabase.from("lab_packing_requests").update(updates).eq("id", req.id);
      if (error) throw error;
      showNotif(`Marked as ${STATUS_CONFIG[nextStatus].label}`);
      fetchRequests();
    } catch (err) {
      showNotif(err.message, "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const setPower = (field, val) => setForm(f => ({ ...f, power_details: { ...f.power_details, [field]: val } }));

  const statusCounts = STATUS_FLOW.reduce((acc, s) => { acc[s] = requests.filter(r => r.status === s).length; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Status Pills */}
      <div className="grid grid-cols-5 gap-3">
        {STATUS_FLOW.map(s => {
          const cfg = STATUS_CONFIG[s];
          const isActive = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(isActive ? "all" : s)}
              className={`p-3 rounded-2xl border text-center transition-all ${isActive ? "border-black bg-black text-white" : "border-gray-100 bg-white hover:border-gray-300"}`}>
              <p className={`text-lg font-black ${isActive ? "text-white" : "text-black"}`}>{statusCounts[s]}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest ${isActive ? "text-gray-300" : "text-gray-400"}`}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {statusFilter === "all" ? `All Requests (${requests.length})` : `${STATUS_CONFIG[statusFilter].label} (${requests.length})`}
        </p>
        <div className="flex gap-2">
          <button onClick={fetchRequests} className="p-2 rounded-xl border border-gray-200 hover:border-black transition-all">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setShowDrawer(true); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg">
            <Plus size={13} strokeWidth={3} /> New Request
          </button>
        </div>
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="py-20 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-gray-200 rounded-2xl">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No packing requests</p>
          <p className="text-[10px] text-gray-300 mt-1">Click "+ New Request" to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const canAdvance = STATUS_FLOW.indexOf(req.status) < STATUS_FLOW.length - 1;
            const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(req.status) + 1];
            const pd = req.power_details || {};
            const dateStr = new Date(req.requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const timeStr = new Date(req.requested_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

            return (
              <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-all shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-black">{req.customer_name}</p>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">{req.customer_phone || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={req.status} />
                    {canAdvance && (
                      <button disabled={updatingId === req.id} onClick={() => advanceStatus(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-black hover:bg-black hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40">
                        {updatingId === req.id
                          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <ArrowRight size={11} strokeWidth={3} />}
                        {STATUS_CONFIG[nextStatus]?.label}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "Lens Type", value: req.lens_type },
                    { label: "Coating", value: req.coating },
                    { label: "Store", value: req.stores?.name },
                    { label: "Requested", value: dateStr, sub: timeStr },
                  ].map(d => (
                    <div key={d.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{d.label}</p>
                      <p className="font-black text-black">{d.value || "—"}</p>
                      {d.sub && <p className="text-[9px] text-gray-400 mt-0.5">{d.sub}</p>}
                    </div>
                  ))}
                </div>

                {(pd.sph_re || pd.sph_le) && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-5 bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {["Eye", "SPH", "CYL", "AXIS", "ADD"].map(h => (
                        <div key={h} className="px-3 py-2">{h}</div>
                      ))}
                    </div>
                    {[
                      { label: "RE", keys: ["sph_re", "cyl_re", "axis_re", "add_re"] },
                      { label: "LE", keys: ["sph_le", "cyl_le", "axis_le", "add_le"] },
                    ].map(eye => (
                      <div key={eye.label} className="grid grid-cols-5 border-t border-gray-50 text-xs font-mono">
                        <div className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase">{eye.label}</div>
                        {eye.keys.map(k => (
                          <div key={k} className="px-3 py-2 text-center text-gray-700">{pd[k] || "—"}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {(req.frame_details || req.notes) && (
                  <div className="flex flex-wrap gap-4 text-[10px] text-gray-500">
                    {req.frame_details && <span><strong className="font-black text-gray-700">Frame:</strong> {req.frame_details}</span>}
                    {req.notes && <span><strong className="font-black text-gray-700">Notes:</strong> {req.notes}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col" style={{ animation: "slideInRight 0.25s ease-out" }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-black">New Packing Request</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Fill in lens and customer details</p>
              </div>
              <button onClick={() => setShowDrawer(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
              {/* Customer */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                <input required type="text" placeholder="Customer Name *" value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all" />
                <input type="tel" placeholder="Phone Number" value={form.customer_phone}
                  onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all" />
                <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-black transition-all">
                  <option value="">Select Store (Optional)</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Power Details */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Power Details</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-5 bg-gray-50 border-b border-gray-100">
                    {["Eye", "SPH", "CYL", "AXIS", "ADD"].map(h => (
                      <div key={h} className="px-3 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</div>
                    ))}
                  </div>
                  {[
                    { label: "RE", fields: [["sph_re","±0.00"], ["cyl_re","±0.00"], ["axis_re","0°"], ["add_re","+ADD"]] },
                    { label: "LE", fields: [["sph_le","±0.00"], ["cyl_le","±0.00"], ["axis_le","0°"], ["add_le","+ADD"]] },
                  ].map(eye => (
                    <div key={eye.label} className="grid grid-cols-5 border-t border-gray-50">
                      <div className="px-3 py-2 flex items-center text-[10px] font-black text-gray-600 uppercase">{eye.label}</div>
                      {eye.fields.map(([key, ph]) => (
                        <input key={key} type="text" placeholder={ph} value={form.power_details[key]}
                          onChange={e => setPower(key, e.target.value)}
                          className="px-2 py-2 text-[11px] font-mono focus:outline-none focus:bg-gray-50 border-l border-gray-100 text-center transition-all" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lens & Frame */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lens & Frame</p>
                <input type="text" placeholder="Lens Type (e.g. CR-39, Trivex, Hi-Index 1.67)" value={form.lens_type}
                  onChange={e => setForm(f => ({ ...f, lens_type: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all" />
                <input type="text" placeholder="Coating (e.g. Anti-Glare, Blue Cut, UV400)" value={form.coating}
                  onChange={e => setForm(f => ({ ...f, coating: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all" />
                <input type="text" placeholder="Frame Details (brand, model, size)" value={form.frame_details}
                  onChange={e => setForm(f => ({ ...f, frame_details: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all" />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</p>
                <textarea rows={3} placeholder="Any special instructions..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-black transition-all resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDrawer(false)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest hover:border-black transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg disabled:opacity-50">
                  {submitting ? "Creating..." : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400]">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${
            notification.type === "success" ? "bg-black text-white" : "bg-red-50 border border-red-100 text-red-600"
          }`}>
            {notification.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("lab_packing_requests")
          .select("status, requested_at, dispatched_at, store_id, stores(name)")
          .order("requested_at", { ascending: false });
        setAllRequests(data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statusDist = STATUS_FLOW.map(s => ({
    name: STATUS_CONFIG[s].label,
    value: allRequests.filter(r => r.status === s).length,
  })).filter(d => d.value > 0);

  const today = new Date();
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: label,
      Created: allRequests.filter(r => r.requested_at?.startsWith(dateStr)).length,
      Dispatched: allRequests.filter(r => r.dispatched_at?.startsWith(dateStr)).length,
    };
  });

  const dispatched = allRequests.filter(r => r.dispatched_at && r.requested_at);
  const avgTurnaround = dispatched.length > 0
    ? (dispatched.reduce((sum, r) => sum + (new Date(r.dispatched_at) - new Date(r.requested_at)) / (1000 * 60 * 60), 0) / dispatched.length).toFixed(1)
    : null;

  const storeData = Object.values(
    allRequests.reduce((acc, r) => {
      const name = r.stores?.name || "Unknown";
      acc[name] = acc[name] || { name, count: 0 };
      acc[name].count++;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const total = allRequests.length;

  const KPI_CARDS = [
    { label: "Total Jobs", value: total },
    { label: "Pending", value: allRequests.filter(r => r.status === "pending").length, warn: true },
    { label: "In Pipeline", value: allRequests.filter(r => ["in_progress", "received", "ready"].includes(r.status)).length },
    { label: "Dispatched", value: dispatched.length },
    { label: "Avg. Turnaround", value: avgTurnaround ? `${avgTurnaround}h` : "—" },
  ];

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {KPI_CARDS.map(k => (
          <div key={k.label} className={`bg-white rounded-2xl border p-5 shadow-sm ${k.warn && k.value > 5 ? "border-amber-200" : "border-gray-100"}`}>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{k.label}</p>
            <p className={`text-2xl font-black tracking-tighter ${k.warn && k.value > 5 ? "text-amber-600" : "text-black"}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Daily Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-black mb-5">Daily Jobs — Last 14 Days</h3>
          {dailyData.every(d => d.Created === 0 && d.Dispatched === 0) ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400 font-bold uppercase tracking-widest">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: "#9CA3AF" }} />
                <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#9CA3AF" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.15)", fontSize: 11 }} />
                <Bar dataKey="Created" fill="#000000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dispatched" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-black mb-5">Status Distribution</h3>
          {statusDist.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400 font-bold uppercase tracking-widest">No data yet</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {statusDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.15)", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusDist.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-gray-600">{d.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-black">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {storeData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-black mb-5">Jobs by Store</h3>
          <div className="space-y-3">
            {storeData.map(s => (
              <div key={s.name} className="flex items-center gap-4">
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight w-36 flex-shrink-0 truncate">{s.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-all"
                    style={{ width: total > 0 ? `${(s.count / total) * 100}%` : "0%" }} />
                </div>
                <span className="text-[10px] font-black text-black w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN LABS PAGE ───────────────────────────────────────────────────────────
export default function Labs({ userProfile }) {
  const [activeTab, setActiveTab] = useState("Packing Requests");

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <FlaskConical size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-black tracking-tighter uppercase">Labs</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Packing Requests · Stock · Analytics</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = TAB_ICONS[tab];
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? "bg-black text-white shadow-md" : "text-gray-500 hover:text-black"
              }`}>
              <Icon size={13} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "Stock" && <StockTab userProfile={userProfile} />}
        {activeTab === "Packing Requests" && <PackingRequestsTab userProfile={userProfile} />}
        {activeTab === "Analytics" && <AnalyticsTab userProfile={userProfile} />}
      </div>
    </div>
  );
}
