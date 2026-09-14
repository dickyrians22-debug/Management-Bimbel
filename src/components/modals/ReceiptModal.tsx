import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, CheckCircle, GraduationCap, Download, Image as ImageIcon, Loader2, Palette } from 'lucide-react';
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

  const handlePrint = () => {
    if (receiptCardRef.current) {
      const modeSuffix = isMonochrome ? ' (B&W)' : '';
      printElement(
        receiptCardRef.current,
        `Kwitansi_${income.receiptNumber || 'Bimbel_Sigma'}${modeSuffix}`,
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
      const modeSuffix = isMonochrome ? '_BW' : '';
      const fileName = `Kwitansi_${income.receiptNumber || 'Bimbel_Sigma'}${modeSuffix}`;
      await exportElementToPng(receiptCardRef.current, fileName, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
      });
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
          <div className="flex items-center flex-wrap gap-2">
            {/* Opsi Warna vs Hitam Putih (B&W) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setIsMonochrome(false)}
                className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition cursor-pointer ${
                  !isMonochrome
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format kwitansi berwarna asli"
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

            <button
              id="btn-download-receipt-png"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Unduh gambar PNG (format center A6 presisi) untuk dikirim via WhatsApp"
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
              className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                isMonochrome
                  ? 'bg-slate-800 hover:bg-black border border-slate-600'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              title="Cetak kwitansi ke printer atau simpan sebagai PDF A6"
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
          {/* Printable & Exportable Kwitansi Content (Standard A6 Format: 105mm x 148mm) */}
          <div
            ref={receiptCardRef}
            id="receipt-printable-content"
            className={`w-full max-w-[105mm] bg-white text-slate-800 p-5 sm:p-6 space-y-4 rounded-xl shadow-xs border ${
              isMonochrome ? 'border-slate-900 print:border-0' : 'border-slate-200 print:border-0'
            } print:p-2 print:m-0 print:max-w-[105mm] print:shadow-none print:rounded-none`}
          >
            {/* Header Kop */}
            <div className={`flex items-center justify-between border-b-2 ${isMonochrome ? 'border-slate-950' : 'border-indigo-900'} pb-3`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl font-heading overflow-hidden shrink-0 ${
                  isMonochrome ? 'bg-white text-slate-950 border-2 border-slate-950' : 'bg-indigo-900 text-white shadow-xs'
                }`}>
                  <BimbelLogo settings={settings} />
                </div>
                <div>
                  <h2 className={`text-base font-black tracking-tight leading-tight ${isMonochrome ? 'text-slate-950' : 'text-indigo-950'}`}>
                    {bimbelName}
                  </h2>
                  <p className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${isMonochrome ? 'text-slate-700' : 'text-amber-600'}`}>
                    {bimbelTagline}
                  </p>
                  <p className={`text-[9px] leading-tight ${isMonochrome ? 'text-slate-600' : 'text-slate-500'}`}>
                    {bimbelAddress} • Telp/WA: {bimbelPhone}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {income.remainingBill && income.remainingBill > 0 ? (
                  <span className={`inline-block px-2 py-0.5 font-bold text-[10px] rounded-full uppercase tracking-wider border ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-2 border-slate-950 font-black'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    CICILAN
                  </span>
                ) : (
                  <span className={`inline-block px-2 py-0.5 font-bold text-[10px] rounded-full uppercase tracking-wider border ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-2 border-slate-950 font-black'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    LUNAS
                  </span>
                )}
                <p className={`text-[10px] font-mono font-bold mt-0.5 ${isMonochrome ? 'text-slate-950' : 'text-slate-600'}`}>
                  {income.receiptNumber}
                </p>
              </div>
            </div>

            <div className="text-center py-0.5">
              <h3 className={`text-xs font-black uppercase tracking-wider border-b border-dashed pb-1.5 ${
                isMonochrome ? 'text-slate-950 border-slate-950' : 'text-slate-900 border-slate-300'
              }`}>
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
                <span className={`font-bold text-right flex-1 ${isMonochrome ? 'text-slate-950' : 'text-indigo-900'}`}>
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
                <div className={`flex justify-between py-1 border-b px-1.5 rounded ${
                  isMonochrome
                    ? 'border-slate-300 bg-slate-100 text-slate-950'
                    : 'border-slate-100 text-amber-900 bg-amber-50/60'
                }`}>
                  <span className="font-semibold w-36 shrink-0">Diskon / Potongan:</span>
                  <span className="font-bold text-right flex-1 font-mono">
                    -{formatRupiah(income.discountAmount)}
                    {income.discountType === 'percentage' && income.discountValue ? ` (${income.discountValue}%)` : ''}
                  </span>
                </div>
              ) : null}
              {income.remainingBill && income.remainingBill > 0 ? (
                <div className={`flex justify-between py-1 border-b px-1.5 rounded ${
                  isMonochrome
                    ? 'border-slate-300 bg-slate-100 text-slate-950'
                    : 'border-slate-100 text-amber-700 bg-amber-50/50'
                }`}>
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
              <div className={`p-3 rounded-xl space-y-1.5 ${
                isMonochrome
                  ? 'bg-white border-2 border-slate-950 text-slate-950'
                  : 'bg-amber-50/80 border border-amber-400'
              }`}>
                <div className="flex items-center justify-between text-[11px] text-slate-700">
                  <span className="font-semibold">Total Tagihan Periode Ini:</span>
                  <span className="font-bold font-mono text-xs text-slate-900">
                    {formatRupiah(income.totalBill || (income.amount + income.remainingBill))}
                  </span>
                </div>
                <div className={`flex items-center justify-between pt-1 border-t ${
                  isMonochrome ? 'border-slate-300' : 'border-amber-200'
                }`}>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                    isMonochrome ? 'text-slate-950' : 'text-emerald-800'
                  }`}>
                    DITERIMA SAAT INI (CICILAN):
                  </span>
                  <span className={`text-lg font-black font-mono ${
                    isMonochrome ? 'text-slate-950' : 'text-emerald-700'
                  }`}>
                    {formatRupiah(income.amount)}
                  </span>
                </div>
                <div className={`flex items-center justify-between pt-1 border-t text-[10px] ${
                  isMonochrome ? 'border-slate-300' : 'border-amber-200'
                }`}>
                  <span className={`font-bold ${isMonochrome ? 'text-slate-950' : 'text-amber-900'}`}>SISA KURANG BAYAR:</span>
                  <span className={`font-black text-xs font-mono px-1.5 py-0.5 rounded border ${
                    isMonochrome
                      ? 'bg-slate-100 text-slate-950 border-slate-400'
                      : 'bg-white text-amber-700 border-amber-300'
                  }`}>
                    {formatRupiah(income.remainingBill)}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`p-3 rounded-xl flex items-center justify-between ${
                isMonochrome
                  ? 'bg-white border-2 border-slate-950 text-slate-950'
                  : 'bg-emerald-50 border border-emerald-500/40'
              }`}>
                <div>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold block ${
                    isMonochrome ? 'text-slate-950' : 'text-emerald-800'
                  }`}>
                    JUMLAH DITERIMA (LUNAS):
                  </span>
                  {income.discountAmount && income.discountAmount > 0 && (
                    <span className="text-[9px] text-slate-500">
                      Tarif normal: <span className="line-through">{formatRupiah(income.originalAmount || (income.amount + income.discountAmount))}</span>
                    </span>
                  )}
                </div>
                <span className={`text-xl font-black font-mono ${
                  isMonochrome ? 'text-slate-950' : 'text-emerald-700'
                }`}>
                  {formatRupiah(income.amount)}
                </span>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-2 text-[10px]">
              <div className="text-center">
                <p className="text-slate-600 font-semibold mb-9">Wali / Pembayar,</p>
                <div className={`border-t pt-0.5 font-bold text-slate-900 inline-block min-w-[120px] ${
                  isMonochrome ? 'border-slate-950' : 'border-slate-400'
                }`}>
                  ( {student?.parentName || (student ? `Wali ${student.name}` : (income.studentName ? `Wali ${income.studentName}` : '......................'))} )
                </div>
              </div>
              <div className="text-center">
                <p className="text-slate-600 font-semibold mb-9">
                  {settings?.financeOfficerTitle || 'Kasir / Petugas'},
                </p>
                <div className={`border-t pt-0.5 font-bold text-slate-900 inline-block min-w-[120px] ${
                  isMonochrome ? 'border-slate-950' : 'border-slate-400'
                }`}>
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
    </div>
  );
};
