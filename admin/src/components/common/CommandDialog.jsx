import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { OVERLAY_CHROME_STYLE } from './overlayChrome';

export default function CommandDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
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

  const content = (
    <div
      className="fixed z-[200] flex items-center justify-center p-4"
      style={OVERLAY_CHROME_STYLE}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full ${maxWidth} bg-white rounded-[40px] shadow-2xl border border-gray-100/80 overflow-hidden animate-scale-in-center flex flex-col max-h-[min(90vh,calc(100%-2rem))]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h3
              id="command-dialog-title"
              className="text-2xl font-black text-black uppercase tracking-tighter"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-8">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
