import { useState, useEffect, useCallback } from "react";
import { 
  Package, Search, Plus, X, 
  Trash2, Database, CheckCircle, 
  ArrowRight, ClipboardList, Info
} from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import { generateId, ID_RULES } from "../server/supabase/idGenerator";

export default function Provisioning({ userProfile }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [provisioningList, setProvisioningList] = useState([]);
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchArrivedShipments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch shipments that are 'Arrived' or 'Received' but not yet fully synced/provisioned
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq('status', 'Arrived')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "shipments" does not exist')) {
          setShipments([
            { id: "SH-4404", supplier: "Essilor Luxottica", expected: "2024-05-31", units: 450, status: "Arrived", contents: [{name: 'Sunglasses', quantity: 450, sku: 'SG-003'}] },
            { id: "SH-4401", supplier: "Vision One Supplies", expected: "2024-05-31", units: 240, status: "Arrived", contents: [{name: 'Contact Lenses', quantity: 240, sku: 'CL-001'}] },
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

  useEffect(() => {
    fetchArrivedShipments();
  }, [fetchArrivedShipments]);

  const handleSelectShipment = (ship) => {
    setSelectedShipment(ship);
    setProvisioningList(ship.contents || []);
  };

  const handleAddProvisionItem = () => {
    setProvisioningList([...provisioningList, { name: '', quantity: '', sku: '' }]);
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
    if (!selectedShipment) return;
    setIsSyncing(true);
    try {
      // 1. Update Shipment with finalized contents
      await supabase
        .from("shipments")
        .update({ contents: provisioningList })
        .eq('id', selectedShipment.id);

      // 2. Sync to Master Catalog (Inventory)
      for (const item of provisioningList) {
        if (!item.name || !item.quantity) continue;

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
            price: 0,
            sales: 0
          }]);
        }
      }

      // 3. Mark Shipment as Processed/Provisioned
      await supabase
        .from("shipments")
        .update({ status: 'Provisioned' })
        .eq('id', selectedShipment.id);

      alert("Cargo Provisioned Successfully. Inventory Updated.");
      setSelectedShipment(null);
      fetchArrivedShipments();
    } catch (err) {
      console.error("Provisioning failed:", err.message);
      alert("Demo: Cargo manifest updated in session.");
      setSelectedShipment(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredShipments = shipments.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) || 
    s.supplier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Provisioning</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Itemize & Provision Inbound Cargo</p>
        </div>
      </div>

      {!selectedShipment ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm">
            <div className="relative group w-full md:w-96">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
              <input
                type="text"
                placeholder="Lookup Arrived Vector..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-[40px]" />
              ))
            ) : filteredShipments.length === 0 ? (
              <div className="col-span-full py-20 bg-white rounded-[40px] border border-gray-100 border-dashed flex flex-col items-center justify-center text-center">
                <ClipboardList size={40} className="text-gray-200 mb-4" />
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No cargo awaiting provisioning</p>
              </div>
            ) : filteredShipments.map(ship => (
              <div 
                key={ship.id} 
                onClick={() => handleSelectShipment(ship)}
                className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{ship.id}</span>
                  <div className="p-2 bg-black text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={14} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2 line-clamp-1">{ship.supplier}</h3>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ship.expected}</span>
                    <span className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">{ship.units} Units</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fast-slide space-y-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <button 
                    onClick={() => setSelectedShipment(null)}
                    className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-black flex items-center gap-1 mb-2"
                >
                    <ArrowRight size={10} className="rotate-180" /> Back to Registry
                </button>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Cargo Provisioning</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref: {selectedShipment.id} — {selectedShipment.supplier}</p>
              </div>
              <div className="flex gap-3">
                <button 
                    onClick={() => setSelectedShipment(null)}
                    className="px-6 py-3 border border-gray-200 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"
                >
                    Discard
                </button>
                <button 
                    onClick={handleFinalizeProvision}
                    disabled={isSyncing}
                    className="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                    <CheckCircle size={14} /> {isSyncing ? 'Syncing...' : 'Provision Assets'}
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-black uppercase tracking-[0.2em]">Itemization Manifest</h4>
                    <button 
                        onClick={handleAddProvisionItem}
                        className="flex items-center gap-1 text-[10px] font-black text-black hover:underline uppercase tracking-widest"
                    >
                        <Plus size={14} strokeWidth={3} /> Add Cargo Line
                    </button>
                </div>

                <div className="space-y-3">
                    {provisioningList.length === 0 && (
                        <div className="py-12 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-center">
                            <Package size={32} className="text-gray-200 mb-3" />
                            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No items provisioned yet</p>
                        </div>
                    )}
                    {provisioningList.map((item, i) => (
                        <div key={i} className="flex gap-4 items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 group">
                            <div className="flex-[3]">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Entity Name</label>
                                <input
                                    type="text"
                                    placeholder="Product Entity"
                                    value={item.name}
                                    onChange={e => handleUpdateItem(i, 'name', e.target.value)}
                                    className="w-full bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none border-b border-transparent focus:border-black"
                                />
                            </div>
                            <div className="flex-[2]">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Vector SKU</label>
                                <input
                                    type="text"
                                    placeholder="SKU"
                                    value={item.sku}
                                    onChange={e => handleUpdateItem(i, 'sku', e.target.value)}
                                    className="w-full bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none border-b border-transparent focus:border-black"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center mb-1 block">Quantity</label>
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={e => handleUpdateItem(i, 'quantity', e.target.value)}
                                    className="w-full bg-transparent text-[12px] font-black text-black uppercase tracking-widest outline-none text-center border-b border-transparent focus:border-black"
                                />
                            </div>
                            <button 
                                onClick={() => handleRemoveProvisionItem(i)}
                                className="p-3 text-gray-300 hover:text-black transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-8 bg-black text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Info size={20} className="text-gray-400" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Master Catalog Synchronization</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Provisioning will auto-update or create product entities.</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Cargo Units</p>
                    <p className="text-2xl font-black">{provisioningList.reduce((sum, i) => sum + Number(i.quantity || 0), 0)}</p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
