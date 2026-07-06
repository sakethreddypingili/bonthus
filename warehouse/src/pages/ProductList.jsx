import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus, LayoutGrid, List, X, MoreVertical, ChevronDown, Check, Tags, Database, FolderSync, Trash2, CheckCircle2, ChevronRight, AlertCircle, FilePlus, Layers, PackagePlus, ClipboardList } from "lucide-react";
import { supabase } from "../server/supabase/supabase";
import SlideDrawer from "../components/common/SlideDrawer";

// Auto-generate a unique 5-character uppercase alphanumeric code
const generateSKU = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Auto-generate a unique 13-digit EAN-style barcode
const generateBarcode = () => {
  return "8901" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
};

export default function ProductList({ userProfile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabParam = new URLSearchParams(location.search).get("tab") || "stock";
  const activeTab = ["stock", "quick-add", "batch-load", "review-queue"].includes(tabParam) ? tabParam : "stock";

  const setActiveTab = (tabName) => {
    navigate(`/products?tab=${tabName}`, { replace: true });
  };
  
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [categories, setCategories] = useState([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Single product state (for Quick Add)
  const [productData, setProductData] = useState({
    name: '', sku: generateSKU(), brand: '', base_price: '', category_id: '', description: '',
    stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
  });

  const [editingItem, setEditingItem] = useState(null);
  const [cascadePath, setCascadePath] = useState([]);

  // Pending Queue state
  const [pendingItems, setPendingItems] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedPendingIds, setSelectedPendingIds] = useState(new Set());
  
  // Batch Load state
  const [bulkCheckpointName, setBulkCheckpointName] = useState("");
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkCascadePath, setBulkCascadePath] = useState([]);
  const [bulkRows, setBulkRows] = useState([
    { name: '', brand: '', base_price: '', sku: generateSKU(), stock_quantity: '1', low_stock_threshold: '5' }
  ]);
  const [batchStage, setBatchStage] = useState('details'); // 'details' | 'products' | 'review'
  const [showEditDetailsPopup, setShowEditDetailsPopup] = useState(false);
  const [showConfirmEditDetailsPopup, setShowConfirmEditDetailsPopup] = useState(false);

  const isSuperAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin' || userProfile?.role === 'warehouse';

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: sData } = await supabase.from('stores').select('id, name').order('name');
      setStores(sData || []);
      
      const mainWarehouse = sData?.find(s => s.name === 'Main Warehouse');
      const defaultStore = isSuperAdmin ? (mainWarehouse?.id || sData?.[0]?.id) : userProfile?.store_id;
      setSelectedStore(defaultStore || "");

      const { data: cData } = await supabase.from('categories').select('id, name, parent_id').order('name');
      setCategories(cData || []);
    } catch (err) {
      console.error("Error fetching initial data:", err.message);
    }
  }, [isSuperAdmin, userProfile?.store_id]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const categoryPaths = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.id] = c;
    });
    
    const paths = {};
    const getPath = (id) => {
      if (paths[id]) return paths[id];
      const cat = map[id];
      if (!cat) return '';
      if (!cat.parent_id) {
        paths[id] = cat.name;
        return cat.name;
      }
      const parentPath = getPath(cat.parent_id);
      paths[id] = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      return paths[id];
    };
    
    categories.forEach(c => {
      getPath(c.id);
    });
    return paths;
  }, [categories]);

  const [frameFields, setFrameFields] = useState({
    modelNo: '',
    color: '',
    frameType: '',
    frameShape: '',
    sizeA: '',
    sizeB: '',
    templeLength: '',
    dbl: ''
  });

  const [lensFields, setLensFields] = useState({
    lensType: '',
    index: '',
    material: '',
    coating: '',
    sph: '',
    cyl: '',
    axis: '',
    add: ''
  });

  const getCategoryType = useCallback((categoryId) => {
    if (!categoryId) return null;
    const path = (categoryPaths[categoryId] || "").toLowerCase();
    if (path.includes("frame")) return "frame";
    if (path.includes("lens")) return "lens";
    return null;
  }, [categoryPaths]);

  const renderProductDescription = useCallback((desc) => {
    if (!desc) return "";
    if (desc.startsWith("{")) {
      try {
        const data = JSON.parse(desc);
        if (data.type === 'frame') {
          return `Frame: Model: ${data.modelNo || 'N/A'} | Color: ${data.color || 'N/A'} | Type: ${data.frameType || 'N/A'} | Shape: ${data.frameShape || 'N/A'} | Size: ${data.sizeA || 'N/A'}-${data.sizeB || 'N/A'}-${data.templeLength || 'N/A'}-${data.dbl || 'N/A'}`;
        } else if (data.type === 'lens') {
          return `Lens: Type: ${data.lensType || 'N/A'} | Index: ${data.index || 'N/A'} | Material: ${data.material || 'N/A'} | Coating: ${data.coating || 'N/A'} | SPH: ${data.sph || 'N/A'} | CYL: ${data.cyl || 'N/A'} | Axis: ${data.axis || 'N/A'} | ADD: ${data.add || 'N/A'}`;
        }
        return data.rawDescription || desc;
      } catch (e) {
        return desc;
      }
    }
    return desc;
  }, []);


  const categoryChildMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      const key = c.parent_id || '__root__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [categories]);

  const buildCascadePathForCategory = useCallback((categoryId) => {
    if (!categoryId) {
      setCascadePath([]);
      return;
    }
    const catMap = {};
    categories.forEach(c => {
      catMap[c.id] = c;
    });
    
    const path = [];
    let current = catMap[categoryId];
    while (current) {
      path.unshift(current.id);
      current = current.parent_id ? catMap[current.parent_id] : null;
    }
    setCascadePath(path);
  }, [categories]);

  const handleCategoryLevelSelect = (depth, selectedId) => {
    if (!selectedId) {
      const newPath = cascadePath.slice(0, depth);
      setCascadePath(newPath);
      setProductData(prev => ({ ...prev, category_id: newPath[newPath.length - 1] || '' }));
      return;
    }
    const newPath = [...cascadePath.slice(0, depth), selectedId];
    setCascadePath(newPath);
    setProductData(prev => ({ ...prev, category_id: selectedId }));
  };

  const handleBulkCategoryLevelSelect = (depth, selectedId) => {
    if (!selectedId) {
      const newPath = bulkCascadePath.slice(0, depth);
      setBulkCascadePath(newPath);
      setBulkCategoryId(newPath[newPath.length - 1] || '');
      return;
    }
    const newPath = [...bulkCascadePath.slice(0, depth), selectedId];
    setBulkCascadePath(newPath);
    setBulkCategoryId(selectedId);
  };

  const fetchInventory = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_inventory")
        .select(`
          id,
          stock_quantity,
          unit_price,
          low_stock_threshold,
          product:products (
            id,
            name,
            sku,
            brand,
            base_price,
            description,
            category:categories (
              id,
              name,
              parent_id
            ),
            product_barcodes (
              barcode
            )
          )
        `)
        .eq('store_id', selectedStore);

      if (error) throw error;

      const mapped = data.map(item => ({
        id: item.product?.id,
        inventory_id: item.id,
        name: item.product?.name,
        sku: item.product?.sku,
        barcode: item.product?.product_barcodes?.[0]?.barcode || "-",
        brand: item.product?.brand,
        description: item.product?.description,
        category: item.product?.category ? categoryPaths[item.product.category.id] || item.product.category.name : "",
        category_id: item.product?.category?.id,
        price: item.unit_price || item.product?.base_price || 0,
        stock: item.stock_quantity,
        minStock: item.low_stock_threshold,
        status: item.stock_quantity === 0 ? "Out of Stock" : item.stock_quantity <= item.low_stock_threshold ? "Low Stock" : "Active"
      }));

      setInventory(mapped);
    } catch (err) {
      console.error("Error fetching inventory:", err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStore, categoryPaths]);

  const fetchPendingQueue = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from("pending_products")
        .select(`
          *,
          category:categories (
            id,
            name
          ),
          store:stores (
            id,
            name
          ),
          pending_product_barcodes (
            barcode
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingItems(data || []);
    } catch (err) {
      console.error("Error fetching pending queue:", err.message);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchPendingQueue();
  }, [fetchInventory, fetchPendingQueue]);

  const pendingByCheckpoint = useMemo(() => {
    const groups = {};
    pendingItems.forEach(item => {
      const cp = item.checkpoint_name || "Uncategorized Batch";
      if (!groups[cp]) groups[cp] = [];
      groups[cp].push(item);
    });
    return groups;
  }, [pendingItems]);

  const reviewStats = useMemo(() => {
    const batches = new Set();
    let pendingCount = 0;
    let confirmedCount = 0;
    const batchMap = {};

    pendingItems.forEach(item => {
      const cp = item.checkpoint_name || "Uncategorized Batch";
      batches.add(cp);
      if (item.status === 'pending') {
        pendingCount++;
      } else if (item.status === 'confirmed') {
        confirmedCount++;
      }

      if (!batchMap[cp]) {
        batchMap[cp] = { pending: 0, confirmed: 0, total: 0 };
      }
      batchMap[cp].total++;
      if (item.status === 'pending') batchMap[cp].pending++;
      if (item.status === 'confirmed') batchMap[cp].confirmed++;
    });

    return {
      totalBatches: batches.size,
      pendingCount,
      confirmedCount,
      batchBreakdown: Object.entries(batchMap).map(([name, counts]) => ({
        name,
        ...counts
      }))
    };
  }, [pendingItems]);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    try {
      const catType = getCategoryType(productData.category_id);
      let finalDesc = productData.description;
      if (catType === 'frame') {
        finalDesc = JSON.stringify({
          type: 'frame',
          modelNo: frameFields.modelNo,
          color: frameFields.color,
          frameType: frameFields.frameType,
          frameShape: frameFields.frameShape,
          sizeA: frameFields.sizeA,
          sizeB: frameFields.sizeB,
          templeLength: frameFields.templeLength,
          dbl: frameFields.dbl,
          rawDescription: productData.description
        });
      } else if (catType === 'lens') {
        finalDesc = JSON.stringify({
          type: 'lens',
          lensType: lensFields.lensType,
          index: lensFields.index,
          material: lensFields.material,
          coating: lensFields.coating,
          sph: lensFields.sph,
          cyl: lensFields.cyl,
          axis: lensFields.axis,
          add: lensFields.add,
          rawDescription: productData.description
        });
      }

      if (editingItem) {
        // 1. Update Product
        const { error: pError } = await supabase
          .from('products')
          .update({
            name: productData.name,
            sku: productData.sku,
            brand: productData.brand,
            base_price: Number(productData.base_price),
            category_id: productData.category_id || null,
            description: finalDesc
          })
          .eq('id', editingItem.id);
        
        if (pError) throw pError;

        // 2. Update Store Inventory
        const { error: iError } = await supabase
          .from('store_inventory')
          .upsert({
            id: editingItem.inventory_id,
            store_id: selectedStore,
            product_id: editingItem.id,
            stock_quantity: Number(productData.stock_quantity),
            unit_price: Number(productData.unit_price || productData.base_price),
            low_stock_threshold: Number(productData.low_stock_threshold)
          });
        
        if (iError) throw iError;
        
        setSuccessMessage("Product updated in catalog successfully!");
        setShowEditModal(false);
        setEditingItem(null);
        setCascadePath([]);
        await fetchInventory();
        setActiveTab("stock");
      } else {
        // Quick Add logic (always saves to pending queue under 'Quick Intake')
        const { data: quickAddData, error } = await supabase
          .from("pending_products")
          .insert([{
            checkpoint_name: "Quick Intake",
            name: productData.name,
            sku: productData.sku,
            brand: productData.brand || null,
            base_price: Number(productData.base_price || 0),
            category_id: productData.category_id || null,
            description: finalDesc || null,
            stock_quantity: Number(productData.stock_quantity || 0),
            low_stock_threshold: Number(productData.low_stock_threshold || 5),
            unit_price: Number(productData.unit_price || productData.base_price || 0),
            store_id: selectedStore,
            status: 'pending'
          }])
          .select()
          .single();

        if (error) throw error;

        // Generate and insert the barcode for this Quick Add product
        const uniqueBarcode = generateBarcode();
        const { error: barcodeError } = await supabase
          .from("pending_product_barcodes")
          .insert([{
            pending_product_id: quickAddData.id,
            barcode: uniqueBarcode
          }]);

        if (barcodeError) console.error("Error creating barcode for Quick Add:", barcodeError.message);

        // Shadow-write to quick_add_history table
        try {
          await supabase
            .from("quick_add_history")
            .insert([{
              pending_product_id: quickAddData.id,
              name: productData.name,
              sku: productData.sku,
              barcode: uniqueBarcode,
              brand: productData.brand || null,
              base_price: Number(productData.base_price || 0),
              category_id: productData.category_id || null,
              store_id: selectedStore || null
            }]);
        } catch (historyErr) {
          console.error("Shadow write to quick_add_history failed:", historyErr);
        }
        
        setSuccessMessage(`Product added to Review Queue under checkpoint: Quick Intake`);
        await fetchPendingQueue();
        setActiveTab("review-queue");

        // Reset Add Form
        setCascadePath([]);
        setProductData({
          name: '', sku: generateSKU(), brand: '', base_price: '', category_id: '', description: '',
          stock_quantity: 0, low_stock_threshold: 5, unit_price: ''
        });
      }
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setProductData({
      name: item.name,
      sku: item.sku,
      brand: item.brand,
      base_price: item.price,
      category_id: item.category_id,
      description: item.description,
      stock_quantity: item.stock,
      low_stock_threshold: item.minStock,
      unit_price: item.price
    });
    buildCascadePathForCategory(item.category_id);
    setShowEditModal(true);
  };

  // Bulk Load Row utilities
  const handleAddBulkRow = () => {
    setBulkRows(prev => [...prev, { name: '', brand: '', base_price: '', sku: generateSKU(), stock_quantity: '1', low_stock_threshold: '5' }]);
  };

  const handleRemoveBulkRow = (index) => {
    if (bulkRows.length === 1) return;
    setBulkRows(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleBulkRowChange = (index, field, value) => {
    setBulkRows(prev => prev.map((row, idx) => idx === index ? { ...row, [field]: value } : row));
  };

  const handleSaveBulk = async (e) => {
    e.preventDefault();
    if (!bulkCheckpointName.trim()) {
      alert("Please provide a checkpoint name.");
      return;
    }
    if (!bulkCategoryId) {
      alert("Please select a category hierarchy first.");
      return;
    }
    setSaving(true);
    setSuccessMessage("");
    try {
      // Append a unique date/time string to the checkpoint name so that
      // batches created with the same name at different times are grouped separately.
      const timestamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const finalCheckpointName = `${bulkCheckpointName.trim()} (${timestamp})`;

      const records = [];
      for (const row of bulkRows) {
        const catType = getCategoryType(bulkCategoryId);
        const qty = Math.max(1, Number(row.stock_quantity || 1));
        
        let baseDescObj = {};
        if (catType === 'frame') {
          baseDescObj = {
            type: 'frame',
            modelNo: row.frame_model_no || '',
            color: row.frame_color || '',
            frameType: row.frame_type || '',
            frameShape: row.frame_shape || '',
            sizeA: row.frame_size_a || '',
            sizeB: row.frame_size_b || '',
            templeLength: row.frame_temple_length || '',
            dbl: row.frame_dbl || '',
            rawDescription: row.description || ''
          };
        } else if (catType === 'lens') {
          baseDescObj = {
            type: 'lens',
            lensType: row.lens_type || '',
            index: row.lens_index || '',
            material: row.lens_material || '',
            coating: row.lens_coating || '',
            sph: row.lens_sph || '',
            cyl: row.lens_cyl || '',
            axis: row.lens_axis || '',
            add: row.lens_add || '',
            rawDescription: row.description || ''
          };
        } else {
          baseDescObj = {
            type: 'generic',
            rawDescription: row.description || ''
          };
        }

        // Loop 'qty' times to generate unique records for quantity > 1
        for (let i = 0; i < qty; i++) {
          const uniqueSku = generateSKU();
          const uniqueBarcode = generateBarcode();
          records.push({
            checkpoint_name: finalCheckpointName,
            name: qty > 1 ? `${row.name} #${i + 1}` : row.name,
            sku: uniqueSku, // unique 5-character SKU
            brand: row.brand || null,
            base_price: Number(row.base_price || 0),
            category_id: bulkCategoryId,
            description: JSON.stringify(baseDescObj),
            stock_quantity: 1, // each individual product has quantity = 1
            low_stock_threshold: Number(row.low_stock_threshold || 5),
            unit_price: Number(row.base_price || 0),
            store_id: selectedStore,
            status: 'pending',
            temp_barcode: uniqueBarcode // Temporary property to map to barcodes table below
          });
        }
      }

      // Strip temporary property before insertion, but keep mapping
      const dbRecords = records.map(({ temp_barcode, ...rest }) => rest);
      const { data: insertedProducts, error: insertError } = await supabase
        .from("pending_products")
        .insert(dbRecords)
        .select("id, sku");

      if (insertError) throw insertError;

      // Map inserted IDs to their respective barcode records
      const barcodeRecords = insertedProducts.map(p => {
        const originalRecord = records.find(r => r.sku === p.sku);
        return {
          pending_product_id: p.id,
          barcode: originalRecord?.temp_barcode || generateBarcode()
        };
      });

      const { error: barcodeError } = await supabase
        .from("pending_product_barcodes")
        .insert(barcodeRecords);

      if (barcodeError) throw barcodeError;

      // 3. Shadow-write to long-term history tables (parallel, non-blocking)
      try {
        const { data: checkpointData, error: cpError } = await supabase
          .from("intake_checkpoints")
          .insert([{
            checkpoint_name: finalCheckpointName,
            store_id: selectedStore || null,
            category_id: bulkCategoryId || null,
            item_count: records.length
          }])
          .select("id")
          .single();

        if (!cpError && checkpointData) {
          const checkpointItemsRecords = insertedProducts.map(p => {
            const originalRecord = records.find(r => r.sku === p.sku);
            const matchingBarcode = barcodeRecords.find(b => b.pending_product_id === p.id);
            return {
              checkpoint_id: checkpointData.id,
              pending_product_id: p.id,
              name: originalRecord?.name || "",
              sku: p.sku,
              barcode: matchingBarcode?.barcode || null,
              brand: originalRecord?.brand || null,
              base_price: originalRecord?.base_price || null,
              category_id: bulkCategoryId || null
            };
          });

          await supabase
            .from("intake_checkpoint_items")
            .insert(checkpointItemsRecords);
        }
      } catch (historyErr) {
        console.error("Shadow write to checkpoint history failed:", historyErr);
      }

      setSuccessMessage(`Bulk batch containing ${records.length} items added to Review Queue!`);
      setBulkCheckpointName("");
      setBulkCategoryId("");
      setBulkCascadePath([]);
      setBulkRows([{ name: '', brand: '', base_price: '', sku: generateSKU(), stock_quantity: '1', low_stock_threshold: '5' }]);
      setBatchStage('details');
      await fetchPendingQueue();
      setActiveTab("review-queue");
    } catch (err) {
      alert("Failed to insert bulk batch: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Ingest selected confirmed products
  const handleIngestSelectedConfirmed = async () => {
    const toIngest = pendingItems.filter(item => selectedPendingIds.has(item.id) && item.status === 'confirmed');
    if (toIngest.length === 0) {
      alert("No confirmed products selected for ingestion.");
      return;
    }
    setSaving(true);
    try {
      for (const item of toIngest) {
        // 1. Insert into products
        const { data: pData, error: pError } = await supabase
          .from("products")
          .insert([{
            name: item.name,
            sku: item.sku,
            brand: item.brand,
            base_price: Number(item.base_price),
            category_id: item.category_id,
            description: item.description
          }])
          .select()
          .single();

        if (pError) throw pError;

        // 1b. Insert the barcode record
        const parsedBarcode = item.pending_product_barcodes?.[0]?.barcode;

        if (parsedBarcode) {
          const { error: pbError } = await supabase
            .from("product_barcodes")
            .insert([{
              product_id: pData.id,
              barcode: parsedBarcode,
              status: 'active'
            }]);
          if (pbError) console.error("Error inserting product_barcode:", pbError);
        }

        // 2. Insert into store_inventory
        const { error: iError } = await supabase
          .from("store_inventory")
          .insert([{
            store_id: item.store_id || selectedStore,
            product_id: pData.id,
            stock_quantity: Number(item.stock_quantity),
            unit_price: Number(item.unit_price || item.base_price),
            low_stock_threshold: Number(item.low_stock_threshold)
          }]);

        if (iError) throw iError;

        // 3. Delete from pending_products
        const { error: dError } = await supabase
          .from("pending_products")
          .delete()
          .eq('id', item.id);

        if (dError) throw dError;
      }

      setSelectedPendingIds(new Set());
      setSuccessMessage(`Successfully ingested ${toIngest.length} confirmed products to catalog.`);
      await fetchInventory();
      await fetchPendingQueue();
    } catch (err) {
      alert("Ingestion failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleIngestConfirmedProduct = async (item) => {
    setSaving(true);
    try {
      const { data: pData, error: pError } = await supabase
        .from("products")
        .insert([{
          name: item.name,
          sku: item.sku,
          brand: item.brand,
          base_price: Number(item.base_price),
          category_id: item.category_id,
          description: item.description
        }])
        .select()
        .single();

      if (pError) throw pError;

      // Insert the barcode record
      const parsedBarcode = item.pending_product_barcodes?.[0]?.barcode;

      if (parsedBarcode) {
        const { error: pbError } = await supabase
          .from("product_barcodes")
          .insert([{
            product_id: pData.id,
            barcode: parsedBarcode,
            status: 'active'
          }]);
        if (pbError) console.error("Error inserting product_barcode:", pbError);
      }

      const { error: iError } = await supabase
        .from("store_inventory")
        .insert([{
          store_id: item.store_id || selectedStore,
          product_id: pData.id,
          stock_quantity: Number(item.stock_quantity),
          unit_price: Number(item.unit_price || item.base_price),
          low_stock_threshold: Number(item.low_stock_threshold)
        }]);

      if (iError) throw iError;

      const { error: dError } = await supabase
        .from("pending_products")
        .delete()
        .eq('id', item.id);

      if (dError) throw dError;

      setSuccessMessage(`Successfully ingested confirmed product ${item.name} to live catalog.`);
      await fetchInventory();
      await fetchPendingQueue();
    } catch (err) {
      alert("Ingestion failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete pending items
  const handleDeleteSelectedPending = async () => {
    if (selectedPendingIds.size === 0) return;
    if (!window.confirm("Are you sure you want to discard selected pending entities?")) return;
    setSaving(true);
    try {
      const ids = Array.from(selectedPendingIds);
      const { error } = await supabase.from("pending_products").delete().in("id", ids);
      if (error) throw error;

      setSelectedPendingIds(new Set());
      await fetchPendingQueue();
    } catch (err) {
      alert("Failed to discard pending items: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectPending = (id) => {
    const item = pendingItems.find(i => i.id === id);
    if (!item || item.status !== 'confirmed') return;
    const next = new Set(selectedPendingIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPendingIds(next);
  };

  const toggleSelectCheckpoint = (checkpointItems, selectAll) => {
    const next = new Set(selectedPendingIds);
    checkpointItems.forEach(item => {
      if (item.status === 'confirmed') {
        if (selectAll) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
      }
    });
    setSelectedPendingIds(next);
  };

  const filteredCatalog = inventory.filter(p => {
    const matchesSearch = !search || 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || String(p.category_id) === String(selectedCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  const statusBadge = (item) => {
    const map = {
      "Active": "bg-black text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Low Stock": "border border-black text-black px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      "Out of Stock": "bg-gray-200 text-gray-500 line-through px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
    };
    return <span className={map[item.status]}>{item.status}</span>;
  };

  const headerDetails = {
    "stock": { title: "Stock Catalog", subtitle: "Master Product Catalog & Unit Stock" },
    "quick-add": { title: "Quick Intake", subtitle: "Register single product entity to active stock or queue" },
    "batch-load": { title: "Batch Intake", subtitle: "Ingest multiple product entities under checkpoint batches" },
    "review-queue": { title: "Review Queue", subtitle: "Verify and confirm checkpoint ingestion batches to live catalog" }
  }[activeTab] || { title: "Inventory Matrix", subtitle: "Manage catalog stock levels and ingestion channels" };

  return (
    <div className="space-y-6 animate-fast-slide pb-20">

      {/* Status Toasts/Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-black text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-fast-zoom">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="ml-auto text-emerald-600 hover:text-black font-black uppercase text-[10px]">Dismiss</button>
        </div>
      )}

      {/* -------------------- 1. STOCK TAB -------------------- */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Showing Active Catalog Products</span>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Store Selection Dropdown */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <Database size={14} className="text-gray-400" />
                <select
                  value={selectedStore}
                  onChange={e => setSelectedStore(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="appearance-none bg-transparent text-[11px] font-bold text-black uppercase focus:outline-none cursor-pointer pr-6 py-0.5 disabled:opacity-50"
                >
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <Tags size={14} className="text-gray-400" />
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="appearance-none bg-transparent text-[11px] font-bold text-black uppercase focus:outline-none cursor-pointer pr-6 py-0.5"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{categoryPaths[c.id] || c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative group">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search Stock registry…"
                  className="pl-9 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black focus:bg-white w-56 placeholder:text-gray-300"
                />
              </div>
              <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl overflow-hidden p-1">
                <button onClick={() => setView("list")} className={`p-2 rounded-lg ${view === "list" ? "bg-black text-white shadow-sm" : "text-gray-400 hover:text-black"}`}>
                  <List size={16} />
                </button>
                <button onClick={() => setView("grid")} className={`p-2 rounded-lg ${view === "grid" ? "bg-black text-white shadow-sm" : "text-gray-400 hover:text-black"}`}>
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {loading && inventory.length === 0 ? (
            <div className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Syncing Master Registry...</div>
          ) : view === "list" ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Identify</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Unique Code (SKU)</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Barcode</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Brand</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Classification</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume</th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCatalog.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-xs font-black text-black uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate max-w-xs">{renderProductDescription(item.description)}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">{item.barcode}</td>
                        <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-widest">{item.brand || "Generic"}</td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{item.category || "Unassigned"}</td>
                        <td className="px-6 py-4 text-xs font-black text-black">₹{item.price.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4 text-xs font-black text-black">{item.stock} Units</td>
                        <td className="px-6 py-4">{statusBadge(item)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleEditClick(item)} className="p-2 border border-gray-100 rounded-xl text-gray-400 hover:text-black hover:bg-gray-50 transition-all">
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCatalog.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                          No stock records matched search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredCatalog.map(item => (
                <div key={item.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.sku}</span>
                      {statusBadge(item)}
                    </div>
                    <h3 className="text-sm font-black text-black uppercase tracking-tight mt-4">{item.name}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider leading-relaxed line-clamp-2">{renderProductDescription(item.description)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 mt-6 pt-4">
                    <div>
                      <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Stock / Price</p>
                      <p className="text-xs font-black text-black uppercase mt-0.5">{item.stock} Units — ₹{item.price}</p>
                    </div>
                    <button onClick={() => handleEditClick(item)} className="p-2.5 border border-gray-100 rounded-xl text-gray-400 hover:text-black hover:bg-gray-50 transition-all">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- 2. QUICK ADD TAB -------------------- */}
      {activeTab === "quick-add" && (
        <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-fast-zoom">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-black uppercase tracking-wider">Quick Ingestion Form</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Register a single product entity to active stock or queue</p>
            </div>
            {productData.category_id && (
              <button 
                type="button" 
                onClick={() => {
                  setCascadePath([]);
                  setProductData(prev => ({ ...prev, category_id: '' }));
                }}
                className="text-[9px] font-black uppercase tracking-widest bg-gray-50 border border-gray-100 px-3.5 py-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all self-start"
              >
                Change Category
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-6">
            {/* Target selection */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="text-black" />
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-relaxed">
                Note: All new product entries will be saved to the Review Queue first as draft for verification.
              </p>
            </div>

            {/* Classification (Always Shown First) */}
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
              <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Classification Hierarchy</h4>
              <div className="space-y-4">
                <ProductCascadeLevel
                  depth={0}
                  options={categoryChildMap['__root__'] || []}
                  selectedId={cascadePath[0] || ''}
                  onSelect={id => handleCategoryLevelSelect(0, id)}
                />
                {cascadePath.map((selectedId, idx) => {
                  const children = categoryChildMap[selectedId] || [];
                  if (children.length === 0) return null;
                  return (
                    <ProductCascadeLevel
                      key={selectedId}
                      depth={idx + 1}
                      options={children}
                      selectedId={cascadePath[idx + 1] || ''}
                      onSelect={id => handleCategoryLevelSelect(idx + 1, id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Proceed Further only if Category is Selected */}
            {productData.category_id ? (
              <div className="space-y-6 animate-fast-zoom">
                {/* Identifiers */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-1.5"><Tags size={12} /> Product Identifiers</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title *</label>
                      <input required value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Name</label>
                        <input value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU Code *</label>
                        <input required value={productData.sku} onChange={e => setProductData({...productData, sku: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Custom Fields for Frame */}
                {getCategoryType(productData.category_id) === 'frame' && (
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Frame Specifications</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Model No *</label>
                        <input required type="text" value={frameFields.modelNo} onChange={e => setFrameFields({...frameFields, modelNo: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 78005" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Color *</label>
                        <input required type="text" value={frameFields.color} onChange={e => setFrameFields({...frameFields, color: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. Black" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Type *</label>
                        <select required value={frameFields.frameType} onChange={e => setFrameFields({...frameFields, frameType: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                          <option value="">— Select —</option>
                          <option value="Full Rim">Full Rim</option>
                          <option value="Half Rim">Half Rim</option>
                          <option value="Rimless">Rimless</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Shape *</label>
                        <select required value={frameFields.frameShape} onChange={e => setFrameFields({...frameFields, frameShape: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                          <option value="">— Select —</option>
                          <option value="Square">Square</option>
                          <option value="Rectangle">Rectangle</option>
                          <option value="Round">Round</option>
                          <option value="Oval">Oval</option>
                          <option value="Aviator">Aviator</option>
                          <option value="Wayfarer">Wayfarer</option>
                          <option value="Clubmaster">Clubmaster</option>
                          <option value="Cat Eye">Cat Eye</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">A Size (Lens Width)</label>
                        <input type="text" value={frameFields.sizeA} onChange={e => setFrameFields({...frameFields, sizeA: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 52" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">B Size (Lens Height)</label>
                        <input type="text" value={frameFields.sizeB} onChange={e => setFrameFields({...frameFields, sizeB: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 38" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Temple Length</label>
                        <input type="text" value={frameFields.templeLength} onChange={e => setFrameFields({...frameFields, templeLength: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 140" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">DBL (Bridge Size)</label>
                        <input type="text" value={frameFields.dbl} onChange={e => setFrameFields({...frameFields, dbl: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 18" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Custom Fields for Lens */}
                {getCategoryType(productData.category_id) === 'lens' && (
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Lens Specifications</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Type *</label>
                        <select required value={lensFields.lensType} onChange={e => setLensFields({...lensFields, lensType: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                          <option value="">— Select —</option>
                          <option value="Single Vision">Single Vision</option>
                          <option value="Bifocal">Bifocal</option>
                          <option value="Progressive">Progressive</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Index *</label>
                        <input required type="text" value={lensFields.index} onChange={e => setLensFields({...lensFields, index: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 1.56, 1.61" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Material *</label>
                        <input required type="text" value={lensFields.material} onChange={e => setLensFields({...lensFields, material: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. CR-39, Poly" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Coating *</label>
                        <input required type="text" value={lensFields.coating} onChange={e => setLensFields({...lensFields, coating: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. ARC, Blue Cut" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH Power</label>
                        <input type="text" value={lensFields.sph} onChange={e => setLensFields({...lensFields, sph: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. -2.00" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL Power</label>
                        <input type="text" value={lensFields.cyl} onChange={e => setLensFields({...lensFields, cyl: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. -0.50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                        <input type="text" value={lensFields.axis} onChange={e => setLensFields({...lensFields, axis: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 180" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">ADD Power</label>
                        <input type="text" value={lensFields.add} onChange={e => setLensFields({...lensFields, add: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. +2.00" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} className="w-full min-h-[80px] p-4 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none resize-none" />
                </div>

                {/* Stock details */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Warehouse Stock levels</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Stock</label>
                      <input required value={productData.stock_quantity} onChange={e => setProductData({...productData, stock_quantity: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Threshold</label>
                      <input required value={productData.low_stock_threshold} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Price</label>
                      <input required value={productData.base_price} onChange={e => setProductData({...productData, base_price: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" placeholder="₹" />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-4.5 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 h-[56px] flex justify-center items-center">
                  {saving ? "Ingesting Product..." : "Commit Entity"}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      )}

      {/* -------------------- 3. BATCH LOAD TAB -------------------- */}
      {activeTab === "batch-load" && (
        <div className="space-y-4">
          {/* Header Row above the card container */}
          {(batchStage === 'products' || batchStage === 'review') && (
            <div className="flex justify-end">
              {batchStage === 'products' && (
                <button 
                  type="button"
                  onClick={() => {
                    let valid = true;
                    for (const row of bulkRows) {
                      if (!row.name || !row.stock_quantity || !row.base_price) {
                        valid = false;
                      }
                      const catType = getCategoryType(bulkCategoryId);
                      if (catType === 'frame') {
                        if (!row.frame_model_no || !row.frame_color || !row.frame_type || !row.frame_shape || !row.brand) {
                          valid = false;
                        }
                      } else if (catType === 'lens') {
                        if (!row.lens_type || !row.lens_index || !row.lens_material || !row.lens_coating) {
                          valid = false;
                        }
                      }
                    }
                    if (!valid) {
                      alert("Please fill in all required product fields (including brand name).");
                      return;
                    }
                    setBatchStage('review');
                  }}
                  className="px-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
                >
                  Confirm
                </button>
              )}
              {batchStage === 'review' && (
                <button 
                  type="button"
                  onClick={handleSaveBulk}
                  disabled={saving}
                  className="px-6 py-3 bg-black hover:bg-neutral-805 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] disabled:opacity-50"
                >
                  {saving ? "Confirming..." : "Confirm"}
                </button>
              )}
            </div>
          )}

          <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 animate-fast-zoom">
            <div className="mb-6">
              <h3 className="text-lg font-black text-black uppercase tracking-wider">Batch Ingest load</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Ingest multiple product entities under a single checkpoint batch</p>
            </div>

            <div className="space-y-6">
              {/* Screen 1: Details (Batch Tag & Category) */}
              {batchStage === 'details' && (
                <div className="space-y-6 animate-fast-zoom">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Checkpoint / Batch Tag *</label>
                      <input 
                        required 
                        value={bulkCheckpointName} 
                        onChange={e => setBulkCheckpointName(e.target.value)} 
                        type="text" 
                        placeholder="e.g. CONTAINER SHIPMENT JULY-A" 
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none placeholder:text-gray-200 focus:border-black" 
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch Category Classification Hierarchy *</label>
                      <div className="space-y-4">
                        <ProductCascadeLevel
                          depth={0}
                          options={categoryChildMap['__root__'] || []}
                          selectedId={bulkCascadePath[0] || ''}
                          onSelect={id => handleBulkCategoryLevelSelect(0, id)}
                        />
                        {bulkCascadePath.map((selectedId, idx) => {
                          const children = categoryChildMap[selectedId] || [];
                          if (children.length === 0) return null;
                          return (
                            <ProductCascadeLevel
                              key={selectedId}
                              depth={idx + 1}
                              options={children}
                              selectedId={bulkCascadePath[idx + 1] || ''}
                              onSelect={id => handleBulkCategoryLevelSelect(idx + 1, id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      if (!bulkCheckpointName.trim()) {
                        alert("Please enter a Batch Tag/Checkpoint name.");
                        return;
                      }
                      if (!bulkCategoryId) {
                        alert("Please select a Category.");
                        return;
                      }
                      setBatchStage('products');
                    }}
                    className="w-full py-4.5 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.01] transition-all h-[56px] flex justify-center items-center"
                  >
                    Confirm
                  </button>
                </div>
              )}

              {/* Screen 2: Add Products */}
              {batchStage === 'products' && (
                <div className="space-y-6 animate-fast-zoom">
                  {/* Clean Horizontal Active Info Border */}
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 gap-3">
                    <div className="flex flex-col gap-1 text-[11px] font-black uppercase text-black">
                      <div>
                        <span className="text-gray-400 font-bold">Batch:</span>
                        <span className="text-black ml-1">{bulkCheckpointName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold">Category:</span>
                        <span className="text-black ml-1">{categoryPaths[bulkCategoryId] || 'N/A'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfirmEditDetailsPopup(true)}
                      className="text-[9px] font-black uppercase tracking-widest bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-xl text-gray-500 hover:text-black transition-all shrink-0"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="space-y-4">
                    {bulkRows.map((row, idx) => (
                      <div key={idx} className="p-5 border border-gray-150 rounded-2xl relative bg-white shadow-sm">
                        {bulkRows.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveBulkRow(idx)}
                            className="absolute top-4 right-4 text-red-500 hover:scale-110 transition-transform"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest block mb-3">Ingest Row #{idx + 1}</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Name *</label>
                            <input 
                              required 
                              value={row.name} 
                              onChange={e => handleBulkRowChange(idx, 'name', e.target.value)} 
                              type="text" 
                              placeholder="Product Name" 
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none focus:border-black" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand *</label>
                            {getCategoryType(bulkCategoryId) === 'frame' ? (
                              <div className="space-y-1.5">
                                <select
                                  value={['Bonthus', 'Jas Harlon'].includes(row.brand) ? row.brand : (row.brand ? 'Custom' : '')}
                                  onChange={e => {
                                    const val = e.target.value;
                                    if (val === 'Custom') {
                                      handleBulkRowChange(idx, '_brand_is_custom', true);
                                      handleBulkRowChange(idx, 'brand', '');
                                    } else {
                                      handleBulkRowChange(idx, '_brand_is_custom', false);
                                      handleBulkRowChange(idx, 'brand', val);
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none focus:border-black bg-white cursor-pointer"
                                >
                                  <option value="">— Select —</option>
                                  <option value="Bonthus">Bonthus</option>
                                  <option value="Jas Harlon">Jas Harlon</option>
                                  <option value="Custom">Custom...</option>
                                </select>
                                {(row._brand_is_custom || (!['Bonthus', 'Jas Harlon', ''].includes(row.brand))) && (
                                  <input 
                                    required
                                    value={row.brand === 'Custom' ? '' : row.brand} 
                                    onChange={e => handleBulkRowChange(idx, 'brand', e.target.value)} 
                                    type="text" 
                                    placeholder="Enter Custom Brand" 
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none focus:border-black animate-fast-slide" 
                                  />
                                )}
                              </div>
                            ) : (
                              <input 
                                value={row.brand} 
                                onChange={e => handleBulkRowChange(idx, 'brand', e.target.value)} 
                                type="text" 
                                placeholder="Brand Name" 
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none focus:border-black" 
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Stock Qty *</label>
                            <input 
                              required 
                              value={row.stock_quantity} 
                              onChange={e => handleBulkRowChange(idx, 'stock_quantity', e.target.value)} 
                              type="number" 
                              min="1"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none focus:border-black" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Base Price (₹) *</label>
                            <input 
                              required 
                              value={row.base_price} 
                              onChange={e => handleBulkRowChange(idx, 'base_price', e.target.value)} 
                              type="number" 
                              placeholder="₹" 
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[11px] font-bold text-black outline-none focus:border-black" 
                            />
                          </div>
                        </div>

                        {/* Conditional Batch Row Custom Fields for Frame */}
                        {getCategoryType(bulkCategoryId) === 'frame' && (
                          <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 animate-fast-zoom">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Model No *</label>
                              <input required value={row.frame_model_no || ''} onChange={e => handleBulkRowChange(idx, 'frame_model_no', e.target.value)} type="text" placeholder="e.g. 78005" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Color *</label>
                              <input required value={row.frame_color || ''} onChange={e => handleBulkRowChange(idx, 'frame_color', e.target.value)} type="text" placeholder="e.g. Black" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Type *</label>
                              <select required value={row.frame_type || ''} onChange={e => handleBulkRowChange(idx, 'frame_type', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white cursor-pointer focus:border-black">
                                <option value="">— Select —</option>
                                <option value="Full Rim">Full Rim</option>
                                <option value="Half Rim">Half Rim</option>
                                <option value="Rimless">Rimless</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Shape *</label>
                              <select required value={row.frame_shape || ''} onChange={e => handleBulkRowChange(idx, 'frame_shape', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white cursor-pointer focus:border-black">
                                <option value="">— Select —</option>
                                <option value="Square">Square</option>
                                <option value="Rectangle">Rectangle</option>
                                <option value="Round">Round</option>
                                <option value="Oval">Oval</option>
                                <option value="Aviator">Aviator</option>
                                <option value="Wayfarer">Wayfarer</option>
                                <option value="Clubmaster">Clubmaster</option>
                                <option value="Cat Eye">Cat Eye</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">A Size</label>
                              <input value={row.frame_size_a || ''} onChange={e => handleBulkRowChange(idx, 'frame_size_a', e.target.value)} type="text" placeholder="e.g. 52" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">B Size</label>
                              <input value={row.frame_size_b || ''} onChange={e => handleBulkRowChange(idx, 'frame_size_b', e.target.value)} type="text" placeholder="e.g. 38" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Temple</label>
                              <input value={row.frame_temple_length || ''} onChange={e => handleBulkRowChange(idx, 'frame_temple_length', e.target.value)} type="text" placeholder="e.g. 140" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">DBL</label>
                              <input value={row.frame_dbl || ''} onChange={e => handleBulkRowChange(idx, 'frame_dbl', e.target.value)} type="text" placeholder="e.g. 18" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                          </div>
                        )}

                        {/* Conditional Batch Row Custom Fields for Lens */}
                        {getCategoryType(bulkCategoryId) === 'lens' && (
                          <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 animate-fast-zoom">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Type *</label>
                              <select required value={row.lens_type || ''} onChange={e => handleBulkRowChange(idx, 'lens_type', e.target.value)} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white cursor-pointer focus:border-black">
                                <option value="">— Select —</option>
                                <option value="Single Vision">Single Vision</option>
                                <option value="Bifocal">Bifocal</option>
                                <option value="Progressive">Progressive</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Index *</label>
                              <input required value={row.lens_index || ''} onChange={e => handleBulkRowChange(idx, 'lens_index', e.target.value)} type="text" placeholder="e.g. 1.56" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Material *</label>
                              <input required value={row.lens_material || ''} onChange={e => handleBulkRowChange(idx, 'lens_material', e.target.value)} type="text" placeholder="e.g. CR-39" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Coating *</label>
                              <input required value={row.lens_coating || ''} onChange={e => handleBulkRowChange(idx, 'lens_coating', e.target.value)} type="text" placeholder="e.g. ARC" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH</label>
                              <input value={row.lens_sph || ''} onChange={e => handleBulkRowChange(idx, 'lens_sph', e.target.value)} type="text" placeholder="e.g. -2.00" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL</label>
                              <input value={row.lens_cyl || ''} onChange={e => handleBulkRowChange(idx, 'lens_cyl', e.target.value)} type="text" placeholder="e.g. -0.50" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                              <input value={row.lens_axis || ''} onChange={e => handleBulkRowChange(idx, 'lens_axis', e.target.value)} type="text" placeholder="e.g. 180" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">ADD</label>
                              <input value={row.lens_add || ''} onChange={e => handleBulkRowChange(idx, 'lens_add', e.target.value)} type="text" placeholder="e.g. +2.00" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold text-black outline-none bg-white focus:border-black" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Row Button at the bottom of the card list, aligned right */}
                  <div className="flex justify-end pt-2">
                    <button 
                      type="button" 
                      onClick={handleAddBulkRow}
                      className="text-[10px] font-black bg-black text-white px-5 py-3 rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-md flex items-center gap-2"
                    >
                      + Add Row
                    </button>
                  </div>
                </div>
              )}

              {/* Screen 3: Review & Submit */}
              {batchStage === 'review' && (
                <div className="space-y-6 animate-fast-zoom">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Review Batch Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Batch/Checkpoint Tag</p>
                        <p className="text-black uppercase">{bulkCheckpointName}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Category Classification</p>
                        <p className="text-black uppercase">{categoryPaths[bulkCategoryId] || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Products Summary ({bulkRows.length})</h4>
                    <div className="border border-gray-150 rounded-2xl overflow-hidden divide-y divide-gray-100 bg-white">
                      {bulkRows.map((row, idx) => {
                        const catType = getCategoryType(bulkCategoryId);
                        return (
                          <div key={idx} className="p-5 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black text-black uppercase">{row.name || 'Unnamed Product'}</p>
                                <p className="text-[9px] text-gray-455 font-bold uppercase tracking-wider mt-0.5">
                                  Brand: {row.brand || 'N/A'} | Qty: {row.stock_quantity}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-black">₹{row.base_price}</p>
                              </div>
                            </div>
                            
                            {catType === 'frame' && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Model No</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_model_no || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Color</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_color || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Type</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_type || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Shape</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_shape || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">A Size</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_size_a || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">B Size</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_size_b || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Temple</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_temple_length || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">DBL</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.frame_dbl || '—'}</span>
                                </div>
                              </div>
                            )}

                            {catType === 'lens' && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Lens Type</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_type || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Index</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_index || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Material</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_material || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">Coating</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_coating || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">SPH</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_sph || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">CYL</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_cyl || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">AXIS</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_axis || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] font-black text-gray-400 block uppercase tracking-wider">ADD</span>
                                  <span className="text-[10px] font-bold text-black uppercase">{row.lens_add || '—'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Editing Modal */}
      {showEditDetailsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditDetailsPopup(false)} />
          <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-base font-black text-black uppercase tracking-tight">Edit Batch Details</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Update batch metadata without losing product row values</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Checkpoint / Batch Tag *</label>
                <input 
                  required 
                  value={bulkCheckpointName} 
                  onChange={e => setBulkCheckpointName(e.target.value)} 
                  type="text" 
                  placeholder="e.g. CONTAINER SHIPMENT JULY-A" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-150 rounded-xl text-[12px] font-bold text-black outline-none placeholder:text-gray-200 focus:border-black" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch Category Classification Hierarchy *</label>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  <ProductCascadeLevel
                    depth={0}
                    options={categoryChildMap['__root__'] || []}
                    selectedId={bulkCascadePath[0] || ''}
                    onSelect={id => handleBulkCategoryLevelSelect(0, id)}
                  />
                  {bulkCascadePath.map((selectedId, idx) => {
                    const children = categoryChildMap[selectedId] || [];
                    if (children.length === 0) return null;
                    return (
                      <ProductCascadeLevel
                        key={selectedId}
                        depth={idx + 1}
                        options={children}
                        selectedId={bulkCascadePath[idx + 1] || ''}
                        onSelect={id => handleBulkCategoryLevelSelect(idx + 1, id)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditDetailsPopup(false)}
                className="flex-1 py-3 text-[10px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!bulkCheckpointName.trim()) {
                    alert("Please enter a Batch Tag/Checkpoint name.");
                    return;
                  }
                  if (!bulkCategoryId) {
                    alert("Please select a Category.");
                    return;
                  }
                  setShowEditDetailsPopup(false);
                }}
                className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation of Editing active batch details */}
      {showConfirmEditDetailsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmEditDetailsPopup(false)} />
          <div className="relative bg-white border-2 border-black rounded-[24px] p-6 shadow-2xl max-w-sm w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-base font-black text-black uppercase tracking-tight">Confirm Edit</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                Are you sure you want to edit batch details?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmEditDetailsPopup(false)}
                className="flex-1 py-3 text-[10px] font-black uppercase border border-neutral-200 rounded-xl hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmEditDetailsPopup(false);
                  setShowEditDetailsPopup(true);
                }}
                className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase rounded-xl hover:bg-neutral-800"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- 4. REVIEW QUEUE TAB -------------------- */}
      {activeTab === "review-queue" && (
        <div className="space-y-6">
          {/* Analysis View cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-gray-150 p-6 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Batches</span>
                <span className="text-2xl font-black text-black block mt-1">{reviewStats.totalBatches}</span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                <ClipboardList className="text-black" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 p-6 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Pending Products</span>
                <span className="text-2xl font-black text-amber-500 block mt-1">{reviewStats.pendingCount}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <FolderSync className="text-amber-500" size={24} />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-150 p-6 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Confirmed Products</span>
                <span className="text-2xl font-black text-green-500 block mt-1">{reviewStats.confirmedCount}</span>
              </div>
              <div className="p-3 bg-green-50 rounded-2xl border border-green-100">
                <CheckCircle2 className="text-green-500" size={24} />
              </div>
            </div>
          </div>

          {/* Batch Breakdown Boxes */}
          {reviewStats.batchBreakdown.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-black uppercase tracking-widest font-black">Batch / Box Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {reviewStats.batchBreakdown.map((b, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center space-y-1">
                    <p className="text-[9px] font-black text-black uppercase truncate">{b.name}</p>
                    <div className="flex justify-center gap-1.5 text-[9px] font-bold">
                      <span className="text-amber-500">{b.pending} P</span>
                      <span className="text-gray-300">|</span>
                      <span className="text-green-500">{b.confirmed} C</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Ingestion Controls */}
          <div className="bg-white rounded-3xl border border-gray-105 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Select and Confirm Ingested checkpoint batches
            </span>
            {selectedPendingIds.size > 0 && (
              <div className="flex items-center gap-2 animate-fast-zoom">
                <button 
                  onClick={handleIngestSelectedConfirmed}
                  disabled={saving}
                  className="text-[10px] font-black bg-black text-white uppercase tracking-widest px-4 py-2.5 rounded-xl hover:scale-105 transition-all flex items-center gap-1.5 shadow-md animate-pulse"
                >
                  <CheckCircle2 size={12} /> Ingest Selected Confirmed ({selectedPendingIds.size})
                </button>
                <button 
                  onClick={handleDeleteSelectedPending}
                  disabled={saving}
                  className="text-[10px] font-black border-2 border-black text-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-50 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 size={12} /> Discard
                </button>
              </div>
            )}
          </div>

          {/* Accordion / Groups */}
          <div className="space-y-6">
            {Object.entries(pendingByCheckpoint).map(([checkpoint, items]) => {
              const confirmedItems = items.filter(i => i.status === 'confirmed');
              const hasCheckedAll = confirmedItems.length > 0 && confirmedItems.every(i => selectedPendingIds.has(i.id));
              const hasCheckedSome = confirmedItems.some(i => selectedPendingIds.has(i.id)) && !hasCheckedAll;

              return (
                <div key={checkpoint} className="bg-white rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {/* Accordion Header */}
                  <div className="bg-gray-50 border-b-2 border-black px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        checked={hasCheckedAll}
                        disabled={confirmedItems.length === 0}
                        ref={el => {
                          if (el) el.indeterminate = hasCheckedSome;
                        }}
                        onChange={e => toggleSelectCheckpoint(items, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                      <div>
                        <h3 className="text-sm font-black text-black uppercase tracking-wider">{checkpoint}</h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {items.length} entities ({items.filter(i => i.status === 'pending').length} Pending, {items.filter(i => i.status === 'confirmed').length} Confirmed)
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black bg-white border border-gray-200 text-gray-500 px-3 py-1 rounded-full uppercase tracking-wider">
                      Batch Ingest
                    </span>
                  </div>

                  {/* Batch Items List */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="w-12 px-6 py-3"></th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Unique Code (SKU)</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Barcode</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Brand</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-3">
                              <input 
                                type="checkbox"
                                checked={selectedPendingIds.has(item.id)}
                                disabled={item.status !== 'confirmed'}
                                onChange={() => toggleSelectPending(item.id)}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-6 py-3 text-xs font-black text-black uppercase tracking-tight">{item.name}</td>
                            <td className="px-6 py-3 text-xs font-mono font-bold text-black uppercase tracking-wider">{item.sku}</td>
                            <td className="px-6 py-3 text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">
                              {item.pending_product_barcodes?.[0]?.barcode || "-"}
                            </td>
                            <td className="px-6 py-3 text-xs font-bold text-black uppercase tracking-widest">{item.brand || "Generic"}</td>
                            <td className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              {item.category?.name || "Unassigned"}
                            </td>
                            <td className="px-6 py-3 text-xs font-bold text-black">₹{item.base_price}</td>
                            <td className="px-6 py-3 text-xs font-black text-black">{item.stock_quantity} units</td>
                            <td className="px-6 py-3">
                              {item.status === 'confirmed' ? (
                                <span className="text-[8px] font-black bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Confirmed</span>
                              ) : (
                                <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-150 px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              {item.status === 'confirmed' ? (
                                <button
                                  onClick={() => handleIngestConfirmedProduct(item)}
                                  disabled={saving}
                                  className="text-[9px] font-black bg-black text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:scale-105 transition-all shadow-sm"
                                >
                                  Add to Products
                                </button>
                              ) : (
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Requires Scan</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            
            {pendingItems.length === 0 && (
              <div className="p-20 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-neutral-50 flex flex-col items-center justify-center gap-4">
                <FolderSync size={32} className="text-gray-300 animate-pulse" />
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Ingestion queue empty</p>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mt-1">No pending or confirmed checkpoint batches currently</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Drawer (for existing catalog items) */}
      <SlideDrawer isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingItem(null); setCascadePath([]); }} title="Edit Product Matrix">
        <div className="h-full flex flex-col">
            <form onSubmit={handleSaveProduct} className="space-y-8 flex-1 overflow-y-auto pr-1 no-scrollbar pb-10">
                {/* Identity Block */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-1.5"><Tags size={12} /> Entity Identifiers</h4>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title *</label>
                            <input required value={productData.name} onChange={e => setProductData({...productData, name: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Name</label>
                                <input value={productData.brand} onChange={e => setProductData({...productData, brand: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SKU Code *</label>
                                <input required value={productData.sku} onChange={e => setProductData({...productData, sku: e.target.value})} type="text" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories classification */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Classification Hierarchy</h4>
                    <div className="space-y-4">
                        <ProductCascadeLevel
                            depth={0}
                            options={categoryChildMap['__root__'] || []}
                            selectedId={cascadePath[0] || ''}
                            onSelect={id => handleCategoryLevelSelect(0, id)}
                        />
                        {cascadePath.map((selectedId, idx) => {
                            const children = categoryChildMap[selectedId] || [];
                            if (children.length === 0) return null;
                            return (
                                <ProductCascadeLevel
                                    key={selectedId}
                                    depth={idx + 1}
                                    options={children}
                                    selectedId={cascadePath[idx + 1] || ''}
                                    onSelect={id => handleCategoryLevelSelect(idx + 1, id)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Conditional Custom Fields for Frame */}
                {getCategoryType(productData.category_id) === 'frame' && (
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Frame Specifications</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Model No *</label>
                        <input required type="text" value={frameFields.modelNo} onChange={e => setFrameFields({...frameFields, modelNo: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 78005" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Color *</label>
                        <input required type="text" value={frameFields.color} onChange={e => setFrameFields({...frameFields, color: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. Black" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Type *</label>
                        <select required value={frameFields.frameType} onChange={e => setFrameFields({...frameFields, frameType: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                          <option value="">— Select —</option>
                          <option value="Full Rim">Full Rim</option>
                          <option value="Half Rim">Half Rim</option>
                          <option value="Rimless">Rimless</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Frame Shape *</label>
                        <select required value={frameFields.frameShape} onChange={e => setFrameFields({...frameFields, frameShape: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                          <option value="">— Select —</option>
                          <option value="Square">Square</option>
                          <option value="Rectangle">Rectangle</option>
                          <option value="Round">Round</option>
                          <option value="Oval">Oval</option>
                          <option value="Aviator">Aviator</option>
                          <option value="Wayfarer">Wayfarer</option>
                          <option value="Clubmaster">Clubmaster</option>
                          <option value="Cat Eye">Cat Eye</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">A Size (Lens Width)</label>
                        <input type="text" value={frameFields.sizeA} onChange={e => setFrameFields({...frameFields, sizeA: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 52" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">B Size (Lens Height)</label>
                        <input type="text" value={frameFields.sizeB} onChange={e => setFrameFields({...frameFields, sizeB: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 38" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Temple Length</label>
                        <input type="text" value={frameFields.templeLength} onChange={e => setFrameFields({...frameFields, templeLength: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 140" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">DBL (Bridge Size)</label>
                        <input type="text" value={frameFields.dbl} onChange={e => setFrameFields({...frameFields, dbl: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 18" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Custom Fields for Lens */}
                {getCategoryType(productData.category_id) === 'lens' && (
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Lens Specifications</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Lens Type *</label>
                        <select required value={lensFields.lensType} onChange={e => setLensFields({...lensFields, lensType: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-black outline-none cursor-pointer focus:border-black">
                          <option value="">— Select —</option>
                          <option value="Single Vision">Single Vision</option>
                          <option value="Bifocal">Bifocal</option>
                          <option value="Progressive">Progressive</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Index *</label>
                        <input required type="text" value={lensFields.index} onChange={e => setLensFields({...lensFields, index: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 1.56, 1.61" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Material *</label>
                        <input required type="text" value={lensFields.material} onChange={e => setLensFields({...lensFields, material: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. CR-39, Poly" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Coating *</label>
                        <input required type="text" value={lensFields.coating} onChange={e => setLensFields({...lensFields, coating: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. ARC, Blue Cut" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">SPH Power</label>
                        <input type="text" value={lensFields.sph} onChange={e => setLensFields({...lensFields, sph: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. -2.00" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">CYL Power</label>
                        <input type="text" value={lensFields.cyl} onChange={e => setLensFields({...lensFields, cyl: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. -0.50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Axis</label>
                        <input type="text" value={lensFields.axis} onChange={e => setLensFields({...lensFields, axis: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. 180" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">ADD Power</label>
                        <input type="text" value={lensFields.add} onChange={e => setLensFields({...lensFields, add: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none focus:border-black" placeholder="e.g. +2.00" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Detail Description */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Matrix Description</label>
                    <textarea value={productData.description} onChange={e => setProductData({...productData, description: e.target.value})} className="w-full min-h-[80px] p-4 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none resize-none" />
                </div>

                {/* Stock Level Ingestion */}
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Warehouse Stock levels</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Stock</label>
                            <input required value={productData.stock_quantity} onChange={e => setProductData({...productData, stock_quantity: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Threshold</label>
                            <input required value={productData.low_stock_threshold} onChange={e => setProductData({...productData, low_stock_threshold: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Unit Price</label>
                            <input required value={productData.base_price} onChange={e => setProductData({...productData, base_price: e.target.value})} type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-black outline-none" placeholder="₹" />
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex items-center gap-3 border-t border-gray-50 mt-auto">
                    <button type="button" onClick={() => { setShowEditModal(false); setEditingItem(null); setCascadePath([]); }} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">Abort</button>
                    <button type="submit" disabled={saving} className="flex-[2] py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                        {saving ? "Syncing..." : "Update Matrix"}
                    </button>
                </div>
            </form>
        </div>
      </SlideDrawer>
    </div>
  );
}

// Cascade level box sub-component
function ProductCascadeLevel({ depth, options, selectedId, onSelect }) {
  const levelLabels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
  const label = levelLabels[depth] || `Level ${depth + 1}`;

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute -top-3 left-3 flex items-center gap-1">
          <div className="w-px h-3 bg-gray-200" />
          <ChevronRight size={10} className="text-gray-300 -ml-0.5" />
        </div>
      )}
      <div className={`rounded-xl overflow-hidden border transition-all ${
        selectedId ? 'border-black bg-white' : 'border-gray-100 bg-gray-50'
      }`}>
        <div className="flex items-center px-4 py-0.5 border-b border-gray-50">
          <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">{label}</span>
        </div>
        <select
          value={selectedId}
          onChange={e => onSelect(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer text-black appearance-none"
        >
          <option value="">— Select —</option>
          {options.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
