import React, { useState, useEffect } from "react";
import { supabase } from "../../server/supabase/supabase";
import { FolderOpen, Database, RefreshCw, Layers } from "lucide-react";

export default function BatchLoader({ isOpen, onClose, categoryPaths, onLoadBatch }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBatchId, setLoadingBatchId] = useState(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      // Fetch distinct checkpoint names from pending_products
      const { data, error } = await supabase
        .from("pending_products")
        .select("checkpoint_name, category_id, status");

      if (error) throw error;

      // Group distinct checkpoints and aggregate counts
      const grouped = {};
      data.forEach((row) => {
        const name = row.checkpoint_name || "Unassigned Batch";
        if (!grouped[name]) {
          grouped[name] = { name, count: 0, pending: 0, confirmed: 0 };
        }
        grouped[name].count++;
        if (row.status === "pending") grouped[name].pending++;
        if (row.status === "confirmed") grouped[name].confirmed++;
      });

      setBatches(Object.values(grouped));
    } catch (e) {
      console.error("Failed to fetch ingestion checkpoints:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen]);

  const handleImportCheckpoint = async (checkpointName) => {
    setLoadingBatchId(checkpointName);
    try {
      await onLoadBatch(checkpointName);
    } catch (e) {
      alert("Failed to load batch: " + e.message);
    } finally {
      setLoadingBatchId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-black" />
            Ingestion Checkpoints
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Load pending product batches from the review queue
          </p>
        </div>
        <button
          onClick={fetchBatches}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-black rounded-lg border border-gray-100 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all"
          title="Refresh batch list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-black" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Retrieving checkpoints...</span>
        </div>
      ) : batches.length === 0 ? (
        <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-xs font-semibold">No active checkpoint batches found.</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">
            Create a batch in "Product List" > "Batch Load" first.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
          {batches.map((batch) => (
            <div
              key={batch.name}
              className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl transition-all group"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-800 group-hover:text-black transition-colors">
                  {batch.name}
                </p>
                <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider">
                  <span className="text-gray-400">{batch.count} Items</span>
                  <span className="text-yellow-600">● {batch.pending} Pending</span>
                  <span className="text-green-600">● {batch.confirmed} Confirmed</span>
                </div>
              </div>
              <button
                onClick={() => handleImportCheckpoint(batch.name)}
                disabled={loadingBatchId !== null}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-2 bg-black text-white hover:bg-neutral-800 rounded-lg active:scale-95 transition-all disabled:opacity-50"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {loadingBatchId === batch.name ? "Loading..." : "Load Queue"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
