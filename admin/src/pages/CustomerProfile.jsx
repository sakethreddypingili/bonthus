import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  IndianRupee, 
  Eye, 
  ExternalLink
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { isValidUUID } from "../utils/securityUtils";

export default function CustomerProfile({ userProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [eyePowers, setEyePowers] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!isValidUUID(id)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch customer basic info
        const { data: custData, error: custError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();
        
        if (custError) throw custError;
        setCustomer(custData);

        // Fetch customer orders with items and products
        let orderQuery = supabase
          .from('orders')
          .select(`
            *,
            order_items(
              id,
              quantity,
              unit_price,
              products(name)
            )
          `)
          .eq('customer_id', id)
          .eq('disabled', false)
          .order('created_at', { ascending: false });

        // Apply store filter for non-admin users
        const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
        if (!isAdmin && userProfile?.store_id && isValidUUID(userProfile.store_id)) {
          orderQuery = orderQuery.eq('store_id', userProfile.store_id);
        }

        const { data: orderData, error: orderError } = await orderQuery;
        
        if (orderError) throw orderError;

        const storeIds = [...new Set((orderData || []).map((order) => order.store_id).filter(Boolean))];
        let storesById = {};

        if (storeIds.length > 0) {
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('id, name')
            .in('id', storeIds);

          if (storeError) {
            console.error('Error fetching stores for orders:', storeError.message);
          } else {
            storesById = Object.fromEntries((storeData || []).map((store) => [store.id, store.name]));
          }
        }

        const enrichedOrders = (orderData || []).map((order) => ({
          ...order,
          store: {
            id: order.store_id,
            name: storesById[order.store_id] || 'N/A'
          }
        }));

        setOrders(enrichedOrders);

        // Fetch eye powers (no disabled field for prescriptions table)
        const { data: eyeData, error: eyeError } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });
        
        if (eyeError) throw eyeError;
        setEyePowers(eyeData || []);

        // Fetch warranty info
        try {
          const res = await fetch(`/api/customers/${id}/warranty`);
          const result = await res.json();
          if (result.success) {
            setWarranties(result.data || []);
          }
        } catch (err) {
          console.error("Error fetching warranty data:", err);
        }

      } catch (err) {
        console.error("Error fetching customer profile:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [id, userProfile]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Customer Not Found</h2>
        <button 
          onClick={() => navigate('/customers')}
          className="mt-6 px-8 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
        >
          Back to Registry
        </button>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.net_amount || 0), 0);
  const totalOrders = orders.length;

  return (
    <div className="space-y-10 animate-fast-slide pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-gray-100">
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/customers')}
            className="group flex items-center gap-2 text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Database</span>
          </button>
          <div>
            <h1 className="text-5xl font-black text-black tracking-tighter uppercase mb-2 leading-none">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <span className="px-3 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Customer Protocol</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Since {new Date(customer.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-white border border-gray-100 rounded-[28px] p-6 min-w-[200px] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <ShoppingBag size={12} className="text-black" /> Lifetime Volume
            </p>
            <p className="text-3xl font-black text-black tracking-tighter uppercase">{totalOrders} Orders</p>
          </div>
          <div className="bg-black rounded-[28px] p-6 min-w-[220px] shadow-xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
              <IndianRupee size={12} className="text-white" /> Financial Output
            </p>
            <p className="text-3xl font-black text-white tracking-tighter uppercase">₹{totalSpent.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        {/* Main Content: Orders */}
        <div className="space-y-10">
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-black uppercase tracking-[0.3em] flex items-center gap-3">
                Order History <span className="w-12 h-px bg-gray-100"></span>
              </h3>
            </div>

            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-[32px] p-16 text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Zero transactional history</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div 
                    key={order.id}
                    className="bg-white border border-gray-100 rounded-[32px] p-8 hover:border-black hover:shadow-2xl transition-all duration-300 group cursor-pointer"
                    onClick={() => navigate(`/orders/edit/${order.id}`)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex gap-6">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-colors duration-300 shadow-inner">
                          <ShoppingBag size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-black text-black tracking-tighter uppercase">{order.order_number}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              order.status === 'delivered' ? 'bg-green-50 text-green-600' : 
                              order.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                            <span>{order.store?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Order Net</p>
                          <p className="text-lg font-black text-black tracking-tight uppercase">₹{Number(order.net_amount).toLocaleString()}</p>
                        </div>
                        <div className="h-10 w-px bg-gray-50"></div>
                        <button className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-300 hover:bg-black hover:text-white transition-all duration-300 border border-transparent hover:border-black">
                          <Eye size={20} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {order.order_items?.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Entity</p>
                          <p className="text-[10px] font-bold text-black uppercase tracking-tight truncate">{item.products?.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar: Profile & Prescriptions */}
        <div className="space-y-10">
          <section className="bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm">
            <h3 className="text-xs font-black text-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              Entity Identity <span className="w-8 h-px bg-gray-100"></span>
            </h3>

            <div className="space-y-8">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={10} className="text-black" /> Primary Link
                </p>
                <p className="text-lg font-black text-black uppercase tracking-tight">{customer.phone}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={10} className="text-black" /> Digital Address
                </p>
                <p className="text-lg font-black text-black lowercase tracking-tight">{customer.email || 'None Registered'}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={10} className="text-black" /> Geo Coordinates
                </p>
                <p className="text-xs font-bold text-black uppercase leading-relaxed">
                  {[customer.street, customer.town, customer.district, customer.state].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 border border-gray-100 rounded-[40px] p-10">
            <h3 className="text-xs font-black text-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              Optical Prescriptions <span className="w-8 h-px bg-gray-200"></span>
            </h3>

            <div className="space-y-4">
              {eyePowers.length === 0 ? (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">No measurements recorded</p>
              ) : (
                eyePowers.map((pow) => (
                  <div key={pow.id} className="bg-white border border-gray-200 rounded-[28px] p-6 hover:border-black transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-[11px] font-black text-black uppercase tracking-tight">Rx Data</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{new Date(pow.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-colors duration-300 shadow-inner">
                        <ExternalLink size={14} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Right Eye</p>
                        <div className="flex gap-2 text-[10px] font-black text-black">
                          <span>{pow.dv_re_sph || 'PL'}</span>
                          <span className="text-gray-200">/</span>
                          <span>{pow.dv_re_cyl || '0.00'}</span>
                        </div>
                      </div>
                      <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Left Eye</p>
                        <div className="flex gap-2 text-[10px] font-black text-black">
                          <span>{pow.dv_le_sph || 'PL'}</span>
                          <span className="text-gray-200">/</span>
                          <span>{pow.dv_le_cyl || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    {pow.notes && (
                      <p className="mt-4 text-[9px] font-bold text-gray-400 uppercase tracking-tight line-clamp-1 italic">"{pow.notes}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-[40px] p-10 shadow-sm">
            <h3 className="text-xs font-black text-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
              Warranty Lifecycle <span className="w-8 h-px bg-gray-100"></span>
            </h3>

            <div className="space-y-4">
              {warranties.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 italic text-[11px] font-black uppercase tracking-wider">
                  Nothing Found
                </div>
              ) : (
                warranties.map((w, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-[28px] p-6 hover:border-black transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[11px] font-black text-black uppercase tracking-tight truncate max-w-[180px]">{w.product_name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{w.brand || "Generic"}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        w.warranty_status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {w.warranty_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-gray-600">
                      <div>
                        <span className="text-[7px] text-gray-400 uppercase block">Invoice</span>
                        <span className="text-black">{w.invoice_number}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-gray-400 uppercase block">Expiry Date</span>
                        <span className="text-black">{new Date(w.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
