import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Building,
  FileSpreadsheet,
  Image as ImageIcon,
  Printer,
  GraduationCap,
  Users,
  Layers,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Receipt,
  BookOpen,
  School,
  FileText,
  Palette,
} from 'lucide-react';
import { BimbelLogo } from '../common/BimbelLogo';
import {
  AttendanceRecord,
  IncomeRecord,
  ExpenseRecord,
  MonthlyPLSummary,
  BimbelSettings,
  Student,
  UserAccount,
} from '../../types';
import {
  formatRupiah,
  calculateAnnualPL,
  MONTH_NAMES_ID,
  getMonthNameIndo,
  isSystemExpenseCategory,
  isSystemIncomeCategory,
  resolveTutorName,
} from '../../utils/storage';
import { exportToExcel, exportMultiSheetExcel, exportElementToPng, printElement } from '../../utils/exportUtils';

interface ProfitLossViewProps {
  attendance: AttendanceRecord[];
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  settings?: BimbelSettings;
  students?: Student[];
  users?: UserAccount[];
}

type PLViewMode = 'monthly' | 'annual';

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({
  attendance,
  incomes,
  expenses,
  settings,
  students = [],
  users = [],
}) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [activeMode, setActiveMode] = useState<PLViewMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isMonochrome, setIsMonochrome] = useState<boolean>(true); // Default: Hitam Putih (Hemat Tinta)

  const bimbelName = settings?.bimbelName || settings?.sidebarFooterTitle || 'RUMAH BELAJAR';
  const tagline = settings?.tagline || 'Belajar Sampai Paham, Bukan Sekadar Hafal';
  const ownerName = settings?.ownerName || 'Pimpinan Lembaga';
  const ownerTitle = settings?.ownerTitle || settings?.directorTitle || 'Owner & Direktur Lembaga';
  const financeName = settings?.financeOfficerName || 'Bendahara / Bagian Keuangan';
  const financeTitle = settings?.financeOfficerTitle || 'Bendahara / Finance & Admin';
  const opsName = settings?.operationalManagerName;
  const opsTitle = settings?.operationalManagerTitle || 'Manajer Akademik & Operasional';

  // ==========================================
  // 1. DATA PERHITUNGAN P&L TAHUNAN (12 BULAN)
  // ==========================================
  const annualPLData: MonthlyPLSummary[] = calculateAnnualPL(
    selectedYear,
    attendance,
    incomes,
    expenses,
    settings,
    students
  );

  const totalAnnualAccrualIncome = annualPLData.reduce((sum, item) => sum + item.accrualIncome, 0);
  const totalAnnualCashIncome = annualPLData.reduce((sum, item) => sum + item.cashIncome, 0);
  const totalAnnualExpenses = annualPLData.reduce((sum, item) => sum + item.totalExpenses, 0);
  const totalAnnualAccrualNetProfit = totalAnnualAccrualIncome - totalAnnualExpenses;
  const totalAnnualCashNetFlow = totalAnnualCashIncome - totalAnnualExpenses;

  // ==========================================
  // 2. DATA PERHITUNGAN DETAIL P&L BULANAN
  // ==========================================
  const targetMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const targetMonthName = getMonthNameIndo(selectedMonth);

  // A. Kehadiran & Sesi di bulan bersangkutan
  const attendancesInMonth = attendance.filter(
    (a) => a.date && a.date.startsWith(targetMonthPrefix)
  );
  const presentAttendances = attendancesInMonth.filter((a) => a.status === 'Hadir');
  const totalSessionsCount = presentAttendances.length;

  // Himpunan siswa yang hadir belajar bulan ini
  const activeStudentIdsInMonth = new Set(
    presentAttendances.map((a) => a.studentId || a.studentCode || a.studentName)
  );
  const activeStudentCount = activeStudentIdsInMonth.size || students.filter((s) => s.status === 'Aktif').length;

  // B. Pendapatan SPP & Non-SPP dari Buku Kas (Pemasukan)
  interface CategoryBreakdown {
    label: string;
    studentCount: number;
    sessionsCount: number;
    accrualAmount: number;
    paidAmount: number;
  }

  // 1. Ambil seluruh transaksi SPP di Buku Kas (Pemasukan) untuk periode bulan terpilih
  const sppCashIncomesForMonth = incomes.filter((inc) => {
    const isSpp =
      inc.incomeCategory === 'spp_monthly' ||
      inc.incomeCategory === 'session_pack' ||
      isSystemIncomeCategory(inc.category || '', settings);

    if (!isSpp) return false;

    const incMonth = Number(inc.accrualMonth);
    const incYear = Number(inc.accrualYear);

    // Prioritas 1: Cocok dengan periode accrual (Bulan & Tahun SPP yang dibayarkan)
    const matchesAccrual = incMonth === selectedMonth && incYear === selectedYear;

    // Prioritas 2: Jika accrualMonth tidak diset, cek tanggal bayar fisik (datePaid)
    const matchesDatePaid =
      (!incMonth || incMonth === 0) &&
      Boolean(inc.datePaid && inc.datePaid.startsWith(targetMonthPrefix));

    return matchesAccrual || matchesDatePaid;
  });

  // Total Uang SPP yang Diterima dari Buku Kas untuk Periode Bulan Ini
  const totalSppPaidCashBook = sppCashIncomesForMonth.reduce((sum, inc) => sum + (inc.amount || 0), 0);

  // 2. Pendapatan Non-SPP dari Buku Kas (Pendaftaran, Modul, Try Out, dll)
  const nonSppIncomesForMonth = incomes.filter((inc) => {
    const isSpp =
      inc.incomeCategory === 'spp_monthly' ||
      inc.incomeCategory === 'session_pack' ||
      isSystemIncomeCategory(inc.category || '', settings);

    if (isSpp) return false;

    const incMonth = Number(inc.accrualMonth);
    const incYear = Number(inc.accrualYear);

    const matchesDatePaid = Boolean(inc.datePaid && inc.datePaid.startsWith(targetMonthPrefix));
    const matchesAccrual = incMonth === selectedMonth && incYear === selectedYear;

    return matchesDatePaid || matchesAccrual;
  });

  const regFeeIncome = nonSppIncomesForMonth
    .filter(
      (inc) =>
        (inc.category || '').toLowerCase().includes('daftar') ||
        (inc.category || '').toLowerCase().includes('registrasi') ||
        inc.incomeCategory === 'registration'
    )
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const moduleIncome = nonSppIncomesForMonth
    .filter(
      (inc) =>
        (inc.category || '').toLowerCase().includes('modul') ||
        (inc.category || '').toLowerCase().includes('buku')
    )
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const tryOutIncome = nonSppIncomesForMonth
    .filter(
      (inc) =>
        (inc.category || '').toLowerCase().includes('try out') ||
        (inc.category || '').toLowerCase().includes('ujian') ||
        (inc.category || '').toLowerCase().includes('simulasi')
    )
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const otherNonSppIncome = nonSppIncomesForMonth
    .filter(
      (inc) =>
        !(inc.category || '').toLowerCase().includes('daftar') &&
        !(inc.category || '').toLowerCase().includes('registrasi') &&
        !(inc.category || '').toLowerCase().includes('modul') &&
        !(inc.category || '').toLowerCase().includes('buku') &&
        !(inc.category || '').toLowerCase().includes('try out') &&
        !(inc.category || '').toLowerCase().includes('ujian') &&
        !(inc.category || '').toLowerCase().includes('simulasi')
    )
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  // 3. Pemetaan Rincian Siswa & SPP MURNI dari Buku Kas (Presensi hanya untuk info sesi hadir)
  const studentBreakdownMap: {
    [key: string]: {
      studentId?: string;
      studentCode?: string;
      name: string;
      level: string;
      classType: string;
      sessions: number;
      accrualAmount: number;
      paidAmount: number;
      paymentCount: number;
    };
  } = {};

  // Inisialisasi daftar siswa: presensi hanya mencatat jumlah sesi hadir (tidak dikalikan uang)
  students.forEach((std) => {
    const stdKey = std.id || std.code || std.name.toLowerCase();
    const stdAtt = presentAttendances.filter(
      (a) =>
        (a.studentId && a.studentId === std.id) ||
        (a.studentCode && a.studentCode === std.code) ||
        (a.studentName && a.studentName.toLowerCase() === std.name.toLowerCase())
    );
    const sessions = stdAtt.length;

    // Nominal pendapatan MURNI dari Buku Kas (awalan 0, bukan perkalian absensi)
    studentBreakdownMap[stdKey] = {
      studentId: std.id,
      studentCode: std.code,
      name: std.name,
      level: std.level || 'SD',
      classType: std.classType || 'Grup',
      sessions,
      accrualAmount: 0,
      paidAmount: 0,
      paymentCount: 0,
    };
  });

  // Agregasi seluruh pembayaran SPP MURNI dari Buku Kas Masuk ke dalam map siswa
  sppCashIncomesForMonth.forEach((inc) => {
    const matchedStd = students.find(
      (s) =>
        (inc.studentId && s.id === inc.studentId) ||
        (inc.studentCode && s.code === inc.studentCode) ||
        (inc.studentName && s.name.toLowerCase() === inc.studentName.toLowerCase()) ||
        (inc.sourceName && s.name.toLowerCase() === inc.sourceName.toLowerCase())
    );

    const key = matchedStd
      ? (matchedStd.id || matchedStd.code || matchedStd.name.toLowerCase())
      : (inc.studentName || inc.sourceName || inc.id);

    if (!studentBreakdownMap[key]) {
      studentBreakdownMap[key] = {
        studentId: inc.studentId,
        studentCode: inc.studentCode,
        name: matchedStd?.name || inc.studentName || inc.sourceName || 'Siswa Bimbel',
        level: matchedStd?.level || 'SD',
        classType: matchedStd?.classType || 'Grup',
        sessions: 0,
        accrualAmount: 0,
        paidAmount: 0,
        paymentCount: 0,
      };
    }

    const incomeAmount = inc.amount || 0;
    studentBreakdownMap[key].paidAmount += incomeAmount;
    studentBreakdownMap[key].accrualAmount += incomeAmount; // Murni dari Buku Kas
    studentBreakdownMap[key].paymentCount += 1;
  });

  // Group by Level (Jenjang)
  const levels = ['PAUD', 'TK', 'SD', 'SMP', 'SMA', 'Umum'];
  const levelBreakdown: CategoryBreakdown[] = levels.map((lvl) => {
    const matching = Object.values(studentBreakdownMap).filter((item) =>
      lvl === 'PAUD'
        ? item.level.toUpperCase().includes('PAUD')
        : lvl === 'TK'
        ? item.level.toUpperCase().includes('TK')
        : lvl === 'SD'
        ? item.level.toUpperCase().includes('SD')
        : lvl === 'SMP'
        ? item.level.toUpperCase().includes('SMP')
        : lvl === 'SMA'
        ? item.level.toUpperCase().includes('SMA') || item.level.toUpperCase().includes('SMK')
        : !['PAUD', 'TK', 'SD', 'SMP', 'SMA', 'SMK'].some((k) => item.level.toUpperCase().includes(k))
    );

    return {
      label: `Jenjang ${lvl}`,
      studentCount: matching.filter((m) => m.sessions > 0 || m.paidAmount > 0).length,
      sessionsCount: matching.reduce((sum, m) => sum + m.sessions, 0),
      accrualAmount: matching.reduce((sum, m) => sum + m.paidAmount, 0),
      paidAmount: matching.reduce((sum, m) => sum + m.paidAmount, 0),
    };
  }).filter((b) => b.studentCount > 0 || b.accrualAmount > 0 || b.paidAmount > 0);

  // Group by Class Type (Privat vs Grup)
  const typePrivatMatching = Object.values(studentBreakdownMap).filter(
    (item) => item.classType.toLowerCase().includes('privat') || item.classType.toLowerCase().includes('private')
  );
  const typeGrupMatching = Object.values(studentBreakdownMap).filter(
    (item) => !item.classType.toLowerCase().includes('privat') && !item.classType.toLowerCase().includes('private')
  );

  const classTypeBreakdown: CategoryBreakdown[] = [
    {
      label: 'Kelas Privat (1-on-1)',
      studentCount: typePrivatMatching.filter((m) => m.sessions > 0 || m.paidAmount > 0).length,
      sessionsCount: typePrivatMatching.reduce((sum, m) => sum + m.sessions, 0),
      accrualAmount: typePrivatMatching.reduce((sum, m) => sum + m.paidAmount, 0),
      paidAmount: typePrivatMatching.reduce((sum, m) => sum + m.paidAmount, 0),
    },
    {
      label: 'Kelas Grup / Reguler',
      studentCount: typeGrupMatching.filter((m) => m.sessions > 0 || m.paidAmount > 0).length,
      sessionsCount: typeGrupMatching.reduce((sum, m) => sum + m.sessions, 0),
      accrualAmount: typeGrupMatching.reduce((sum, m) => sum + m.paidAmount, 0),
      paidAmount: typeGrupMatching.reduce((sum, m) => sum + m.paidAmount, 0),
    },
  ];

  // Total Realisasi SPP Les MURNI dari Buku Kas
  const totalSppPaid = totalSppPaidCashBook;
  const totalSppAccrual = totalSppPaidCashBook; // Murni dari Buku Kas Masuk
  const totalUncollectedSpp = 0; // Tidak ada piutang semu dari absensi

  const totalNonSppIncome = regFeeIncome + moduleIncome + tryOutIncome + otherNonSppIncome;

  // Total Pendapatan Operasional MURNI dari Buku Kas (SPP + Non-SPP)
  const grandTotalMonthlyRevenueAccrual = totalSppPaidCashBook + totalNonSppIncome;
  const totalMonthlyRevenue = grandTotalMonthlyRevenueAccrual;

  // Kas Masuk Riil di Bulan ini (Semua kas masuk yang diterima di kasir pada tanggal bulan ini)
  const incomesReceivedInMonth = incomes.filter(
    (inc) => inc.datePaid && inc.datePaid.startsWith(targetMonthPrefix)
  );
  const totalCashIncomeMonth = incomesReceivedInMonth.reduce((sum, inc) => sum + (inc.amount || 0), 0);

  // D. Rincian Pengeluaran Bulan Ini (Expense Breakdown)
  // Beban Operasional Umum berdasarkan tanggal kas keluar pada bulan terpilih
  const generalExpensesInMonth = expenses.filter((e) => {
    const isSalary = isSystemExpenseCategory(e.category, settings);
    if (isSalary) return false;
    return Boolean(e.date && e.date.startsWith(targetMonthPrefix));
  });

  // 1. Beban Pokok Pengajaran (Gaji / Honor Tutor) - Menggunakan Accrual Basis (Matching Principle)
  // Beban diakui pada periode bulan hak mengajar (periodMonth & periodYear), bukan bulan saat kas dicairkan.
  // Misal: Honor sesi mengajar bulan Juli yang baru dicairkan di bulan September tetap masuk ke beban P&L bulan Juli!
  const salaryExpensesForMonth = expenses.filter((e) => {
    const isSalary = isSystemExpenseCategory(e.category, settings);
    if (!isSalary) return false;

    const expMonth = Number(e.periodMonth);
    const expYear = Number(e.periodYear);

    // Prioritas 1: Cocok dengan periode hak kerja (periodMonth & periodYear)
    const matchesPeriod = expMonth === selectedMonth && expYear === selectedYear;

    // Prioritas 2: Fallback jika periodMonth belum diatur, gunakan tanggal transaksi kas
    const matchesDateFallback =
      (!expMonth || expMonth === 0) &&
      Boolean(e.date && e.date.startsWith(targetMonthPrefix));

    return matchesPeriod || matchesDateFallback;
  });

  const totalSalaryExpense = salaryExpensesForMonth.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Beban Kas Keluar Riil di Bulan Ini (untuk perhitungan Arus Kas Bersih / Cash Flow)
  const cashExpensesInMonth = expenses.filter((e) => e.date && e.date.startsWith(targetMonthPrefix));
  const totalCashExpensesInMonth = cashExpensesInMonth.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Breakdown per Tutor untuk Periode Bulan Terpilih (Accrual Basis)
  const activeTutors = users.filter((u) => u.role === 'tutor');
  const tutorSalaryBreakdown = activeTutors.map((tutor) => {
    const tutorResolvedName = tutor.name;
    const tutorSessions = presentAttendances.filter(
      (a) => resolveTutorName(a.tutorName, users).toLowerCase() === tutorResolvedName.toLowerCase()
    ).length;

    const tutorPaidList = salaryExpensesForMonth.filter(
      (e) =>
        resolveTutorName(e.tutorName || e.paidTo || e.recipient, users).toLowerCase() ===
        tutorResolvedName.toLowerCase()
    );
    const tutorPaidAmount = tutorPaidList.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      tutorName: tutorResolvedName,
      specialty: tutor.specialty || 'Tutor Bimbel',
      sessionsTaught: tutorSessions,
      amountPaid: tutorPaidAmount,
    };
  }).filter((t) => t.sessionsTaught > 0 || t.amountPaid > 0);

  // 2. Beban Fasilitas & Utilitas
  const rentExpense = generalExpensesInMonth
    .filter(
      (e) =>
        (e.category || '').toLowerCase().includes('sewa') ||
        (e.category || '').toLowerCase().includes('gedung')
    )
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const utilityExpense = generalExpensesInMonth
    .filter(
      (e) =>
        (e.category || '').toLowerCase().includes('listrik') ||
        (e.category || '').toLowerCase().includes('internet') ||
        (e.category || '').toLowerCase().includes('wifi') ||
        (e.category || '').toLowerCase().includes('air')
    )
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // 3. Beban Pembelajaran & Operasional Kelas
  const moduleExp = generalExpensesInMonth
    .filter(
      (e) =>
        (e.category || '').toLowerCase().includes('modul') ||
        (e.category || '').toLowerCase().includes('atk') ||
        (e.category || '').toLowerCase().includes('cetak') ||
        (e.category || '').toLowerCase().includes('fotokopi')
    )
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const pantryExp = generalExpensesInMonth
    .filter(
      (e) =>
        (e.category || '').toLowerCase().includes('konsumsi') ||
        (e.category || '').toLowerCase().includes('pantry') ||
        (e.category || '').toLowerCase().includes('snack')
    )
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // 4. Beban Pemasaran & Operasional Lainnya
  const promoExp = generalExpensesInMonth
    .filter(
      (e) =>
        (e.category || '').toLowerCase().includes('iklan') ||
        (e.category || '').toLowerCase().includes('promosi') ||
        (e.category || '').toLowerCase().includes('banner') ||
        (e.category || '').toLowerCase().includes('brosur')
    )
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const generalNonSalaryExpense = generalExpensesInMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
  const otherExp = Math.max(
    0,
    generalNonSalaryExpense - (rentExpense + utilityExpense + moduleExp + pantryExp + promoExp)
  );

  // Total Beban Operasional P&L (Beban Gaji Periode Ini + Beban Operasional Umum)
  const totalMonthlyExpenses = totalSalaryExpense + generalNonSalaryExpense;

  // Total Laba Bersih & Rasio
  const monthlyAccrualNetProfit = grandTotalMonthlyRevenueAccrual - totalMonthlyExpenses;
  const monthlyCashNetFlow = totalCashIncomeMonth - totalCashExpensesInMonth;
  const profitMarginPercent =
    grandTotalMonthlyRevenueAccrual > 0
      ? Math.round((monthlyAccrualNetProfit / grandTotalMonthlyRevenueAccrual) * 100)
      : 0;
  const tutorCostRatio =
    totalSppAccrual > 0 ? Math.round((totalSalaryExpense / totalSppAccrual) * 100) : 0;
  const avgRevenuePerStudent =
    activeStudentCount > 0 ? Math.round(grandTotalMonthlyRevenueAccrual / activeStudentCount) : 0;
  const collectionRate =
    totalSppAccrual > 0 ? Math.min(100, Math.round((totalSppPaid / totalSppAccrual) * 100)) : 100;

  // ==========================================
  // EXPORT HANDLERS
  // ==========================================
  const handlePrint = () => {
    const modeLabel = activeMode === 'monthly' ? `Bulan_${targetMonthName}` : 'Tahunan_12_Bulan';
    const docTitle = `Laporan_P&L_${bimbelName.replace(/\s+/g, '_')}_${modeLabel}_${selectedYear}`;
    printElement('printable-pl-statement', docTitle);
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    try {
      const modeLabel = activeMode === 'monthly' ? `Bulan_${targetMonthName}` : 'Tahunan_12_Bulan';
      const fileName = `Laporan_P&L_${bimbelName.replace(/\s+/g, '_')}_${modeLabel}_${selectedYear}`;
      await exportElementToPng('printable-pl-statement', fileName);
    } catch (err) {
      console.error('Gagal unduh gambar laba rugi:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleExportExcel = () => {
    if (activeMode === 'monthly') {
      // Detailed monthly export
      const monthlyRows = [
        { 'KOMPONEN LAPORAN': '=== RINGKASAN EKSEKUTIF P&L ===', 'NILAI (RP)': '', 'KETERANGAN': `${targetMonthName} ${selectedYear}` },
        { 'KOMPONEN LAPORAN': '1. Total Pendapatan Operasional (Buku Kas Masuk)', 'NILAI (RP)': grandTotalMonthlyRevenueAccrual, 'KETERANGAN': 'Pendapatan SPP + Non-SPP' },
        { 'KOMPONEN LAPORAN': '   - Pendapatan SPP Siswa (Buku Kas)', 'NILAI (RP)': totalSppPaidCashBook, 'KETERANGAN': `${sppCashIncomesForMonth.length} Transaksi SPP (${totalSessionsCount} Sesi Hadir)` },
        { 'KOMPONEN LAPORAN': '   - Pendapatan Pendaftaran Siswa', 'NILAI (RP)': regFeeIncome, 'KETERANGAN': 'Registrasi Siswa Baru' },
        { 'KOMPONEN LAPORAN': '   - Pendapatan Modul & Buku Paket', 'NILAI (RP)': moduleIncome, 'KETERANGAN': 'Penjualan Modul' },
        { 'KOMPONEN LAPORAN': '   - Pendapatan Try Out & Ujian Simulasi', 'NILAI (RP)': tryOutIncome, 'KETERANGAN': 'Ujian Simulasi' },
        { 'KOMPONEN LAPORAN': '   - Pendapatan Kas Masuk Lainnya', 'NILAI (RP)': otherNonSppIncome, 'KETERANGAN': 'Event / Workshop / Lain-lain' },
        { 'KOMPONEN LAPORAN': '2. Total Kas Masuk Riil (Cash Basis)', 'NILAI (RP)': totalCashIncomeMonth, 'KETERANGAN': 'Uang Masuk Kasir di Bulan Ini' },
        { 'KOMPONEN LAPORAN': '3. Total Beban Pengeluaran Operasional', 'NILAI (RP)': totalMonthlyExpenses, 'KETERANGAN': 'Total Seluruh Kas Keluar' },
        { 'KOMPONEN LAPORAN': '   - Beban Gaji & Honor Tutor Pengajar', 'NILAI (RP)': totalSalaryExpense, 'KETERANGAN': `${tutorSalaryBreakdown.length} Tutor Pengajar` },
        { 'KOMPONEN LAPORAN': '   - Beban Sewa Tempat / Gedung', 'NILAI (RP)': rentExpense, 'KETERANGAN': 'Sewa Fasilitas Belajar' },
        { 'KOMPONEN LAPORAN': '   - Beban Listrik, Air & Internet WiFi', 'NILAI (RP)': utilityExpense, 'KETERANGAN': 'Utilitas Operasional' },
        { 'KOMPONEN LAPORAN': '   - Beban Modul, ATK & Fotokopi', 'NILAI (RP)': moduleExp, 'KETERANGAN': 'Bahan Ajar & Kantor' },
        { 'KOMPONEN LAPORAN': '   - Beban Konsumsi / Pantry', 'NILAI (RP)': pantryExp, 'KETERANGAN': 'Konsumsi Tutor & Siswa' },
        { 'KOMPONEN LAPORAN': '   - Beban Promosi / Banner / Iklan', 'NILAI (RP)': promoExp, 'KETERANGAN': 'Pemasaran & Spanduk' },
        { 'KOMPONEN LAPORAN': '   - Beban Operasional Lain-lain', 'NILAI (RP)': otherExp, 'KETERANGAN': 'Pemeliharaan & Kebersihan' },
        { 'KOMPONEN LAPORAN': '4. LABA BERSIH OPERASIONAL (NET PROFIT)', 'NILAI (RP)': monthlyAccrualNetProfit, 'KETERANGAN': `Margin Profit: ${profitMarginPercent}%` },
        { 'KOMPONEN LAPORAN': '5. ARUS KAS BERSIH (NET CASH FLOW)', 'NILAI (RP)': monthlyCashNetFlow, 'KETERANGAN': 'Kas Masuk Riil - Pengeluaran' },
        { 'KOMPONEN LAPORAN': '6. Sisa Tagihan SPP Belum Tertagih (Piutang)', 'NILAI (RP)': totalUncollectedSpp, 'KETERANGAN': `Tingkat Pelunasan: ${collectionRate}%` },
      ];

      // Sheet 2: Rincian SPP & Sesi per Siswa (Murni dari Buku Kas)
      const studentRows = Object.values(studentBreakdownMap)
        .filter((s) => s.sessions > 0 || s.paidAmount > 0)
        .map((s, idx) => ({
          'No': idx + 1,
          'Kode Siswa': s.studentCode || '-',
          'Nama Siswa': s.name,
          'Jenjang': s.level,
          'Tipe Kelas': s.classType,
          'Sesi Hadir': s.sessions,
          'Total SPP Terbayar Buku Kas (Rp)': s.paidAmount,
          'Jumlah Transaksi Kas': s.paymentCount,
          'Status': s.paidAmount > 0 ? 'Tercatat di Buku Kas' : 'Belum Ada Pembayaran',
        }));

      // Sheet 3: Rincian Gaji & Honor Tutor
      const tutorRows = tutorSalaryBreakdown.map((t, idx) => ({
        'No': idx + 1,
        'Nama Tutor': t.tutorName,
        'Bidang / Mata Pelajaran': t.specialty,
        'Sesi Mengajar': t.sessionsTaught,
        'Honor Dibayarkan (Rp)': t.amountPaid,
      }));

      // Sheet 4: Rincian Pengeluaran Kas Operasional Non-Gaji
      const expenseRows = generalExpensesInMonth.map((e, idx) => ({
        'No': idx + 1,
        'Tanggal': e.date,
        'Kategori': e.category,
        'Keperluan / Deskripsi': e.description || e.title || '-',
        'Nominal (Rp)': e.amount,
        'Penerima': e.recipient || e.paidTo || '-',
        'Metode': e.paymentMethod || '-',
      }));

      // Sheet 5: Rincian Kas Masuk Riil
      const cashIncomeRows = incomesReceivedInMonth.map((i, idx) => ({
        'No': idx + 1,
        'No. Kwitansi': i.receiptNumber || '-',
        'Tanggal Bayar': i.datePaid,
        'Kategori': i.category || (i.incomeCategory === 'registration' ? 'Pendaftaran' : 'SPP'),
        'Sumber / Siswa': i.studentName || i.sourceName || '-',
        'Nominal (Rp)': i.amount,
        'Metode': i.paymentMethod || '-',
      }));

      exportMultiSheetExcel(
        [
          { name: 'Ringkasan P&L', data: monthlyRows },
          { name: 'Rincian Siswa & SPP', data: studentRows },
          { name: 'Honor Gaji Tutor', data: tutorRows },
          { name: 'Pengeluaran Kas', data: expenseRows },
          { name: 'Kas Masuk Riil', data: cashIncomeRows },
        ],
        `Laporan_P&L_Bulanan_${bimbelName.replace(/\s+/g, '_')}_${targetMonthName}_${selectedYear}`
      );
    } else {
      // Annual 12-Month Export
      const annualRows = annualPLData.map((d) => ({
        'Bulan': d.monthName,
        'Pendapatan Accrual (Rp)': d.accrualIncome,
        'Kas Masuk Riil (Rp)': d.cashIncome,
        'Beban Gaji Tutor (Rp)': d.tutorSalaryExpense,
        'Beban Sewa Tempat (Rp)': d.rentExpense,
        'Beban Listrik & Internet (Rp)': d.utilityExpense,
        'Beban Modul & ATK (Rp)': d.moduleExpense,
        'Beban Lain-lain (Rp)': d.otherExpense,
        'Total Pengeluaran (Rp)': d.totalExpenses,
        'Laba Bersih Accrual (Rp)': d.accrualNetProfit,
        'Arus Kas Bersih (Rp)': d.cashNetFlow,
      }));

      annualRows.push({
        'Bulan': `TOTAL TAHUNAN ${selectedYear} (YTD)`,
        'Pendapatan Accrual (Rp)': totalAnnualAccrualIncome,
        'Kas Masuk Riil (Rp)': totalAnnualCashIncome,
        'Beban Gaji Tutor (Rp)': annualPLData.reduce((sum, d) => sum + d.tutorSalaryExpense, 0),
        'Beban Sewa Tempat (Rp)': annualPLData.reduce((sum, d) => sum + d.rentExpense, 0),
        'Beban Listrik & Internet (Rp)': annualPLData.reduce((sum, d) => sum + d.utilityExpense, 0),
        'Beban Modul & ATK (Rp)': annualPLData.reduce((sum, d) => sum + d.moduleExpense, 0),
        'Beban Lain-lain (Rp)': annualPLData.reduce((sum, d) => sum + d.otherExpense, 0),
        'Total Pengeluaran (Rp)': totalAnnualExpenses,
        'Laba Bersih Accrual (Rp)': totalAnnualAccrualNetProfit,
        'Arus Kas Bersih (Rp)': totalAnnualCashNetFlow,
      });

      // Sheet 2: Ringkasan Beban Tahunan
      const annualExpenseBreakdown = [
        { 'KATEGORI BEBAN OPERASIONAL': 'Beban Gaji & Honor Tutor', 'TOTAL SETAHUN (RP)': annualPLData.reduce((sum, d) => sum + d.tutorSalaryExpense, 0) },
        { 'KATEGORI BEBAN OPERASIONAL': 'Beban Sewa Gedung / Fasilitas', 'TOTAL SETAHUN (RP)': annualPLData.reduce((sum, d) => sum + d.rentExpense, 0) },
        { 'KATEGORI BEBAN OPERASIONAL': 'Beban Listrik, Air & Internet WiFi', 'TOTAL SETAHUN (RP)': annualPLData.reduce((sum, d) => sum + d.utilityExpense, 0) },
        { 'KATEGORI BEBAN OPERASIONAL': 'Beban Modul, ATK & Fotokopi', 'TOTAL SETAHUN (RP)': annualPLData.reduce((sum, d) => sum + d.moduleExpense, 0) },
        { 'KATEGORI BEBAN OPERASIONAL': 'Beban Operasional Lainnya', 'TOTAL SETAHUN (RP)': annualPLData.reduce((sum, d) => sum + d.otherExpense, 0) },
        { 'KATEGORI BEBAN OPERASIONAL': 'TOTAL SELURUH BEBAN OPERASIONAL', 'TOTAL SETAHUN (RP)': totalAnnualExpenses },
      ];

      exportMultiSheetExcel(
        [
          { name: `P&L 12 Bulan ${selectedYear}`, data: annualRows },
          { name: 'Struktur Beban Tahunan', data: annualExpenseBreakdown },
        ],
        `Laporan_P&L_Tahunan_${bimbelName.replace(/\s+/g, '_')}_Tahun_${selectedYear}`
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner & Mode Selector */}
      <div className="no-print bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 font-heading">
                  Laporan Laba Rugi (Profit & Loss / P&L)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                  {activeMode === 'monthly' ? `${targetMonthName} ${selectedYear}` : `Tahun ${selectedYear}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi komprehensif performa laba/rugi, rincian pos pendapatan, efisiensi beban operasional, dan arus kas lembaga
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Format Cetak / Tampilan: Hitam Putih (Hemat Tinta) vs Berwarna */}
            <div className="inline-flex p-0.5 bg-slate-100 border border-slate-300 rounded-2xl text-xs">
              <button
                type="button"
                onClick={() => setIsMonochrome(true)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs ${
                  isMonochrome
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format monokrom hitam putih (hemat tinta printer & PDF)"
              >
                <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-400 inline-block" />
                <span>B&W (Hemat Tinta)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMonochrome(false)}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs ${
                  !isMonochrome
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format berwarna"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Berwarna</span>
              </button>
            </div>

            <button
              id="btn-export-pl-excel"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
              title="Unduh laporan laba rugi ke format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              id="btn-export-pl-png"
              onClick={handleExportPng}
              disabled={isExportingPng}
              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Unduh tampilan visual laporan laba rugi sebagai gambar PNG"
            >
              <ImageIcon className="w-4 h-4 text-amber-700" />
              <span>{isExportingPng ? 'Menyimpan...' : 'Unduh Gambar (PNG)'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: P&L Bulanan (Detail) vs P&L Tahunan (12 Bulan) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveMode('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeMode === 'monthly'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>P&L Bulanan (Rincian Detail)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeMode === 'annual'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>P&L Tahunan (Rekap 12 Bulan)</span>
            </button>
          </div>

          {/* Period Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeMode === 'monthly' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-500">Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES_ID.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-500">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: P&L BULANAN (RINCIAN DETAIL OPERASIONAL)                          */}
      {/* ========================================================================= */}
      {activeMode === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Pendapatan Accrual */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Pendapatan (Accrual)
                </span>
                <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-indigo-950 font-mono mt-2">
                {formatRupiah(grandTotalMonthlyRevenueAccrual)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Kas Riil Diterima:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {formatRupiah(totalCashIncomeMonth)}
                </span>
              </div>
            </div>

            {/* KPI 2: Total Beban Pengeluaran */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Beban Operasional
                </span>
                <span className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-rose-600 font-mono mt-2">
                {formatRupiah(totalMonthlyExpenses)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Gaji Tutor:</span>
                <span className="font-bold text-slate-700 font-mono">
                  {formatRupiah(totalSalaryExpense)}
                </span>
              </div>
            </div>

            {/* KPI 3: Laba Bersih Accrual */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Laba Bersih (Net Profit)
                </span>
                <span className="px-2 py-0.5 bg-white/15 rounded-full text-[11px] font-extrabold text-indigo-200">
                  Margin {profitMarginPercent}%
                </span>
              </div>
              <h3
                className={`text-2xl font-black font-mono mt-2 ${
                  monthlyAccrualNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatRupiah(monthlyAccrualNetProfit)}
              </h3>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
                <span>Arus Kas Bersih:</span>
                <span
                  className={`font-bold font-mono ${
                    monthlyCashNetFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatRupiah(monthlyCashNetFlow)}
                </span>
              </div>
            </div>

            {/* KPI 4: Sisa Tagihan SPP Belum Tertagih */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Piutang SPP Siswa
                </span>
                <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-2xl font-black text-amber-700 font-mono mt-2">
                {formatRupiah(totalUncollectedSpp)}
              </h3>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Pelunasan SPP:</span>
                <span className="font-bold text-emerald-700">{collectionRate}% Lunas</span>
              </div>
            </div>
          </div>

          {/* Ratios & Operational Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/70 border border-indigo-100 p-4 rounded-3xl text-xs">
            <div className="p-2">
              <span className="text-slate-500 block text-[11px] font-bold">Total Sesi Hadir Siswa</span>
              <span className="text-base font-black text-indigo-950 font-mono">{totalSessionsCount} Sesi</span>
            </div>
            <div className="p-2">
              <span className="text-slate-500 block text-[11px] font-bold">Siswa Aktif Belajar</span>
              <span className="text-base font-black text-indigo-950 font-mono">{activeStudentCount} Siswa</span>
            </div>
            <div className="p-2">
              <span className="text-slate-500 block text-[11px] font-bold">Rasio Gaji Tutor : SPP</span>
              <span className="text-base font-black text-indigo-950 font-mono">{tutorCostRatio}%</span>
            </div>
            <div className="p-2">
              <span className="text-slate-500 block text-[11px] font-bold">Rata-rata Pendapatan/Siswa</span>
              <span className="text-base font-black text-indigo-950 font-mono">{formatRupiah(avgRevenuePerStudent)}</span>
            </div>
          </div>

          {/* SECTION 1: RINCIAN PENDAPATAN (REVENUE BREAKDOWN) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">1. Rincian Pendapatan Layanan (Buku Kas Masuk)</h4>
                  <p className="text-xs text-slate-500">
                    Akumulasi penerimaan SPP siswa dan kas operasional yang tercatat di Buku Kas bulan {targetMonthName} {selectedYear}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Total: {formatRupiah(grandTotalMonthlyRevenueAccrual)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SPP Breakdown per Jenjang */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  Rincian Biaya Les per Jenjang Pendidikan
                </h5>
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Jenjang</th>
                        <th className="py-2.5 px-2 text-center">Siswa</th>
                        <th className="py-2.5 px-2 text-center">Sesi Hadir</th>
                        <th className="py-2.5 px-3 text-right">Total SPP Buku Kas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {levelBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Belum ada transaksi pembayaran SPP di Buku Kas pada bulan ini.
                          </td>
                        </tr>
                      ) : (
                        levelBreakdown.map((item) => (
                          <tr key={item.label} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{item.label}</td>
                            <td className="py-2.5 px-2 text-center font-mono">{item.studentCount}</td>
                            <td className="py-2.5 px-2 text-center font-mono">{item.sessionsCount}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(item.paidAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SPP Breakdown per Tipe Kelas & Non-SPP */}
              <div className="space-y-4">
                {/* Tipe Kelas */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Rincian Biaya Les per Tipe Kelas
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    {classTypeBreakdown.map((ct) => (
                      <div key={ct.label} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 block">{ct.label}</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-400 font-medium">{ct.studentCount} Siswa ({ct.sessionsCount} Sesi)</span>
                          <span className="text-xs font-black text-slate-900 font-mono">{formatRupiah(ct.accrualAmount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Non-SPP (Layanan Tambahan) */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Pendapatan Non-SPP / Layanan Tambahan
                  </h5>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Biaya Pendaftaran / Registrasi Siswa:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatRupiah(regFeeIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Modul & Buku Paket Belajar:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatRupiah(moduleIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Try Out & Ujian Simulasi:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatRupiah(tryOutIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Penerimaan Event / Kas Masuk Lainnya:</span>
                      <span className="font-bold text-slate-900 font-mono">{formatRupiah(otherNonSppIncome)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-emerald-800">
                      <span>Subtotal Pendapatan Non-SPP:</span>
                      <span className="font-mono">{formatRupiah(totalNonSppIncome)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TABEL RINCIAN TRANSAKSI PEMBAYARAN SPP SISWA DARI BUKU KAS */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Daftar Pembayaran SPP Siswa (Buku Kas Masuk)
                </h5>
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 w-fit">
                  {sppCashIncomesForMonth.length} Transaksi • Total: {formatRupiah(totalSppPaidCashBook)}
                </span>
              </div>

              <div className="overflow-hidden border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No. Kwitansi</th>
                      <th className="py-2.5 px-3">Tgl Bayar</th>
                      <th className="py-2.5 px-3">Nama Siswa / Pembayar</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3">Petugas Kasir</th>
                      <th className="py-2.5 px-3 text-right">Nominal Masuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sppCashIncomesForMonth.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Belum ada transaksi pembayaran SPP yang tercatat di Buku Kas untuk periode {targetMonthName} {selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      sppCashIncomesForMonth.map((inc) => (
                        <tr key={inc.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {inc.receiptNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{inc.datePaid}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {inc.studentName || inc.sourceName || 'Siswa Bimbel'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                              {inc.paymentMethod || 'Transfer BCA'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{inc.receivedBy || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(inc.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 2: RINCIAN BEBAN / PENGELUARAN (EXPENSE BREAKDOWN) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">2. Rincian Beban Operasional (Expense Breakdown)</h4>
                  <p className="text-xs text-slate-500">
                    Rincian per pos pengeluaran, honor tutor mengajar, sewa gedung, utilitas, modul & ATK
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Total Beban: {formatRupiah(totalMonthlyExpenses)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Beban Pokok: Honor Tutor Per Orang */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    Honor / Gaji Tutor Pengajar
                  </h5>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    Total: {formatRupiah(totalSalaryExpense)}
                  </span>
                </div>
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Nama Tutor</th>
                        <th className="py-2.5 px-2 text-center">Sesi Ajar</th>
                        <th className="py-2.5 px-3 text-right">Honor Periode Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tutorSalaryBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">
                            Belum ada beban honor tutor untuk periode bulan ini.
                          </td>
                        </tr>
                      ) : (
                        tutorSalaryBreakdown.map((tutor) => (
                          <tr key={tutor.tutorName} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">{tutor.tutorName}</span>
                              <span className="text-[10px] text-slate-400">{tutor.specialty}</span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-semibold text-slate-700">
                              {tutor.sessionsTaught} Sesi
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(tutor.amountPaid)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Beban Fasilitas, Utilitas, Pembelajaran & Promosi */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Rincian Beban Operasional Lembaga
                </h5>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
                  {/* Fasilitas & Sewa */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Sewa Gedung / Ruang Kelas:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatRupiah(rentExpense)}</span>
                  </div>
                  {/* Listrik & WiFi */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Listrik, Air & Internet (WiFi):</span>
                    <span className="font-bold text-slate-900 font-mono">{formatRupiah(utilityExpense)}</span>
                  </div>
                  {/* Modul & ATK */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Modul, ATK & Fotokopi Lembar Belajar:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatRupiah(moduleExp)}</span>
                  </div>
                  {/* Konsumsi / Pantry */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Konsumsi / Pantry Siswa & Tutor:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatRupiah(pantryExp)}</span>
                  </div>
                  {/* Promosi / Spanduk */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Pemasaran / Spanduk / Brosur Promosi:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatRupiah(promoExp)}</span>
                  </div>
                  {/* Lainnya */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Pemeliharaan, Kebersihan & Beban Lain:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatRupiah(otherExp)}</span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between font-black text-rose-700">
                    <span>Subtotal Beban Non-Tutor:</span>
                    <span className="font-mono">
                      {formatRupiah(totalMonthlyExpenses - totalSalaryExpense)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PRINTABLE OFFICIAL MONTHLY STATEMENT CARD */}
          <div id="printable-pl-statement" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Document Header */}
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl font-black text-2xl flex items-center justify-center font-heading overflow-hidden ${
                  isMonochrome
                    ? 'bg-white border-2 border-slate-900 text-slate-950 print:border-black print:text-black'
                    : 'bg-indigo-950 text-white print:bg-white print:border-2 print:border-black print:text-black'
                }`}>
                  <BimbelLogo settings={settings} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-950 font-heading uppercase tracking-wide print:text-black">
                    LAPORAN LABA RUGI OPERASIONAL BULANAN
                  </h3>
                  <p className="text-xs text-slate-600 font-medium print:text-black">
                    {bimbelName} • Periode Bulan {targetMonthName} {selectedYear}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right text-xs">
                <span className="font-bold text-slate-800 block print:text-black">Metode: Accrual & Cash Basis</span>
                <span className="text-slate-500 text-[11px] print:text-slate-700">Mata Uang: IDR (Rupiah)</span>
              </div>
            </div>

            {/* Comprehensive Statement Table */}
            <div className="overflow-x-auto p-6 print:p-0">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 uppercase font-black tracking-wider print:border-black print:text-black">
                    <th className="py-2.5 px-3">Uraian Komponen Keuangan</th>
                    <th className="py-2.5 px-3 text-right">Rincian Pos (Rp)</th>
                    <th className="py-2.5 px-3 text-right">Jumlah Total (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                  {/* REVENUE SECTION */}
                  <tr className={`font-black uppercase tracking-wider ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-b border-t border-slate-900 print:border-black print:text-black'
                      : 'bg-indigo-50/50 text-indigo-950 print:bg-white print:text-black print:border-t print:border-b print:border-black'
                  }`}>
                    <td colSpan={3} className="py-2 px-3 tracking-wider">
                      I. PENDAPATAN OPERASIONAL (REVENUE)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">
                      • Pendapatan SPP / Iuran Belajar Siswa ({sppCashIncomesForMonth.length} Transaksi Kas Masuk)
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(totalSppPaidCashBook)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Biaya Pendaftaran / Registrasi Siswa Baru</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(regFeeIncome)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Penjualan Modul & Buku Paket Siswa</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(moduleIncome)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Pendapatan Try Out & Layanan Tambahan Lainnya</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(tryOutIncome + otherNonSppIncome)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr className={`font-black border-t ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-slate-900 border-b print:border-black print:text-black'
                      : 'bg-emerald-50/80 text-emerald-950 border-emerald-200 print:bg-white print:text-black print:border-black'
                  }`}>
                    <td className="py-2.5 px-3">TOTAL PENDAPATAN OPERASIONAL (A)</td>
                    <td className="py-2.5 px-3 text-right font-mono"></td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm">{formatRupiah(grandTotalMonthlyRevenueAccrual)}</td>
                  </tr>

                  {/* EXPENSE SECTION */}
                  <tr className={`font-black uppercase tracking-wider ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-b border-t border-slate-900 print:border-black print:text-black'
                      : 'bg-rose-50/50 text-rose-950 print:bg-white print:text-black print:border-t print:border-b print:border-black'
                  }`}>
                    <td colSpan={3} className="py-2 px-3 tracking-wider">
                      II. BEBAN OPERASIONAL (OPERATING EXPENSES)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">
                      • Beban Pokok: Honor / Gaji Tutor Pengajar ({tutorSalaryBreakdown.length} Tutor)
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(totalSalaryExpense)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Beban Sewa Tempat / Gedung Pembelajaran</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(rentExpense)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Beban Utilitas (Listrik, Air & Internet WiFi)</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(utilityExpense)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Beban Modul, Fotokopi & ATK Kantor</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(moduleExp)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Beban Konsumsi & Pantry</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(pantryExp)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-6 font-semibold text-slate-800 print:text-black">• Beban Pemasaran, Pemeliharaan & Operasional Lain</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 print:text-black">{formatRupiah(promoExp + otherExp)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 print:text-black"></td>
                  </tr>
                  <tr className={`font-black border-t ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-slate-900 border-b print:border-black print:text-black'
                      : 'bg-rose-50/80 text-rose-950 border-rose-200 print:bg-white print:text-black print:border-black'
                  }`}>
                    <td className="py-2.5 px-3">TOTAL BEBAN OPERASIONAL (B)</td>
                    <td className="py-2.5 px-3 text-right font-mono"></td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm">{formatRupiah(totalMonthlyExpenses)}</td>
                  </tr>

                  {/* NET PROFIT */}
                  <tr className={`font-black border-t-2 text-sm ${
                    isMonochrome
                      ? 'bg-white text-slate-950 border-slate-900 border-b-2 print:border-black print:text-black'
                      : 'bg-slate-900 text-white border-slate-900 print:bg-white print:text-black print:border-2 print:border-black'
                  }`}>
                    <td className="py-3 px-3">LABA BERSIH OPERASIONAL (A - B)</td>
                    <td className={`py-3 px-3 text-right font-mono text-xs ${
                      isMonochrome ? 'text-slate-700 print:text-black' : 'text-slate-300 print:text-black'
                    }`}>
                      Margin: {profitMarginPercent}%
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono text-base ${
                        isMonochrome
                          ? 'text-slate-950 font-black print:text-black'
                          : monthlyAccrualNetProfit >= 0 ? 'text-emerald-400 print:text-black' : 'text-rose-400 print:text-black'
                      }`}
                    >
                      {formatRupiah(monthlyAccrualNetProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Report Footer & Signatures */}
            <div
              className={`p-6 border-t border-slate-200 grid ${
                opsName ? 'grid-cols-3' : 'grid-cols-2'
              } gap-6 text-xs text-center`}
            >
              <div>
                <p className="text-slate-600 font-semibold mb-14">Disiapkan Oleh ({financeTitle}):</p>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                  ( {financeName} )
                </p>
              </div>

              {opsName && (
                <div>
                  <p className="text-slate-600 font-semibold mb-14">Mengetahui ({opsTitle}):</p>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                    ( {opsName} )
                  </p>
                </div>
              )}

              <div>
                <p className="text-slate-600 font-semibold mb-14">Disetujui Oleh ({ownerTitle}):</p>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                  ( {ownerName} )
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: P&L TAHUNAN (REKAP 12 BULAN / KOMPARATIF)                        */}
      {/* ========================================================================= */}
      {activeMode === 'annual' && (
        <div className="space-y-6">
          {/* YTD Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Pendapatan Accrual */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pendapatan Accrual (YTD)
              </span>
              <h3 className="text-2xl font-black text-indigo-900 font-mono mt-1.5">
                {formatRupiah(totalAnnualAccrualIncome)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Hak pendapatan dari total sesi hadir siswa</p>
            </div>

            {/* Card 2: Total Kas Masuk Riil (Cash Basis) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Kas Masuk Riil / Cash (YTD)
              </span>
              <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1.5">
                {formatRupiah(totalAnnualCashIncome)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Uang SPP riil yang telah diterima kas</p>
            </div>

            {/* Card 3: Total Pengeluaran (Beban) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Beban Pengeluaran (YTD)
              </span>
              <h3 className="text-2xl font-black text-rose-600 font-mono mt-1.5">
                {formatRupiah(totalAnnualExpenses)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Gaji tutor, sewa, utilitas & ATK bimbel</p>
            </div>

            {/* Card 4: Laba Bersih Accrual */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Laba Bersih Accrual (YTD)
              </span>
              <h3
                className={`text-2xl font-black font-mono mt-1.5 ${
                  totalAnnualAccrualNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatRupiah(totalAnnualAccrualNetProfit)}
              </h3>
              <p className="text-xs text-indigo-200 mt-1">
                Arus Kas Bersih: {formatRupiah(totalAnnualCashNetFlow)}
              </p>
            </div>
          </div>

          {/* Accounting Explanation Box */}
          <div className="no-print p-4 bg-indigo-50/70 border border-indigo-200 rounded-3xl flex items-start gap-3 text-xs text-indigo-900">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Penjelasan Prinsip Akuntansi di Bimbel Sigma:</h4>
              <p>
                • <strong>Pendapatan Accrual:</strong> Dihitung berdasarkan perkalian sesi hadir siswa di bulan bersangkutan dengan tarif per sesi (pendapatan diakui saat sesi belajar terlaksana).
              </p>
              <p>
                • <strong>Kas Masuk Riil:</strong> Dihitung dari kas SPP yang nyata diterima pada bulan tersebut (sesuai tanggal bayar kasir).
              </p>
              <p>
                • <strong>Laba Bersih Accrual:</strong> Mencerminkan profitabilitas murni operasional bimbel (Pendapatan Accrual dikurangi Beban Pengeluaran).
              </p>
            </div>
          </div>

          {/* 12-Month Table */}
          <div
            id="printable-pl-statement"
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Printable Header for Reports */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl font-black text-xl flex items-center justify-center font-heading overflow-hidden ${
                  isMonochrome
                    ? 'bg-white border-2 border-slate-900 text-slate-950 print:border-black print:text-black'
                    : 'bg-indigo-950 text-white print:bg-white print:border-2 print:border-black print:text-black'
                }`}>
                  <BimbelLogo settings={settings} />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-950 font-heading uppercase print:text-black">
                    LAPORAN LABA RUGI KOMPREHENSIF 12 BULAN (TAHUNAN)
                  </h3>
                  <p className="text-xs text-slate-500 print:text-slate-700">
                    {bimbelName} • Periode 1 Januari - 31 Desember {selectedYear}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-slate-700 print:text-black">Mata Uang: IDR (Rupiah)</span>
                <p className="text-slate-400 text-[10px] print:text-slate-600">Dicetak secara otomatis dari Sistem OMS</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`font-extrabold uppercase tracking-wider border-b ${
                  isMonochrome
                    ? 'bg-white text-slate-950 border-slate-900 print:border-black print:text-black'
                    : 'bg-slate-100/90 text-slate-700 border-slate-300 print:bg-white print:text-black print:border-black'
                }`}>
                  <tr>
                    <th className="py-3.5 px-3 border-r border-slate-300 print:border-black">Bulan</th>
                    <th className={`py-3.5 px-3 text-right border-r border-slate-300 print:border-black ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'bg-indigo-50/50 text-indigo-900 print:bg-white print:text-black'
                    }`}>
                      Pendapatan Accrual
                    </th>
                    <th className={`py-3.5 px-3 text-right border-r border-slate-300 print:border-black ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-emerald-800 print:text-black'
                    }`}>
                      Kas Riil Masuk
                    </th>
                    <th className="py-3.5 px-3 text-right text-slate-700 print:text-black">Gaji Tutor</th>
                    <th className="py-3.5 px-3 text-right text-slate-700 print:text-black">Sewa Gedung</th>
                    <th className="py-3.5 px-3 text-right text-slate-700 print:text-black">Utilitas</th>
                    <th className="py-3.5 px-3 text-right text-slate-700 print:text-black">Modul/ATK</th>
                    <th className="py-3.5 px-3 text-right text-slate-700 border-r border-slate-300 print:border-black print:text-black">Lainnya</th>
                    <th className={`py-3.5 px-3 text-right font-bold border-r border-slate-300 print:border-black ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-rose-700 print:text-black'
                    }`}>
                      Total Beban
                    </th>
                    <th className={`py-3.5 px-3 text-right font-black ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'bg-indigo-50/50 text-indigo-950 print:bg-white print:text-black'
                    }`}>
                      Laba Bersih Accrual
                    </th>
                    <th className="py-3.5 px-3 text-right font-bold text-slate-800 print:text-black">
                      Arus Kas Bersih
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                  {annualPLData.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200 print:border-black print:text-black">
                        {row.monthName}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold border-r border-slate-200 print:border-black print:text-black ${
                        isMonochrome ? 'text-slate-900' : 'text-indigo-900 bg-indigo-50/30 print:bg-white'
                      }`}>
                        {formatRupiah(row.accrualIncome)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-medium border-r border-slate-200 print:border-black print:text-black ${
                        isMonochrome ? 'text-slate-900' : 'text-emerald-800'
                      }`}>
                        {formatRupiah(row.cashIncome)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 print:text-black">
                        {formatRupiah(row.tutorSalaryExpense)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 print:text-black">
                        {formatRupiah(row.rentExpense)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 print:text-black">
                        {formatRupiah(row.utilityExpense)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 print:text-black">
                        {formatRupiah(row.moduleExpense)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 border-r border-slate-200 print:border-black print:text-black">
                        {formatRupiah(row.otherExpense)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold border-r border-slate-200 print:border-black print:text-black ${
                        isMonochrome ? 'text-slate-900' : 'text-rose-600'
                      }`}>
                        {formatRupiah(row.totalExpenses)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-black ${
                          isMonochrome
                            ? 'text-slate-950 print:text-black'
                            : `${row.accrualNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'} bg-indigo-50/30 print:bg-white print:text-black`
                        }`}
                      >
                        {formatRupiah(row.accrualNetProfit)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-semibold ${
                          isMonochrome
                            ? 'text-slate-900 print:text-black'
                            : row.cashNetFlow >= 0 ? 'text-emerald-700 print:text-black' : 'text-rose-600 print:text-black'
                        }`}
                      >
                        {formatRupiah(row.cashNetFlow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Grand Total Footer */}
                <tfoot className={`font-bold border-t-2 ${
                  isMonochrome
                    ? 'bg-white text-slate-950 border-slate-900 border-b-2 print:border-black print:text-black'
                    : 'bg-slate-900 text-white border-slate-800 print:bg-white print:text-black print:border-2 print:border-black'
                }`}>
                  <tr>
                    <td className={`py-3.5 px-3 border-r uppercase tracking-wider ${
                      isMonochrome ? 'border-slate-900 print:border-black' : 'border-slate-700 print:border-black'
                    }`}>
                      TOTAL TAHUN {selectedYear}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono border-r ${
                      isMonochrome ? 'text-slate-950 border-slate-900 print:border-black print:text-black' : 'text-amber-400 border-slate-700 print:text-black print:border-black'
                    }`}>
                      {formatRupiah(totalAnnualAccrualIncome)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono border-r ${
                      isMonochrome ? 'text-slate-950 border-slate-900 print:border-black print:text-black' : 'text-emerald-400 border-slate-700 print:text-black print:border-black'
                    }`}>
                      {formatRupiah(totalAnnualCashIncome)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-slate-300 print:text-black'
                    }`}>
                      {formatRupiah(annualPLData.reduce((sum, d) => sum + d.tutorSalaryExpense, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-slate-300 print:text-black'
                    }`}>
                      {formatRupiah(annualPLData.reduce((sum, d) => sum + d.rentExpense, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-slate-300 print:text-black'
                    }`}>
                      {formatRupiah(annualPLData.reduce((sum, d) => sum + d.utilityExpense, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-slate-300 print:text-black'
                    }`}>
                      {formatRupiah(annualPLData.reduce((sum, d) => sum + d.moduleExpense, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono border-r ${
                      isMonochrome ? 'text-slate-950 border-slate-900 print:border-black print:text-black' : 'text-slate-300 border-slate-700 print:text-black print:border-black'
                    }`}>
                      {formatRupiah(annualPLData.reduce((sum, d) => sum + d.otherExpense, 0))}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono border-r ${
                      isMonochrome ? 'text-slate-950 border-slate-900 print:border-black print:text-black' : 'text-rose-400 border-slate-700 print:text-black print:border-black'
                    }`}>
                      {formatRupiah(totalAnnualExpenses)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono font-black ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-amber-300 print:text-black'
                    }`}>
                      {formatRupiah(totalAnnualAccrualNetProfit)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-mono ${
                      isMonochrome ? 'text-slate-950 print:text-black' : 'text-emerald-300 print:text-black'
                    }`}>
                      {formatRupiah(totalAnnualCashNetFlow)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Report Footer / Signature when printed */}
            <div
              className={`p-6 border-t border-slate-200 grid ${
                opsName ? 'grid-cols-3' : 'grid-cols-2'
              } gap-6 text-xs text-center`}
            >
              <div>
                <p className="text-slate-600 font-semibold mb-14">Disiapkan Oleh ({financeTitle}):</p>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                  ( {financeName} )
                </p>
              </div>

              {opsName && (
                <div>
                  <p className="text-slate-600 font-semibold mb-14">Mengetahui ({opsTitle}):</p>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                    ( {opsName} )
                  </p>
                </div>
              )}

              <div>
                <p className="text-slate-600 font-semibold mb-14">Disetujui Oleh ({ownerTitle}):</p>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">
                  ( {ownerName} )
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
