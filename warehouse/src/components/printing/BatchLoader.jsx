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

  const getLocalDateString = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("pending_products")
          .select("checkpoint_name, category_id, status, created_at")
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      // Group distinct checkpoints and aggregate counts / oldest dates
      const grouped = {};
      allData.forEach((row) => {
        const name = row.checkpoint_name || "Unassigned Batch";
        if (!grouped[name]) {
          grouped[name] = { 
            name, 
            count: 0, 
            pending: 0, 
            confirmed: 0,
            date: row.created_at ? getLocalDateString(row.created_at) : ""
          };
        }
        grouped[name].count++;
        if (row.status === "pending") grouped[name].pending++;
        if (row.status === "confirmed") grouped[name].confirmed++;
        
        // Keep the oldest created_at as the checkpoint date reference (local timezone day)
        if (row.created_at) {
          const itemDate = getLocalDateString(row.created_at);
          if (!grouped[name].date || itemDate < grouped[name].date) {
            grouped[name].date = itemDate;
          }
        }
      });

      // Sort batches: newest date first, alphabetically by name
      const sorted = Object.values(grouped).sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date); // newest date first
        }
        return a.name.localeCompare(b.name);
      });

      setBatches(sorted);
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
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col animate-in fade-in duration-200">
      {/* Full Screen Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-black" />
          <div>
            <h1 className="text-sm font-black text-gray-900 uppercase tracking-wider">
              Ingestion Checkpoints
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Load pending product batches into the active print queue
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-black text-gray-500 hover:text-black rounded-xl text-xs font-bold transition-all active:scale-95 bg-white"
        >
          <X className="w-4 h-4" /> Close Screen
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 flex flex-col space-y-6 overflow-hidden">
        {/* Filters Panel */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by checkpoint name, batch brand, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-black bg-gray-50/50 transition-colors"
            />
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">Filter Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-700 bg-white"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter("")}
                className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black border border-gray-200 hover:border-black rounded-xl bg-white disabled:opacity-50 transition-all flex-shrink-0 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Batches</span>
            <span className="text-2xl font-black text-gray-900 mt-1">{filteredBatches.length}</span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Products</span>
            <span className="text-2xl font-black text-gray-900 mt-1">
              {filteredBatches.reduce((acc, b) => acc + b.count, 0)}
            </span>
          </div>
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 min-h-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-gray-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-black" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Querying Supabase database...</span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="py-24 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-700">No matching checkpoints found</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                Verify the selected date or refine your query string.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200/60 rounded-2xl transition-all group gap-4"
                >
                  <div className="space-y-2">
                    <h2 className="text-xs font-black text-gray-900 group-hover:text-black transition-colors break-words">
                      {batch.name}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wider items-center">
                      <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{batch.date || "No Date"}</span>
                      <span className="text-gray-500 bg-gray-200/50 px-2 py-0.5 rounded-full">{batch.count} Items</span>
                      <span className="text-yellow-600 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full">{batch.pending} Pending</span>
                      <span className="text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">{batch.confirmed} Confirmed</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImportCheckpoint(batch.name)}
                    disabled={loadingBatchId !== null}
                    className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider px-4 py-2.5 bg-black text-white hover:bg-neutral-800 rounded-xl active:scale-95 transition-all disabled:opacity-50 flex-shrink-0 w-full sm:w-auto"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {loadingBatchId === batch.name ? "Loading..." : "Load Queue"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
