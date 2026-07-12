import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, RefreshCw, FileQuestion, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface CompletedProduct {
  id: string;
  pending_product_id: string;
  image_1: string | null;
  image_2: string | null;
  image_3: string | null;
  created_at: string;
  product: { name: string; sku: string; brand: string };
}

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<CompletedProduct[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const navigate = useNavigate();

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('pending_product_images')
        .select(`
          id, pending_product_id, image_1, image_2, image_3, created_at,
          product:pending_products ( name, sku, brand )
        `)
        .order('updated_at', { ascending: false })
        .limit(24);
      if (error) throw error;
      const formatted = (data || [])
        .filter((item: any) => item.product !== null)
        .map((item: any) => ({
          ...item,
          product: Array.isArray(item.product) ? item.product[0] : item.product,
        })) as CompletedProduct[];
      setHistory(formatted);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="page-wrap space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            Completed History
          </h2>
          <p className="section-title">Recently uploaded product photos</p>
        </div>
        <button
          id="history-refresh-btn"
          onClick={fetchHistory}
          disabled={loadingHistory}
          className="btn btn-ghost"
        >
          <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <hr className="section-divider" />

      {loadingHistory ? (
        <div className="history-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-2 border-black bg-white rounded-xl overflow-hidden animate-pulse p-3.5 space-y-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="grid grid-cols-3 gap-2 h-16">
                <div className="bg-gray-300 rounded-lg" />
                <div className="bg-gray-300 rounded-lg" />
                <div className="bg-gray-300 rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="bg-gray-300 h-2.5 w-12 rounded" />
                <div className="bg-gray-300 h-3.5 w-full rounded" />
                <div className="bg-gray-300 h-2.5 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <ImageIcon className="w-8 h-8 text-gray-200" />
          <span className="empty-state-label">No uploads found</span>
          <span className="empty-state-sub">Your uploaded files will appear here.</span>
        </div>
      ) : (
        <div className="history-grid">
          {history.map(item => (
            <div
              key={item.id}
              id={`history-card-${item.id}`}
              className="history-card"
              onClick={() => navigate(`/?sku=${item.pending_product_id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="history-thumb-row">
                {[item.image_1, item.image_2, item.image_3].map((img, i) => (
                  <div key={i} className="history-thumb-cell">
                    {img ? (
                      <img src={img} alt={`Asset ${i + 1}`} />
                    ) : (
                      <FileQuestion className="w-4 h-4 text-gray-200" />
                    )}
                  </div>
                ))}
              </div>
              <div className="history-card-body">
                <span className="history-brand">{item.product?.brand || 'No Brand'}</span>
                <span className="history-name">{item.product?.name}</span>
                <span className="history-sku">SKU: {item.product?.sku}</span>
                <div className="history-footer">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-0.5">
                    Edit <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
