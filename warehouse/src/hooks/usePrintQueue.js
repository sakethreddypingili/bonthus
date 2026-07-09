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
      // 1. Fetch categories map
      const { data: cats } = await supabase.from("categories").select("id, name");
      const catsMap = { ...categoryPathsMap };
      if (cats) {
        cats.forEach(c => {
          catsMap[c.id] = c.name;
        });
      }

      // 2. Fetch pending products matching this checkpoint
      const { data: pendingProds, error: pendingErr } = await supabase
        .from("pending_products")
        .select("*")
        .eq("checkpoint_name", checkpointName);

      if (pendingErr) throw pendingErr;
      if (!pendingProds || pendingProds.length === 0) return 0;

      // 3. Fetch barcodes mapping for these pending products
      const productIds = pendingProds.map(p => p.id);
      const { data: barcodeData } = await supabase
        .from("pending_product_barcodes")
        .select("pending_product_id, barcode")
        .in("pending_product_id", productIds);

      const barcodeMap = {};
      if (barcodeData) {
        barcodeData.forEach(b => {
          barcodeMap[b.pending_product_id] = b.barcode;
        });
      }

      const formatted = pendingProds.map((item) => {
        let desc = {};
        try {
          desc = JSON.parse(item.description || "{}");
        } catch (e) {
          console.error("Failed to parse description JSON:", e);
        }

        const categoryName = catsMap[item.category_id] || desc.type || "Eyewear";
        const barcodeVal = barcodeMap[item.id] || item.sku;

        return {
          id: item.id.toString(),
          barcodeValue: barcodeVal,
          brandValue: item.brand || "",
          modelValue: desc.modelNo || "",
          skuValue: item.sku,
          categoryId: item.category_id,
          categoryName: categoryName,
          priceValue: item.base_price ? item.base_price.toString() : "1200",
          sizeA: desc.sizeA || "",
          sizeB: desc.sizeB || "",
          dbl: desc.dbl || "",
          templeLength: desc.templeLength || "",
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
