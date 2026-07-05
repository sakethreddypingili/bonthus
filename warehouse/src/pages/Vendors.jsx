import { useState, useEffect, useCallback } from "react";
import { 
  Users, Plus, Search, X, 
  History, Mail, Phone, MapPin 
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";

export default function Vendors({ userProfile }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [newVendor, setNewVendor] = useState({ 
    name: '', contact_name: '', email: '', phone: '', address: '' 
  });
  const [adding, setAdding] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order('name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error("Error fetching vendors:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { error } = await supabase.from("vendors").insert([newVendor]);
      if (error) throw error;
      setShowAddModal(false);
      setNewVendor({ name: '', contact_name: '', email: '', phone: '', address: '' });
      fetchVendors();
    } catch (err) {
      alert('Failed to onboard vendor: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const fetchOrderHistory = async (vendor) => {
    setSelectedVendor(vendor);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          tracking_number,
          created_at,
          status,
          items:shipment_items(quantity)
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mapped = data.map(s => ({
        id: s.tracking_number,
        date: new Date(s.created_at).toLocaleDateString(),
        items: s.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
        status: s.status
      }));

      setOrderHistory(mapped);
    } catch (err) {
      console.error("Error fetching history:", err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredVendors = vendors.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 animate-fast-slide">
      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative group w-full md:w-96">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black transition-colors" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search Vendor Ledger..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-11 pr-5 py-3.5 text-[10px] font-mono font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white hover:bg-neutral-900 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
        >
          <Plus size={15} strokeWidth={3} /> Onboard Vendor
        </button>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-neutral-100 animate-pulse rounded-3xl" />
          ))
        ) : filteredVendors.map(vendor => (
          <div key={vendor.id} className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm hover:border-black hover:shadow-md transition-all duration-300 group relative overflow-hidden flex flex-col justify-between h-72">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button 
                onClick={() => fetchOrderHistory(vendor)}
                className="p-3 bg-black text-white rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                <History size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col h-full justify-between">
              <div>
                <span className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest">ID: {vendor.id.slice(0, 8)}</span>
                <h3 className="text-xl font-black text-black uppercase tracking-tight mt-1.5 line-clamp-1">{vendor.name}</h3>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1.5">Contact: {vendor.contact_name || 'N/A'}</p>
              </div>

              <div className="space-y-3.5 py-4 border-t border-b border-neutral-100 my-4">
                <div className="flex items-center gap-3 text-neutral-500 hover:text-black transition-colors duration-150">
                  <Mail size={13} className="text-neutral-400 shrink-0" />
                  <span className="text-[10px] font-bold lowercase tracking-wider truncate">{vendor.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-500 hover:text-black transition-colors duration-150">
                  <Phone size={13} className="text-neutral-400 shrink-0" />
                  <span className="text-[10px] font-mono font-black tracking-widest">{vendor.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-neutral-400 hover:text-black transition-colors duration-150">
                <MapPin size={12} className="shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-widest truncate">{vendor.address || 'No Address'}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredVendors.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-neutral-200 border-dashed flex flex-col items-center justify-center text-center">
            <Users size={36} className="text-neutral-300 mb-4" />
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">No Vendors Found</p>
          </div>
        )}
      </div>

      {/* Drawer: Add Vendor */}
      <SlideDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Onboard Vendor"
        subtitle="Register new partner"
      >
        <div className="flex flex-col h-full justify-between">
          <form onSubmit={handleAddVendor} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Entity Name</label>
                <input
                  type="text" required value={newVendor.name}
                  onChange={e => setNewVendor({...newVendor, name: e.target.value})}
                  placeholder="Vendor Name"
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Contact Person</label>
                <input
                  type="text" value={newVendor.contact_name}
                  onChange={e => setNewVendor({...newVendor, contact_name: e.target.value})}
                  placeholder="Contact Name"
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Email</label>
                <input
                  type="email" value={newVendor.email}
                  onChange={e => setNewVendor({...newVendor, email: e.target.value})}
                  placeholder="Email Address"
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-bold lowercase tracking-wider focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Phone</label>
                <input
                  type="text" value={newVendor.phone}
                  onChange={e => setNewVendor({...newVendor, phone: e.target.value})}
                  placeholder="Phone Number"
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-mono font-black tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Address</label>
              <textarea
                value={newVendor.address}
                onChange={e => setNewVendor({...newVendor, address: e.target.value})}
                placeholder="Business Address" rows={3}
                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none resize-none transition-all"
              />
            </div>
            <div className="pt-8 flex items-center gap-3 border-t border-neutral-100 mt-auto">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
              <button type="submit" disabled={adding} className="flex-[2] py-4 bg-black text-white hover:bg-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-200">
                {adding ? 'Processing...' : 'Complete Onboarding'}
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>

      {/* Drawer: History */}
      <SlideDrawer
        isOpen={showHistoryModal && selectedVendor !== null}
        onClose={() => setShowHistoryModal(false)}
        title="Order History"
        subtitle={selectedVendor?.name}
      >
        <div className="">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-2 border-neutral-100 border-t-black rounded-full animate-spin" />
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Retrieving Ledger...</p>
            </div>
          ) : orderHistory.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="pb-4 text-[9px] font-black text-neutral-400 uppercase tracking-widest">Tracking #</th>
                  <th className="pb-4 text-[9px] font-black text-neutral-400 uppercase tracking-widest">Date</th>
                  <th className="pb-4 text-center text-[9px] font-black text-neutral-400 uppercase tracking-widest">Units</th>
                  <th className="pb-4 text-right text-[9px] font-black text-neutral-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orderHistory.map(order => (
                  <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 font-mono text-[11px] font-black text-black">{order.id}</td>
                    <td className="py-4 text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest">{order.date}</td>
                    <td className="py-4 text-center text-[11px] font-mono font-black text-black">{order.items}</td>
                    <td className="py-4 text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-mono font-black uppercase tracking-widest ${
                        order.status === 'delivered' ? 'bg-black text-white' : 'border border-neutral-300 text-black'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center text-[10px] font-black text-neutral-300 uppercase tracking-widest">No Historical Cargo Data</div>
          )}
        </div>
      </SlideDrawer>
    </div>
  );
}
