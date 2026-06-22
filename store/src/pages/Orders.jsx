import { useState, useEffect, useCallback } from "react";
import { Search, Plus, MapPin, Eye, Edit2, Lock, Download, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";
import CommandDialog from "../components/common/CommandDialog";
import ConfirmSheet from "../components/common/ConfirmSheet";
import { usePopup } from "../components/common/PopupProvider";

const STATUS_COLORS = {
  Delivered: "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
  Advance: "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
  Due: "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
  Processing: "bg-gray-100 text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
  Cancelled: "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
};

const STATUSES = ["All", "Due", "Processing", "Delivered"];

export default function Orders({ userProfile }) {
  const { showAlert } = usePopup();
  const [dbOrders, setDbOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedStore, setSelectedStore] = useState("All");
  const [editingOrder, setEditingOrder] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerMobile, setCustomerMobile] = useState('');
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [searchedProfiles, setSearchedProfiles] = useState([]);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
    setCustomerMobile('');
    setSearchedProfiles([]);
    setSearchAttempted(false);
  };
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState([{ id: Date.now(), mode: 'Cash', amount: '' }]);
  const [clearingBalance, setClearingBalance] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [selectedOrderForAction, setSelectedOrderForAction] = useState(null);
  const [disableAction, setDisableAction] = useState('disable');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const perPage = 25;
  const navigate = useNavigate();

  const roleLower = userProfile?.role?.toLowerCase();
  const isSuperAdmin = roleLower === 'super_admin';
  const isAdmin = roleLower === 'admin' || isSuperAdmin;
  const canEditOrder = isAdmin || roleLower === 'store_manager';

  const [stores, setStores] = useState([]);

  useEffect(() => {
    // For non-admins, lock selectedStore to their primary store
    if (userProfile && !isAdmin) {
      setSelectedStore(userProfile.store_id || 'All');
    }
  }, [userProfile, isAdmin]);

  useEffect(() => {
    fetchStores();
  }, []);

  async function fetchStores() {
    try {
      const { data, error } = await supabase.from('store').select('*').order('name');
      if (!error && data) {
        setStores(data);
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
    }
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const table = "orders";
      let query = supabase
        .from(table)
        .select(`
          id,
          created_at,
          status,
          net_amount,
          due_amount,
          store_id,
          disabled,
          customers ( * ),
          order_items ( id, quantity, unit_price, discount_amount, total_price, products ( name ) ),
          prescriptions ( * )
        `)
        .order('created_at', { ascending: false });

      // Store filtering: admins see all stores (or selected), managers see only their store
      if (!isAdmin && userProfile?.store_id) {
        query = query.eq('store_id', userProfile.store_id);
      } else if (isAdmin && selectedStore && selectedStore !== 'All') {
        query = query.or(`store_id.eq.${selectedStore},store_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = data.map(o => {
        const productNames = o.order_items?.map(item => item.products?.name).join(', ') || 'Custom Order';
        
        // Calculate the inclusive total: (Qty * Price) - Discount
        const calculatedTotal = o.order_items?.reduce((sum, item) => {
          const lineTotal = (Number(item.quantity || 0) * Number(item.unit_price || 0)) - Number(item.discount_amount || 0);
          return sum + lineTotal;
        }, 0);

        // Detect material difference for legacy orders (more than 1 rupee delta)
        const net = Number(o.net_amount || 0);
        const finalAmount = Math.abs(calculatedTotal - net) > 1.5 ? net : calculatedTotal;
        
        return {
          ...o,
          status: o.status === 'Advance' ? 'Due' : o.status,
          store_id: o.store_id,
          disabled: o.disabled ?? false,
          customer_name: o.customers?.name || 'Unknown User',
          product_name: productNames,
          // Round for a clean UI display
          amount: Math.round(finalAmount > 0 ? finalAmount : net),
          date: new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        };
      });

      setDbOrders(mapped);
    } catch (err) {
      console.error("Error fetching orders:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedStore, userProfile?.store_id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const table = "orders";
      if (!isAdmin && userProfile?.store_id && editingOrder.store_id && editingOrder.store_id !== userProfile.store_id) {
        throw new Error('Not authorized to edit orders from other stores.');
      }

      const updateData = {
        status: Number(editingOrder.due_amount) > 0 ? 'Due' : editingOrder.status,
        due_amount: Number(editingOrder.due_amount) || 0,
      };

      // Only admins can edit net_amount
      if (isAdmin) {
        updateData.net_amount = Number(editingOrder.amount) || 0;
      }

      let q = supabase
        .from(table)
        .update(updateData)
        .eq('id', editingOrder.id);

      if (!isAdmin && userProfile?.store_id) {
        q = q.eq('store_id', userProfile.store_id);
      }

      const { error } = await q;

      if (error) throw error;
      setEditingOrder(null);
      fetchOrders();
    } catch (err) {
      showAlert("Error saving edit: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLookupCustomer = async (e) => {
    e.preventDefault();
    if (!customerMobile) return;

    setLoadingCustomer(true);
    setSearchAttempted(true);
    try {
      const { data: matchedCustomers, error: primaryError } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', customerMobile.trim());

      if (primaryError) throw primaryError;

      if (matchedCustomers && matchedCustomers.length > 0) {
        const primaryData = matchedCustomers.find(c => !c.parent_id);
        let dependentsData = [];

        if (primaryData) {
          const { data: deps, error: dependentsError } = await supabase
            .from('customers')
            .select('*')
            .eq('parent_id', primaryData.id);
          if (dependentsError) throw dependentsError;
          dependentsData = deps || [];
        }

        const profileMap = new Map();
        matchedCustomers.forEach(c => {
          profileMap.set(c.id, {
            ...c,
            label: c.parent_id ? `Dependent (${c.relationship || "Family"})` : "Primary Profile"
          });
        });

        dependentsData.forEach(c => {
          if (!profileMap.has(c.id)) {
            profileMap.set(c.id, {
              ...c,
              label: `Dependent (${c.relationship || "Family"})`
            });
          }
        });

        setSearchedProfiles(Array.from(profileMap.values()));
      } else {
        setSearchedProfiles([]);
      }
    } catch (err) {
      showAlert("Error looking up customer: " + err.message);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const filtered = dbOrders.filter(o => {
    // Non-admins don't see disabled orders
    if (!isAdmin && o.disabled) return false;
    
    const matchSearch = !search ||
      (o.id && o.id.toLowerCase().includes(search.toLowerCase())) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.product_name && o.product_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = status === "All" || o.status === status;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const statusCounts = STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = dbOrders.filter(o => o.status === s && !o.disabled).length;
    return acc;
  }, {});

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Exclude disabled orders from metrics
  const todayOrdersCount = dbOrders.filter(o => {
    const d = new Date(o.created_at);
    return d >= startOfToday && !o.disabled;
  }).length;

  const monthOrdersCount = dbOrders.filter(o => {
    const d = new Date(o.created_at);
    return d >= startOfMonth && !o.disabled;
  }).length;

  // Exclude disabled orders from total count
  const totalActiveOrders = dbOrders.filter(o => !o.disabled).length;

  const currentCards = [
    { label: "Active Orders", value: totalActiveOrders, color: "text-black" },
    { label: "Today Volume", value: todayOrdersCount, color: "text-black" },
    { label: "Monthly Flow", value: monthOrdersCount, color: "text-black" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Orders</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Transaction Ledger & Fulfillment</p>
        </div>
        <button onClick={() => setShowCustomerModal(true)} className="px-6 py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-2">
          <Plus size={16} strokeWidth={3} /> New Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {currentCards.map(c => (
          <div key={c.label} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black/5 transition-all duration-300">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">{c.label}</p>
            <div className={`text-4xl font-black ${c.color} tracking-tighter`}>{loading ? "..." : c.value}</div>
          </div>
        ))}

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-black/5 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">Store Access</p>
            <div className="relative group/select">
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full appearance-none bg-transparent text-xl font-black text-black uppercase focus:outline-none cursor-pointer pr-8 tracking-tight"
                disabled={!isAdmin}
              >
                {isAdmin
                  ? (
                    <>
                      <option value="All">All Entities</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </>
                  )
                  : <option value={userProfile?.store_id || 'All'}>{stores.find(s => s.id === userProfile?.store_id)?.name || 'Local Store'}</option>
              }
              </select>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={20} className="text-black" />
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <MapPin size={64} />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 px-6 py-6 border-b border-gray-50">
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${status === s
                  ? "bg-black text-white shadow-lg scale-105"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-black"
                }`}
              >
                {s}
                {s !== "All" && <span className="ml-2 opacity-50">{statusCounts[s] || 0}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="relative group flex-1 sm:flex-none">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Lookup Order..."
                className="pl-11 pr-4 py-2.5 text-[11px] font-black uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-full sm:w-64 transition-all"
              />
            </div>
            <button className="p-2.5 rounded-xl border border-gray-100 text-black hover:bg-black hover:text-white transition-all">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Inventory</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Timeline</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Value</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map(o => (
                <tr key={o.id} className={`hover:bg-gray-50/50 transition-colors group ${o.disabled ? 'opacity-40 grayscale' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-black">#{o.id.slice(0, 8)}</span>
                      {o.disabled && <Lock size={12} className="text-black" />}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[11px] font-black uppercase text-black tracking-tight">{o.customer_name}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase truncate block max-w-[150px]">{o.product_name}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-black text-gray-400 uppercase">{o.date}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[11px] font-black text-black">₹{o.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`${o.disabled ? 'bg-black text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase' : (STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600")}`}>
                      {o.disabled ? 'Disabled' : o.status}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button disabled={o.disabled} onClick={() => navigate(`/invoice/${o.id}`, { state: { order: o } })} className="p-2 rounded-lg bg-black text-white shadow-lg hover:scale-110 transition-all disabled:opacity-20" title="View Details">
                        <Eye size={14} strokeWidth={3} />
                      </button>
                      {canEditOrder && (
                        <button onClick={() => setEditingOrder(o)} className="p-2 rounded-lg border border-black text-black hover:bg-black hover:text-white transition-all" title="Quick Edit">
                          <Edit2 size={14} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Search size={32} className="text-gray-200" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-6 border-t border-gray-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Index {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-gray-100 text-black hover:bg-black hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${page === n ? "bg-black text-white shadow-lg scale-110" : "text-gray-400 hover:text-black hover:bg-gray-50"
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-gray-100 text-black hover:bg-black hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals - Simplified & Monochromatic */}
      <CommandDialog
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        title="Modify Record"
        subtitle={editingOrder ? `Ref: ${editingOrder.id.slice(0,12)}` : ''}
      >
        {editingOrder && (
            <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Entity</label>
                <input 
                  disabled={!isAdmin || editingOrder.disabled} 
                  required 
                  type="text" 
                  value={editingOrder.customer_name} 
                  onChange={e => setEditingOrder({ ...editingOrder, customer_name: e.target.value })} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all disabled:opacity-50" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fulfillment</label>
                  <select 
                    disabled={Number(editingOrder.due_amount) > 0}
                    value={editingOrder.status}
                    onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all appearance-none"
                  >
                    {(Number(editingOrder.due_amount) > 0 || editingOrder.status === 'Due') && (
                      <option value="Due">Pending Due</option>
                    )}
                    <option value="Processing">In Process</option>
                    <option value="Delivered">Completed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Value</label>
                  <input 
                    required 
                    type="number" 
                    disabled={!isAdmin}
                    value={editingOrder.amount} 
                    onChange={e => setEditingOrder({ ...editingOrder, amount: e.target.value })} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all disabled:opacity-50" 
                  />
                </div>
              </div>

              {Number(editingOrder.due_amount) > 0 && (
                <div className="bg-black text-white rounded-2xl p-5 shadow-xl animate-pulse-slow">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Unsettled Balance</p>
                      <p className="text-xl font-black tracking-tighter">₹{Number(editingOrder.due_amount).toLocaleString()}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setPayments([{ id: Date.now(), mode: 'Cash', amount: String(editingOrder.due_amount) }]);
                        setShowPaymentModal(true);
                      }}
                      className="px-4 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                      Clear Now
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingOrder(null)} 
                  className="flex-1 px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  disabled={savingEdit} 
                  className="flex-1 px-4 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50"
                >
                  {savingEdit ? 'Commiting...' : 'Update Record'}
                </button>
              </div>
            </form>
        )}
      </CommandDialog>

      {/* Clear Due Payment Modal */}
      <CommandDialog
        isOpen={showPaymentModal && !!editingOrder}
        onClose={() => setShowPaymentModal(false)}
        title="Payment Collection"
        subtitle="Pending Ledger Balance"
        maxWidth="max-w-lg"
      >
        {editingOrder && (
            <div className="p-8">
              <div className="text-right mb-4 border-b border-gray-100 pb-4">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Balance</span>
                <span className="text-2xl font-black text-black tracking-tighter">₹{Number(editingOrder.due_amount).toLocaleString('en-IN')}</span>
              </div>

              <div className="space-y-4 mb-8">
                {payments.map((p, idx) => (
                  <div key={p.id} className="flex items-end gap-3 group">
                    <div className="flex-1 relative">
                      <label className="block text-[9px] font-black text-gray-400 mb-1.5 uppercase tracking-[0.2em] ml-1">Mode</label>
                      <select
                        value={p.mode}
                        onChange={e => {
                          const newPayments = [...payments];
                          newPayments[idx].mode = e.target.value;
                          setPayments(newPayments);
                        }}
                        className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black appearance-none transition-all text-[11px] font-black uppercase tracking-widest text-black"
                      >
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Card</option>
                        <option>Due</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 bottom-3.5 text-black pointer-events-none" strokeWidth={3} />
                    </div>
                    <div className="flex-[1.5]">
                      <label className="block text-[9px] font-black text-gray-400 mb-1.5 uppercase tracking-[0.2em] ml-1">Value (₹)</label>
                      <input
                        type="number"
                        value={p.amount}
                        onChange={e => {
                          const newPayments = [...payments];
                          newPayments[idx].amount = e.target.value;
                          setPayments(newPayments);
                        }}
                        className="w-full px-5 py-3 border border-gray-100 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-[14px] font-mono font-black text-black"
                        placeholder="0.00"
                        autoFocus={idx === payments.length - 1}
                      />
                    </div>
                    <button
                      onClick={() => setPayments(payments.filter(pay => pay.id !== p.id))}
                      className="p-3 text-gray-300 hover:text-black hover:bg-gray-50 rounded-xl transition-all disabled:opacity-20"
                      disabled={payments.length === 1}
                    >
                      <Trash2 size={18} strokeWidth={3} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setPayments([...payments, { id: Date.now(), mode: 'Cash', amount: '' }])}
                  className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:border-black hover:text-black hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mt-4"
                >
                  <Plus size={16} strokeWidth={3} /> Append Payment Vector
                </button>
              </div>

              <div className="bg-black rounded-3xl p-6 space-y-3 mb-8 shadow-2xl">
                <div className="flex justify-between items-center text-white">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ledger Entry</span>
                  <span className="text-[14px] font-black tracking-widest">₹{payments.filter(p => p.mode !== 'Due').reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-white pt-3 border-t border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Variance</span>
                  <div className={`text-[14px] font-black tracking-widest ${
                    (Number(editingOrder.due_amount) - payments.filter(p => p.mode !== 'Due').reduce((sum, p) => sum + Number(p.amount || 0), 0)) === 0 
                    ? 'text-white' 
                    : 'text-gray-400'
                  }`}>
                    {(Number(editingOrder.due_amount) - payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)) === 0 
                      ? '✓ Fully Settled' 
                      : `₹${(Number(editingOrder.due_amount) - payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)).toLocaleString()}`
                    }
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowPaymentModal(false)} 
                  className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
                >
                  Abort
                </button>
                <button
                  disabled={clearingBalance || payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) <= 0}
                  onClick={async () => {
                    setClearingBalance(true);
                    try {
                      const totalToClear = payments.filter(p => p.mode !== 'Due').reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const newDue = Math.max(0, Number(editingOrder.due_amount) - totalToClear);
                      const newStatus = newDue > 0 ? 'Due' : 'Delivered';
                      const { error } = await supabase
                        .from('orders')
                        .update({ 
                          due_amount: newDue,
                          status: newStatus
                        })
                        .eq('id', editingOrder.id);
                      if (error) throw error;
                      setEditingOrder({ ...editingOrder, due_amount: newDue, status: newStatus });
                      setShowPaymentModal(false);
                      fetchOrders();
                    } catch (err) {
                      showAlert(err.message);
                    } finally {
                      setClearingBalance(false);
                    }
                  }}
                  className="flex-[2] bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                >
                  {clearingBalance ? 'Syncing...' : 'Commit Transaction'}
                </button>
              </div>
            </div>
        )}
      </CommandDialog>

      <CommandDialog
        isOpen={showDisableModal && !!selectedOrderForAction}
        onClose={() => setShowDisableModal(false)}
        title="Order Vector"
        subtitle={selectedOrderForAction ? `Ref: ${selectedOrderForAction.id.slice(0, 12)}` : ''}
      >
        {selectedOrderForAction && (
            <div className="p-8">
              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Directive</label>
                <div className="relative group">
                  <select
                    value={disableAction}
                    onChange={(e) => setDisableAction(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none transition-all cursor-pointer pr-12"
                  >
                    <option value="disable">Archive Entity</option>
                    <option value="enable">Activate Entity</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-black pointer-events-none" strokeWidth={3} />
                </div>
              </div>

              {disableAction === 'disable' && (
                <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200 mt-4">
                  <p className="text-[10px] text-black font-black uppercase tracking-widest leading-relaxed">System Note: Entity will be hidden from operational metrics and counts.</p>
                </div>
              )}

              {disableAction === 'enable' && (
                <div className="bg-black rounded-2xl p-6 shadow-xl mt-4">
                  <p className="text-[10px] text-white font-black uppercase tracking-widest leading-relaxed">System Note: Entity will be restored to full operational visibility.</p>
                </div>
              )}

              <div className="pt-8 flex items-center justify-end gap-3 border-t border-gray-50 mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowDisableModal(false)} 
                  className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(false);
                    setShowConfirmModal(true);
                  }}
                  className="flex-1 bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Proceed
                </button>
              </div>
            </div>
        )}
      </CommandDialog>

      <ConfirmSheet
        isOpen={showConfirmModal && !!selectedOrderForAction}
        onClose={() => setShowConfirmModal(false)}
        icon={disableAction === 'disable' ? Lock : CheckCircle}
        title={disableAction === 'disable' ? 'Confirm Archive' : 'Confirm Activation'}
        description={`Ref: ${selectedOrderForAction?.id.slice(0,12)}`}
        danger={disableAction === 'disable'}
        confirmLabel={processingAction ? 'Executing...' : 'Commit Authorization'}
        confirmLoading={processingAction}
        onConfirm={async () => {
          setProcessingAction(true);
          try {
            const updatedDisabled = disableAction === 'disable';
            const { error } = await supabase
              .from('orders')
              .update({ disabled: updatedDisabled })
              .eq('id', selectedOrderForAction.id);
            if (error) throw error;
            setShowConfirmModal(false);
            fetchOrders();
          } catch (err) {
            showAlert('Error: ' + err.message);
          } finally {
            setProcessingAction(false);
          }
        }}
      >
        <div className={`p-6 rounded-2xl mb-8 ${
          disableAction === 'disable'
            ? 'bg-gray-100 border border-gray-200'
            : 'bg-black border border-black shadow-xl'
        }`}>
          <p className={`text-[10px] font-black uppercase tracking-widest leading-relaxed ${
            disableAction === 'disable'
              ? 'text-black'
              : 'text-white'
          }`}>
            {disableAction === 'disable' 
              ? `Entity will be suspended from operational vectors until explicit reactivation.`
              : `Entity will be restored to all operational vectors immediately.`
            }
          </p>
        </div>

        <div className="mb-8 p-4 border border-gray-100 rounded-2xl bg-gray-50">
          <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Entity</span>
          <span className="text-[12px] font-black text-black uppercase tracking-tight">{selectedOrderForAction?.customer_name}</span>
        </div>
      </ConfirmSheet>

      <CommandDialog
        isOpen={showCustomerModal}
        onClose={closeCustomerModal}
        title="Initiate Order"
        subtitle="Identify Customer Entity"
      >
        <div className="p-8">
          <form onSubmit={handleLookupCustomer} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Link</label>
              <input
                required
                type="tel"
                autoFocus
                placeholder="+91 MOBILE"
                value={customerMobile}
                onChange={e => setCustomerMobile(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl text-lg font-black tracking-tighter focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white transition-all placeholder:text-gray-200"
              />
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <button 
                type="submit" 
                disabled={loadingCustomer} 
                className="w-full px-6 py-4 bg-black text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loadingCustomer ? 'Verifying...' : 'Search'}
              </button>
            </div>
          </form>

          {searchAttempted && !loadingCustomer && (
            <>
              {searchedProfiles.length > 0 ? (
                <div className="space-y-3 mt-6 border-t border-gray-100 pt-6 max-h-60 overflow-y-auto no-scrollbar">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Profile</label>
                  {searchedProfiles.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        navigate('/orders/new', { state: { customer: p } });
                        closeCustomerModal();
                      }}
                      className="w-full text-left px-5 py-4 border border-gray-100 hover:border-black bg-gray-50 hover:bg-black hover:text-white rounded-2xl transition-all flex items-center justify-between group"
                    >
                      <div>
                        <span className="block text-xs font-black uppercase tracking-tight text-black group-hover:text-white">{p.name}</span>
                        <span className="block text-[9px] font-bold text-gray-400 group-hover:text-gray-300 uppercase tracking-wider mt-0.5">{p.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 group-hover:text-white">{p.phone}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-6 border-t border-gray-100 pt-6 text-center space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching customer profile found</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/orders/new', { state: { customer: { phone: customerMobile } } });
                      closeCustomerModal();
                    }}
                    className="w-full px-5 py-4 border border-dashed border-gray-200 hover:border-black hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest text-black rounded-2xl transition-all"
                  >
                    Register New Profile (+91 {customerMobile})
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={closeCustomerModal} 
              className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-black transition-colors"
            >
              Cancel Operation
            </button>
          </div>
        </div>
      </CommandDialog>

    </div>
  );
}
