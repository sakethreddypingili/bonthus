import { useState, useEffect, useCallback } from "react";
import { Search, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../server/supabase/supabase";

export default function Customers({ userProfile }) {
  const navigate = useNavigate();
  const [dbCustomers, setDbCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [jumpToPage, setJumpToPage] = useState('');
  const PER_PAGE = 25;

  const [activeStoreCustomerIds, setActiveStoreCustomerIds] = useState(new Set());

  const fetchCustomers = useCallback(async () => {
    if (!userProfile) {
      // Halt fetching until userProfile is loaded
      return;
    }

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'super_admin';
    const userStoreId = userProfile.store_id;

    if (isAdmin) {
      console.log(`[Customers Page] Authenticated User Role: ${userProfile.role} (Super/Global Admin). Showing all-time customers.`);
    } else {
      const storeName = userProfile.store?.name || userProfile.store_name || "Assigned Store";
      console.log(`[Customers Page] Authenticated User Role: ${userProfile.role} | Store: ${storeName} (ID: ${userStoreId}). Applying 48-hour activity window.`);
    }

    setLoading(true);
    try {
      // 1. Fetch active customer ids from orders matching store in the last 48 hours
      let fortyEightHourCustomerIds = new Set();
      if (!isAdmin && userStoreId) {
        const thresholdDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: recentOrders, error: orderErr } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('store_id', userStoreId)
          .gte('created_at', thresholdDate)
          .eq('disabled', false);

        if (orderErr) {
          console.error("Failed to query 48-hour store orders:", orderErr);
        } else if (recentOrders) {
          recentOrders.forEach(o => {
            if (o.customer_id) fortyEightHourCustomerIds.add(o.customer_id);
          });
        }
      }
      setActiveStoreCustomerIds(fortyEightHourCustomerIds);

      // 2. Fetch all customers globally
      let allCustomers = [];
      let hasMoreCust = true;
      let startCust = 0;
      const step = 1000;

      while (hasMoreCust) {
        let query = supabase
          .from("customers")
          .select('id, name, phone, email, street, town, district, state, created_at, family_id')
          .order('created_at', { ascending: false })
          .range(startCust, startCust + step - 1);

        const { data, error } = await query;
        if (error) throw new Error(`Supabase customers query failed: ${error.message}`);

        if (data && data.length > 0) {
          allCustomers = allCustomers.concat(data);
          startCust += step;
        }
        if (!data || data.length < step) {
          hasMoreCust = false;
        }
      }

      // 3. Fetch all dependents globally
      let allDependents = [];
      let hasMoreDep = true;
      let startDep = 0;

      while (hasMoreDep) {
        let query = supabase
          .from("dependents")
          .select('id, parent_customer_id, family_id, name, relationship, phone, email, created_at')
          .order('created_at', { ascending: false })
          .range(startDep, startDep + step - 1);

        const { data, error } = await query;
        if (error) throw new Error(`Supabase dependents query failed: ${error.message}`);

        if (data && data.length > 0) {
          allDependents = allDependents.concat(data);
          startDep += step;
        }
        if (!data || data.length < step) {
          hasMoreDep = false;
        }
      }

      // Combine and map defensively
      const mappedCustomers = allCustomers.map(u => {
        const name = String(u.name || '').trim() || 'Anonymous';
        const email = String(u.email || '').trim() || 'N/A';
        const phone = String(u.phone || '').trim() || 'N/A';
        
        let city = 'N/A';
        try {
          const parts = [u.street, u.town, u.district, u.state].filter(p => typeof p === 'string' && p.trim() !== '');
          if (parts.length > 0) city = parts.join(', ');
        } catch (e) {
          console.error(e);
        }

        const joined = u.created_at 
          ? new Date(u.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) 
          : 'N/A';

        return {
          id: u.id,
          name,
          email,
          phone,
          city,
          orders: 0,
          spent: 0,
          joined,
          created_at: u.created_at,
          parent_id: null,
          family_id: u.family_id
        };
      });

      const mappedDependents = allDependents.map(d => {
        const name = String(d.name || '').trim() || 'Anonymous';
        const email = d.email ? String(d.email).trim() : 'N/A';
        const phone = d.phone ? String(d.phone).trim() : 'N/A';
        
        const parentObj = allCustomers.find(p => p.id === d.parent_customer_id);
        const parentName = parentObj ? String(parentObj.name || '').trim() : 'Primary';
        const displayName = `${name} (${parentName})`;

        // Get address from parent
        let city = 'N/A';
        if (parentObj) {
          try {
            const parts = [parentObj.street, parentObj.town, parentObj.district, parentObj.state].filter(p => typeof p === 'string' && p.trim() !== '');
            if (parts.length > 0) city = parts.join(', ');
          } catch (e) {
            console.error(e);
          }
        }

        const joined = d.created_at 
          ? new Date(d.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) 
          : 'N/A';

        return {
          id: d.id,
          name: displayName,
          email,
          phone,
          city,
          orders: 0,
          spent: 0,
          joined,
          created_at: d.created_at,
          parent_id: d.parent_customer_id,
          family_id: d.family_id
        };
      });

      setDbCustomers([...mappedCustomers, ...mappedDependents]);
    } catch (err) {
      console.error("Error fetching customers:", err.message);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const [searchInput, setSearchInput] = useState("");

  const filtered = dbCustomers.filter(c => {
    const isMatchingSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));

    if (!isMatchingSearch) return false;

    // If searching, show all matching customers globally
    if (search.trim() !== "") {
      return true;
    }

    // If not searching, check filters based on role
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
    if (isAdmin) {
      return true; // Show all-time customers for admin
    }

    // For store operators (when not searching), show only customers who placed orders at their store in the last 48 hours
    return activeStoreCustomerIds.has(c.id);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      setSearch(searchInput);
      setPage(1);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Customers</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Manage customer database and order history</p>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
              <div className="text-[10px] font-black text-white bg-black px-4 py-2 rounded-xl uppercase tracking-widest">
                Total: {filtered.length}
              </div>
            )}
          </div>
          <div className="relative group">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search customers…"
              className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-64 transition-all placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Orders</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Spent</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Synthesizing customers...</td></tr>
              ) : paginated.length > 0 ? paginated.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-black uppercase tracking-tight">{c.name}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase font-mono">#{c.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-black">{c.phone}</span>
                      <span className="text-[9px] font-bold text-gray-400">{c.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-gray-600 max-w-[150px] truncate">{c.city}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">{c.orders}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-[11px] font-black text-black tracking-tight">₹{c.spent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase">{c.joined}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="p-2 rounded-lg hover:bg-black hover:text-white transition-all text-gray-400"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PER_PAGE && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-black disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} strokeWidth={3} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                  .map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${page === n ? "bg-black text-white shadow-lg" : "text-gray-400 hover:bg-gray-50 hover:text-black"}`}
                    >
                      {n}
                    </button>
                  ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-black disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={16} strokeWidth={3} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={jumpToPage}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d+$/.test(val)) setJumpToPage(val);
                  }}
                  placeholder="Page"
                  className="w-16 px-3 py-2 text-[10px] font-black uppercase border border-gray-100 rounded-xl bg-white focus:outline-none focus:border-black transition-all text-center"
                />
                <button
                  onClick={() => {
                    const pageNum = parseInt(jumpToPage, 10);
                    if (!jumpToPage || isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) return;
                    setPage(pageNum);
                    setJumpToPage('');
                  }}
                  className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all"
                >
                  Jump
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
