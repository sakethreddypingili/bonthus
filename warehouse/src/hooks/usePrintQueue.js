import { useState, useEffect, useCallback } from "react";
import { supabase } from "../server/supabase/supabase";

/**
 * Custom hook for managing the print queue state and actions.
 * Persists state to localStorage.
 */
export function usePrintQueue() {
  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem("bonthus_print_queue");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load print queue from localStorage:", e);
      return [];
    }
  });

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem("bonthus_print_queue", JSON.stringify(queue));
  }, [queue]);

  const addItems = useCallback((items) => {
    // items is an array of { id, barcodeValue, categoryId, categoryName, quantity, status: "pending" }
    setQueue((prev) => {
      // Avoid duplicate barcodes in the current queue list
      const existingBarcodes = new Set(prev.map((i) => i.barcodeValue));
      const filteredNew = items.filter((i) => !existingBarcodes.has(i.barcodeValue));
      return [...prev, ...filteredNew];
    });
  }, []);

  const addSingleItem = useCallback((item) => {
    setQueue((prev) => {
      if (prev.some((i) => i.barcodeValue === item.barcodeValue)) {
        return prev; // skip duplicates
      }
      return [...prev, item];
    });
  }, []);

  const updateItemQty = useCallback((id, qty) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  }, []);

  const updateItemStatus = useCallback((id, status) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }, []);

  const removeItem = useCallback((id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== "done"));
  }, []);

  const reorderQueue = useCallback((startIndex, endIndex) => {
    setQueue((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  /**
   * Helper to load items from Supabase `pending_products` by a specific checkpoint_name.
   */
  const loadBatchFromSupabase = useCallback(async (checkpointName, categoryPathsMap) => {
    try {
      // 1. Fetch SKUs for the given checkpointName from pending_products
      const { data: pendingProds, error: pendingErr } = await supabase
        .from("pending_products")
        .select("sku")
        .eq("checkpoint_name", checkpointName);

      if (pendingErr) throw pendingErr;
      if (!pendingProds || pendingProds.length === 0) return 0;

      const skus = pendingProds.map(p => p.sku);

      // 2. Fetch printing data from barcode_printing table matching those SKUs
      const { data: printData, error: printErr } = await supabase
        .from("barcode_printing")
        .select("*")
        .in("sku", skus)
        .eq("status", "pending");

      if (printErr) throw printErr;
      if (!printData || printData.length === 0) return 0;

      const formatted = printData.map((item) => {
        return {
          id: item.id.toString(),
          barcodeValue: item.barcode || item.sku,
          brandValue: item.brand || "",
          modelValue: item.model_no || "",
          skuValue: item.sku,
          categoryId: null,
          categoryName: item.category_name || "Uncategorized",
          priceValue: item.price ? item.price.toString() : "1200",
          sizeA: item.a || "",
          sizeB: item.b || "",
          dbl: item.dbl || "",
          templeLength: item.tem || "",
          quantity: 1, // Default to 1 label per item in the batch
          status: "pending",
          addedAt: new Date().toISOString(),
        };
      });

      addItems(formatted);
      return formatted.length;
    } catch (e) {
      console.error("Error loading batch from Supabase:", e);
      throw e;
    }
  }, [addItems]);

  return {
    queue,
    addItems,
    addSingleItem,
    updateItemQty,
    updateItemStatus,
    removeItem,
    clearQueue,
    clearCompleted,
    reorderQueue,
    loadBatchFromSupabase,
  };
}
