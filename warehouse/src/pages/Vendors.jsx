import { useState, useEffect, useCallback } from "react";
import { 
  Users, Plus, Search, X, 
  History, Mail, Phone, MapPin 
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";
import SlideDrawer from "../components/common/SlideDrawer";

export default function Vendors({ userProfile }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [newVendor, setNewVendor] = useState({ 
    name: '', contact_person: '', email: '', phone: '', address: '' 
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

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "vendors" does not exist')) {
          setVendors([
            { id: 'PV-0001', name: 'Vision One Supplies', contact_person: 'John Doe', email: 'john@visionone.com', phone: '+123456789', address: '123 Optics Way', status: 'Active' },
            { id: 'PV-0002', name: 'Apex Optical Co.', contact_person: 'Jane Smith', email: 'jane@apex.com', phone: '+987654321', address: '456 Lens St', status: 'Active' },
          ]);
        } else {
          throw error;
        }
      } else {
        setVendors(data || []);
      }
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
      const newId = generateId(ID_RULES.PROVIDERS.prefix, ID_RULES.PROVIDERS.digits);
      const { error } = await supabase.from("vendors").insert([{
        id: newId,
        ...newVendor,
        status: 'Active'
      }]);
      
      if (error) throw error;
      
      setShowAddModal(false);
      setNewVendor({ name: '', contact_person: '', email: '', phone: '', address: '' });
      fetchVendors();
    } catch (err) {
      console.error("Error adding vendor:", err.message);
      setVendors(prev => [...prev, { id: 'PV-' + Math.floor(Math.random()*10000), ...newVendor, status: 'Active' }]);
      setShowAddModal(false);
    } finally {
      setAdding(false);
    }
  };

  const fetchOrderHistory = async (vendor) => {
    setSelectedVendor(vendor);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      setTimeout(() => {
        setOrderHistory([
          { id: 'SH-4401', date: '2024-05-30', items: 240, status: 'Received' },
          { id: 'SH-4352', date: '2024-04-15', items: 180, status: 'Received' },
        ]);
        setHistoryLoading(false);
      }, 800);
    } catch (err) {
      console.error("Error fetching history:", err.message);
      setHistoryLoading(false);
    }
  };

  const filteredVendors = vendors.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Vendors</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage Supply Chain Entities</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={16} strokeWidth={3} /> Onboard Vendor
        </button>
      </div>

      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm">
        <div className="relative group w-full md:w-96">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search Vendor Ledger..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-[40px]" />
          ))
        ) : filteredVendors.map(vendor => (
          <div key={vendor.id} className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => fetchOrderHistory(vendor)}
                className="p-3 bg-black text-white rounded-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                <History size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col h-full">
              <div className="mb-6">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{vendor.id}</span>
                <h3 className="text-xl font-black text-black uppercase tracking-tight mt-1 line-clamp-1">{vendor.name}</h3>
                <span className="inline-block px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full mt-2">
                  {vendor.status || 'Active'}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-black">
                    <Mail size={14} />
                  </div>
                  <span className="text-[10px] font-bold lowercase tracking-wider">{vendor.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-black">
                    <Phone size={14} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest">{vendor.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-50">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-widest truncate">{vendor.address || 'No Address'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SlideDrawer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Onboard Vendor"
        subtitle="Register new partner"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleAddVendor} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Entity Name</label>
                <input
                  type="text" required value={newVendor.name}
                  onChange={e => setNewVendor({...newVendor, name: e.target.value})}
                  placeholder="Vendor Name"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email</label>
                <input
                  type="email" value={newVendor.email}
                  onChange={e => setNewVendor({...newVendor, email: e.target.value})}
                  placeholder="Email Address"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold lowercase tracking-wider focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Address</label>
              <textarea
                value={newVendor.address}
                onChange={e => setNewVendor({...newVendor, address: e.target.value})}
                placeholder="Business Address" rows={3}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none resize-none"
              />
            </div>
            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Abort</button>
              <button type="submit" disabled={adding} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                {adding ? 'Processing...' : 'Complete Onboarding'}
              </button>
            </div>
          </form>
        </div>
      </SlideDrawer>

      <SlideDrawer
        isOpen={showHistoryModal && selectedVendor !== null}
        onClose={() => setShowHistoryModal(false)}
        title="Order History"
        subtitle={selectedVendor?.name}
      >
        <div className="">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retrieving Ledger...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Shipment ID</th>
                  <th className="pb-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="pb-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Units</th>
                  <th className="pb-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orderHistory.map(order => (
                  <tr key={order.id}>
                    <td className="py-5 font-mono text-[11px] font-black text-black">{order.id}</td>
                    <td className="py-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{order.date}</td>
                    <td className="py-5 text-center text-[12px] font-black text-black">{order.items}</td>
                    <td className="py-5 text-right">
                      <span className="inline-block px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SlideDrawer>
    </div>
  );
}
