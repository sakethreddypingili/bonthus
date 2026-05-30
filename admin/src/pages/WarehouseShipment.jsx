import { useState } from"react";
import { 
  Truck, Plus, Search, Download, QrCode, X, 
  ChevronLeft, ChevronRight, CheckCircle2, Clock
} from"lucide-react";

const MOCK_INBOUND = [
  { id:"IN-4401", supplier:"Vision One Supplies", expected:"Today, 03:30 PM", items: 240, status:"In Transit" },
  { id:"IN-4402", supplier:"Apex Optical Co.", expected:"Tomorrow, 10:00 AM", items: 180, status:"Scheduled" },
  { id:"IN-4403", supplier:"ClearView Distribution", expected:"May 31, 01:15 PM", items: 96, status:"Delayed" },
  { id:"IN-4404", supplier:"Essilor Luxottica", expected:"Today, 11:00 AM", items: 450, status:"Arrived" },
];

export default function Shipment({ userProfile }) {
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  return (
    <div className="space-y-8 pb-20 animate-fast-slide">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Shipment</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Manage Supplier Shipments & Restock Deliveries</p>
        </div>
        <button 
          onClick={() => setShowRecordModal(true)}
          className="flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={3} /> Record Shipment
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative group w-full md:w-96">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Lookup Shipment Vector..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
          />
        </div>
        <div className="flex gap-2">
            {['All', 'In Transit', 'Arrived', 'Delayed'].map(s => (
                <button key={s} className="px-4 py-2 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 rounded-xl hover:text-black hover:bg-gray-100">{s}</button>
            ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Manifest Code</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Supplier Entity</th>
                <th className="px-8 py-6 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Expected Arrival</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Units</th>
                <th className="px-8 py-6 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_INBOUND.map(ship => (
                <tr key={ship.id} className="hover:bg-gray-50/50  group">
                  <td className="px-8 py-6 font-mono text-[11px] font-black text-black">{ship.id}</td>
                  <td className="px-8 py-6 text-[11px] font-black text-black uppercase tracking-tight">{ship.supplier}</td>
                  <td className="px-8 py-6 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <Clock size={12} />
                        {ship.expected}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center text-[12px] font-black text-black">{ship.items}</td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      ship.status === 'Arrived' ? 'bg-black text-white shadow-lg' : 
                      ship.status === 'In Transit' ? 'border border-black text-black' : 
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {ship.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-4 py-2 bg-black text-white rounded-xl shadow-lg hover:scale-110  text-[9px] font-black uppercase tracking-widest">
                        Receive
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => { setSelectedShipment(ship); setShowQrModal(true); }}
                          className="p-2 border border-gray-200 text-black rounded-xl hover:bg-gray-50"
                        >
                          <QrCode size={14} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Shipment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fast-zoom">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Record Shipment</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Log inbound inventory vector</p>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={e => { e.preventDefault(); setShowRecordModal(false); }} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Supplier / Origin</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zeiss Optics"
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Expected Date</label>
                  <input type="date" required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Total Units</label>
                  <input type="number" required min="1" className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none" />
                </div>
              </div>

              <div className="pt-8 flex items-center gap-3 border-t border-gray-50">
                <button type="button" onClick={() => setShowRecordModal(false)} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Abort</button>
                <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95">
                  Commit Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Tracking Modal */}
      {showQrModal && selectedShipment && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fast-zoom">
          <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-black uppercase tracking-tighter">Tracking Vector</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref: {selectedShipment.id}</p>
              </div>
              <button onClick={() => setShowQrModal(false)} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full">
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-50 rounded-[32px] border border-gray-200 shadow-inner flex items-center justify-center mb-8">
                <QrCode size={120} strokeWidth={1} className="opacity-80" />
              </div>
              <p className="text-[12px] font-black text-black uppercase tracking-tight mb-1">{selectedShipment.supplier}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Asset Tag Ready</p>
              <button className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105  flex items-center justify-center gap-2">
                <Download size={16} strokeWidth={3} /> Save Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
