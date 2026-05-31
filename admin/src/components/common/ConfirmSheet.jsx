import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OVERLAY_CHROME_STYLE } from './overlayChrome';

export default function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  icon: Icon,
  title,
  description,
  message,
  confirmLabel = 'Confirm',
  confirmText,
  confirmLoading = false,
  loading = false,
  disabled = false,
  danger = false,
  isDanger = false,
  children,
}) {
  const bodyText = description ?? message;
  const actionLabel = confirmText ?? confirmLabel;
  const isLoading = confirmLoading || loading || disabled;
  const isDangerAction = danger || isDanger;

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
      className="fixed z-[200] flex items-end justify-center"
      style={OVERLAY_CHROME_STYLE}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-md bg-white rounded-t-[2rem] shadow-2xl animate-slide-in-up p-8 text-center flex flex-col max-h-[min(90vh,calc(100%-1rem))]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1 flex flex-col pb-4">
          {Icon && (
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0 ${
                isDangerAction ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-black'
              }`}
            >
              <Icon size={32} />
            </div>
          )}
          <h3
            id="confirm-sheet-title"
            className="text-2xl font-black text-black uppercase tracking-tighter shrink-0"
          >
            {title}
          </h3>
          {bodyText && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 mb-4 shrink-0">
              {bodyText}
            </p>
          )}

          {children && <div className="mt-2 text-left">{children}</div>}
        </div>

        <div className="flex gap-3 mt-4 shrink-0 pt-2 border-t border-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
          >
            Abort
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-[2] py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all ${
              isDangerAction ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-black/90'
            }`}
          >
            {isLoading ? 'Processing...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
