import React, { useEffect, useState, useRef } from 'react';
import { Undo2, X, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
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
  const [isHovered, setIsHovered] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const duration = toast?.duration || (toast?.undoItem ? 7500 : 4000);

  useEffect(() => {
    if (!toast) return;

    startTimeRef.current = Date.now();
    remainingTimeRef.current = duration;
    setProgress(100);

    const updateTimer = () => {
      if (isHovered) {
        // Paused on hover
        animationFrameRef.current = requestAnimationFrame(updateTimer);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const pct = (remaining / duration) * 100;
      setProgress(pct);

      if (remaining <= 0) {
        onClose();
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
  }, [toast?.id, isHovered, duration, onClose]);

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
      className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 sm:px-0 pointer-events-none transition-all duration-300"
      role="alert"
      aria-live="polite"
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          startTimeRef.current = Date.now() - (1 - progress / 100) * duration;
        }}
        className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/80 p-3.5 sm:p-4 flex flex-col gap-2.5 overflow-hidden transition-all duration-200 transform translate-y-0 opacity-100"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-xl bg-slate-800/90 border border-slate-700/50 flex items-center justify-center shrink-0">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-100 line-clamp-2 leading-relaxed">
                {toast.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast.undoItem && (
              <button
                type="button"
                onClick={() => {
                  if (toast.undoItem) {
                    onUndo(toast.undoItem);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer border border-amber-400/30"
                title="Batalkan perubahan ini (Undo / Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Undo</span>
                <span className="hidden sm:inline text-[10px] opacity-80 font-mono bg-black/20 px-1 py-0.2 rounded ml-0.5">
                  Ctrl+Z
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Countdown Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
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
