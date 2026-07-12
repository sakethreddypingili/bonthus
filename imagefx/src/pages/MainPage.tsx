import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Upload, Loader2, AlertCircle, CheckCircle, Trash2,
  Eye, ZoomIn, Layers, AlertTriangle, Search, RefreshCw
} from 'lucide-react';
import { supabase } from '../utils/supabase';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface PendingProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  status: string;
}

interface ImageSlot {
  file: File | null;
  previewUrl: string | null;
  existingUrl: string | null;
  isModified: boolean;
  sizeWarning: string | null;
}

interface ParsedFile {
  id: string;
  file: File;
  sku: string;
  slotIndex: number;
  status: 'pending' | 'resolving' | 'matched' | 'failed' | 'uploading' | 'completed';
  productId?: string;
  productName?: string;
  error?: string;
  progress?: number;
}

const EMPTY_SLOT = (): ImageSlot => ({
  file: null,
  previewUrl: null,
  existingUrl: null,
  isModified: false,
  sizeWarning: null,
});

/* ─── Component ─────────────────────────────────────────────────────────── */

export const MainPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const skuQuery = searchParams.get('sku');

  /* Search */
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  /* Product editor */
  const [product, setProduct] = useState<PendingProduct | null>(null);
  const [slots, setSlots] = useState<ImageSlot[]>(Array.from({ length: 10 }, EMPTY_SLOT));
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  /* Zoom/pan */
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 50, y: 50 });
  const previewRef = useRef<HTMLDivElement>(null);

  /* Batch */
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<ParsedFile[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* ── Search function ─────────────────────────────────────────────────── */
  const handleSearch = async (query: string) => {
    setSearching(true);
    setSearchError('');
    setSaveError('');
    setSaveSuccess('');

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(query);

      let qb = supabase.from('pending_products').select('id, name, sku, brand, status');
      qb = isUuid ? qb.eq('id', query) : qb.or(`sku.eq."${query}",name.ilike."%${query}%"`);

      const { data, error } = await qb.limit(5);
      if (error) throw error;

      if (!data || data.length === 0) {
        setSearchError('No pending product found with that SKU or ID.');
        setProduct(null);
        return;
      }
      if (data.length > 1) {
        setSearchError('Multiple products found. Please search by exact SKU.');
        setProduct(null);
        return;
      }

      const prod = data[0] as PendingProduct;
      setProduct(prod);
      await loadProductImages(prod.id);
      setBatchOpen(false);
    } catch (err: any) {
      setSearchError(err.message || 'Error searching for product.');
      setProduct(null);
    } finally {
      setSearching(false);
    }
  };

  /* ── Trigger search from query parameter or reset ────────────────────── */
  useEffect(() => {
    if (skuQuery) {
      handleSearch(skuQuery);
      setSearchInputValue(skuQuery);
    } else {
      setProduct(null);
      setSlots(Array.from({ length: 10 }, EMPTY_SLOT));
      setSearchInputValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuQuery]);

  const onSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInputValue.trim();
    if (query) {
      setSearchParams({ sku: query });
    }
  };

  /* ── Load existing images ────────────────────────────────────────────── */
  const loadProductImages = async (productId: string) => {
    setLoadingProduct(true);
    try {
      const { data, error } = await supabase
        .from('pending_product_images')
        .select('*')
        .eq('pending_product_id', productId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSlots(
          Array.from({ length: 10 }, (_, i) => {
            const url = data[`image_${i + 1}`] || null;
            return { file: null, previewUrl: url, existingUrl: url, isModified: false, sizeWarning: null };
          }),
        );
      } else {
        setSlots(Array.from({ length: 10 }, EMPTY_SLOT));
      }
      setSelectedSlotIndex(0);
      setZoomLevel(1);
      setPanPosition({ x: 50, y: 50 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProduct(false);
    }
  };

  /* ── File change (editor slot) ───────────────────────────────────────── */
  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowed.includes(file.type)) {
      alert('Unsupported format. Use JPEG, PNG, WebP, GIF, or SVG.');
      return;
    }

    let sizeWarning: string | null = null;
    if (file.size > 50 * 1024) {
      sizeWarning = `File is too large (${(file.size / 1024).toFixed(1)} KB). Strictly max 50 KB allowed.`;
    }

    const previewUrl = URL.createObjectURL(file);
    setSlots(prev =>
      prev.map((s, i) =>
        i === index ? { ...s, file, previewUrl, isModified: true, sizeWarning } : s,
      ),
    );
    setSelectedSlotIndex(index);
    setZoomLevel(1);
    setPanPosition({ x: 50, y: 50 });
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFileChange(index, e.dataTransfer.files[0]);
  };

  const handleRemoveImage = (index: number) => {
    setSlots(prev =>
      prev.map((s, i) =>
        i === index
          ? { ...s, file: null, previewUrl: null, isModified: true, sizeWarning: null }
          : s,
      ),
    );
  };

  /* ── Zoom/pan ─────────────────────────────────────────────────────────── */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomLevel === 1 || !previewRef.current) return;
    const { left, top, width, height } = previewRef.current.getBoundingClientRect();
    setPanPosition({
      x: ((e.clientX - left) / width) * 100,
      y: ((e.clientY - top) / height) * 100,
    });
  };

  const toggleZoom = () => {
    setZoomLevel(prev => (prev === 1 ? 2.5 : 1));
  };

  /* ── Save ─────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!product) return;

    // Check size limit on modified files
    const tooLarge = slots.some(s => s.isModified && s.file && s.file.size > 50 * 1024);
    if (tooLarge) {
      setSaveError('Cannot save assets: One or more slots contain files exceeding the 50 KB size limit.');
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const updatedUrls: Record<string, string | null> = {};

      for (let i = 0; i < 10; i++) {
        const slot = slots[i];
        const col = `image_${i + 1}`;

        if (!slot.isModified) {
          updatedUrls[col] = slot.existingUrl;
          continue;
        }
        if (!slot.previewUrl) {
          updatedUrls[col] = null;
          // Clean up file with original extension if known (checking supabse logic path)
          await supabase.storage.from('imagefx-uploads').remove([`${product.id}/image_${i + 1}.jpg`]);
          await supabase.storage.from('imagefx-uploads').remove([`${product.id}/image_${i + 1}.jpeg`]);
          await supabase.storage.from('imagefx-uploads').remove([`${product.id}/image_${i + 1}.png`]);
          continue;
        }

        if (slot.file) {
          const extension = slot.file.name.split('.').pop() || 'jpg';
          const path = `${product.id}/image_${i + 1}.${extension}`;

          const { error: uploadErr } = await supabase.storage
            .from('imagefx-uploads')
            .upload(path, slot.file, { cacheControl: '3600', contentType: slot.file.type, upsert: true });
          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage.from('imagefx-uploads').getPublicUrl(path);
          updatedUrls[col] = urlData.publicUrl;
        }
      }

      const { error: dbErr } = await supabase
        .from('pending_product_images')
        .upsert({ pending_product_id: product.id, ...updatedUrls, updated_at: new Date().toISOString() });
      if (dbErr) throw dbErr;

      setSaveSuccess('Assets saved successfully.');
      await loadProductImages(product.id);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save assets.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Batch: parse filenames ───────────────────────────────────────────── */
  const parseFilename = (filename: string): { sku: string; slotIndex: number } | null => {
    const clean = filename.substring(0, filename.lastIndexOf('.'));
    const match = clean.match(/^([A-Z0-9\-_]+)[_-](\d+)$/i);
    if (match) {
      const idx = parseInt(match[2], 10);
      if (idx >= 1 && idx <= 10) return { sku: match[1].toUpperCase(), slotIndex: idx - 1 };
    }
    return null;
  };

  const handleBatchDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!e.dataTransfer.files) return;
    const newFiles: ParsedFile[] = [];
    Array.from(e.dataTransfer.files).forEach(file => {
      const parsed = parseFilename(file.name);
      if (file.size > 50 * 1024) {
        newFiles.push({ id: crypto.randomUUID(), file, sku: parsed ? parsed.sku : 'UNKNOWN', slotIndex: parsed ? parsed.slotIndex : 0, status: 'failed', error: 'File size exceeds 50 KB limit' });
      } else if (parsed) {
        newFiles.push({ id: crypto.randomUUID(), file, sku: parsed.sku, slotIndex: parsed.slotIndex, status: 'pending' });
      } else {
        newFiles.push({ id: crypto.randomUUID(), file, sku: 'UNKNOWN', slotIndex: 0, status: 'failed', error: 'Filename must be SKU_INDEX (e.g. SKU123_1.jpg)' });
      }
    });
    setBatchFiles(prev => [...prev, ...newFiles]);
  };

  const handleBatchClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      if (!input.files) return;
      const newFiles: ParsedFile[] = [];
      Array.from(input.files).forEach(file => {
        const parsed = parseFilename(file.name);
        if (file.size > 50 * 1024) {
          newFiles.push({ id: crypto.randomUUID(), file, sku: parsed ? parsed.sku : 'UNKNOWN', slotIndex: parsed ? parsed.slotIndex : 0, status: 'failed', error: 'File size exceeds 50 KB limit' });
        } else if (parsed) {
          newFiles.push({ id: crypto.randomUUID(), file, sku: parsed.sku, slotIndex: parsed.slotIndex, status: 'pending' });
        } else {
          newFiles.push({ id: crypto.randomUUID(), file, sku: 'UNKNOWN', slotIndex: 0, status: 'failed', error: 'Filename must be SKU_INDEX (e.g. SKU123_1.jpg)' });
        }
      });
      setBatchFiles(prev => [...prev, ...newFiles]);
    };
    input.click();
  };

  /* ── Batch: resolve SKUs ─────────────────────────────────────────────── */
  const resolveSKUs = async () => {
    const pending = batchFiles.filter(f => f.status === 'pending');
    if (!pending.length) return;
    setBatchProcessing(true);
    setBatchFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'resolving' } : f));

    const skus = [...new Set(pending.map(f => f.sku))];
    try {
      const { data, error } = await supabase.from('pending_products').select('id, sku, name').in('sku', skus);
      if (error) throw error;
      const skuMap = new Map<string, { id: string; name: string }>();
      data?.forEach(p => skuMap.set(p.sku.toUpperCase(), { id: p.id, name: p.name }));

      setBatchFiles(prev =>
        prev.map(f => {
          if (f.status !== 'resolving') return f;
          const match = skuMap.get(f.sku);
          return match
            ? { ...f, status: 'matched', productId: match.id, productName: match.name }
            : { ...f, status: 'failed', error: 'SKU not found in registry' };
        }),
      );
    } catch (err: any) {
      alert('Error verifying SKUs: ' + (err.message || 'Unknown error'));
      setBatchFiles(prev => prev.map(f => f.status === 'resolving' ? { ...f, status: 'pending' } : f));
    } finally {
      setBatchProcessing(false);
    }
  };

  /* ── Batch: upload ────────────────────────────────────────────────────── */
  const executeBatchUpload = async () => {
    const matched = batchFiles.filter(f => f.status === 'matched' && f.productId);
    if (!matched.length) return;
    setBatchProcessing(true);

    for (const item of matched) {
      if (item.file.size > 50 * 1024) {
        setBatchFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'failed', error: 'File size exceeds 50 KB limit' } : f));
        continue;
      }

      setBatchFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f));
      try {
        const extension = item.file.name.split('.').pop() || 'jpg';
        const path = `${item.productId}/image_${item.slotIndex + 1}.${extension}`;

        const { error: uploadErr } = await supabase.storage
          .from('imagefx-uploads')
          .upload(path, item.file, { cacheControl: '3600', contentType: item.file.type, upsert: true });
        if (uploadErr) throw uploadErr;

        setBatchFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 60 } : f));

        const { data: urlData } = supabase.storage.from('imagefx-uploads').getPublicUrl(path);
        const col = `image_${item.slotIndex + 1}`;

        const { error: dbErr } = await supabase
          .from('pending_product_images')
          .upsert({ pending_product_id: item.productId, [col]: urlData.publicUrl, updated_at: new Date().toISOString() });
        if (dbErr) throw dbErr;

        setBatchFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'completed', progress: 100 } : f));
      } catch (err: any) {
        setBatchFiles(prev =>
          prev.map(f => f.id === item.id ? { ...f, status: 'failed', error: err.message || 'Upload failed' } : f),
        );
      }
    }

    setBatchProcessing(false);
  };

  /* ─── Derived ─────────────────────────────────────────────────────────── */
  const activeSlot = slots[selectedSlotIndex];
  const readyToResolve = batchFiles.some(f => f.status === 'pending');
  const readyToUpload = batchFiles.some(f => f.status === 'matched');

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="page-wrap space-y-8 animate-fade-in">

      {/* ── Center search bar layout when no product editing ────────────────── */}
      {!product && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-black uppercase">
              Search Products
            </h1>
            <p className="max-w-xl mx-auto text-xs text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
              Search for a product SKU or scan the barcode to upload high-res images
            </p>
          </div>

          <form onSubmit={onSearchFormSubmit} className="w-full max-w-2xl relative">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-black">
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </span>
              <input
                id="sku-search-input"
                type="text"
                required
                value={searchInputValue}
                onChange={e => setSearchInputValue(e.target.value)}
                placeholder="Enter product SKU, ID, or scan barcode..."
                className="input-field pl-12 pr-28 py-3.5 text-base border border-black focus:border-black focus:ring-2 focus:ring-black/10"
              />
              <button
                id="sku-search-btn"
                type="submit"
                disabled={searching}
                className="absolute right-2 top-2 btn-primary px-4 py-2 text-xs uppercase font-extrabold tracking-wider rounded-md"
                style={{ height: '36px' }}
              >
                Search
              </button>
            </div>
            {searchError && (
              <p className="mt-3 text-xs font-bold text-red-700 text-left bg-red-50 border border-red-300 p-2.5 rounded-xl">
                {searchError}
              </p>
            )}
          </form>

          {/* Quick Guide content below search bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full pt-12 text-left animate-slide-up">
            <div className="border-2 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2 font-mono">Step 01</span>
              <h3 className="text-sm font-extrabold uppercase text-black mb-1.5">Look up SKU</h3>
              <p className="text-xs text-gray-500 leading-normal">
                Scan product barcode or search by exact SKU to load your asset workspace slots.
              </p>
            </div>
            <div className="border-2 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2 font-mono">Step 02</span>
              <h3 className="text-sm font-extrabold uppercase text-black mb-1.5">Drop raw files</h3>
              <p className="text-xs text-gray-500 leading-normal">
                Drag Photoshop exports into slot panels. System automatically optimizes files to high-fidelity WebP format.
              </p>
            </div>
            <div className="border-2 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-2 font-mono">Step 03</span>
              <h3 className="text-sm font-extrabold uppercase text-black mb-1.5">Verify & Zoom</h3>
              <p className="text-xs text-gray-500 leading-normal">
                Use high-resolution pan-inspector tools to examine fine details before syncing to database.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Product editor ──────────────────────────────────────────────── */}
      {product && (
        <div className="space-y-5 animate-slide-down">
          {/* Product strip */}
          <div className="product-strip">
            <div className="product-strip-left">
              <span className="product-brand-chip">{product.brand || 'No Brand'}</span>
              <span className="product-sku-chip">SKU: {product.sku}</span>
              <span className="product-name">{product.name}</span>
            </div>
            <div className="product-strip-actions">
              <button
                id="save-assets-btn"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save Assets'}
              </button>
              <button
                onClick={() => setSearchParams({})}
                className="btn btn-ghost"
              >
                Back to Search
              </button>
            </div>
          </div>

          {/* Save alerts */}
          {saveError && (
            <div className="alert alert-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {saveSuccess && (
            <div className="alert alert-success">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {/* Editor grid */}
          {loadingProduct ? (
            <div className="editor-grid animate-pulse">
              {/* Slots Panel Skeleton */}
              <div className="slots-panel border-2 border-black bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="bg-gray-300 h-3.5 w-24 rounded" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-28 bg-gray-200 border-2 border-dashed border-gray-300 rounded-xl" />
                  ))}
                </div>
              </div>
              
              {/* Inspector Panel Skeleton */}
              <div className="inspector-panel border-2 border-black bg-white rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[600px]">
                <div className="bg-gray-50 h-11 border-b-2 border-black flex items-center px-5">
                  <div className="bg-gray-300 h-3 w-32 rounded" />
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center" />
              </div>
            </div>
          ) : (
            <div className="editor-grid">
              {/* Slot grid */}
              <div className="slots-panel">
                <div className="slots-panel-header">
                  <span className="section-title">Asset Slots (1–10)</span>
                </div>
                <div className="slots-grid">
                  {slots.map((slot, idx) => (
                    <div
                      key={idx}
                      id={`slot-${idx + 1}`}
                      className={`slot-card ${selectedSlotIndex === idx ? 'slot-card-active' : ''} ${slot.previewUrl && selectedSlotIndex !== idx ? 'slot-card-filled' : ''} ${slot.sizeWarning ? 'border-red-500' : ''}`}
                      onClick={() => setSelectedSlotIndex(idx)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDrop(e, idx)}
                    >
                      {slot.previewUrl ? (
                        <div className="w-full h-full relative group overflow-hidden rounded-md">
                          <img src={slot.previewUrl} alt={`Slot ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150">
                            <button
                              id={`slot-${idx + 1}-remove-btn`}
                              onClick={e => { e.stopPropagation(); handleRemoveImage(idx); }}
                              className="p-1.5 bg-white rounded text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-4 h-4 text-gray-300 mb-1" />
                          <span className="slot-label">Image {idx + 1}</span>
                        </div>
                      )}
                      {slot.isModified && <div className="slot-modified-dot" title="Modified" />}
                      {!slot.previewUrl && (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => { if (e.target.files?.[0]) handleFileChange(idx, e.target.files[0]); }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Inspector */}
              <div className="inspector-panel">
                <div className="inspector-header">
                  <span className="inspector-label">
                    <Eye className="w-3.5 h-3.5" />
                    Asset Inspector — Slot {selectedSlotIndex + 1}
                  </span>
                  {activeSlot.previewUrl && (
                    <button
                      id="zoom-toggle-btn"
                      onClick={toggleZoom}
                      className="btn btn-ghost"
                      style={{ height: 28, fontSize: 10, padding: '0 10px' }}
                    >
                      <ZoomIn className="w-3 h-3" />
                      {zoomLevel === 1 ? 'Zoom In' : 'Reset'}
                    </button>
                  )}
                </div>
                <div
                  ref={previewRef}
                  onMouseMove={handleMouseMove}
                  onClick={activeSlot.previewUrl ? toggleZoom : undefined}
                  className={`inspector-body ${!activeSlot.previewUrl ? 'inspector-empty' : ''}`}
                  style={{ cursor: activeSlot.previewUrl ? (zoomLevel > 1 ? 'zoom-out' : 'zoom-in') : 'default' }}
                >
                  {activeSlot.previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={activeSlot.previewUrl}
                        alt="Inspector"
                        className="max-w-full max-h-full object-contain transition-all duration-300 select-none"
                        style={{
                          transform: zoomLevel > 1 ? `scale(${zoomLevel})` : 'scale(1)',
                          transformOrigin: zoomLevel > 1 ? `${panPosition.x}% ${panPosition.y}%` : 'center',
                        }}
                        draggable={false}
                      />
                      {activeSlot.sizeWarning && (
                        <div className="absolute top-2 left-2 right-2 bg-red-100 border border-red-400 text-red-700 text-xs font-semibold px-3 py-2 rounded flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>{activeSlot.sizeWarning}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-200" />
                      <span className="inspector-empty-label">Drag & Drop Image Here</span>
                      <span className="inspector-empty-sub">or click the slot on the left to select a file</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Batch panel ─────────────────────────────────────────────────── */}
      {batchOpen && (
        <div className="batch-panel animate-slide-down">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="section-title flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Smart Batch Uploader
            </span>
            <div className="flex items-center gap-2">
              {readyToResolve && (
                <button id="verify-sku-btn" onClick={resolveSKUs} disabled={batchProcessing} className="btn btn-ghost">
                  <RefreshCw className={`w-3 h-3 ${batchProcessing ? 'animate-spin' : ''}`} />
                  Verify SKUs
                </button>
              )}
              {readyToUpload && (
                <button id="upload-matched-btn" onClick={executeBatchUpload} disabled={batchProcessing} className="btn btn-primary">
                  Upload Matched
                </button>
              )}
              {batchFiles.length > 0 && (
                <button id="clear-batch-btn" onClick={() => setBatchFiles([])} disabled={batchProcessing} className="btn btn-ghost">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Drop zone */}
          <div
            id="batch-drop-zone"
            className={`batch-drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleBatchDrop}
            onClick={handleBatchClick}
          >
            <Upload className="w-8 h-8 text-gray-300" />
            <span className="batch-drop-label">Drag & Drop Batch Photos Here</span>
            <span className="batch-drop-sub">
              Click to browse · Supports multiple files<br />
              Filename pattern: SKU_INDEX (e.g. LENS423_1.jpg, LENS423_2.jpg)
            </span>
          </div>

          {/* Queue table */}
          {batchFiles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>SKU</th>
                    <th>Slot</th>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {batchFiles.map(item => {
                    const isTooLarge = item.file.size > 50 * 1024;
                    return (
                      <tr key={item.id}>
                        <td className="font-mono text-xs text-gray-700">{item.file.name}</td>
                        <td className="font-mono font-semibold">{item.sku}</td>
                        <td className="font-mono">Slot {item.slotIndex + 1}</td>
                        <td className="text-gray-500 max-w-[180px] truncate">{item.productName || '—'}</td>
                        <td className="font-mono text-xs">
                          <span className={`compress-badge ${isTooLarge ? 'border-red-400 text-red-700' : 'compress-badge-ok'}`}>
                            {(item.file.size / 1024).toFixed(1)} KB
                          </span>
                        </td>
                        <td>
                          {item.status === 'pending'    && <span className="status-badge badge-pending">Unverified</span>}
                          {item.status === 'resolving'  && <span className="status-badge badge-resolving"><Loader2 className="w-3 h-3 animate-spin" /> Verifying</span>}
                          {item.status === 'matched'    && <span className="status-badge badge-matched">Ready</span>}
                          {item.status === 'uploading'  && <span className="status-badge badge-uploading"><Loader2 className="w-3 h-3 animate-spin" /> Uploading</span>}
                          {item.status === 'completed'  && <span className="status-badge badge-completed"><CheckCircle className="w-3 h-3" /> Done</span>}
                          {item.status === 'failed'     && (
                            <span className="status-badge badge-failed" title={item.error}>
                              <AlertTriangle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setBatchFiles(prev => prev.filter(f => f.id !== item.id))}
                            disabled={batchProcessing}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
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
      )}
    </div>
  );
};
