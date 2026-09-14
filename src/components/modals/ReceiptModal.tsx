import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, CheckCircle, GraduationCap, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { IncomeRecord, Student, BimbelSettings } from '../../types';
import { formatRupiah, getMonthNameIndo, formatDateIndo } from '../../utils/storage';
import { exportElementToPng, printElement } from '../../utils/exportUtils';
import { BimbelLogo } from '../common/BimbelLogo';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose?: () => void;
  income: IncomeRecord;
  student?: Student;
  settings?: BimbelSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  income,
  student,
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

  const handlePrint = () => {
    if (receiptCardRef.current) {
      printElement(
        receiptCardRef.current,
        `Kwitansi_${income.receiptNumber || 'Bimbel_Sigma'}`,
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
  const ownerName = settings?.ownerName || 'Nanik Susilowati, M.Pd';

  const handleDownloadImage = async () => {
    if (!receiptCardRef.current) return;
    setIsExportingImage(true);
    try {
      const fileName = `Kwitansi_${income.receiptNumber || 'Bimbel_Sigma'}`;
      await exportElementToPng(receiptCardRef.current, fileName);
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
        id="receipt-modal-container"
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Topbar (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Kwitansi Resmi {bimbelName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-download-receipt-png"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Unduh gambar PNG untuk dikirim via WhatsApp"
            >
              {isExportingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyiapkan PNG...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Unduh Gambar (PNG)
                </>
              )}
            </button>
            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
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

        {/* Printable & Exportable Kwitansi Content (Standard A6 Format: 105mm x 148mm) */}
        <div
          ref={receiptCardRef}
          id="receipt-printable-content"
          className="p-5 sm:p-6 bg-white text-slate-800 space-y-4 mx-auto max-w-[105mm] border border-slate-200 sm:rounded-b-2xl print:border-0 print:p-2 print:m-0 print:max-w-[105mm]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-indigo-900 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black text-xl font-heading shadow-xs overflow-hidden shrink-0">
                <BimbelLogo settings={settings} />
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-indigo-950 leading-tight">{bimbelName}</h2>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider leading-tight">
                  {bimbelTagline}
                </p>
                <p className="text-[9px] text-slate-500 leading-tight">
                  {bimbelAddress} • Telp/WA: {bimbelPhone}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              {income.remainingBill && income.remainingBill > 0 ? (
                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full uppercase tracking-wider border border-amber-300">
                  CICILAN
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full uppercase tracking-wider border border-emerald-300">
                  LUNAS
                </span>
              )}
              <p className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">
                {income.receiptNumber}
              </p>
            </div>
          </div>

          <div className="text-center py-0.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-dashed border-slate-300 pb-1.5">
              {income.remainingBill && income.remainingBill > 0
                ? 'KWITANSI PEMBAYARAN SEBAGIAN (CICILAN)'
                : income.incomeCategory === 'session_pack'
                ? 'KWITANSI PEMBELIAN PAKET SESI LES'
                : income.incomeCategory === 'registration'
                ? 'KWITANSI BIAYA PENDAFTARAN SISWA'
                : income.incomeCategory === 'general'
                ? 'BUKTI PENERIMAAN KAS MASUK'
                : 'KWITANSI PEMBAYARAN IURAN LES'}
            </h3>
          </div>

          {/* Details Table */}
          <div className="space-y-1.5 text-[11px] leading-tight">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 w-36 shrink-0">Telah Diterima Dari:</span>
              <span className="font-bold text-slate-900 text-right flex-1 truncate">
                {income.studentName ? `${income.studentName} (${income.studentCode || '-'})` : (income.sourceName || 'Pembayar')}
              </span>
            </div>
            {student && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Tingkat / Paket Siswa:</span>
                <span className="font-medium text-slate-800 text-right flex-1 truncate">
                  {student.gradeDetail} ({student.classType}) • {student.packageType === 'session_pack' ? 'Paket Sesi' : 'SPP'}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 w-36 shrink-0">Untuk Pembayaran:</span>
              <span className="font-bold text-indigo-900 text-right flex-1">
                {income.incomeCategory === 'session_pack'
                  ? `Paket ${income.sessionsCount || 8} Sesi (${getMonthNameIndo(income.accrualMonth)} ${income.accrualYear})`
                  : income.incomeCategory === 'registration'
                  ? 'Registrasi Siswa Baru'
                  : income.incomeCategory === 'general'
                  ? `${income.category || 'Penerimaan Kas'}`
                  : `SPP ${getMonthNameIndo(income.accrualMonth)} ${income.accrualYear} (${income.sessionsCount || 8} Sesi)`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 w-36 shrink-0">Tanggal Bayar:</span>
              <span className="font-medium text-slate-800 text-right flex-1">
                {formatDateIndo(income.datePaid)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 w-36 shrink-0">Metode Bayar:</span>
              <span className="font-medium text-slate-800 text-right flex-1">
                {income.paymentMethod}
              </span>
            </div>
            {income.discountAmount && income.discountAmount > 0 ? (
              <div className="flex justify-between py-1 border-b border-slate-100 text-amber-900 bg-amber-50/60 px-1.5 rounded">
                <span className="font-semibold w-36 shrink-0">Diskon / Potongan:</span>
                <span className="font-bold text-right flex-1 font-mono">
                  -{formatRupiah(income.discountAmount)}
                  {income.discountType === 'percentage' && income.discountValue ? ` (${income.discountValue}%)` : ''}
                </span>
              </div>
            ) : null}
            {income.remainingBill && income.remainingBill > 0 ? (
              <div className="flex justify-between py-1 border-b border-slate-100 text-amber-700 bg-amber-50/50 px-1.5 rounded">
                <span className="font-semibold w-36 shrink-0">Status Pembayaran:</span>
                <span className="font-bold text-right flex-1">
                  Cicilan (Sisa {formatRupiah(income.remainingBill)})
                </span>
              </div>
            ) : null}
            {income.notes && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 w-36 shrink-0">Keterangan:</span>
                <span className="text-slate-700 italic text-right flex-1 text-[10px]">
                  {income.notes}
                </span>
              </div>
            )}
          </div>

          {/* Amount Box */}
          {income.remainingBill && income.remainingBill > 0 ? (
            <div className="p-3 bg-amber-50/80 border border-amber-400 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-700">
                <span className="font-semibold">Total Tagihan Periode Ini:</span>
                <span className="font-bold font-mono text-xs text-slate-900">
                  {formatRupiah(income.totalBill || (income.amount + income.remainingBill))}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800">
                  DITERIMA SAAT INI (CICILAN):
                </span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {formatRupiah(income.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200 text-[10px]">
                <span className="font-bold text-amber-900">SISA KURANG BAYAR:</span>
                <span className="font-black text-xs text-amber-700 font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">
                  {formatRupiah(income.remainingBill)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-500/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 block">
                  JUMLAH DITERIMA (LUNAS):
                </span>
                {income.discountAmount && income.discountAmount > 0 && (
                  <span className="text-[9px] text-slate-500">
                    Tarif normal: <span className="line-through">{formatRupiah(income.originalAmount || (income.amount + income.discountAmount))}</span>
                  </span>
                )}
              </div>
              <span className="text-xl font-black text-emerald-700 font-mono">
                {formatRupiah(income.amount)}
              </span>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-2 text-[10px]">
            <div className="text-center">
              <p className="text-slate-600 font-semibold mb-9">Wali / Pembayar,</p>
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900 inline-block min-w-[120px]">
                ( {student?.parentName || (student ? `Wali ${student.name}` : (income.studentName ? `Wali ${income.studentName}` : '......................'))} )
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-600 font-semibold mb-9">
                {settings?.financeOfficerTitle || 'Kasir / Petugas'},
              </p>
              <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900 inline-block min-w-[120px]">
                ( {income.receivedBy || settings?.financeOfficerName || ownerName || 'Petugas'} )
              </div>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-1.5">
            *Bukti pembayaran sah {bimbelName}. Standar Kertas A6 (1/4 A4).
          </div>
        </div>
      </div>
    </div>
  );
};
