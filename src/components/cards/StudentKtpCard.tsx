import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, QrCode, Scissors, Check, Sparkles } from 'lucide-react';
import { Student, BimbelSettings } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { BimbelLogo } from '../common/BimbelLogo';

export interface StudentKtpCardProps {
  student: Student;
  settings?: BimbelSettings;
  effectiveOwnerName?: string;
  onDownloadSingle?: (student: Student) => void;
  onPrintSingle?: (student: Student) => void;
  isDownloading?: boolean;
  showActionToolbar?: boolean;
  showCuttingGuides?: boolean;
  scale?: number;
  isMonochrome?: boolean;
}

export const StudentKtpCard: React.FC<StudentKtpCardProps> = ({
  student,
  settings,
  effectiveOwnerName = 'Nanik Susilowati, M.Pd',
  onDownloadSingle,
  onPrintSingle,
  isDownloading = false,
  showActionToolbar = true,
  showCuttingGuides = false,
  isMonochrome = true,
}) => {
  const bimbelName = settings?.bimbelName || 'RUMAH BELAJAR';
  const bimbelTagline = settings?.tagline || 'Belajar Sampai Paham, Bukan Sekadar Hafal';
  const bimbelAddress = settings?.address || 'Blora, Jawa Tengah';
  const bimbelPhone = settings?.phone || '-';
  const effectiveCity = settings?.city || (bimbelAddress.toLowerCase().includes('blora') ? 'Blora' : 'Blora');
  const qrPayload = student.code;

  return (
    <div className="flex flex-col items-center gap-1.5 group">
      {/* Optional Non-Printable Action Toolbar per Individual Card */}
      {showActionToolbar && (
        <div className="no-print flex items-center justify-between w-full max-w-[85.6mm] px-1 py-1 text-xs">
          <span className="font-mono text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
            {student.code} • {student.name.split(' ')[0]}
          </span>
          <div className="flex items-center gap-1.5">
            {onDownloadSingle && (
              <button
                type="button"
                onClick={() => onDownloadSingle(student)}
                disabled={isDownloading}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title={`Unduh kartu KTP & QR untuk ${student.name} (PNG)`}
              >
                <Download className="w-2.5 h-2.5" />
                <span>{isDownloading ? 'Menyimpan...' : 'Unduh (PNG)'}</span>
              </button>
            )}
            {onPrintSingle && (
              <button
                type="button"
                onClick={() => onPrintSingle(student)}
                className="px-2 py-0.5 bg-slate-900 hover:bg-black text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs active:scale-95"
                title={`Cetak kartu presensi ${student.name} saja`}
              >
                <Printer className="w-2.5 h-2.5" />
                <span>Cetak</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cutting Guides (Dashed line when placed on A4 Sheet) */}
      <div
        className={`relative ${
          showCuttingGuides
            ? 'p-1.5 border border-dashed border-slate-400 rounded-[4mm] hover:border-slate-800 transition bg-white'
            : ''
        }`}
      >
        {showCuttingGuides && (
          <div className="no-print absolute -top-2 left-2 px-1 bg-white text-[8px] font-mono text-slate-500 flex items-center gap-0.5">
            <Scissors className="w-2.5 h-2.5" />
            <span>85.6 × 54 mm (Garis Potong)</span>
          </div>
        )}

        {/* 
          ACTUAL KTP CARD CONTAINER (CR-80 Standard: 85.6mm x 54mm)
          This element is targeted by exportElementToPng with ID: card-ktp-${student.id}
          Designed with zero heavy black ink-blocks for clean B&W printing
        */}
        <div
          id={`card-ktp-${student.id}`}
          className={`ktp-card-standard w-[85.6mm] h-[54mm] min-w-[85.6mm] min-h-[54mm] max-w-[85.6mm] max-h-[54mm] bg-white rounded-[3.18mm] flex flex-col justify-between overflow-hidden relative font-sans text-slate-900 select-none box-border shadow-xs print:shadow-none ${
            isMonochrome
              ? 'border-2 border-slate-900 print:border-black'
              : 'border border-slate-300 print:border-black'
          }`}
          style={{ width: '85.6mm', height: '54mm' }}
        >
          {/* Subtle Security Micro-Background Pattern (Disabled in Monochrome & Print to save ink) */}
          {!isMonochrome && (
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none print:hidden"
              style={{
                backgroundImage: `radial-gradient(#0f172a 1px, transparent 1px)`,
                backgroundSize: '4px 4px',
              }}
            />
          )}

          {/* 1. Header / Kop Kartu KTP (Height ~11mm) - Clean Monochrome or Color with print ink-saver */}
          <div
            className={`h-[11mm] px-2.5 py-1 flex items-center justify-between shrink-0 relative z-10 ${
              isMonochrome
                ? 'bg-white border-b-2 border-slate-900 text-slate-950'
                : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white print:bg-white print:text-slate-950 print:border-b-2 print:border-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center font-heading font-black text-[10px] shrink-0 overflow-hidden ${
                  isMonochrome
                    ? 'border-1.5 border-slate-900 bg-white text-slate-950'
                    : 'bg-white text-indigo-950 print:border-1.5 print:border-slate-900 print:bg-white print:text-slate-950'
                }`}
              >
                <BimbelLogo settings={settings} />
              </div>
              <div className="min-w-0">
                <h4
                  className={`font-black text-[9px] uppercase tracking-wide leading-tight truncate max-w-[130px] font-heading ${
                    isMonochrome ? 'text-slate-950' : 'text-white print:text-slate-950'
                  }`}
                >
                  {bimbelName}
                </h4>
                <p
                  className={`text-[6.5px] tracking-wider font-bold uppercase leading-none ${
                    isMonochrome ? 'text-slate-700' : 'text-indigo-200 print:text-slate-700'
                  }`}
                >
                  KARTU TANDA PELAJAR & PRESENSI
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`text-[6.5px] block font-mono leading-none ${
                  isMonochrome ? 'text-slate-600' : 'text-indigo-300 print:text-slate-600'
                }`}
              >
                NIS / ID:
              </span>
              <span
                className={`font-mono font-bold text-[8.5px] tracking-wide leading-tight ${
                  isMonochrome ? 'text-slate-950' : 'text-white print:text-slate-950'
                }`}
              >
                {student.code}
              </span>
            </div>
          </div>

          {/* 2. Card Body: 2 Kolom Landscape KTP (Height ~37mm) */}
          <div className="h-[37mm] px-2 py-1 flex items-center justify-between gap-1.5 relative z-10 overflow-hidden bg-white">
            {/* Kolom Kiri: Foto Siswa & Biodata Lengkap */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Pas Foto Pelajar Siswa dengan border rapi */}
              <div className="w-[19mm] h-[23mm] shrink-0 rounded-md border border-slate-400 overflow-hidden bg-slate-50 flex items-center justify-center relative">
                <UserAvatar
                  name={student.name}
                  avatar={student.avatar}
                  role="siswa"
                  size="md"
                  className="w-full h-full object-cover"
                  rounded="rounded-none"
                />
              </div>

              {/* Rincian Identitas */}
              <div className="flex-1 min-w-0 flex flex-col justify-center space-y-0.5">
                <h5
                  className="font-black text-[10px] text-slate-950 leading-tight uppercase truncate"
                  title={student.name}
                >
                  {student.name}
                </h5>

                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.2 bg-white text-slate-900 border border-slate-800 rounded text-[7px] font-bold">
                    {student.level} • {student.gradeDetail}
                  </span>
                </div>

                <div className="text-[7.2px] text-slate-700 leading-tight space-y-0.2">
                  <p className="truncate">
                    Kelas: <strong className="text-slate-950">{student.classType}</strong>
                  </p>
                  <p className="truncate text-slate-600">
                    Tutor: <strong className="text-slate-900">{student.tutorName || effectiveOwnerName}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: QR Code Presensi Instan (High Contrast) */}
            <div className="w-[24mm] shrink-0 flex flex-col items-center justify-center pl-1.5 border-l border-slate-300">
              <div className="p-1 bg-white rounded-md border border-slate-400 flex flex-col items-center justify-center">
                <QRCodeCanvas
                  value={qrPayload}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <span className="font-mono text-[7.5px] font-black text-slate-950 tracking-wider mt-0.5 leading-none">
                {student.code}
              </span>
              <span className="text-[5.5px] font-extrabold uppercase tracking-widest text-slate-950 bg-white border border-slate-800 px-1 py-0.2 rounded mt-0.5 leading-none">
                SCAN PRESENSI
              </span>
            </div>
          </div>

          {/* 3. Footer Kartu KTP (Height ~6mm) - White background with clean thin border */}
          <div className="h-[6mm] bg-white border-t border-slate-300 px-2 py-0.5 flex items-center justify-between text-[6.8px] text-slate-600 relative z-10 shrink-0">
            <span className="truncate max-w-[45mm]">
              📍 {effectiveCity} • {bimbelPhone}
            </span>
            <span className="truncate max-w-[36mm] text-right font-medium text-slate-700">
              {bimbelTagline}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
