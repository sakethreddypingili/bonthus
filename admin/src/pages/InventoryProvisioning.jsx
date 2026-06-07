import { useState, useEffect, useCallback } from "react";
import { 
  Package, Search, Plus, X, 
  Trash2, Database, CheckCircle, 
  ArrowRight, ClipboardList, Info
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";

export default function InventoryProvisioning({ userProfile }) {
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [provisioningList, setProvisioningList] = useState([]);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [warehouseId, setWarehouseId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: wData } = await supabase.from('stores').select('id').eq('name', 'Main Warehouse').single();
      if (wData) setWarehouseId(wData.id);

      const { data: sData } = await supabase
        .from("shipments")
        .select(`
          *,
          vendor:vendors(name),
          items:shipment_items(
            id,
            product_id,
            quantity
          )
        `)
        .eq('status', 'preparing')
        .order('created_at', { ascending: false });
      
      setShipments(sData || []);

      const { data: pData } = await supabase.from("products").select("id, name, sku");
      setProducts(pData || []);
    } catch (err) {
      console.error("Error fetching data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectShipment = (ship) => {
    setSelectedShipment(ship);
    setProvisioningList(ship.items || []);
  };

  const handleAddProvisionItem = () => {
    setProvisioningList([...provisioningList, { product_id: '', quantity: '' }]);
  };

  const handleRemoveProvisionItem = (index) => {
    const newList = [...provisioningList];
    newList.splice(index, 1);
    setProvisioningList(newList);
  };

  const handleUpdateItem = (index, field, value) => {
    const newList = [...provisioningList];
    newList[index][field] = value;
    setProvisioningList(newList);
  };

  const handleFinalizeProvision = async () => {
    if (!selectedShipment || !warehouseId) return;
    setIsSyncing(true);
    try {
      // 1. Delete old items and insert new ones
      await supabase.from("shipment_items").delete().eq("shipment_id", selectedShipment.id);
      
      const newItems = provisioningList.map(item => ({
        shipment_id: selectedShipment.id,
        product_id: item.product_id,
        quantity: Number(item.quantity)
      }));

      const { error: itemsError } = await supabase.from("shipment_items").insert(newItems);
      if (itemsError) throw itemsError;

      // 2. Sync to Master Catalog (Inventory)
      for (const item of provisioningList) {
        if (!item.product_id || !item.quantity) continue;

        const { data: existing } = await supabase
          .from("store_inventory")
          .select("id, stock_quantity")
          .eq("store_id", warehouseId)
          .eq("product_id", item.product_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("store_inventory")
            .update({ stock_quantity: existing.stock_quantity + Number(item.quantity) })
            .eq("id", existing.id);
        } else {
          await supabase.from("store_inventory").insert([{
            store_id: warehouseId,
            product_id: item.product_id,
            stock_quantity: Number(item.quantity),
            low_stock_threshold: 10
          }]);
        }
      }

      // 3. Mark Shipment as Delivered
      await supabase
        .from("shipments")
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', selectedShipment.id);

      alert("Cargo Provisioned Successfully. Warehouse Inventory Updated.");
      setSelectedShipment(null);
      fetchData();
    } catch (err) {
      alert("Provisioning failed: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredShipments = shipments.filter(s => 
    s.tracking_number?.toLowerCase().includes(search.toLowerCase()) || 
    s.vendor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Provisioning</h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.25em]">Itemize & Provision Inbound Cargo</p>
        </div>
      </div>

      {!selectedShipment ? (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-sm">
            <div className="relative group w-full md:w-96">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-black transition-colors" strokeWidth={3} />
              <input
                type="text"
                placeholder="Lookup Preparation Vector..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-11 pr-5 py-3.5 text-[10px] font-mono font-black uppercase tracking-widest focus:ring-1 focus:ring-black focus:border-black focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-44 bg-neutral-100 animate-pulse rounded-3xl" />
              ))
            ) : filteredShipments.length === 0 ? (
              <div className="col-span-full py-20 bg-white rounded-3xl border border-neutral-200 border-dashed flex flex-col items-center justify-center text-center">
                <ClipboardList size={36} className="text-neutral-300 mb-4" />
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">No cargo awaiting itemization</p>
              </div>
            ) : filteredShipments.map(ship => (
              <div 
                key={ship.id} 
                onClick={() => handleSelectShipment(ship)}
                className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm hover:border-black hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer group flex flex-col justify-between h-44"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest">{ship.tracking_number}</span>
                  <div className="p-2 bg-black text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowRight size={12} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-black uppercase tracking-tight mb-2 line-clamp-1">{ship.vendor?.name}</h3>
                  <div className="flex items-center gap-4">
                      <span className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest">{ship.estimated_delivery}</span>
                      <span className="px-2.5 py-1 bg-black text-white text-[9px] font-mono font-black uppercase tracking-widest rounded-full">{ship.items?.length || 0} Entities</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Provisioning Detail Form */
        <div className="animate-fast-slide space-y-8">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-neutral-200 flex flex-col md:flex-row justify-between md:items-center bg-neutral-50/50 gap-6">
              <div>
                <button 
                  onClick={() => setSelectedShipment(null)}
                  className="text-[9px] font-black text-neutral-400 uppercase tracking-widest hover:text-black flex items-center gap-1.5 mb-2 transition-colors"
                >
                  <ArrowRight size={10} className="rotate-180" strokeWidth={3} /> Back to Registry
                </button>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Cargo Provisioning</h3>
                <p className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest mt-1">Ref: {selectedShipment.tracking_number} — {selectedShipment.vendor?.name}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedShipment(null)}
                  className="px-5 py-3 border border-neutral-200 text-black hover:bg-neutral-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
                >
                  Discard
                </button>
                <button 
                  onClick={handleFinalizeProvision}
                  disabled={isSyncing}
                  className="px-7 py-3 bg-black text-white hover:bg-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
                >
                  <CheckCircle size={13} strokeWidth={2.5} /> {isSyncing ? 'Syncing...' : 'Provision Assets'}
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Itemization Manifest</h4>
                <button 
                  onClick={handleAddProvisionItem}
                  className="flex items-center gap-1.5 text-[9px] font-black text-black hover:underline uppercase tracking-widest border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <Plus size={13} strokeWidth={3} /> Add Cargo Line
                </button>
              </div>

              <div className="space-y-3">
                {provisioningList.length === 0 && (
                  <div className="py-12 border border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center text-center bg-neutral-50/20">
                    <Package size={28} className="text-neutral-300 mb-3" />
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">No items provisioned yet</p>
                  </div>
                )}
                {provisioningList.map((item, i) => (
                  <div key={i} className="flex gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200 group">
                    <div className="flex-[3]">
                      <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1 mb-1 block">Product Entity</label>
                      <select
                        required value={item.product_id}
                        onChange={e => handleUpdateItem(i, 'product_id', e.target.value)}
                        className="w-full bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-b border-transparent focus:border-black pb-1"
                      >
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest text-center mb-1 block">Quantity</label>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(i, 'quantity', e.target.value)}
                        className="w-full bg-transparent text-[11px] font-mono font-black text-black uppercase tracking-widest outline-none text-center border-b border-transparent focus:border-black pb-1"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveProvisionItem(i)}
                      className="p-2 text-neutral-400 hover:text-black transition-colors"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Alert Banner */}
            <div className="p-8 bg-black text-white flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-neutral-900">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Info size={18} className="text-neutral-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Master Catalog Synchronization</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Provisioning will auto-update warehouse inventory levels.</p>
                </div>
              </div>
              <div className="text-right shrink-0 w-full sm:w-auto border-t sm:border-0 border-neutral-800 pt-4 sm:pt-0">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Total Cargo Units</p>
                <p className="text-3xl font-mono font-black mt-1">{provisioningList.reduce((sum, i) => sum + Number(i.quantity || 0), 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
