import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Palette,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Student, BimbelSettings } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { BimbelLogo } from '../common/BimbelLogo';
import { exportElementToPng, printElement } from '../../utils/exportUtils';

interface StudentQRCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  settings?: BimbelSettings;
}

export const StudentQRCardModal: React.FC<StudentQRCardModalProps> = ({
  isOpen,
  onClose,
  student,
  settings,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMonochrome, setIsMonochrome] = useState<boolean>(true); // Default: Hitam Putih (Hemat Tinta)
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen || !student) return null;

  const brandTitle = settings?.bimbelName || settings?.sidebarFooterTitle || 'RUMAH BELAJAR';
  const brandTagline = (settings?.tagline || settings?.sidebarFooterTagline || 'Belajar Sampai Paham').replace(/[“”"]/g, '');
  const ownerName = settings?.ownerName || 'Nanik Susilowati, M.Pd';

  // QR Code payload - clean student code for universal white-label scanning
  const qrPayload = student.code;

  // Print single card
  const handlePrintCard = () => {
    const cardEl = cardRef.current || document.getElementById('printable-student-qr-card');
    if (cardEl) {
      printElement(
        cardEl,
        `Kartu_Siswa_${student.name.replace(/\s+/g, '_')}_${student.code}`
      );
    } else {
      window.print();
    }
  };

  // Download entire Student ID Card as PNG image
  const handleDownloadIdCard = async () => {
    const cardEl = cardRef.current || document.getElementById('printable-student-qr-card');
    if (!cardEl) return;
    setIsExporting(true);
    try {
      const modeSuffix = isMonochrome ? 'BW' : 'Warna';
      const filename = `ID_Card_${student.name.replace(/\s+/g, '_')}_${student.code}_${modeSuffix}`;
      await exportElementToPng(cardEl, filename);
    } catch (err) {
      console.error('Gagal mengunduh ID Card:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header (Hidden on print) */}
        <div className="no-print p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base font-heading">
                ID Card Pelajar Siswa
              </h3>
              <p className="text-[11px] text-slate-300">
                Kartu tanda pelajar resmi & kode absensi instan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: The Physical ID Card Card Layout */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Theme Selector (Ink-Saver B&W vs Color) */}
          <div className="no-print flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-700">Warna Cetak:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setIsMonochrome(true)}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isMonochrome
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-400 inline-block" />
                <span>Hitam Putih (Hemat Tinta)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMonochrome(false)}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  !isMonochrome
                    ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>Berwarna</span>
              </button>
            </div>
          </div>

          {/* Printable ID Card (Monochrome Ink-Saver or Color with print protection) */}
          <div
            ref={cardRef}
            id="printable-student-qr-card"
            className={`relative rounded-3xl p-5 sm:p-6 overflow-hidden flex flex-col items-center text-center space-y-4 transition ${
              isMonochrome
                ? 'bg-white text-slate-950 border-2 border-slate-900 shadow-sm print:border-black'
                : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl border border-indigo-500/30 print:bg-white print:text-slate-950 print:border-2 print:border-black'
            }`}
          >
            {/* Top Brand Kop */}
            <div
              className={`w-full flex items-center justify-between pb-3 ${
                isMonochrome
                  ? 'border-b-2 border-slate-900'
                  : 'border-b border-white/15 print:border-b-2 print:border-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 text-left">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm font-heading overflow-hidden ${
                    isMonochrome
                      ? 'border-1.5 border-slate-900 bg-white text-slate-950'
                      : 'bg-white text-indigo-900 shadow-md print:border-1.5 print:border-slate-900 print:bg-white print:text-slate-950'
                  }`}
                >
                  <BimbelLogo settings={settings} />
                </div>
                <div>
                  <h4
                    className={`font-extrabold text-xs tracking-wider uppercase font-heading ${
                      isMonochrome ? 'text-slate-950' : 'text-white print:text-slate-950'
                    }`}
                  >
                    {brandTitle}
                  </h4>
                  <p
                    className={`text-[9px] font-medium ${
                      isMonochrome ? 'text-slate-600' : 'text-indigo-300 print:text-slate-600'
                    }`}
                  >
                    {brandTagline}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest ${
                  isMonochrome
                    ? 'border border-slate-800 bg-white text-slate-950'
                    : 'bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 print:border print:border-slate-800 print:bg-white print:text-slate-950'
                }`}
              >
                ID CARD
              </span>
            </div>

            {/* Student Avatar & Basic Info */}
            <div className="space-y-1">
              <div
                className={`inline-block p-1 rounded-2xl ${
                  isMonochrome
                    ? 'bg-white border border-slate-400 shadow-2xs'
                    : 'bg-white/10 backdrop-blur-xs border border-white/20 shadow-md print:bg-white print:border-slate-400'
                }`}
              >
                <UserAvatar name={student.name} role="siswa" size="lg" rounded="rounded-xl" />
              </div>
              <h3
                className={`text-base sm:text-lg font-black tracking-tight font-heading pt-1 ${
                  isMonochrome ? 'text-slate-950' : 'text-white print:text-slate-950'
                }`}
              >
                {student.name}
              </h3>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isMonochrome
                      ? 'bg-white text-slate-900 border border-slate-800'
                      : 'bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 print:bg-white print:text-slate-950 print:border print:border-slate-800'
                  }`}
                >
                  {student.gradeDetail}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                    isMonochrome
                      ? 'bg-white text-slate-800 border border-slate-300'
                      : 'bg-white/10 text-slate-200 print:bg-white print:text-slate-800 print:border print:border-slate-300'
                  }`}
                >
                  {student.classType}
                </span>
              </div>
            </div>

            {/* Crisp QR Code Container */}
            <div
              className={`p-3 bg-white rounded-2xl flex flex-col items-center justify-center ${
                isMonochrome ? 'border border-slate-400 shadow-2xs' : 'shadow-xl'
              }`}
            >
              <QRCodeCanvas
                id={`qr-canvas-${student.id}`}
                value={qrPayload}
                size={160}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
              <p className="text-[10px] font-mono font-black text-slate-950 tracking-widest mt-2">
                {student.code}
              </p>
            </div>

            {/* Card Footer & Security Note */}
            <div
              className={`w-full pt-2 text-[10px] flex items-center justify-center gap-1.5 ${
                isMonochrome
                  ? 'border-t border-slate-300 text-slate-700'
                  : 'border-t border-white/10 text-indigo-200/80 print:border-t print:border-slate-300 print:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>Kartu Resmi Presensi Digital Bimbel Sigma</span>
            </div>
          </div>

          {/* Quick instructions for parents / tutors */}
          <div className="no-print p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Petunjuk Cetak & Simpan:
            </p>
            <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc">
              <li>Klik <strong>Unduh ID Card</strong> untuk menyimpan kartu pelajar lengkap (Kop Bimbel, nama siswa, foto &amp; QR Code) ke format gambar PNG.</li>
              <li>Mode <strong>Hitam Putih (Hemat Tinta)</strong> otomatis menghemat tinta toner printer hingga 90%.</li>
              <li>QR Code pada kartu ID beresolusi tinggi dan siap dipindai oleh kamera scanner absensi.</li>
            </ul>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            id="btn-download-id-card"
            onClick={handleDownloadIdCard}
            disabled={isExporting}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Unduh seluruh kartu ID Card sebagai gambar PNG"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>{isExporting ? 'Mengunduh...' : 'Unduh ID Card'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintCard}
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
