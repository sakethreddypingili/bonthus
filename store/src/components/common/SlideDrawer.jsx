import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { OVERLAY_CHROME_STYLE } from './overlayChrome';

export default function SlideDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-[440px]',
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
    <div className="fixed z-[200] flex justify-end" style={OVERLAY_CHROME_STYLE}>
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative h-full w-full ${width} bg-white shadow-2xl flex flex-col animate-slide-in-right`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-drawer-title"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div>
            <h3
              id="slide-drawer-title"
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

        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
