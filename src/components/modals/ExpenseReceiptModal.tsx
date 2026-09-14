import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, CheckCircle2, Download, Image as ImageIcon, Loader2, Palette } from 'lucide-react';
import { ExpenseRecord, BimbelSettings } from '../../types';
import { formatRupiah, formatDateIndo, angkaTerbilang, normalizeExpenseRefNumber } from '../../utils/storage';
import { exportElementToPng, printElement } from '../../utils/exportUtils';
import { BimbelLogo } from '../common/BimbelLogo';
import { getDocumentThemeStyles } from '../../utils/theme';

interface ExpenseReceiptModalProps {
  isOpen: boolean;
  onClose?: () => void;
  expense: ExpenseRecord;
  settings?: BimbelSettings;
}

export const ExpenseReceiptModal: React.FC<ExpenseReceiptModalProps> = ({
  isOpen,
  onClose,
  expense,
  settings,
}) => {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState(false);
  const receiptCardRef = useRef<HTMLDivElement>(null);

  // Toggle modal-receipt-open on body for print isolation
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('modal-receipt-open');
    return () => {
      document.body.classList.remove('modal-receipt-open');
    };
  }, [isOpen]);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const refNumber = normalizeExpenseRefNumber(expense.receiptRef, expense.date, 1);

  const handlePrint = () => {
    if (receiptCardRef.current) {
      const modeSuffix = isMonochrome ? ' (B&W)' : '';
      printElement(
        receiptCardRef.current,
        `Bukti_Kas_Keluar_${refNumber}${modeSuffix}`,
        { pageSize: 'A6 portrait', margin: '4mm', maxWidth: '105mm' }
      );
    } else {
      window.print();
    }
  };

  const bimbelName = settings?.bimbelName || settings?.sidebarFooterTitle || 'RUMAH BELAJAR';
  const bimbelTagline = settings?.tagline || 'Belajar Sampai Paham, Bukan Sekadar Hafal';
  const bimbelAddress = settings?.address || 'Karang Muso 06/02 Bicak, Todanan, Blora, Jawa Tengah';
  const bimbelPhone = settings?.phone || '0852-8232-4337';

  // Profil Pejabat & Jabatan Otentik dari Database Profil Lembaga
  const ownerName = settings?.ownerName || 'Nanik Susilowati, M.Pd';
  const ownerTitle = settings?.ownerTitle || 'Pemilik & Kepala Lembaga';
  const financeOfficerName = settings?.financeOfficerName || ownerName;
  const financeOfficerTitle = settings?.financeOfficerTitle || 'Bendahara / Finance & Admin';
  const theme = getDocumentThemeStyles(settings?.accentColor);

  // Toggle penandatangan pihak internal lembaga (Default: Finance/Bendahara sesuai profil perusahaan)
  const [signerType, setSignerType] = useState<'finance' | 'owner'>('finance');

  const activeSignerName = signerType === 'owner' ? ownerName : (expense.approvedBy || financeOfficerName);
  const activeSignerTitle = signerType === 'owner' ? ownerTitle : financeOfficerTitle;

  const recipientName = expense.recipient || expense.paidTo || 'Penerima / Vendor';

  // Keterangan peran penerima
  const isSalaryOrTutor =
    (expense.category && (
      expense.category.toLowerCase().includes('salary') ||
      expense.category.toLowerCase().includes('gaji') ||
      expense.category.toLowerCase().includes('honor')
    )) ||
    Boolean(expense.tutorName) ||
    Boolean(expense.tutorId);

  const recipientRole = isSalaryOrTutor ? 'Tutor / Tenaga Pengajar' : 'Penerima Dana / Rekanan';

  const handleDownloadImage = async () => {
    if (!receiptCardRef.current) return;
    setIsExportingImage(true);
    try {
      const modeSuffix = isMonochrome ? '_BW' : '';
      const fileName = `BKK_${refNumber}_${expense.category || 'KasKeluar'}${modeSuffix}`;
      await exportElementToPng(receiptCardRef.current, fileName, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });
    } catch (err) {
      console.error('Gagal unduh gambar BKK:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div
      className="modal-receipt-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in cursor-pointer"
      onClick={() => onClose?.()}
    >
      <div
        id="expense-receipt-modal-container"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Topbar (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-sm">Bukti Kas Keluar (BKK) Resmi</h3>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Opsi Warna vs Hitam Putih (B&W) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setIsMonochrome(false)}
                className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition cursor-pointer ${
                  !isMonochrome
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format BKK berwarna asli"
              >
                <Palette className="w-3 h-3" />
                <span>Warna</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMonochrome(true)}
                className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition cursor-pointer ${
                  isMonochrome
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format monokrom hitam putih (hemat tinta printer & kontras tinggi)"
              >
                <span className="w-2 h-2 rounded-full bg-slate-950 border border-slate-400 inline-block" />
                <span>B&W</span>
              </button>
            </div>

            {/* Opsi Cepat Pilihan Penandatangan (Sesuai Profil Lembaga) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setSignerType('finance')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  signerType === 'finance'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={`Tanda tangan: ${financeOfficerTitle}`}
              >
                {financeOfficerTitle.split('/')[0].trim() || 'Bendahara'}
              </button>
              <button
                type="button"
                onClick={() => setSignerType('owner')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  signerType === 'owner'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={`Tanda tangan: ${ownerTitle}`}
              >
                {ownerTitle.split('/')[0].trim() || 'Pimpinan'}
              </button>
            </div>

            <button
              id="btn-download-expense-receipt-png"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3 py-1.5 hover:opacity-90 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              style={{ backgroundColor: theme.primary }}
              title="Unduh gambar PNG (format center A6 presisi) Bukti Kas Keluar"
            >
              {isExportingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyiapkan PNG...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Unduh (PNG)
                </>
              )}
            </button>
            <button
              id="btn-print-expense-receipt"
              onClick={handlePrint}
              className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                isMonochrome
                  ? 'bg-slate-800 hover:bg-black border border-slate-600'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
              title="Cetak Bukti Kas Keluar ke printer atau simpan sebagai PDF"
            >
              <Printer className="w-4 h-4" />
              Cetak / PDF
            </button>
            <button
              onClick={() => onClose?.()}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Canvas Container */}
        <div className="p-4 sm:p-6 bg-slate-100/70 flex justify-center overflow-x-auto">
          {/* Printable & Exportable Kwitansi Kas Keluar Content (Standard A6: 105mm x 148mm) */}
          <div
            ref={receiptCardRef}
            id="expense-receipt-printable-content"
            className={`w-full max-w-[105mm] bg-white text-slate-800 p-5 sm:p-6 space-y-3.5 rounded-xl shadow-xs border ${
              isMonochrome ? 'border-slate-900 print:border-0' : 'border-slate-200 print:border-0'
            } print:p-2 print:m-0 print:max-w-[105mm] print:shadow-none print:rounded-none`}
          >
            {/* Kop Lembaga */}
            <div className={`flex items-center justify-between border-b-2 ${isMonochrome ? 'border-slate-950' : 'border-rose-900'} pb-3`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl font-heading overflow-hidden shrink-0 ${
                  isMonochrome ? 'bg-white text-slate-950 border-2 border-slate-950' : 'bg-rose-900 text-white shadow-xs'
                }`}>
                  <BimbelLogo settings={settings} />
                </div>
                <div>
                  <h2 className={`text-base font-black tracking-tight leading-tight ${isMonochrome ? 'text-slate-950' : 'text-slate-950'}`}>
                    {bimbelName}
                  </h2>
                  <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${isMonochrome ? 'text-slate-700' : 'text-rose-700'}`}>
                    {bimbelTagline}
                  </p>
                  <p className={`text-[9px] leading-tight ${isMonochrome ? 'text-slate-600' : 'text-slate-500'}`}>
                    {bimbelAddress} • Telp/WA: {bimbelPhone}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block px-2 py-0.5 font-extrabold text-[10px] rounded-full uppercase tracking-wider border ${
                  isMonochrome
                    ? 'bg-white text-slate-950 border-2 border-slate-950 font-black'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}>
                  KAS KELUAR
                </span>
                <p className={`text-[10px] font-mono font-bold mt-0.5 ${isMonochrome ? 'text-slate-950' : 'text-slate-700'}`}>
                  {refNumber}
                </p>
              </div>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center py-0.5">
              <h3 className={`text-xs font-black uppercase tracking-wider border-b border-dashed pb-1.5 ${
                isMonochrome ? 'text-slate-950 border-slate-950' : 'text-slate-900 border-slate-300'
              }`}>
                BUKTI PENGELUARAN KAS (BKK)
              </h3>
            </div>

            {/* Rincian Transaksi */}
            <div className="space-y-1.5 text-[11px] leading-tight">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Dibayarkan Kepada:</span>
                <span className="font-bold text-slate-900 text-right flex-1 truncate">
                  {recipientName}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Pos Kategori Beban:</span>
                <span className={`font-semibold text-right flex-1 truncate ${isMonochrome ? 'text-slate-950' : 'text-rose-900'}`}>
                  {expense.category || 'Beban Operasional'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Keperluan / Ket:</span>
                <span className="font-bold text-slate-900 text-right flex-1">
                  {expense.description || expense.title || 'Pengeluaran Operasional'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Tanggal Bayar:</span>
                <span className="font-medium text-slate-800 text-right flex-1">
                  {formatDateIndo(expense.date)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Metode Bayar:</span>
                <span className="font-medium text-slate-800 text-right flex-1">
                  {expense.paymentMethod || 'Tunai'}
                </span>
              </div>
              {expense.notes && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 w-36 shrink-0">Catatan:</span>
                  <span className="text-slate-600 italic text-right flex-1 text-[10px]">
                    {expense.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Kotak Nominal & Terbilang */}
            <div className={`p-3 rounded-xl space-y-1.5 ${
              isMonochrome
                ? 'bg-white border-2 border-slate-950 text-slate-950'
                : 'bg-rose-50/80 border border-rose-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                  isMonochrome ? 'text-slate-950' : 'text-rose-950'
                }`}>
                  TOTAL KAS DIBAYARKAN:
                </span>
                <span className={`text-xl font-black font-mono ${
                  isMonochrome ? 'text-slate-950' : 'text-rose-700'
                }`}>
                  {formatRupiah(expense.amount)}
                </span>
              </div>
              <div className={`pt-1 border-t ${isMonochrome ? 'border-slate-300' : 'border-rose-200'}`}>
                <p className="text-[9px] text-slate-500 font-medium">Terbilang:</p>
                <p className={`text-[10px] font-bold italic px-2 py-1 rounded border mt-0.5 leading-snug ${
                  isMonochrome
                    ? 'bg-slate-100 text-slate-950 border-slate-400'
                    : 'bg-white/90 text-slate-800 border-rose-200'
                }`}>
                  # {angkaTerbilang(expense.amount)} #
                </p>
              </div>
            </div>

            {/* Kolom Tanda Tangan 2 Pihak */}
            <div className="grid grid-cols-2 gap-4 pt-2 text-[10px]">
              {/* Kolom 1: Penerima Dana */}
              <div className="text-center">
                <p className="text-slate-600 font-semibold mb-9">
                  Diterima Oleh,
                </p>
                <div className={`border-t pt-0.5 font-bold text-slate-900 inline-block min-w-[120px] ${
                  isMonochrome ? 'border-slate-950' : 'border-slate-400'
                }`}>
                  ( {recipientName !== '-' ? recipientName : '......................'} )
                </div>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {recipientRole}
                </p>
              </div>

              {/* Kolom 2: Yang Menyerahkan */}
              <div className="text-center">
                <p className="text-slate-600 font-semibold mb-9">
                  Dibayarkan Oleh,
                </p>
                <div className={`border-t pt-0.5 font-bold text-slate-900 inline-block min-w-[120px] ${
                  isMonochrome ? 'border-slate-950' : 'border-slate-400'
                }`}>
                  ( {activeSignerName} )
                </div>
                <p className={`text-[9px] mt-0.5 font-bold ${isMonochrome ? 'text-slate-800' : 'text-slate-600'}`}>
                  {activeSignerTitle}
                </p>
              </div>
            </div>

            {/* Area Catatan Lampiran Nota Fisik */}
            <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-1.5">
              *Dokumen resmi pengeluaran kas {bimbelName}. Standar Kertas A6 (1/4 A4).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
