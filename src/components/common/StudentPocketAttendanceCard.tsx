import React, { useMemo } from 'react';
import { Student, AttendanceRecord, IncomeRecord, BimbelSettings, UserAccount } from '../../types';
import { calculateStudentMonthlySummary, MONTH_NAMES_ID, formatRupiah } from '../../utils/storage';
import { BimbelLogo } from './BimbelLogo';

interface StudentPocketAttendanceCardProps {
  student: Student;
  month: number;
  year: number;
  attendance: AttendanceRecord[];
  incomes: IncomeRecord[];
  settings?: BimbelSettings;
  effectiveOwnerName?: string;
  effectiveOwnerTitle?: string;
  effectiveCity?: string;
  isMonochrome?: boolean;
  users?: UserAccount[];
  showCuttingGuide?: boolean;
  filterAllMonths?: boolean;
  isSheetMode?: boolean;
}

export const StudentPocketAttendanceCard: React.FC<StudentPocketAttendanceCardProps> = ({
  student,
  month,
  year,
  attendance,
  incomes,
  settings,
  effectiveOwnerName = 'Pimpinan Bimbel',
  effectiveOwnerTitle = 'Pengelola Bimbel',
  isMonochrome = true,
  users = [],
  showCuttingGuide = true,
  filterAllMonths = false,
  isSheetMode = false,
}) => {
  const bimbelName = settings?.bimbelName || 'Bimbel Sigma';
  const bimbelTagline = settings?.tagline || 'Belajar Sampai Paham, Bukan Sekedar Hafal';

  // Calculate Monthly Summary
  const summary = useMemo(() => {
    return calculateStudentMonthlySummary(student, month, year, attendance, incomes);
  }, [student, month, year, attendance, incomes]);

  // Filter Attendance records for this student - ALL records are preserved
  const records = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const cleanStdId = (student.id || '').trim();
    const cleanStdCode = (student.code || '').trim().toLowerCase();
    const cleanStdName = (student.name || '').trim().toLowerCase();

    return attendance
      .filter((a) => {
        const aId = (a.studentId || '').trim();
        const aCode = (a.studentCode || '').trim().toLowerCase();
        const aName = (a.studentName || '').trim().toLowerCase();
        const isMatch =
          (cleanStdId && aId === cleanStdId) ||
          (cleanStdCode && aCode && aCode === cleanStdCode) ||
          (cleanStdName && aName && aName === cleanStdName);

        if (!isMatch) return false;
        if (filterAllMonths) return true;
        return a.date && a.date.startsWith(prefix);
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));
  }, [student, month, year, attendance, filterAllMonths]);

  // Resolve tutor name
  const effectiveTutorName = useMemo(() => {
    if (!student.tutorName) return 'Tutor Pembimbing';
    const found = users.find((u) => u.id === student.tutorName || u.name === student.tutorName);
    return found ? found.name : student.tutorName;
  }, [student.tutorName, users]);

  // Adaptive display: if > 8 records, split into 2 compact side-by-side columns so all sessions fit on A6
  const isDualColumn = records.length > 8;
  const midPoint = isDualColumn ? Math.ceil(records.length / 2) : records.length;
  const col1 = records.slice(0, midPoint);
  const col2 = isDualColumn ? records.slice(midPoint) : [];

  const formatShortDate = (d: string) => {
    if (!d) return '-';
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.slice(5);
  };

  return (
    <div
      className={`student-pocket-card bg-white ${
        isSheetMode ? 'p-2' : 'p-2.5'
      } rounded-xl flex flex-col justify-between text-slate-800 text-[10px] leading-tight box-border relative overflow-hidden ${
        showCuttingGuide
          ? 'border border-dashed border-slate-400 print:border-black'
          : 'border border-slate-300 print:border-black'
      } ${isMonochrome ? 'print:text-black' : ''}`}
      style={{
        width: '100%',
        maxWidth: isSheetMode ? '94mm' : '102mm',
        minHeight: isSheetMode ? '120mm' : '136mm',
        maxHeight: isSheetMode ? '132mm' : '140mm',
        height: '100%',
      }}
    >
      {/* TOP SECTION */}
      <div className="space-y-1.5 flex-1 flex flex-col justify-between">
        {/* 1. Header Kartu Saku */}
        <div className="border-b border-slate-300 pb-1 flex items-center justify-between print:border-black">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded flex items-center justify-center font-black text-xs font-heading shrink-0 overflow-hidden ${
                isMonochrome
                  ? 'border border-slate-900 text-slate-950 print:border-black print:text-black'
                  : 'bg-indigo-950 text-white print:border print:border-black print:bg-white print:text-black'
              }`}
            >
              <BimbelLogo settings={settings} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-950 text-[10.5px] tracking-tight leading-none print:text-black">
                {bimbelName}
              </h4>
              <p className="text-[7px] font-semibold text-slate-600 print:text-slate-800 uppercase leading-none mt-0.5">
                {bimbelTagline}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-[7.5px] font-extrabold uppercase px-1 py-0.5 rounded ${
                isMonochrome
                  ? 'border border-slate-900 text-slate-950 print:border-black print:text-black'
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-900 print:border-black print:text-black'
              }`}
            >
              KARTU SAKU REKAP
            </span>
            <p className="text-[8px] font-bold text-slate-800 print:text-black mt-0.5 leading-none">
              {filterAllMonths ? 'Semua Periode' : `${MONTH_NAMES_ID[month - 1]} ${year}`}
            </p>
          </div>
        </div>

        {/* 2. Biodata Siswa */}
        <div
          className={`grid grid-cols-2 gap-1 p-1 rounded-lg border text-[8.5px] ${
            isMonochrome
              ? 'bg-white border-slate-300 print:border-black'
              : 'bg-slate-50 border-slate-200 print:bg-white print:border-black'
          }`}
        >
          <div>
            <span className="text-slate-500 print:text-slate-700 text-[7.5px] block leading-none">Siswa:</span>
            <p className="font-bold text-slate-950 print:text-black truncate leading-tight mt-0.5">{student.name}</p>
            <p className="text-[7.5px] font-mono text-slate-600 print:text-slate-800 leading-none">NIS: {student.code}</p>
          </div>
          <div>
            <span className="text-slate-500 print:text-slate-700 text-[7.5px] block leading-none">Kelas / Program:</span>
            <p className="font-bold text-slate-900 print:text-black truncate leading-tight mt-0.5">
              {student.gradeDetail || student.level}
            </p>
            <p className="text-[7.5px] text-slate-600 print:text-slate-800 leading-none">Kelas {student.classType}</p>
          </div>
          <div>
            <span className="text-slate-500 print:text-slate-700 text-[7.5px] block leading-none">Tutor Pembimbing:</span>
            <p className="font-semibold text-slate-800 print:text-black truncate leading-tight mt-0.5">
              {effectiveTutorName}
            </p>
          </div>
          <div>
            <span className="text-slate-500 print:text-slate-700 text-[7.5px] block leading-none">Tarif per Sesi:</span>
            <p className="font-bold text-slate-900 print:text-black leading-tight mt-0.5">
              {formatRupiah(student.pricePerSession)}
            </p>
          </div>
        </div>

        {/* 3. History Tabel Presensi (SEMUA HISTORY MASUK 100%) */}
        <div className="flex-1 my-0.5">
          {!isDualColumn ? (
            /* Single Column Table for <= 8 sessions */
            <div className="border border-slate-300 rounded-md overflow-hidden bg-white print:border-black">
              <table className="w-full text-left text-[8px] border-collapse">
                <thead>
                  <tr
                    className={`border-b text-slate-800 font-bold ${
                      isMonochrome
                        ? 'bg-white border-slate-300 print:border-black print:text-black'
                        : 'bg-slate-100 border-slate-200 print:bg-white print:border-black'
                    }`}
                  >
                    <th className="py-0.5 px-1 w-4 text-center">#</th>
                    <th className="py-0.5 px-1 w-12">Tgl</th>
                    <th className="py-0.5 px-1 text-center w-11">Status</th>
                    <th className="py-0.5 px-1">Materi Pokok / Pembahasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-slate-400 italic text-[8px]">
                        Belum ada catatan presensi di periode ini
                      </td>
                    </tr>
                  ) : (
                    records.map((rec, idx) => (
                      <tr key={rec.id || `rec-${idx}`} className="leading-tight">
                        <td className="py-0.5 px-1 text-center font-mono text-[7.5px] text-slate-500 print:text-black">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-1 font-mono text-[7.5px] whitespace-nowrap print:text-black">
                          {formatShortDate(rec.date)} {rec.time ? rec.time.slice(0, 5) : ''}
                        </td>
                        <td className="py-0.5 px-1 text-center font-bold">
                          <span
                            className={
                              isMonochrome
                                ? 'text-slate-950 print:text-black'
                                : rec.status === 'Hadir'
                                ? 'text-emerald-700'
                                : rec.status === 'Izin'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-0.5 px-1 text-slate-800 print:text-black truncate max-w-[48mm]">
                          {rec.topic || 'Pembahasan materi modul & latihan'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Dual Column Side-by-Side Table for > 8 sessions (fits up to 24+ sessions seamlessly) */
            <div className="grid grid-cols-2 gap-1 border border-slate-300 rounded-md overflow-hidden bg-white print:border-black p-0.5">
              {/* Left Column (Sessions 1 .. midPoint) */}
              <div className="border-r border-slate-200 print:border-slate-300 pr-0.5">
                <table className="w-full text-left text-[7px] border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-slate-800 font-bold ${
                        isMonochrome
                          ? 'bg-white border-slate-300 print:border-black print:text-black'
                          : 'bg-slate-100 border-slate-200 print:bg-white print:border-black'
                      }`}
                    >
                      <th className="py-0.5 px-0.5 w-3 text-center">#</th>
                      <th className="py-0.5 px-0.5 w-8">Tgl</th>
                      <th className="py-0.5 px-0.5 text-center w-8">St</th>
                      <th className="py-0.5 px-0.5">Materi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {col1.map((rec, idx) => (
                      <tr key={rec.id || `col1-${idx}`} className="leading-tight">
                        <td className="py-0.5 px-0.5 text-center font-mono text-[6.5px] text-slate-500 print:text-black">
                          {idx + 1}
                        </td>
                        <td className="py-0.5 px-0.5 font-mono text-[6.5px] whitespace-nowrap print:text-black">
                          {formatShortDate(rec.date)}
                        </td>
                        <td className="py-0.5 px-0.5 text-center font-bold text-[6.5px]">
                          <span
                            className={
                              isMonochrome
                                ? 'text-slate-950 print:text-black'
                                : rec.status === 'Hadir'
                                ? 'text-emerald-700'
                                : rec.status === 'Izin'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-0.5 px-0.5 text-slate-800 print:text-black truncate max-w-[20mm]">
                          {rec.topic || 'Modul & latihan'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Column (Sessions midPoint+1 .. N) */}
              <div className="pl-0.5">
                <table className="w-full text-left text-[7px] border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-slate-800 font-bold ${
                        isMonochrome
                          ? 'bg-white border-slate-300 print:border-black print:text-black'
                          : 'bg-slate-100 border-slate-200 print:bg-white print:border-black'
                      }`}
                    >
                      <th className="py-0.5 px-0.5 w-3 text-center">#</th>
                      <th className="py-0.5 px-0.5 w-8">Tgl</th>
                      <th className="py-0.5 px-0.5 text-center w-8">St</th>
                      <th className="py-0.5 px-0.5">Materi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {col2.map((rec, idx) => (
                      <tr key={rec.id || `col2-${idx}`} className="leading-tight">
                        <td className="py-0.5 px-0.5 text-center font-mono text-[6.5px] text-slate-500 print:text-black">
                          {midPoint + idx + 1}
                        </td>
                        <td className="py-0.5 px-0.5 font-mono text-[6.5px] whitespace-nowrap print:text-black">
                          {formatShortDate(rec.date)}
                        </td>
                        <td className="py-0.5 px-0.5 text-center font-bold text-[6.5px]">
                          <span
                            className={
                              isMonochrome
                                ? 'text-slate-950 print:text-black'
                                : rec.status === 'Hadir'
                                ? 'text-emerald-700'
                                : rec.status === 'Izin'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-0.5 px-0.5 text-slate-800 print:text-black truncate max-w-[20mm]">
                          {rec.topic || 'Modul & latihan'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 4. Box Rekap Kehadiran & Tagihan SPP */}
        <div
          className={`p-1.5 rounded-lg border text-[8px] leading-tight ${
            isMonochrome
              ? 'bg-white border-slate-900 print:border-black print:text-black'
              : 'bg-amber-50/90 border-amber-300 print:bg-white print:border-black'
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <span>
              Hadir: <strong className="text-slate-950 print:text-black">{summary.presentCount} Sesi</strong>
              <span className="font-normal text-slate-600 print:text-slate-800 text-[7.5px] ml-1">
                (Tidak Hadir: {summary.permissionCount + summary.sickCount + summary.alphaCount})
              </span>
            </span>
            <span className="font-mono font-black text-[9px] text-slate-950 print:text-black">
              Tagihan: {formatRupiah(summary.totalBilled)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[7.5px] mt-0.5 pt-0.5 border-t border-slate-200 print:border-black">
            <span className="text-slate-600 print:text-slate-800">
              Total {records.length} riwayat presensi tercatat
            </span>
            <span className="font-extrabold uppercase">
              Status:{' '}
              <span
                className={
                  isMonochrome
                    ? 'text-slate-950 font-black print:text-black'
                    : summary.paymentStatus === 'Lunas'
                    ? 'text-emerald-700 font-black'
                    : 'text-rose-700 font-black'
                }
              >
                {summary.paymentStatus}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM SECTION: SIGNATURES */}
      <div className={`grid grid-cols-2 gap-2 text-center text-[7.5px] ${isSheetMode ? 'pt-0.5 mt-0.5' : 'pt-1 mt-1'} border-t border-slate-300 print:border-black`}>
        <div>
          <p className={`text-slate-600 print:text-slate-800 ${isSheetMode ? 'mb-2' : 'mb-3.5'} leading-none`}>Orang Tua / Wali,</p>
          <p className="font-bold text-slate-900 print:text-black border-t border-slate-400 print:border-black pt-0.5 leading-none">
            ( .............................. )
          </p>
        </div>
        <div>
          <p className={`text-slate-600 print:text-slate-800 ${isSheetMode ? 'mb-2' : 'mb-3.5'} leading-none`}>
            {effectiveOwnerTitle || 'Tutor / Pengajar'},
          </p>
          <p className="font-bold text-slate-900 print:text-black border-t border-slate-400 print:border-black pt-0.5 leading-none truncate">
            ( {effectiveTutorName || effectiveOwnerName} )
          </p>
        </div>
      </div>
    </div>
  );
};
