import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight,
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  IndianRupee, 
  Eye, 
  ExternalLink,
  Users,
  Plus,
  Trash2,
  Edit2
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";
import { usePopup } from "../components/common/PopupProvider";

export default function CustomerProfile({ userProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert, showConfirm } = usePopup();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [eyePowers, setEyePowers] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [visits, setVisits] = useState([]);

  // Dependent Modal/Form states
  const [showDepModal, setShowDepModal] = useState(false);
  const [editingDep, setEditingDep] = useState(null);
  const [depForm, setDepForm] = useState({ name: "", relationship: "Child", phone: "", email: "" });
  const [savingDep, setSavingDep] = useState(false);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch customer basic info
      const { data: custDataArray, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .limit(1);
      
      if (custError) throw custError;
      let custData = custDataArray && custDataArray.length > 0 ? custDataArray[0] : null;

      let isDep = false;
      if (custData) {
        isDep = !!custData.parent_id;
      } else {
        // Fallback for store isolation / empty query: try parent ID from navigation state
        const stateParentId = location.state?.parentId || location.state?.parent_id;
        if (stateParentId) {
          const { data: parentDataArray } = await supabase
            .from('customers')
            .select('*')
            .eq('id', stateParentId)
            .limit(1);

          if (parentDataArray && parentDataArray.length > 0) {
            const parent = parentDataArray[0];
            const { data: parentDeps } = await supabase
              .from('customers')
              .select('*')
              .eq('parent_id', parent.id);

            const matchedDep = parentDeps?.find(d => d.id === id);
            if (matchedDep) {
              custData = {
                ...matchedDep,
                phone: matchedDep.phone || parent.phone,
                email: matchedDep.email || parent.email,
                street: matchedDep.street || parent.street,
                town: matchedDep.town || parent.town,
                district: matchedDep.district || parent.district,
                state: matchedDep.state || parent.state
              };
              isDep = true;
            }
          }
        }
      }
      
      // If dependent has missing core contact details, merge from parent row
      if (custData && (isDep || custData.parent_id)) {
        const parentId = custData.parent_id;
        if (parentId) {
          const { data: parentDataArray } = await supabase
            .from('customers')
            .select('*')
            .eq('id', parentId)
            .limit(1);
          if (parentDataArray && parentDataArray.length > 0) {
            const parent = parentDataArray[0];
            custData = {
              ...custData,
              phone: custData.phone || parent.phone,
              email: custData.email || parent.email,
              street: custData.street || parent.street,
              town: custData.town || parent.town,
              district: custData.district || parent.district,
              state: custData.state || parent.state
            };
          }
        }
      }

      setCustomer(custData);

      // Fetch family members sharing identical phone contact string
      if (custData && custData.phone) {
        const { data: siblingData, error: siblingError } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('phone', custData.phone)
          .neq('id', id);

        if (siblingError) {
          console.error("Error fetching sibling accounts:", siblingError.message);
          setFamilyMembers([]);
        } else {
          setFamilyMembers(siblingData || []);
        }
      } else {
        setFamilyMembers([]);
      }

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
      if (!isAdmin && userProfile?.store_id) {
        orderQuery = orderQuery.eq('store_id', userProfile.store_id);
      }

      const { data: orderData, error: orderError } = await orderQuery;
      
      if (orderError) throw orderError;

      const storeIds = [...new Set((orderData || []).map((order) => order.store_id).filter(Boolean))];
      let storesById = {};

      if (storeIds.length > 0) {
        const { data: storeData, error: storeError } = await supabase
          .from('store')
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

      // Fetch eye powers (prescriptions table)
      const { data: eyeData, error: eyeError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('customer_id', id)
        .order('prescribed_at', { ascending: false });
      
      if (eyeError) throw eyeError;
      setEyePowers(eyeData || []);

      // Fetch flow history (customer visits)
      const { data: visitData, error: visitError } = await supabase
        .from('customer_visits')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (!visitError && visitData) {
        setVisits(visitData);
      }

      // Fetch dependents
      // If the current profile has a family_id, load members sharing that family_id
      let dependentsQuery = supabase.from('customers').select('*');
      if (custData.family_id) {
        dependentsQuery = dependentsQuery.eq('family_id', custData.family_id);
      } else {
        dependentsQuery = dependentsQuery.eq('parent_id', id);
      }

      const { data: dependentsData, error: dependentsError } = await dependentsQuery.order('created_at', { ascending: false });

      if (dependentsError) throw dependentsError;

      let combinedFamilyMembers = (dependentsData || []).map(d => ({
        ...d,
        is_primary_customer: !d.parent_id
      }));

      // Fetch other primary customers sharing the same family_id
      if (custData.family_id) {
        const { data: siblingCustomers, error: siblingError } = await supabase
          .from('customers')
          .select('id, name, phone, email, family_id')
          .eq('family_id', custData.family_id)
          .neq('id', id);

        if (siblingError) {
          console.error("Error fetching sibling customers:", siblingError.message);
        } else if (siblingCustomers) {
          const mappedSiblings = siblingCustomers.map(sc => ({
            id: sc.id,
            name: sc.name,
            relationship: 'Primary Member',
            phone: sc.phone,
            email: sc.email,
            family_id: sc.family_id,
            is_primary_customer: true
          }));
          combinedFamilyMembers = [...combinedFamilyMembers, ...mappedSiblings];
        }
      }
      
      // Exclude self if showing family members sharing the same family_id
      const filteredDeps = combinedFamilyMembers.filter(d => d.id !== id);
      setDependents(filteredDeps);

    } catch (err) {
      console.error("Error fetching customer profile:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id, userProfile]);

  const handleOpenAddDependent = () => {
    setEditingDep(null);
    setDepForm({ name: "", relationship: "Child", phone: "", email: "" });
    setShowDepModal(true);
  };

  const handleOpenEditDependent = (dep) => {
    setEditingDep(dep);
    setDepForm({
      name: dep.name,
      relationship: dep.relationship || "Child",
      phone: dep.phone || "",
      email: dep.email || "",
    });
    setShowDepModal(true);
  };

  const handleSaveDependent = async (e) => {
    e.preventDefault();
    setSavingDep(true);
    try {
      const familyId = (customer.family_id && customer.family_id.trim() !== '') ? customer.family_id : null;

      const { data, error } = await supabase.rpc('save_dependent_with_family', {
        p_parent_customer_id: customer.parent_id || id,
        p_name: depForm.name,
        p_relationship: depForm.relationship,
        p_phone: depForm.phone.trim() || null,
        p_email: depForm.email.trim() || null,
        p_editing_dep_id: editingDep ? editingDep.id : null,
        p_family_id: familyId
      });

      if (error) throw error;

      if (data && data.success) {
        if (data.family_id) {
          customer.family_id = data.family_id;
        }
      }

      setShowDepModal(false);
      fetchCustomerData();
    } catch (err) {
      showAlert("Error saving family profile: " + err.message);
    } finally {
      setSavingDep(false);
    }
  };

  const handleDeleteDependent = async (depId) => {
    const confirmed = await showConfirm("Are you sure you want to delete this family profile?");
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', depId);
      if (error) throw error;
      fetchCustomerData();
    } catch (err) {
      showAlert("Error deleting family profile: " + err.message);
    }
  };

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
              <span>Joined {customer.created_at && !isNaN(new Date(customer.created_at).getTime()) ? new Date(customer.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : "N/A"}</span>
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
        {/* Left Column: Stats, Info, & Dependents */}
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

          {/* Linked Family Accounts */}
          <div className="section-card p-5 space-y-4">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2">
                <Users size={16} /> Linked Family Accounts
              </h3>
            </div>
            {familyMembers.length > 0 ? (
              <div className="space-y-3">
                {familyMembers.map(member => (
                  <div key={member.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs font-black text-black uppercase tracking-tight">{member.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{member.email || "No email"}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/customers/' + member.id, { state: { parentId: member.parent_id } })} 
                      className="p-1.5 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                      title="View Profile"
                    >
                      View <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No linked family accounts sharing this phone contact string.</p>
            )}
          </div>

          {/* Family Profiles / Dependents */}
          <div className="section-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2">
                <Users size={16} /> Family Profiles
              </h3>
              <button 
                onClick={handleOpenAddDependent}
                className="p-1 bg-gray-100 text-black hover:bg-black hover:text-white rounded-lg transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
            {dependents.length > 0 ? (
              <div className="space-y-3">
                {dependents.map(dep => (
                  <div key={dep.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs font-black text-black uppercase tracking-tight">{dep.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{dep.relationship || "Family"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {dep.is_primary_customer ? (
                        <>
                          <button 
                            onClick={() => navigate('/orders/new', { state: { customer: dep } })}
                            className="p-1.5 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                            title="New Order"
                          >
                            <ShoppingBag size={12} /> Order
                          </button>
                          <button 
                            onClick={() => navigate(`/customers/${dep.id}`, { state: { parentId: dep.parent_id || customer.id } })} 
                            className="p-1.5 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                            title="View Profile"
                          >
                            View <ArrowRight size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => navigate('/orders/new', { state: { customer: customer, initialSelectedProfileId: dep.id } })}
                            className="p-1.5 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-all flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                            title="New Order"
                          >
                            <ShoppingBag size={12} /> Order
                          </button>
                          <button 
                            onClick={() => handleOpenEditDependent(dep)} 
                            className="p-1.5 text-gray-400 hover:text-black rounded-md hover:bg-gray-100 transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDependent(dep.id)} 
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No family profiles linked yet.</p>
            )}
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
                      
                      const formatEyePowerDate = (dateStr) => {
                        if (!dateStr) return "N/A";
                        const d = new Date(dateStr);
                        if (isNaN(d.getTime())) return "N/A";
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      };

                      return (
                        <React.Fragment key={pow.id}>
                          {/* Distance Vision Row */}
                          <tr className="hover:bg-gray-50/50">
                            <td rowSpan={groupRowSpan} className="px-5 py-4 text-xs font-medium text-gray-600 border-r border-gray-100">
                              {formatEyePowerDate(pow.prescribed_at || pow.created_at)}
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
                          {order.created_at && !isNaN(new Date(order.created_at).getTime()) ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
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

          {/* Flow / Visit History */}
          <div className="section-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2">
                <Users size={16} className="text-[#333333]" /> Flow / Visit History
              </h3>
            </div>
            <div className="p-0 overflow-x-auto">
              {visits.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Date</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Purpose</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visits.map((v) => {
                      const purposeLabels = {
                        buy: "Buy Products",
                        eye_checkup: "Eye Checkup",
                        followup: "Order Followup",
                        other: "Other Reasons"
                      };
                      return (
                        <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(v.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-gray-700">
                            <span className="px-2 py-1 bg-black text-white rounded-lg text-[9px] font-black uppercase">
                              {purposeLabels[v.purpose] || v.purpose}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-500 italic max-w-[300px]">
                            {v.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400 italic">No flow history recorded for this customer.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dependent Profile Drawer */}
      <SlideDrawer
        isOpen={showDepModal}
        onClose={() => setShowDepModal(false)}
        title={editingDep ? "Modify Family Profile" : "Add Family Profile"}
        subtitle="Link a dependent family profile to this customer account"
        width="max-w-md"
      >
        <form onSubmit={handleSaveDependent} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              required 
              type="text" 
              value={depForm.name} 
              onChange={e => setDepForm({ ...depForm, name: e.target.value })} 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all" 
              placeholder="Name..." 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Relationship</label>
            <select 
              value={depForm.relationship} 
              onChange={e => setDepForm({ ...depForm, relationship: e.target.value })} 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none transition-all cursor-pointer"
            >
              {["Spouse", "Child", "Parent", "Sibling", "Other"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number (Optional)</label>
            <input 
              type="tel" 
              value={depForm.phone} 
              onChange={e => setDepForm({ ...depForm, phone: e.target.value })} 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all" 
              placeholder="Defaults to parent's phone" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
            <input 
              type="email" 
              value={depForm.email} 
              onChange={e => setDepForm({ ...depForm, email: e.target.value })} 
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-[11px] font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all" 
              placeholder="Email..." 
            />
          </div>
          <button 
            type="submit" 
            disabled={savingDep}
            className="w-full py-5 bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all mt-8"
          >
            {savingDep ? "Saving..." : "Commit Family Profile"}
          </button>
        </form>
      </SlideDrawer>
    </div>
  );
}
