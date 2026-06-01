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

export default function CustomerProfile({ userProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [eyePowers, setEyePowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
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
              price,
              products(name)
            )
          `)
          .eq('customer_id', id)
          .eq('disabled', false)
          .order('created_at', { ascending: false });

        // Apply store filter for non-admin users
        const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
        if (!isAdmin && userProfile?.store_id) {
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#333333]"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-600">Customer not found</h2>
        <button 
          onClick={() => navigate('/customers')}
          className="mt-4 text-[#333333] font-semibold hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + Number(order.net_amount || 0), 0);
  const totalOrders = orders.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#000000]">{customer.name}</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="font-mono">{customer.id}</span>
              <span className="mx-1">•</span>
              <span>Joined {new Date(customer.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => navigate('/orders/new', { state: { customer } })}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
                <ShoppingBag size={16} /> New Order
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Info */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <ShoppingBag size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
              </div>
              <p className="text-xl font-black text-[#000000]">{totalOrders}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <IndianRupee size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Spent</span>
              </div>
              <p className="text-xl font-black text-[#000000]">₹{totalSpent.toLocaleString()}</p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="section-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#000000] border-b border-gray-100 pb-2">Contact Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 text-black rounded-lg">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Phone Number</p>
                  <p className="text-sm font-semibold text-gray-700">{customer.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 text-black rounded-lg">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Email Address</p>
                  <p className="text-sm font-semibold text-gray-700">{customer.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 text-black rounded-lg">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Address</p>
                  <p className="text-sm font-semibold text-gray-700 leading-relaxed">
                    {[customer.street, customer.town, customer.district, customer.state].filter(Boolean).join(', ') || 'No address provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Tabs for Orders and Eye Power */}
        <div className="lg:col-span-2 space-y-6">
          {/* Eye Power History */}
          <div className="section-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2">
                <Eye size={16} className="text-[#333333]" /> Eye Power History
              </h3>
            </div>
            <div className="p-0 overflow-x-auto">
              {eyePowers.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Date</th>
                      <th className="px-5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">Eye</th>
                      <th className="px-5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">SPH</th>
                      <th className="px-5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">CYL</th>
                      <th className="px-5 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">AXIS</th>
                      <th className="px-5 py-2 text-left text-[10px] font-bold text-gray-400 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eyePowers.map((pow, idx) => {
                      const hasNearVision = (p) => p.nv_re_sph != null || p.nv_le_sph != null || 
                                              p.nv_re_cyl != null || p.nv_le_cyl != null || 
                                              p.nv_re_axis != null || p.nv_le_axis != null;
                      const showNV = hasNearVision(pow);
                      const groupRowSpan = showNV ? 4 : 2;

                      return (
                        <React.Fragment key={pow.id}>
                          {/* Distance Vision Row */}
                          <tr className="hover:bg-gray-50/50">
                            <td rowSpan={groupRowSpan} className="px-5 py-4 text-xs font-medium text-gray-600 border-r border-gray-100">
                              {new Date(pow.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-2 text-center font-bold text-black text-[10px] uppercase tracking-widest bg-gray-50">RE (DV)</td>
                            <td className="px-5 py-2 text-center font-bold">{pow.dv_re_sph ?? '-'}</td>
                            <td className="px-5 py-2 text-center font-bold">{pow.dv_re_cyl ?? '-'}</td>
                            <td className="px-5 py-2 text-center font-bold">{pow.dv_re_axis ?? '-'}</td>
                            <td rowSpan={groupRowSpan} className="px-5 py-4 text-xs text-gray-500 max-w-[200px] italic border-l border-gray-100">
                              {pow.notes || '-'}
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 border-b border-gray-50">
                            <td className="px-5 py-2 text-center font-bold text-black text-[10px] uppercase tracking-widest bg-gray-50">LE (DV)</td>
                            <td className="px-5 py-2 text-center font-bold">{pow.dv_le_sph ?? '-'}</td>
                            <td className="px-5 py-2 text-center font-bold">{pow.dv_le_cyl ?? '-'}</td>
                            <td className="px-5 py-2 text-center font-bold">{pow.dv_le_axis ?? '-'}</td>
                          </tr>
                          
                          {/* Near Vision Row (Conditional) */}
                          {showNV && (
                            <>
                              <tr className="hover:bg-gray-50/50">
                                <td className="px-5 py-2 text-center font-bold text-black text-[10px] uppercase tracking-widest bg-gray-50">RE (NV)</td>
                                <td className="px-5 py-2 text-center font-bold">{pow.nv_re_sph ?? '-'}</td>
                                <td className="px-5 py-2 text-center font-bold">{pow.nv_re_cyl ?? '-'}</td>
                                <td className="px-5 py-2 text-center font-bold">{pow.nv_re_axis ?? '-'}</td>
                              </tr>
                              <tr className="hover:bg-gray-50/50 border-b border-gray-100">
                                <td className="px-5 py-2 text-center font-bold text-black text-[10px] uppercase tracking-widest bg-gray-50">LE (NV)</td>
                                <td className="px-5 py-2 text-center font-bold">{pow.nv_le_sph ?? '-'}</td>
                                <td className="px-5 py-2 text-center font-bold">{pow.nv_le_cyl ?? '-'}</td>
                                <td className="px-5 py-2 text-center font-bold">{pow.nv_le_axis ?? '-'}</td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400 italic">No eye power records found.</div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="section-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#333333]" /> Order History
              </h3>
            </div>
            <div className="p-0 overflow-x-auto">
              {orders.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Order ID</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Date</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Store</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Products</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Amount</th>
                      <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-bold text-[#000000]">{order.id}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-gray-600 whitespace-nowrap">
                          {order.store?.name || 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 max-w-[200px]">
                          <div className="flex flex-col gap-0.5">
                            {order.order_items?.map((item, idx) => (
                              <div key={item.id} className="truncate">
                                • {item.products?.name || 'Unknown Product'} 
                                <span className="text-[10px] opacity-70 ml-1">(x{item.quantity})</span>
                              </div>
                            )) || <span className="italic">No products</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap ${
                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-black text-white' : 
                            order.status === 'Processing' ? 'bg-gray-100 text-black' : 
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[#000000] whitespace-nowrap">
                          ₹{order.net_amount?.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button 
                            onClick={() => navigate(`/invoice/${order.id}`)}
                            className="p-1.5 text-gray-400 hover:text-[#333333] hover:bg-[#333333]/5 rounded-lg transition-colors"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400 italic">No orders found for this customer.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
