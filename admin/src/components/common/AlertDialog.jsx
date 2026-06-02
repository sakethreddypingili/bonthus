import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { OVERLAY_CHROME_STYLE } from './overlayChrome';

export default function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'warning', // 'error' | 'success' | 'warning' | 'info'
  buttonText = 'Got It',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Icon and theme selection based on alert type
  let IconComponent = AlertCircle;
  let iconBg = 'bg-orange-50 text-orange-500';
  
  if (type === 'error') {
    IconComponent = AlertCircle;
    iconBg = 'bg-red-50 text-red-600';
  } else if (type === 'success') {
    IconComponent = CheckCircle2;
    iconBg = 'bg-green-50 text-green-600';
  } else if (type === 'info') {
    IconComponent = Info;
    iconBg = 'bg-blue-50 text-blue-600';
  } else if (type === 'warning') {
    IconComponent = AlertTriangle;
    iconBg = 'bg-orange-50 text-orange-500';
  }

  const content = (
    <div
      className="fixed z-[250] flex items-center justify-center p-4"
      style={OVERLAY_CHROME_STYLE}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-scale-in-center p-8 flex flex-col items-center text-center"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all"
          aria-label="Close"
        >
          <X size={20} strokeWidth={3} />
        </button>

        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 mt-4 shrink-0 ${iconBg}`}>
          <IconComponent size={36} strokeWidth={2.5} />
        </div>

        <h3 className="text-2xl font-black text-black uppercase tracking-tighter mb-3 leading-tight">
          {title}
        </h3>

        {message && (
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed mb-8 max-w-[85%] whitespace-pre-line">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all hover:bg-black/90"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
