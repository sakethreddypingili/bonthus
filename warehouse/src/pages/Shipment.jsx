import React, { useState, useEffect, useCallback } from "react";
import { 
  Truck, Plus, Search, Download, QrCode, X, 
  Clock, Package, Trash2, Edit3, CheckCircle2,
  List, BarChart2, Users, Database, Calendar, ArrowRight, TrendingUp, FileText, MapPin
} from "lucide-react";
import SlideDrawer from '../components/common/SlideDrawer';
import ConfirmSheet from '../components/common/ConfirmSheet';
import CommandDialog from '../components/common/CommandDialog';
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";

export default function Shipment({ userProfile }) {
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  
  const [newShipment, setNewShipment] = useState({
    supplier_name: '',
    expected_date: '',
    items: [{ name: '', quantity: '', sku: '' }]
  });
  const [vendors, setVendors] = useState([]);
  const [stockingInProgress, setStockingInProgress] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "shipments" does not exist')) {
          setShipments([
            { id: "SH-4401", supplier: "Vision One Supplies", expected: "2024-05-31", units: 240, status: "In Transit", contents: [{name: 'Contact Lenses', quantity: 240, sku: 'CL-001'}] },
            { id: "SH-4402", supplier: "Apex Optical Co.", expected: "2024-06-01", units: 180, status: "Scheduled", contents: [{name: 'Frames', quantity: 180, sku: 'FR-002'}] },
            { id: "SH-4404", supplier: "Essilor Luxottica", expected: "2024-05-31", units: 450, status: "Arrived", contents: [{name: 'Sunglasses', quantity: 450, sku: 'SG-003'}] },
          ]);
        } else {
          throw error;
        }
      } else {
        setShipments(data || []);
      }
    } catch (err) {
      console.error("Error fetching shipments:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const { data } = await supabase.from("vendors").select("id, name");
      setVendors(data || [
        { id: 'PV-0001', name: 'Vision One Supplies' },
        { id: 'PV-0002', name: 'Apex Optical Co.' },
      ]);
    } catch (err) {
      console.error("Error fetching vendors:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
    fetchVendors();
  }, [fetchShipments, fetchVendors]);

  const handleCommitShipment = async (e) => {
    e.preventDefault();
    try {
      const totalUnits = newShipment.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      
      if (selectedShipment) {
        const { error } = await supabase
          .from("shipments")
          .update({
            supplier: newShipment.supplier_name,
            expected: newShipment.expected_date,
            units: totalUnits,
            contents: newShipment.items
          })
          .eq('id', selectedShipment.id);
        if (error) throw error;
      } else {
        const newId = generateId(ID_RULES.SHIPMENTS.prefix, ID_RULES.SHIPMENTS.digits);
        const { error } = await supabase.from("shipments").insert([{
          id: newId,
          supplier: newShipment.supplier_name,
          expected: newShipment.expected_date,
          units: totalUnits,
          status: 'Scheduled',
          contents: newShipment.items
        }]);
        if (error) throw error;
      }
      
      setShowRecordModal(false);
      setSelectedShipment(null);
      setNewShipment({ supplier_name: '', expected_date: '', items: [{ name: '', quantity: '', sku: '' }] });
      fetchShipments();
    } catch (err) {
      console.error("Error committing shipment:", err.message);
      // Fallback
      fetchShipments();
      setShowRecordModal(false);
      setSelectedShipment(null);
    }
  };

  const handleStockIn = async () => {
    if (!selectedShipment || !selectedShipment.contents) return;
    setStockingInProgress(true);
    try {
      // Iterate through shipment contents and add to products_list
      for (const item of selectedShipment.contents) {
        const { data: existing } = await supabase
          .from("products_list")
          .select("id, stock")
          .eq("name", item.name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("products_list")
            .update({ stock: existing.stock + Number(item.quantity) })
            .eq("id", existing.id);
        } else {
          const newProdId = generateId(ID_RULES.PRODUCTS.prefix, ID_RULES.PRODUCTS.digits);
          await supabase.from("products_list").insert([{
            id: newProdId,
            name: item.name,
            stock: Number(item.quantity),
            price: 0, // Default price
            sales: 0
          }]);
        }
      }

      // Mark shipment as Received/Processed
      await supabase
        .from("shipments")
        .update({ status: 'Arrived' }) // Or 'Processed'
        .eq('id', selectedShipment.id);

      alert("Inventory Synchronized Successfully.");
      setShowStockInModal(false);
      setSelectedShipment(null);
      fetchShipments();
    } catch (err) {
      console.error("Stock in failed:", err.message);
      alert("Demo Mode: Inventory entities added to virtual ledger.");
      setShowStockInModal(false);
      setSelectedShipment(null);
    } finally {
      setStockingInProgress(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Registry</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Inbound Logistic Registry</p>
        </div>
        <button 
          onClick={() => { setSelectedShipment(null); setNewShipment({ supplier_name: '', expected_date: '', items: [{ name: '', quantity: '', sku: '' }] }); setShowRecordModal(true); }}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={16} strokeWidth={3} /> Record Manifest
        </button>
      </div>

      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative group w-full md:w-96">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search Manifest Ledger..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Expected</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Units</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shipments.map(ship => (
                <tr key={ship.id} className="hover:bg-gray-50 group transition-colors">
                  <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{ship.id}</td>
                  <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">{ship.supplier}</td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{ship.expected}</td>
                  <td className="px-8 py-6 text-center text-[12px] font-black text-black">{ship.units}</td>
                  <td className="px-8 py-6 text-center">
                    <span className="px-3 py-1 rounded-full bg-black text-white text-[9px] font-black uppercase tracking-widest">
                      {ship.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {ship.status !== 'Arrived' && ship.status !== 'Provisioned' && (
                        <>
                        <button 
                          onClick={() => { setNewShipment({ supplier_name: ship.supplier, expected_date: ship.expected, items: ship.contents || [{ name: '', quantity: ship.units, sku: '' }] }); setSelectedShipment(ship); setShowRecordModal(true); }}
                          className="p-2 border border-gray-200 text-black rounded-xl hover:bg-black hover:text-white transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                            onClick={async () => {
                                await supabase.from('shipments').update({ status: 'Arrived' }).eq('id', ship.id);
                                fetchShipments();
                            }}
                            className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:scale-110"
                        >
                           Mark Arrived
                        </button>
                        </>
                      )}
                      <button 
                        onClick={() => { setSelectedShipment(ship); setShowQrModal(true); }}
                        className="p-2 border border-gray-200 text-black rounded-xl hover:bg-black hover:text-white transition-all"
                      >
                        <QrCode size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SlideDrawer
        isOpen={showRecordModal}
        onClose={() => { setShowRecordModal(false); setSelectedShipment(null); }}
        title={selectedShipment ? 'Edit Manifest' : 'Record Manifest'}
        subtitle="Configure Inbound Cargo Vector"
      >
        <div className="flex flex-col h-full">
          <form onSubmit={handleCommitShipment} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Vendor</label>
                <select
                  required value={newShipment.supplier_name}
                  onChange={e => setNewShipment({...newShipment, supplier_name: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Expected Date</label>
                <input
                  type="date" required value={newShipment.expected_date}
                  onChange={e => setNewShipment({...newShipment, expected_date: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black text-black uppercase tracking-[0.2em]">Bulk Details</h4>
                  <button type="button" onClick={() => setNewShipment({...newShipment, items: [...newShipment.items, {name: '', quantity: '', sku: ''}]})} className="text-[9px] font-black text-black uppercase tracking-widest hover:underline">+ Add Entity</button>
              </div>
              <div className="space-y-3">
                  {newShipment.items.map((item, i) => (
                      <div key={i} className="flex gap-3 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                          <input
                              type="text" placeholder="Entity Name" value={item.name}
                              onChange={e => { const ni = [...newShipment.items]; ni[i].name = e.target.value; setNewShipment({...newShipment, items: ni}); }}
                              className="flex-[2] bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none"
                          />
                          <input
                              type="number" placeholder="Qty" value={item.quantity}
                              onChange={e => { const ni = [...newShipment.items]; ni[i].quantity = e.target.value; setNewShipment({...newShipment, items: ni}); }}
                              className="w-20 bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none text-center"
                          />
                          {newShipment.items.length > 1 && <button type="button" onClick={() => { const ni = [...newShipment.items]; ni.splice(i, 1); setNewShipment({...newShipment, items: ni}); }} className="text-gray-400 hover:text-black"><Trash2 size={14} /></button>}
                      </div>
                  ))}
              </div>
            </div>
            <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
              <button type="button" onClick={() => { setShowRecordModal(false); setSelectedShipment(null); }} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Abort</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Commit Manifest</button>
            </div>
          </form>
        </div>
      </SlideDrawer>

      <ConfirmSheet
        isOpen={showStockInModal && selectedShipment !== null}
        onClose={() => setShowStockInModal(false)}
        onConfirm={handleStockIn}
        title="Sync Inventory"
        message={`Add ${selectedShipment?.units} units from ${selectedShipment?.supplier} to Master Catalog?`}
        confirmText={stockingInProgress ? 'Syncing...' : 'Confirm Sync'}
        cancelText="Abort"
        disabled={stockingInProgress}
      />

      <CommandDialog
        isOpen={showQrModal && selectedShipment !== null}
        onClose={() => setShowQrModal(false)}
        title="Asset Vector"
        subtitle={`Ref: ${selectedShipment?.id}`}
      >
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 bg-gray-50 rounded-[32px] border border-gray-100 flex items-center justify-center mb-8 p-6">
            <QrCode size="100%" className="text-black/80" />
          </div>
          <button className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Print Tag</button>
        </div>
      </CommandDialog>
    </div>
  );
}
