import React from "react";
import { Trash2, GripVertical, CheckCircle2, Play, AlertCircle, RefreshCw } from "lucide-react";

export default function PrintQueue({
  queue,
  onUpdateQty,
  onRemove,
  onClear,
  onClearCompleted,
  onPrintBatch,
  isPrinting,
  currentIndex,
  activeMode
}) {
  const totalLabels = queue.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
            Active Print Queue
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {queue.length} items ({totalLabels} total labels to print)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {queue.some((i) => i.status === "done") && (
            <button
              onClick={onClearCompleted}
              disabled={isPrinting}
              className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 bg-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              Clear Completed
            </button>
          )}
          {queue.length > 0 && (
            <button
              onClick={onClear}
              disabled={isPrinting}
              className="px-3 py-1.5 border border-red-100 hover:border-red-200 text-red-500 hover:bg-red-50 bg-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              Clear All
            </button>
          )}
          {queue.length > 0 && (
            <button
              onClick={onPrintBatch}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Printing {currentIndex + 1}/{queue.length}...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Start Batch Print
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Queue Listing Table */}
      {queue.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <p className="text-xs font-semibold">The print queue is currently empty.</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">
            Scan a barcode or use Ingestion Checkpoints to add items.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-10 py-3 pl-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Seq</th>
                <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Barcode</th>
                <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Category path</th>
                <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center w-24">Labels</th>
                <th className="py-3 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest w-28">Status</th>
                <th className="py-3 pr-4 text-right w-12"></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item, idx) => {
                const isActive = isPrinting && currentIndex === idx;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-50 transition-all ${
                      isActive ? "bg-amber-50/40" : item.status === "done" ? "bg-gray-50/30 opacity-70" : "hover:bg-gray-50/20"
                    }`}
                  >
                    {/* Index Sequence */}
                    <td className="py-3.5 pl-4 text-xs font-bold text-gray-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* Barcode Value */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-gray-800">{item.barcodeValue}</span>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                          {item.brandValue || "Generic"} {item.modelValue ? `| M: ${item.modelValue}` : ""} {item.skuValue ? `| SKU: ${item.skuValue}` : ""}
                        </span>
                      </div>
                    </td>

                    {/* Category Path */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-gray-500 font-medium">{item.categoryName}</span>
                    </td>

                    {/* Quantity Edit */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={item.quantity || 1}
                        disabled={isPrinting}
                        onChange={(e) => onUpdateQty(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-center focus:outline-none focus:ring-1 focus:ring-black bg-white disabled:opacity-50"
                      />
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {item.status === "pending" && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Pending</span>
                          </>
                        )}
                        {item.status === "printing" && (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider animate-pulse">Printing</span>
                          </>
                        )}
                        {item.status === "done" && (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Done</span>
                          </>
                        )}
                        {item.status === "error" && (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Error</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Remove Action */}
                    <td className="py-3.5 pr-4 text-right">
                      <button
                        onClick={() => onRemove(item.id)}
                        disabled={isPrinting}
                        className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition-all disabled:opacity-50"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
