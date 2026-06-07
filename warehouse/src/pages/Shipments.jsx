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

export default function Shipments({ userProfile }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  
  const [newShipment, setNewShipment] = useState({
    vendor_id: '',
    estimated_delivery: '',
    items: [{ product_id: '', quantity: '' }]
  });
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockingInProgress, setStockingInProgress] = useState(false);
  const [warehouseId, setWarehouseId] = useState(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: vData } = await supabase.from("vendors").select("id, name");
      setVendors(vData || []);

      const { data: pData } = await supabase.from("products").select("id, name, sku");
      setProducts(pData || []);

      const { data: wData } = await supabase.from('stores').select('id').eq('name', 'Main Warehouse').single();
      if (wData) setWarehouseId(wData.id);
    } catch (err) {
      console.error("Error fetching initial data:", err.message);
    }
  }, []);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
          .from("shipments")
          .select(`
          *,
          vendor:vendors(name),
          items:shipment_items(
            id,
            quantity,
            product:products(name, sku)
          )
        `)
          .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (err) {
      console.error("Error fetching shipments:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    fetchShipments();
  }, [fetchInitialData, fetchShipments]);

  const handleCommitShipment = async (e) => {
    e.preventDefault();
    try {
      const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      const { data: shipData, error: shipError } = await supabase
          .from("shipments")
          .insert([{
            tracking_number: trackingNumber,
            vendor_id: newShipment.vendor_id,
            estimated_delivery: newShipment.estimated_delivery,
            status: 'preparing',
            destination_store_id: warehouseId
          }])
          .select()
          .single();

      if (shipError) throw shipError;

      const shipmentItems = newShipment.items.map(item => ({
        shipment_id: shipData.id,
        product_id: item.product_id,
        quantity: Number(item.quantity)
      }));

      const { error: itemsError } = await supabase.from("shipment_items").insert(shipmentItems);
      if (itemsError) throw itemsError;
      
      setShowRecordModal(false);
      setNewShipment({ vendor_id: '', estimated_delivery: '', items: [{ product_id: '', quantity: '' }] });
      fetchShipments();
    } catch (err) {
      alert('Failed to record manifest: ' + err.message);
    }
  };

  const handleStockIn = async () => {
    if (!selectedShipment || !warehouseId) return;
    setStockingInProgress(true);
    try {
      const { data: items } = await supabase
          .from("shipment_items")
          .select("product_id, quantity")
          .eq("shipment_id", selectedShipment.id);

      for (const item of items || []) {
        const { data: existing } = await supabase
            .from("store_inventory")
            .select("id, stock_quantity")
            .eq("store_id", warehouseId)
            .eq("product_id", item.product_id)
            .maybeSingle();

        if (existing) {
          await supabase
              .from("store_inventory")
              .update({ stock_quantity: existing.stock_quantity + item.quantity })
              .eq("id", existing.id);
        } else {
          await supabase.from("store_inventory").insert([{
            store_id: warehouseId,
            product_id: item.product_id,
            stock_quantity: item.quantity,
            low_stock_threshold: 10
          }]);
        }
      }

      await supabase
          .from("shipments")
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('id', selectedShipment.id);

      alert("Warehouse Inventory Synchronized.");
      setShowStockInModal(false);
      setSelectedShipment(null);
      fetchShipments();
    } catch (err) {
      alert("Sync failed: " + err.message);
    } finally {
      setStockingInProgress(false);
    }
  };

  const filteredShipments = shipments.filter(s => 
      s.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Registry</h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.25em]">Inbound Logistic Registry</p>
        </div>
        <button 
          onClick={() => { setSelectedShipment(null); setNewShipment({ vendor_id: '', estimated_delivery: '', items: [{ product_id: '', quantity: '' }] }); setShowRecordModal(true); }}
          className="flex items-center gap-2 bg-black text-white hover:bg-neutral-900 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
        >
          <Plus size={15} strokeWidth={3} /> Record Manifest
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative group w-full md:w-96">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black transition-colors" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search Manifest Ledger..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-11 pr-5 py-3.5 text-[10px] font-mono font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-200">
                <th className="px-8 py-5 text-left text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Tracking</th>
                <th className="px-8 py-5 text-left text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Vendor</th>
                <th className="px-8 py-5 text-left text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Estimated</th>
                <th className="px-8 py-5 text-center text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Items</th>
                <th className="px-8 py-5 text-center text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredShipments.map(ship => (
                <tr key={ship.id} className="hover:bg-neutral-50/30 group transition-colors duration-150">
                  <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{ship.tracking_number}</td>
                  <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">{ship.vendor?.name}</td>
                  <td className="px-8 py-6 text-[10px] font-mono font-black text-neutral-400 uppercase tracking-[0.1em]">{ship.estimated_delivery}</td>
                  <td className="px-8 py-6 text-center text-[11px] font-mono font-black text-black">{ship.items?.length || 0}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-[9px] font-mono font-black uppercase tracking-widest transition-all ${
                      ship.status === 'delivered' 
                        ? 'bg-black text-white border border-black shadow-sm' 
                        : 'border border-neutral-300 bg-white text-black'
                    }`}>
                      {ship.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {ship.status !== 'delivered' && (
                        <button 
                          onClick={() => { setSelectedShipment(ship); setShowStockInModal(true); }}
                          className="px-4 py-2 bg-black text-white hover:bg-neutral-900 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest shadow-sm hover:scale-[1.03] active:scale-[0.97] transition-all"
                        >
                          Receive Stock
                        </button>
                      )}
                      <button 
                        onClick={() => { setSelectedShipment(ship); setShowQrModal(true); }}
                        className="p-2 border border-neutral-200 text-black hover:bg-black hover:text-white rounded-xl transition-all duration-200"
                      >
                        <QrCode size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-8 py-12 text-center text-[10px] font-black text-neutral-300 uppercase tracking-widest">
                    No Manifest Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: Record Manifest */}
      <SlideDrawer
        isOpen={showRecordModal}
        onClose={() => { setShowRecordModal(false); setSelectedShipment(null); }}
        title="Record Manifest"
        subtitle="Configure Inbound Cargo Vector"
      >
        <div className="flex flex-col h-full justify-between">
          <form onSubmit={handleCommitShipment} className="space-y-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Vendor</label>
                <select
                  required value={newShipment.vendor_id}
                  onChange={e => setNewShipment({...newShipment, vendor_id: e.target.value})}
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-1">Expected Delivery</label>
                <input
                  type="date" required value={newShipment.estimated_delivery}
                  onChange={e => setNewShipment({...newShipment, estimated_delivery: e.target.value})}
                  className="w-full px-5 py-4 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Bulk Details</h4>
                  <button 
                    type="button" 
                    onClick={() => setNewShipment({...newShipment, items: [...newShipment.items, {product_id: '', quantity: ''}]})} 
                    className="text-[9px] font-black text-black uppercase tracking-widest border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    + Add Entity
                  </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {newShipment.items.map((item, i) => (
                      <div key={i} className="flex gap-3 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                          <select
                              required value={item.product_id}
                              onChange={e => { const ni = [...newShipment.items]; ni[i].product_id = e.target.value; setNewShipment({...newShipment, items: ni}); }}
                              className="flex-[2] bg-transparent text-[10px] font-black uppercase tracking-widest outline-none"
                          >
                            <option value="">Select Product</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                          </select>
                          <input
                              type="number" placeholder="Qty" value={item.quantity}
                              onChange={e => { const ni = [...newShipment.items]; ni[i].quantity = e.target.value; setNewShipment({...newShipment, items: ni}); }}
                              className="w-20 bg-transparent text-[10px] font-mono font-black uppercase tracking-widest outline-none text-center border-l border-neutral-200 pl-2"
                          />
                          {newShipment.items.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => { const ni = [...newShipment.items]; ni.splice(i, 1); setNewShipment({...newShipment, items: ni}); }} 
                              className="text-neutral-400 hover:text-black transition-colors"
                            >
                              <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                          )}
                      </div>
                  ))}
              </div>
            </div>
            <div className="pt-8 flex items-center gap-3 border-t border-neutral-100 mt-auto">
              <button type="button" onClick={() => { setShowRecordModal(false); setSelectedShipment(null); }} className="flex-1 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-black transition-colors">Abort</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white hover:bg-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all">Commit Manifest</button>
            </div>
          </form>
        </div>
      </SlideDrawer>

      {/* Sync Confirm Dialog */}
      <ConfirmSheet
        isOpen={showStockInModal && selectedShipment !== null}
        onClose={() => setShowStockInModal(false)}
        onConfirm={handleStockIn}
        title="Sync Inventory"
        message={`Add units from ${selectedShipment?.vendor?.name} to Warehouse Catalog?`}
        confirmText={stockingInProgress ? 'Syncing...' : 'Confirm Sync'}
        cancelText="Abort"
        disabled={stockingInProgress}
      />

      {/* QR Dialog */}
      <CommandDialog
        isOpen={showQrModal && selectedShipment !== null}
        onClose={() => setShowQrModal(false)}
        title="Asset Vector"
        subtitle={`Ref: ${selectedShipment?.tracking_number}`}
      >
        <div className="flex flex-col items-center">
          <div className="w-48 h-48 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-center mb-8 p-6">
            <QrCode size="100%" className="text-black" />
          </div>
          <button className="w-full py-4 bg-black hover:bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-[1.01] transition-all">Print Tag</button>
        </div>
      </CommandDialog>
    </div>
  );
}
