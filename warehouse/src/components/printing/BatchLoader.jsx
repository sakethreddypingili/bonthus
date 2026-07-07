import React, { useState, useEffect } from "react";
import { supabase } from "../../server/supabase/supabase";
import { FolderOpen, Database, RefreshCw, Layers, Search, X } from "lucide-react";

export default function BatchLoader({ isOpen, onClose, categoryPaths, onLoadBatch }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBatchId, setLoadingBatchId] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const fetchBatches = async () => {
    setLoading(true);
    try {
      // Fetch distinct checkpoint names, status, and creation timestamps from pending_products
      const { data, error } = await supabase
        .from("pending_products")
        .select("checkpoint_name, category_id, status, created_at");

      if (error) throw error;

      // Group distinct checkpoints and aggregate counts / oldest dates
      const grouped = {};
      data.forEach((row) => {
        const name = row.checkpoint_name || "Unassigned Batch";
        if (!grouped[name]) {
          grouped[name] = { 
            name, 
            count: 0, 
            pending: 0, 
            confirmed: 0,
            date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ""
          };
        }
        grouped[name].count++;
        if (row.status === "pending") grouped[name].pending++;
        if (row.status === "confirmed") grouped[name].confirmed++;
        
        // Keep the oldest created_at as the checkpoint date reference
        if (row.created_at) {
          const itemDate = new Date(row.created_at).toISOString().split('T')[0];
          if (!grouped[name].date || itemDate < grouped[name].date) {
            grouped[name].date = itemDate;
          }
        }
      });

      setBatches(Object.values(grouped));
    } catch (e) {
      console.error("Failed to fetch Ingestion checkpoints:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
      // Reset filters when opening
      setSearchTerm("");
      setDateFilter("");
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

  // Filtered checkpoints list
  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || batch.date === dateFilter;
    return matchesSearch && matchesDate;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Card Container */}
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] space-y-4 relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-black" />
            Ingestion Checkpoints
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Load pending product batches from the review queue
          </p>
        </div>

        {/* Filters Row */}
        <div className="flex gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
            />
          </div>

          {/* Date Picker Filter */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-3 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors text-gray-700 bg-white"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-black rounded-xl border border-gray-100 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all flex-shrink-0"
            title="Refresh batch list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-black" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Retrieving checkpoints...</span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <Database className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-semibold">No matching checkpoints found.</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                Try refining your filters or create a batch in Intake.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.name}
                  className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl transition-all group"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-800 group-hover:text-black transition-colors">
                      {batch.name}
                    </p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-bold uppercase tracking-wider items-center">
                      <span className="text-gray-400 bg-gray-200/50 px-1 py-0.5 rounded text-[8px]">{batch.date || "No Date"}</span>
                      <span className="text-gray-500">{batch.count} Items</span>
                      <span className="text-yellow-600">● {batch.pending} Pending</span>
                      <span className="text-green-600">● {batch.confirmed} Confirmed</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImportCheckpoint(batch.name)}
                    disabled={loadingBatchId !== null}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 bg-black text-white hover:bg-neutral-800 rounded-xl active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {loadingBatchId === batch.name ? "Loading..." : "Load Queue"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
