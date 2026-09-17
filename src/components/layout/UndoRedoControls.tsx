import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, History, RotateCcw, Clock, Check, ChevronDown } from 'lucide-react';
import { UndoItem } from '../../types';

interface UndoRedoControlsProps {
  undoStack: UndoItem[];
  redoStack: UndoItem[];
  onUndo: () => void;
  onRedo: () => void;
  isLight?: boolean;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  undoStack,
  redoStack,
  onUndo,
  onRedo,
  isLight = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 10) return 'Baru saja';
    if (diff < 60) return `${diff} dtk lalu`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} mnt lalu`;
    const hours = Math.floor(mins / 60);
    return `${hours} jam lalu`;
  };

  const getCategoryLabel = (category: UndoItem['category']) => {
    switch (category) {
      case 'student':
        return { label: 'Siswa', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'attendance':
        return { label: 'Presensi', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'income':
        return { label: 'Kas Masuk', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'expense':
        return { label: 'Kas Keluar', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'user':
        return { label: 'Akun', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'ppdb':
        return { label: 'PPDB', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      case 'settings':
        return { label: 'Pengaturan', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      default:
        return { label: 'Data', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <div
        className={`flex items-center gap-0.5 p-1 rounded-xl border ${
          isLight
            ? 'bg-slate-100 border-slate-200 text-slate-700'
            : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
        }`}
      >
        {/* Undo Button */}
        <button
          type="button"
          onClick={() => onUndo()}
          disabled={!canUndo}
          title={canUndo ? `Batalkan Perubahan: "${undoStack[0]?.title}" (Ctrl+Z)` : 'Undo (Ctrl+Z) - Belum ada riwayat perubahan'}
          className={`relative p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            canUndo
              ? isLight
                ? 'hover:bg-amber-100 text-amber-800 hover:text-amber-900 active:scale-95'
                : 'hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 active:scale-95'
              : 'opacity-40 cursor-not-allowed text-slate-400'
          }`}
        >
          <Undo2 className="w-4 h-4 stroke-[2.2]" />
          <span className="hidden sm:inline text-[11px] font-bold">Undo</span>
          {canUndo && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center -ml-0.5 shadow-sm">
              {undoStack.length}
            </span>
          )}
        </button>

        {/* Redo Button */}
        {canRedo && (
          <button
            type="button"
            onClick={() => onRedo()}
            title={`Ulangi Perubahan: "${redoStack[0]?.title}" (Ctrl+Y)`}
            className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isLight
                ? 'hover:bg-emerald-100 text-emerald-800 hover:text-emerald-900 active:scale-95'
                : 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 active:scale-95'
            }`}
          >
            <Redo2 className="w-4 h-4 stroke-[2.2]" />
            <span className="hidden sm:inline text-[11px] font-bold">Redo</span>
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center -ml-0.5 shadow-sm">
              {redoStack.length}
            </span>
          </button>
        )}

        {/* Dropdown Toggle for Recent History */}
        {canUndo && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            title="Lihat Riwayat Perubahan Terakhir"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isOpen
                ? isLight
                  ? 'bg-slate-200 text-slate-900'
                  : 'bg-white/10 text-white'
                : isLight
                ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* History Dropdown Menu */}
      {isOpen && canUndo && (
        <div
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-slate-100"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Riwayat Perubahan Terakhir</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {undoStack.length} Aksi
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {undoStack.map((item, idx) => {
                const cat = getCategoryLabel(item.category);
                const isLatest = idx === 0;

                return (
                  <div
                    key={item.id}
                    className={`p-2 rounded-xl transition-all border ${
                      isLatest
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cat.color}`}>
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-200 line-clamp-2">
                      {item.title}
                    </p>

                    {isLatest && (
                      <div className="mt-2 pt-1.5 border-t border-amber-500/20 flex items-center justify-between">
                        <span className="text-[10px] text-amber-300 font-medium">Aksi Terkini</span>
                        <button
                          type="button"
                          onClick={() => {
                            onUndo();
                            setIsOpen(false);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition active:scale-95"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Undo Aksi Ini</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between px-1">
            <span>Shortcut: <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded border border-slate-700 text-slate-300">Ctrl+Z</kbd></span>
            <span>Redo: <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded border border-slate-700 text-slate-300">Ctrl+Y</kbd></span>
          </div>
        </div>
      )}
    </div>
  );
};
