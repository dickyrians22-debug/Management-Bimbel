import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, CheckCircle2, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ExpenseRecord, BimbelSettings } from '../../types';
import { formatRupiah, formatDateIndo, angkaTerbilang, normalizeExpenseRefNumber } from '../../utils/storage';
import { exportElementToPng, printElement } from '../../utils/exportUtils';
import { BimbelLogo } from '../common/BimbelLogo';

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
      printElement(
        receiptCardRef.current,
        `Bukti_Kas_Keluar_${refNumber}`
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
      const fileName = `BKK_${refNumber}_${expense.category || 'KasKeluar'}`;
      await exportElementToPng(receiptCardRef.current, fileName);
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
            {/* Opsi Cepat Pilihan Penandatangan (Sesuai Profil Lembaga) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setSignerType('finance')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  signerType === 'finance'
                    ? 'bg-rose-600 text-white shadow-xs'
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
                    ? 'bg-rose-600 text-white shadow-xs'
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
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Unduh gambar PNG Bukti Kas Keluar"
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
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
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

        {/* Printable & Exportable Kwitansi Kas Keluar Content */}
        <div
          ref={receiptCardRef}
          id="expense-receipt-printable-content"
          className="p-8 bg-white text-slate-800 space-y-6"
        >
          {/* Kop Lembaga */}
          <div className="flex items-center justify-between border-b-2 border-rose-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-900 text-white flex items-center justify-center font-black text-2xl font-heading shadow-md overflow-hidden shrink-0">
                <BimbelLogo settings={settings} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-950">{bimbelName}</h2>
                <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                  {bimbelTagline}
                </p>
                <p className="text-[10px] text-slate-500">
                  {bimbelAddress} • Telp/WA: {bimbelPhone}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-rose-100 text-rose-900 font-extrabold text-xs rounded-full uppercase tracking-wider border border-rose-300">
                KAS KELUAR
              </span>
              <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                {refNumber}
              </p>
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center py-1">
            <h3 className="text-base font-extrabold uppercase tracking-widest text-slate-900 border-b border-dashed border-slate-300 pb-2">
              BUKTI PENGELUARAN KAS (PAYMENT VOUCHER)
            </h3>
          </div>

          {/* Rincian Transaksi */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 w-44">Dibayarkan Kepada:</span>
              <span className="font-bold text-slate-900 text-right flex-1">
                {recipientName}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 w-44">Pos Kategori Beban:</span>
              <span className="font-semibold text-rose-900 text-right flex-1">
                {expense.category || 'Beban Operasional'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 w-44">Keperluan / Keterangan:</span>
              <span className="font-bold text-slate-900 text-right flex-1">
                {expense.description || expense.title || 'Pengeluaran Operasional Bimbel'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 w-44">Tanggal Pengeluaran:</span>
              <span className="font-medium text-slate-800 text-right flex-1">
                {formatDateIndo(expense.date)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 w-44">Metode Pembayaran:</span>
              <span className="font-medium text-slate-800 text-right flex-1">
                {expense.paymentMethod || 'Tunai'}
              </span>
            </div>
            {expense.notes && (
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 w-44">Catatan Tambahan:</span>
                <span className="text-slate-600 italic text-right flex-1 text-xs">
                  {expense.notes}
                </span>
              </div>
            )}
          </div>

          {/* Kotak Nominal & Terbilang */}
          <div className="p-4 bg-rose-50/80 border-2 border-rose-300 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-extrabold text-rose-950">
                TOTAL KAS DIBAYARKAN:
              </span>
              <span className="text-2xl font-black text-rose-700 font-mono">
                {formatRupiah(expense.amount)}
              </span>
            </div>
            <div className="pt-2 border-t border-rose-200">
              <p className="text-[11px] text-slate-500 font-medium">Terbilang:</p>
              <p className="text-xs font-bold italic text-slate-800 bg-white/80 px-3 py-1.5 rounded-lg border border-rose-200 mt-1">
                # {angkaTerbilang(expense.amount)} #
              </p>
            </div>
          </div>

          {/* Kolom Tanda Tangan 2 Pihak (Opsi 1: Ringkas & Sesuai Profil Perusahaan) */}
          <div className="grid grid-cols-2 gap-8 pt-5 text-xs">
            {/* Kolom 1: Penerima Dana */}
            <div className="text-center">
              <p className="text-slate-600 font-semibold mb-16">
                Diterima Oleh,
              </p>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-900 inline-block min-w-[170px]">
                ( {recipientName !== '-' ? recipientName : '........................................'} )
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {recipientRole}
              </p>
            </div>

            {/* Kolom 2: Yang Menyerahkan / Bagian Keuangan / Pimpinan Lembaga */}
            <div className="text-center">
              <p className="text-slate-600 font-semibold mb-16">
                Diserahkan / Dibayarkan Oleh,
              </p>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-900 inline-block min-w-[170px]">
                ( {activeSignerName} )
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 font-bold">
                {activeSignerTitle}
              </p>
            </div>
          </div>

          {/* Area Catatan Lampiran Nota Fisik */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            *Bukti Kas Keluar ini adalah dokumen resmi pengeluaran kas {bimbelName}. Mohon lampirkan struk / nota / bukti transfer asli pada lembar ini sebagai arsip pembukuan fisik.
          </div>
        </div>
      </div>
    </div>
  );
};
