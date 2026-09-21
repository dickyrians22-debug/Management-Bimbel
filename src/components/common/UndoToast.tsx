import React, { useEffect, useState, useRef } from 'react';
import { Undo2, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { UndoItem } from '../../types';

export interface ToastPayload {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  undoItem?: UndoItem;
  duration?: number;
}

interface UndoToastProps {
  toast: ToastPayload | null;
  onUndo: (item: UndoItem) => void;
  onClose: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ toast, onUndo, onClose }) => {
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  // Fast & snappy duration:
  // Normal info/success: 1.8 seconds (1800ms)
  // Actions with Undo button: 3.2 seconds (3200ms)
  const duration = toast?.duration || (toast?.undoItem ? 3200 : 1800);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  useEffect(() => {
    if (!toast) {
      setIsClosing(false);
      return;
    }

    setIsClosing(false);
    startTimeRef.current = Date.now();
    setProgress(100);

    const updateTimer = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;
      setProgress(pct);

      if (remaining <= 0) {
        handleDismiss();
      } else {
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [toast?.id, duration]);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'warning':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-full px-3 sm:px-0 pointer-events-none transition-all duration-200 ${
        isClosing ? 'opacity-0 translate-y-3 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div
        onClick={handleDismiss}
        title="Klik untuk langsung menutup notifikasi"
        className="pointer-events-auto cursor-pointer group bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3 sm:p-3.5 flex flex-col gap-2 overflow-hidden transition-all duration-150 hover:bg-slate-900 hover:border-slate-600 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-800/90 border border-slate-700/50 flex items-center justify-center shrink-0">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100 line-clamp-2 leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {toast.undoItem && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (toast.undoItem) {
                    onUndo(toast.undoItem);
                  }
                  handleDismiss();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer border border-amber-400/30 shrink-0"
                title="Batalkan perubahan ini (Undo / Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Undo</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Tutup Notifikasi"
              aria-label="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Countdown Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              toast.undoItem
                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                : 'bg-gradient-to-r from-emerald-400 to-teal-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
