import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  CheckCircle,
  Download,
  Image as ImageIcon,
  Loader2,
  Phone,
  User,
  BookOpen,
  MapPin,
  Calendar,
  Sparkles,
  MessageCircle,
  FileText,
  Building,
  ShieldCheck,
  School,
  Clock,
  Palette,
} from 'lucide-react';
import { ProspectiveStudent, BimbelSettings } from '../../types';
import { formatDateIndo } from '../../utils/storage';
import { exportElementToPng, printElement } from '../../utils/exportUtils';
import { BimbelLogo } from '../common/BimbelLogo';
import { sendWhatsAppDirect } from '../../utils/whatsapp';

interface RegistrationReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectiveStudent: ProspectiveStudent | null;
  settings?: BimbelSettings;
}

export const RegistrationReceiptModal: React.FC<RegistrationReceiptModalProps> = ({
  isOpen,
  onClose,
  prospectiveStudent,
  settings,
}) => {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState<boolean>(true); // Default: Hitam Putih (Hemat Tinta)
  const receiptContainerRef = useRef<HTMLDivElement>(null);

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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !prospectiveStudent) return null;

  const handlePrint = () => {
    if (receiptContainerRef.current) {
      const studentName = prospectiveStudent?.studentName ? prospectiveStudent.studentName.replace(/\s+/g, '_') : 'Siswa';
      printElement(
        receiptContainerRef.current,
        `Bukti_Pendaftaran_${studentName}_${prospectiveStudent?.registrationNumber || ''}`,
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
  const effectiveCity = settings?.city || (bimbelAddress.toLowerCase().includes('blora') ? 'Blora' : 'Blora');

  // PPDB Subtitle & Terms (Customizable by Owner, no trial default)
  const ppdbDocSubtitle =
    settings?.ppdbDocSubtitle ||
    'Penerimaan Peserta Didik Baru & Registrasi Program Bimbingan Belajar';

  const ppdbTermsTitle =
    settings?.ppdbTermsTitle || 'KETENTUAN & PETUNJUK PENDAFTARAN:';

  const ppdbTerms =
    settings?.ppdbTerms && settings.ppdbTerms.length > 0
      ? settings.ppdbTerms
      : [
          'Lembar ini merupakan bukti sah pendaftaran calon peserta didik baru di Bimbel.',
          'Admin Bimbel akan segera menghubungi orang tua / wali murid melalui WhatsApp untuk konfirmasi pemilihan jadwal dan mata pelajaran.',
          'Penyelesaian administrasi pendaftaran & SPP dilakukan sebelum sesi pembelajaran pertama dimulai.',
          'Siswa yang telah terdaftar resmi akan mendapatkan akses mandiri ke Portal Siswa untuk memantau absensi dan materi belajar.',
        ];

  // Registration Date
  const regDateFormatted = prospectiveStudent.registrationDate
    ? formatDateIndo(prospectiveStudent.registrationDate)
    : formatDateIndo(new Date().toISOString().slice(0, 10));

  const todayFormatted = formatDateIndo(new Date().toISOString().slice(0, 10));

  const handleDownloadImage = async () => {
    if (!receiptContainerRef.current) return;
    setIsExportingImage(true);
    try {
      const studentNameClean = prospectiveStudent.studentName.replace(/\s+/g, '_');
      const regNumClean = prospectiveStudent.registrationNumber.replace(/\s+/g, '_');
      const fileName = `Bukti_Pendaftaran_${regNumClean}_${studentNameClean}`;
      await exportElementToPng(receiptContainerRef.current, fileName);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleSendWhatsAppConfirmation = () => {
    const adminPhone = bimbelPhone.replace(/\D/g, '');
    const message =
      `*KONFIRMASI PENDAFTARAN SISWA BARU*\n` +
      `Halo Admin *${bimbelName}*,\n\n` +
      `Saya telah melakukan pendaftaran online dengan rincian data:\n` +
      `• *No. Registrasi:* ${prospectiveStudent.registrationNumber}\n` +
      `• *Nama Calon Siswa:* ${prospectiveStudent.studentName} ${
        prospectiveStudent.nickname ? `(${prospectiveStudent.nickname})` : ''
      }\n` +
      `• *Jenjang & Kelas:* ${prospectiveStudent.gradeDetail || prospectiveStudent.level} (${
        prospectiveStudent.classType
      })\n` +
      `• *Mata Pelajaran:* ${(prospectiveStudent.interestedSubjects || []).join(', ') || 'Semua Pokok'}\n` +
      `• *Orang Tua / No. WA:* ${prospectiveStudent.parentName} (${prospectiveStudent.parentPhone})\n\n` +
      `Mohon informasi lebih lanjut mengenai jadwal belajar dan administrasi pendaftaran. Terima kasih! 🙏`;

    sendWhatsAppDirect(adminPhone || prospectiveStudent.parentPhone, message);
  };

  return (
    <div
      className="modal-receipt-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="registration-receipt-modal-card"
        className="w-full max-w-3xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden my-4 cursor-default relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden When Printing) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">
                Bukti Registrasi Pendaftaran Siswa Baru
              </h3>
              <p className="text-[11px] text-slate-400">
                Format Resmi Siap Cetak (A4) / Simpan Gambar PNG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ink-saver toggle */}
            <div className="inline-flex p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setIsMonochrome(true)}
                className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition cursor-pointer text-[11px] ${
                  isMonochrome
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format monokrom hitam putih (hemat tinta printer)"
              >
                <span className="w-2 h-2 rounded-full bg-slate-950 border border-slate-400 inline-block" />
                <span>B&W</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMonochrome(false)}
                className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition cursor-pointer text-[11px] ${
                  !isMonochrome
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format berwarna"
              >
                <Palette className="w-3 h-3" />
                <span>Warna</span>
              </button>
            </div>

            {/* Kirim ke WhatsApp Admin */}
            <button
              type="button"
              onClick={handleSendWhatsAppConfirmation}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Kirim bukti pendaftaran ke WhatsApp Admin"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Kirim ke WA</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Unduh bukti pendaftaran sebagai gambar PNG resolusi tinggi"
            >
              {isExportingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyiapkan PNG...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Unduh PNG</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`px-3.5 py-1.5 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                isMonochrome
                  ? 'bg-slate-800 hover:bg-black text-white border border-slate-600'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title="Cetak atau Simpan PDF (A4)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer ml-1"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/90 flex justify-center items-start">
          <div
            id="printable-registration-receipt"
            ref={receiptContainerRef}
            className="w-full max-w-[105mm] bg-white rounded-xl shadow-lg border border-slate-300 p-4 text-slate-900 space-y-3 print:shadow-none print:border-none print:p-2 print:m-0 print:rounded-none print:max-w-[105mm]"
          >
            {/* 1. KOP SURAT RESMI */}
            <div className="border-b-2 border-slate-900 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-lg tracking-tight shrink-0 overflow-hidden p-0.5 ${
                    isMonochrome
                      ? 'bg-white border-2 border-slate-900 text-slate-950 print:border-black print:text-black'
                      : 'bg-indigo-950 text-white shadow-xs print:bg-white print:border-2 print:border-black print:text-black'
                  }`}>
                    <BimbelLogo settings={settings} />
                  </div>
                  <div>
                    <h1 className="text-sm font-black text-slate-950 uppercase tracking-tight font-heading leading-tight">
                      {bimbelName}
                    </h1>
                    <p className={`text-[9px] font-bold italic leading-tight ${
                      isMonochrome ? 'text-slate-700 print:text-black' : 'text-amber-700 print:text-black'
                    }`}>
                      "{bimbelTagline}"
                    </p>
                    <p className="text-[8px] text-slate-600 leading-tight mt-0.5 print:text-slate-700">
                      {bimbelAddress} • WA: <span className="font-semibold text-slate-800">{bimbelPhone}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                    isMonochrome
                      ? 'bg-white border border-slate-900 text-slate-950 print:border-black print:text-black'
                      : 'bg-indigo-100 border-indigo-200 text-indigo-950 print:bg-white print:border-2 print:border-black print:text-black'
                  }`}>
                    PPDB RESMI
                  </span>
                  <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                    {prospectiveStudent.registrationNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. DOKUMEN TITLE */}
            <div className="text-center py-0.5">
              <h2 className="text-[11px] font-black text-slate-900 tracking-wide uppercase font-heading">
                BUKTI REGISTRASI SISWA BARU
              </h2>
              <p className="text-[8px] text-slate-500 font-medium">
                Tgl: {regDateFormatted} • Ref: {prospectiveStudent.id.slice(0, 8)}
              </p>
            </div>

            {/* 3. BIODATA & RINCIAN PENDAFTARAN */}
            <div className="border border-slate-300 rounded-lg overflow-hidden text-[10px] leading-tight print:border-black">
              <div className="p-2 space-y-1 bg-slate-50/50">
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-500 w-28 shrink-0">Nama Calon Siswa:</span>
                  <span className="font-extrabold text-slate-900 text-right truncate">
                    {prospectiveStudent.studentName} {prospectiveStudent.nickname ? `(${prospectiveStudent.nickname})` : ''}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-500 w-28 shrink-0">Jenjang / Kelas:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {prospectiveStudent.gradeDetail || `Jenjang ${prospectiveStudent.level}`} ({prospectiveStudent.classType})
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-500 w-28 shrink-0">Asal Sekolah:</span>
                  <span className="font-medium text-slate-800 text-right truncate">
                    {prospectiveStudent.schoolOrigin || '-'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-500 w-28 shrink-0">Orang Tua / Wali:</span>
                  <span className="font-bold text-slate-900 text-right">
                    {prospectiveStudent.parentName} ({prospectiveStudent.parentPhone})
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200">
                  <span className="text-slate-500 w-28 shrink-0">Mata Pelajaran:</span>
                  <span className="font-semibold text-indigo-950 text-right truncate">
                    {(prospectiveStudent.interestedSubjects || []).join(', ') || 'Semua Pokok'}
                  </span>
                </div>
                {prospectiveStudent.preferredSchedule && (
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-500 w-28 shrink-0">Jadwal Diminati:</span>
                    <span className="font-medium text-slate-800 text-right">
                      {prospectiveStudent.preferredSchedule}
                    </span>
                  </div>
                )}
                {prospectiveStudent.address && (
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-500 w-28 shrink-0">Alamat Domisili:</span>
                    <span className="text-slate-700 text-right truncate">{prospectiveStudent.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. KETENTUAN PENDAFTARAN */}
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[8.5px] leading-snug space-y-0.5">
              <p className="font-bold text-slate-900 uppercase">
                Petunjuk &amp; Ketentuan:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                <li>Bukti sah pendaftaran calon peserta didik di {bimbelName}.</li>
                <li>Admin akan konfirmasi pemilihan jadwal dan kelas melalui WhatsApp.</li>
                <li>Administrasi diselesaikan sebelum sesi pertama dimulai.</li>
              </ul>
            </div>

            {/* 5. TANDA TANGAN & PENGESAHAN */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-[9px]">
              <div className="text-center">
                <p className="text-slate-600 font-semibold mb-8">
                  Orang Tua / Wali,
                </p>
                <div className="border-t border-slate-900 pt-0.5 font-bold text-slate-900 inline-block min-w-[100px]">
                  ( {prospectiveStudent.parentName || '..................'} )
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-500 text-[8px]">{effectiveCity}, {todayFormatted}</p>
                <p className="text-slate-800 font-semibold mb-6">
                  Admin PPDB,
                </p>
                <div className="border-t border-slate-900 pt-0.5 font-bold text-slate-900 inline-block min-w-[100px]">
                  ( {ownerName} )
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="text-center text-[8px] text-slate-400 border-t border-slate-200 pt-1">
              *Bukti pendaftaran sah {bimbelName}. Standar Kertas A6 (1/4 A4).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
