import React, { useState, useEffect } from 'react';
import {
  Student,
  AttendanceRecord,
  IncomeRecord,
  ExpenseRecord,
  UserSession,
  UserAccount,
  UserRole,
  BimbelSettings,
  ActiveTab,
  ProspectiveStudent,
  UndoItem,
} from './types';
import {
  getInitialStudents,
  getInitialAttendance,
  getInitialIncomes,
  getInitialExpenses,
  getInitialUsers,
  getInitialSettings,
  getInitialProspectiveStudents,
  saveStudents,
  saveAttendance,
  saveIncomes,
  saveExpenses,
  saveUsers,
  saveSettings,
  saveProspectiveStudents,
  resetToMockData,
  sortUsersByRole,
  getTodayDateString,
  getMonthNameIndo,
  formatRupiah,
  getSystemSalaryCategory,
  getSystemSppCategory,
  isSystemExpenseCategory,
  isSystemIncomeCategory,
  normalizeExpenseCategory,
  normalizeIncomeCategory,
  sanitizeAndHarmonizeExpenses,
  sanitizeAndHarmonizeIncomes,
  generateIncomeReceiptNumber,
  generateExpenseRefNumber,
  normalizeExpenseRefNumber,
  normalizeIncomeReceiptNumber,
  synchronizeTutorNames,
  resolveTutorName,
  deduplicateAttendanceList,
  findAttendanceDuplicates,
} from './utils/storage';
import {
  DEFAULT_USERS,
  DEFAULT_ACCOUNTS,
  DEFAULT_SETTINGS,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_INCOMES,
  INITIAL_EXPENSES,
  INITIAL_PROSPECTIVE_STUDENTS,
} from './utils/mockData';
import {
  subscribeToCollection,
  syncDocToFirestore,
  deleteDocFromFirestore,
  batchSeedToFirestore,
  replaceAllInCollection,
  clearFirestoreCollection,
  checkCollectionCount,
  COLLECTIONS,
} from './lib/firebase';

// Layout Components
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// View Components
import { AuthLoginView } from './components/views/AuthLoginView';
import { DashboardOwner } from './components/views/DashboardOwner';
import { DashboardTutor } from './components/views/DashboardTutor';
import { DashboardSiswa } from './components/views/DashboardSiswa';
import { StudentDatabaseView } from './components/views/StudentDatabaseView';
import { AttendanceView } from './components/views/AttendanceView';
import { StudentBillingView } from './components/views/StudentBillingView';
import { CashBookView } from './components/views/CashBookView';
import { PrintCardsView } from './components/views/PrintCardsView';
import { IncomeView } from './components/views/IncomeView';
import { ExpenseView } from './components/views/ExpenseView';
import { ProfitLossView } from './components/views/ProfitLossView';
import { SalaryView } from './components/views/SalaryView';
import { SettingsView } from './components/views/SettingsView';
import { PPDBManagementView } from './components/views/PPDBManagementView';
import { PublicPortalView } from './components/portal/PublicPortalView';

// Modal Components
import { StudentModal } from './components/modals/StudentModal';
import { AttendanceModal } from './components/modals/AttendanceModal';
import { BatchAttendanceModal } from './components/modals/BatchAttendanceModal';
import { SelfAttendanceModal } from './components/modals/SelfAttendanceModal';
import { IncomeModal } from './components/modals/IncomeModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { ExpenseReceiptModal } from './components/modals/ExpenseReceiptModal';
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal';
import { UserAccountModal } from './components/modals/UserAccountModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { QRScannerModal } from './components/modals/QRScannerModal';
import { StudentQRCardModal } from './components/modals/StudentQRCardModal';
import { UndoToast, ToastPayload } from './components/common/UndoToast';
import { applyThemeVariables } from './utils/theme';

// Helper: Ensure accounts have unique usernames and no role collisions (e.g. non-owner cannot have username "owner")
export const sanitizeAndFixUserAccounts = (
  rawUsers: UserAccount[]
): { fixed: UserAccount[]; changed: boolean } => {
  const seenUsernames = new Set<string>();
  let changed = false;

  const result = rawUsers.map((u) => {
    let cleanUsername = (u.username || '').trim().toLowerCase();
    const currentRole = u.role;

    // Rule 1: Only OWNER role can use username 'owner'. If a Tutor/Siswa has username 'owner', rename it!
    if (currentRole !== 'owner' && cleanUsername === 'owner') {
      const derived = (u.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      cleanUsername = derived && derived !== 'owner' ? derived : `tutor_${u.id.slice(-4)}`;
      changed = true;
    }

    // Rule 2: Ensure username is not empty
    if (!cleanUsername) {
      const derived = (u.name || currentRole)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      cleanUsername = derived || `user_${u.id.slice(-4)}`;
      changed = true;
    }

    // Rule 3: Avoid duplicate username collisions across accounts
    if (seenUsernames.has(cleanUsername)) {
      const derived = (u.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8);
      cleanUsername = derived ? `${derived}_${u.id.slice(-3)}` : `${cleanUsername}_${u.id.slice(-3)}`;
      changed = true;
    }

    seenUsernames.add(cleanUsername);

    if (cleanUsername !== u.username) {
      return { ...u, username: cleanUsername };
    }
    return u;
  });

  return { fixed: sortUsersByRole(result), changed };
};

export default function App() {
  // 1. Authentication State - Mandatory login required for fresh sessions
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('bimbel_sigma_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null; // Require login screen first!
  });

  // 2. Navigation State
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [showPublicPortal, setShowPublicPortal] = useState(false);

  // 3. Core Data States (Synced with LocalStorage & Firestore Cloud)
  const [students, setStudents] = useState<Student[]>(() => getInitialStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const raw = getInitialAttendance();
    const { cleanList } = deduplicateAttendanceList(raw);
    return cleanList;
  });
  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => getInitialIncomes());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => getInitialExpenses());
  const [prospectiveStudents, setProspectiveStudents] = useState<ProspectiveStudent[]>(() =>
    getInitialProspectiveStudents()
  );
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const raw = getInitialUsers();
    const { fixed } = sanitizeAndFixUserAccounts(raw);
    return fixed;
  });
  const [settings, setSettings] = useState<BimbelSettings>(() => getInitialSettings());

  // 4. Modal Visibility & Editing Target States
  // Student Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);

  // Attendance Modal
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | undefined>(undefined);

  // Batch Attendance Modal
  const [isBatchAttendanceModalOpen, setIsBatchAttendanceModalOpen] = useState(false);

  // Self Attendance Modal (For Siswa)
  const [isSelfAttendanceModalOpen, setIsSelfAttendanceModalOpen] = useState(false);

  // Income Modal
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeRecord | undefined>(undefined);

  // Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | undefined>(undefined);

  // Receipt Modal
  const [receiptIncome, setReceiptIncome] = useState<IncomeRecord | null>(null);
  const [receiptExpense, setReceiptExpense] = useState<ExpenseRecord | null>(null);

  // User Account Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | undefined>(undefined);

  // Change Password Modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserAccount | UserSession | undefined>(undefined);

  // QR Attendance Scanner & Student QR Card Modals
  const [isQRScannerModalOpen, setIsQRScannerModalOpen] = useState(false);
  const [qrCardStudent, setQrCardStudent] = useState<Student | null>(null);

  // Confirm Delete Modal
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    onConfirm: () => {},
  });

  // 5. Undo / Redo & Toast Notification State
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [redoStack, setRedoStack] = useState<UndoItem[]>([]);
  const [activeToast, setActiveToast] = useState<ToastPayload | null>(null);

  const showToast = (
    msg: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
    undoItem?: UndoItem,
    duration?: number
  ) => {
    setActiveToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      message: msg,
      type,
      undoItem,
      duration,
    });
  };

  const pushUndoAction = (action: UndoItem, showInToast: boolean = true) => {
    setUndoStack((prev) => [action, ...prev.slice(0, 19)]); // Keep up to 20 actions
    setRedoStack([]); // Clear redo on fresh action
    if (showInToast) {
      showToast(action.title, 'success', action);
    }
  };

  const performUndo = async (specificItem?: UndoItem | unknown) => {
    // Robust check: Ensure specificItem is an actual UndoItem with an .undo() function,
    // avoiding SyntheticEvent (MouseEvent) passed by React onClick handlers
    const targetItem =
      specificItem && typeof (specificItem as UndoItem).undo === 'function'
        ? (specificItem as UndoItem)
        : undoStack[0];

    if (!targetItem || typeof targetItem.undo !== 'function') {
      console.warn('No valid undo item found in stack');
      return;
    }

    try {
      await targetItem.undo();
      setUndoStack((prev) => prev.filter((item) => item.id !== targetItem.id));
      if (targetItem.redo) {
        setRedoStack((prev) => [targetItem, ...prev.slice(0, 19)]);
      }
      showToast(`Perubahan berhasil dibatalkan: "${targetItem.title}"`, 'info', undefined, 4000);
    } catch (error) {
      console.error('Error executing undo:', error);
      showToast('Gagal membatalkan perubahan.', 'error');
    }
  };

  const performRedo = async (specificItem?: UndoItem | unknown) => {
    const targetItem =
      specificItem && typeof (specificItem as UndoItem).redo === 'function'
        ? (specificItem as UndoItem)
        : redoStack[0];

    if (!targetItem || typeof targetItem.redo !== 'function') {
      console.warn('No valid redo item found in stack');
      return;
    }

    try {
      await targetItem.redo();
      setRedoStack((prev) => prev.filter((item) => item.id !== targetItem.id));
      setUndoStack((prev) => [targetItem, ...prev.slice(0, 19)]);
      showToast(`Tindakan diulangi: "${targetItem.title}"`, 'info', undefined, 4000);
    } catch (error) {
      console.error('Error executing redo:', error);
      showToast('Gagal mengulangi tindakan.', 'error');
    }
  };

  // Keyboard shortcut listener: Ctrl+Z / Cmd+Z for Undo, Ctrl+Y / Cmd+Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditing =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');

      if (isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        performRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth < 1024) {
          setIsMobileSidebarOpen((prev) => !prev);
        } else {
          setIsSidebarCollapsed((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack]);


  // --- Realtime Firestore Cloud Synchronization & Auto-Seeding ---
  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // Auto-seed cloud if database is fresh/empty
    const checkAndSeedCloud = async () => {
      try {
        const usersCount = await checkCollectionCount(COLLECTIONS.USERS);
        if (usersCount === 0) {
          console.log('Seeding essential accounts and students to Firestore...');
          await batchSeedToFirestore(COLLECTIONS.USERS, DEFAULT_ACCOUNTS);
          await batchSeedToFirestore(COLLECTIONS.STUDENTS, INITIAL_STUDENTS);
          await batchSeedToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, INITIAL_PROSPECTIVE_STUDENTS);
          await syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...DEFAULT_SETTINGS });
          console.log('Firestore essential seed completed.');
        } else if (usersCount > 0) {
          // If Firestore contains fewer than 25 students or old mock data, update with student list and user accounts
          const studentCount = await checkCollectionCount(COLLECTIONS.STUDENTS);
          if (studentCount > 0 && studentCount < 25) {
            console.log('Updating Firestore with 25 students from bimbel list...');
            await replaceAllInCollection(COLLECTIONS.STUDENTS, INITIAL_STUDENTS);
            await replaceAllInCollection(COLLECTIONS.USERS, DEFAULT_ACCOUNTS);
          }

          // If Firestore contains fewer than 170 attendance records, sync the complete attendance logs
          const attendanceCount = await checkCollectionCount(COLLECTIONS.ATTENDANCE);
          if (attendanceCount > 0 && attendanceCount < 170) {
            console.log('Updating Firestore with 170 attendance records...');
            await replaceAllInCollection(COLLECTIONS.ATTENDANCE, INITIAL_ATTENDANCE);
          }
        }
      } catch (e) {
        console.warn('Initial cloud seed check:', e);
      }
    };

    checkAndSeedCloud();

    // 1. Subscribe to Students
    const unsubStudents = subscribeToCollection<Student>(
      COLLECTIONS.STUDENTS,
      (cloudData) => {
        setStudents(cloudData);
        saveStudents(cloudData);
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubStudents);

    // 2. Subscribe to Attendance
    const unsubAttendance = subscribeToCollection<AttendanceRecord>(
      COLLECTIONS.ATTENDANCE,
      (cloudData) => {
        const { cleanList } = deduplicateAttendanceList(cloudData);
        setAttendance(cleanList);
        saveAttendance(cleanList);
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubAttendance);

    // 3. Subscribe to Incomes
    const unsubIncomes = subscribeToCollection<IncomeRecord>(
      COLLECTIONS.INCOMES,
      (cloudData) => {
        const { sanitized, hasChanges } = sanitizeAndHarmonizeIncomes(cloudData, settings);
        setIncomes(sanitized);
        saveIncomes(sanitized);
        if (hasChanges && sanitized.length > 0) {
          sanitized.forEach((inc) => {
            syncDocToFirestore(COLLECTIONS.INCOMES, inc.id, inc).catch(console.error);
          });
        }
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubIncomes);

    // 4. Subscribe to Expenses
    const unsubExpenses = subscribeToCollection<ExpenseRecord>(
      COLLECTIONS.EXPENSES,
      (cloudData) => {
        const { sanitized, hasChanges } = sanitizeAndHarmonizeExpenses(cloudData, settings);
        setExpenses(sanitized);
        saveExpenses(sanitized);
        if (hasChanges && sanitized.length > 0) {
          sanitized.forEach((exp) => {
            syncDocToFirestore(COLLECTIONS.EXPENSES, exp.id, exp).catch(console.error);
          });
        }
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubExpenses);

    // 5. Subscribe to Users
    const unsubUsers = subscribeToCollection<UserAccount>(
      COLLECTIONS.USERS,
      (cloudData) => {
        if (cloudData.length > 0) {
          const { fixed, changed } = sanitizeAndFixUserAccounts(cloudData);
          setUsers(fixed);
          saveUsers(fixed);

          // If there were collisions that got automatically resolved, sync fixed docs back to Firestore
          if (changed) {
            fixed.forEach((u) => {
              syncDocToFirestore(COLLECTIONS.USERS, u.id, u).catch(console.error);
            });
          }

          // Auto-sync currentUser session data if modified in database
          setCurrentUser((prevUser) => {
            if (!prevUser) return null;
            const matched = fixed.find(
              (u) =>
                u.id === prevUser.id ||
                (u.role === prevUser.role && u.username.toLowerCase() === prevUser.username.toLowerCase())
            );
            if (matched) {
              const updatedSession = { ...prevUser, ...matched };
              localStorage.setItem('bimbel_sigma_auth_user', JSON.stringify(updatedSession));
              return updatedSession;
            }
            return prevUser;
          });
        }
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubUsers);

    // 6. Subscribe to Settings
    const unsubSettings = subscribeToCollection<BimbelSettings & { id: string }>(
      COLLECTIONS.SETTINGS,
      (cloudData) => {
        if (cloudData.length > 0) {
          const { id, ...cleanSettings } = cloudData[0];
          setSettings(cleanSettings as BimbelSettings);
          saveSettings(cleanSettings as BimbelSettings);
        }
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubSettings);

    // 7. Subscribe to Prospective Students (PPDB)
    const unsubProspective = subscribeToCollection<ProspectiveStudent>(
      COLLECTIONS.PROSPECTIVE_STUDENTS,
      (cloudData) => {
        setProspectiveStudents(cloudData);
        saveProspectiveStudents(cloudData);
        setIsCloudConnected(true);
      },
      () => setIsCloudConnected(false)
    );
    unsubs.push(unsubProspective);

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  // Auto-harmonize expenses and incomes whenever database settings or categories change
  useEffect(() => {
    if (expenses.length > 0) {
      const { sanitized: cleanExp, hasChanges: expChanged } = sanitizeAndHarmonizeExpenses(expenses, settings);
      if (expChanged) {
        setExpenses(cleanExp);
        saveExpenses(cleanExp);
        cleanExp.forEach((exp) => {
          syncDocToFirestore(COLLECTIONS.EXPENSES, exp.id, exp).catch(console.error);
        });
      }
    }

    if (incomes.length > 0) {
      const { sanitized: cleanInc, hasChanges: incChanged } = sanitizeAndHarmonizeIncomes(incomes, settings);
      if (incChanged) {
        setIncomes(cleanInc);
        saveIncomes(cleanInc);
        cleanInc.forEach((inc) => {
          syncDocToFirestore(COLLECTIONS.INCOMES, inc.id, inc).catch(console.error);
        });
      }
    }
  }, [settings]);

  // Apply Theme Color to root CSS variables dynamically
  useEffect(() => {
    applyThemeVariables(settings.accentColor, settings.accentOpacity);
  }, [settings.accentColor, settings.accentOpacity]);

  // --- Handlers: Auth ---
  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    localStorage.setItem('bimbel_sigma_auth_user', JSON.stringify(user));
    setCurrentTab(user.role === 'siswa' ? 'student-portal' : 'dashboard');
    showToast(`Selamat datang, ${user.name} (${user.role.toUpperCase()})`);
  };

  const handleLogout = () => {
    localStorage.removeItem('bimbel_sigma_auth_user');
    setCurrentUser(null);
  };

  const handleSwitchUser = (user: UserSession) => {
    setCurrentUser(user);
    localStorage.setItem('bimbel_sigma_auth_user', JSON.stringify(user));
    setCurrentTab(user.role === 'siswa' ? 'student-portal' : 'dashboard');
    showToast(`Beralih ke tampilan akun: ${user.name} (${user.role.toUpperCase()})`);
  };

  const handleSwitchUserRole = (newRole: 'owner' | 'tutor' | 'siswa') => {
    const target = users.find((u) => u.role === newRole && u.isActive !== false) ||
      users.find((u) => u.role === newRole) ||
      DEFAULT_USERS.find((u) => u.role === newRole) ||
      DEFAULT_USERS[0];
    handleSwitchUser(target);
  };

  // --- Handlers: Students CRUD ---
  const handleOpenStudentModal = (studentToEdit?: Student) => {
    setEditingStudent(studentToEdit);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (data: Omit<Student, 'id' | 'createdAt'> & { id?: string }) => {
    if (data.id) {
      const prevStudent = students.find((s) => s.id === data.id);
      const prevStudentsList = [...students];
      const prevAttendanceList = [...attendance];
      const prevIncomesList = [...incomes];
      const prevUsersList = [...users];

      // 1. Update Students Master Data
      const updated = students.map((s) => (s.id === data.id ? { ...s, ...data } : s));
      setStudents(updated);
      saveStudents(updated);
      const studentObj = updated.find((s) => s.id === data.id)!;
      syncDocToFirestore(COLLECTIONS.STUDENTS, data.id, studentObj).catch(console.error);

      // 2. Cascade Update to Attendance Records
      const updatedAttendance = attendance.map((a) => {
        if (a.studentId === data.id) {
          return {
            ...a,
            studentName: data.name,
            studentCode: data.code,
            classType: data.classType,
          };
        }
        return a;
      });
      const hasAttendanceChanges = updatedAttendance.some((a, idx) => a !== attendance[idx]);
      if (hasAttendanceChanges) {
        setAttendance(updatedAttendance);
        saveAttendance(updatedAttendance);
        const affectedAttendance = updatedAttendance.filter((a) => a.studentId === data.id);
        batchSeedToFirestore(COLLECTIONS.ATTENDANCE, affectedAttendance).catch(console.error);
      }

      // 3. Cascade Update to Incomes Records (SPP / Registrations)
      const updatedIncomes = incomes.map((inc) => {
        if (inc.studentId === data.id) {
          return {
            ...inc,
            studentName: data.name,
            studentCode: data.code,
            sourceName: inc.category === 'SPP Bulanan' ? `SPP Siswa: ${data.name} (${data.code})` : inc.sourceName,
          };
        }
        return inc;
      });
      const hasIncomeChanges = updatedIncomes.some((inc, idx) => inc !== incomes[idx]);
      if (hasIncomeChanges) {
        setIncomes(updatedIncomes);
        saveIncomes(updatedIncomes);
        const affectedIncomes = updatedIncomes.filter((inc) => inc.studentId === data.id);
        batchSeedToFirestore(COLLECTIONS.INCOMES, affectedIncomes).catch(console.error);
      }

      // 4. Cascade Update to User Accounts (Student portal login)
      const updatedUsers = users.map((u) => {
        if (u.linkedStudentId === data.id || u.code === studentObj.code || (u.role === 'siswa' && u.code === data.code)) {
          return {
            ...u,
            name: data.name,
            code: data.code,
            username: data.code.toLowerCase(),
            linkedStudentId: data.id,
          };
        }
        return u;
      });
      const hasUserChanges = updatedUsers.some((u, idx) => u !== users[idx]);
      if (hasUserChanges) {
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
        const affectedUsers = updatedUsers.filter((u) => u.linkedStudentId === data.id || u.code === data.code);
        batchSeedToFirestore(COLLECTIONS.USERS, affectedUsers).catch(console.error);
      }

      if (prevStudent) {
        pushUndoAction({
          id: `undo-std-edit-${Date.now()}`,
          title: `Perbarui Siswa: ${data.name} (${data.code})`,
          category: 'student',
          timestamp: Date.now(),
          undo: async () => {
            setStudents(prevStudentsList);
            saveStudents(prevStudentsList);
            await syncDocToFirestore(COLLECTIONS.STUDENTS, data.id!, prevStudent);

            setAttendance(prevAttendanceList);
            saveAttendance(prevAttendanceList);
            const affectedAttendance = prevAttendanceList.filter((a) => a.studentId === data.id);
            if (affectedAttendance.length > 0) {
              await batchSeedToFirestore(COLLECTIONS.ATTENDANCE, affectedAttendance);
            }

            setIncomes(prevIncomesList);
            saveIncomes(prevIncomesList);
            const affectedIncomes = prevIncomesList.filter((inc) => inc.studentId === data.id);
            if (affectedIncomes.length > 0) {
              await batchSeedToFirestore(COLLECTIONS.INCOMES, affectedIncomes);
            }

            setUsers(prevUsersList);
            saveUsers(prevUsersList);
            const affectedUsers = prevUsersList.filter((u) => u.linkedStudentId === data.id || u.code === data.code);
            if (affectedUsers.length > 0) {
              await batchSeedToFirestore(COLLECTIONS.USERS, affectedUsers);
            }
          },
          redo: async () => {
            handleSaveStudent(data);
          },
        });
      } else {
        showToast(`Data siswa "${data.name}" dan seluruh presensi/keuangan berhasil disinkronkan!`);
      }
    } else {
      // Add
      const newStudent: Student = {
        ...data,
        id: `std-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newStudent, ...students];
      setStudents(updated);
      saveStudents(updated);
      syncDocToFirestore(COLLECTIONS.STUDENTS, newStudent.id, newStudent).catch(console.error);

      pushUndoAction({
        id: `undo-std-add-${newStudent.id}`,
        title: `Tambah Siswa: ${newStudent.name} (${newStudent.code})`,
        category: 'student',
        timestamp: Date.now(),
        undo: async () => {
          setStudents((prev) => {
            const reverted = prev.filter((s) => s.id !== newStudent.id);
            saveStudents(reverted);
            return reverted;
          });
          await deleteDocFromFirestore(COLLECTIONS.STUDENTS, newStudent.id);
        },
        redo: async () => {
          setStudents((prev) => {
            const restored = [newStudent, ...prev];
            saveStudents(restored);
            return restored;
          });
          await syncDocToFirestore(COLLECTIONS.STUDENTS, newStudent.id, newStudent);
        },
      });
    }
  };

  const handleDeleteStudent = (studentOrId: Student | string, customName?: string) => {
    const id = typeof studentOrId === 'string' ? studentOrId : studentOrId.id;
    const target = typeof studentOrId === 'object' ? studentOrId : students.find((s) => s.id === id);
    const itemName = customName || (target ? `${target.name} (${target.code})` : 'Data Siswa');

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Data Siswa',
      message: 'Apakah Anda yakin ingin menghapus data siswa ini? Semua histori presensi terkait akan tetap tersimpan.',
      itemName,
      onConfirm: async () => {
        const updated = students.filter((s) => s.id !== id);
        setStudents(updated);
        saveStudents(updated);
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDocFromFirestore(COLLECTIONS.STUDENTS, id);
        } catch (err) {
          console.error('Gagal menghapus siswa dari Firestore:', err);
        }

        if (target) {
          pushUndoAction({
            id: `undo-std-del-${target.id}-${Date.now()}`,
            title: `Hapus Siswa: ${target.name} (${target.code})`,
            category: 'student',
            timestamp: Date.now(),
            undo: async () => {
              setStudents((prev) => {
                const restored = [target, ...prev];
                saveStudents(restored);
                return restored;
              });
              await syncDocToFirestore(COLLECTIONS.STUDENTS, target.id, target);
            },
            redo: async () => {
              setStudents((prev) => {
                const filtered = prev.filter((s) => s.id !== target.id);
                saveStudents(filtered);
                return filtered;
              });
              await deleteDocFromFirestore(COLLECTIONS.STUDENTS, target.id);
            },
          });
        } else {
          showToast(`Siswa "${itemName}" telah berhasil dihapus.`);
        }
      },
    });
  };

  const handleResetToScreenshotStudents = () => {
    setDeleteDialog({
      isOpen: true,
      title: 'Perbarui Seluruh Database Siswa',
      message: 'Apakah Anda ingin memperbarui seluruh database siswa menjadi 25 siswa lengkap sesuai daftar yang telah diinput (Naureen, Kia, Brian, Gyo, Abi, Silvia, Geo, Elvano, Kaysa, Agan, Dolken, Rara, Kaila, Debi, Tasya, Bella, Raja, Aura, Naila, Rangga, Juna, Agha, Zidane, Valen, Athar)?',
      itemName: '25 Data Siswa Bimbel',
      onConfirm: async () => {
        setStudents(INITIAL_STUDENTS);
        saveStudents(INITIAL_STUDENTS);
        setUsers(DEFAULT_ACCOUNTS);
        saveUsers(DEFAULT_ACCOUNTS);
        try {
          await replaceAllInCollection(COLLECTIONS.STUDENTS, INITIAL_STUDENTS);
          await replaceAllInCollection(COLLECTIONS.USERS, DEFAULT_ACCOUNTS);
        } catch (err) {
          console.error('Error syncing 25 students to cloud:', err);
        }
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('Database 25 siswa berhasil diperbarui & disinkronkan!');
      },
    });
  };

  // --- Handlers: Prospective Students (PPDB) ---
  const handleSaveProspectiveStudent = (data: ProspectiveStudent) => {
    const existing = prospectiveStudents.find((p) => p.id === data.id);
    if (existing) {
      const updated = prospectiveStudents.map((p) => (p.id === data.id ? data : p));
      setProspectiveStudents(updated);
      saveProspectiveStudents(updated);
      syncDocToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, data.id, data).catch(console.error);

      pushUndoAction({
        id: `undo-prosp-edit-${data.id}-${Date.now()}`,
        title: `Ubah Calon Siswa: ${existing.studentName}`,
        category: 'ppdb',
        timestamp: Date.now(),
        undo: async () => {
          setProspectiveStudents((prev) => {
            const reverted = prev.map((p) => (p.id === existing.id ? existing : p));
            saveProspectiveStudents(reverted);
            return reverted;
          });
          await syncDocToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, existing.id, existing);
        },
        redo: async () => {
          handleSaveProspectiveStudent(data);
        },
      });
    } else {
      const newProspective: ProspectiveStudent = {
        ...data,
        id: data.id || `prosp-${Date.now()}`,
        registrationDate: data.registrationDate || getTodayDateString(),
        createdAt: data.createdAt || new Date().toISOString(),
      };
      const updated = [newProspective, ...prospectiveStudents];
      setProspectiveStudents(updated);
      saveProspectiveStudents(updated);
      syncDocToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, newProspective.id, newProspective).catch(console.error);

      pushUndoAction({
        id: `undo-prosp-add-${newProspective.id}`,
        title: `Daftar Calon Siswa: ${newProspective.studentName}`,
        category: 'ppdb',
        timestamp: Date.now(),
        undo: async () => {
          setProspectiveStudents((prev) => {
            const reverted = prev.filter((p) => p.id !== newProspective.id);
            saveProspectiveStudents(reverted);
            return reverted;
          });
          await deleteDocFromFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, newProspective.id);
        },
        redo: async () => {
          setProspectiveStudents((prev) => {
            const restored = [newProspective, ...prev];
            saveProspectiveStudents(restored);
            return restored;
          });
          await syncDocToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, newProspective.id, newProspective);
        },
      });
    }
  };

  const handleDeleteProspectiveStudent = (prospectiveOrId: ProspectiveStudent | string, customName?: string) => {
    const id = typeof prospectiveOrId === 'string' ? prospectiveOrId : prospectiveOrId.id;
    const target = typeof prospectiveOrId === 'object' ? prospectiveOrId : prospectiveStudents.find((p) => p.id === id);
    const itemName = customName || (target ? `${target.studentName} (${target.registrationNumber})` : 'Data Calon Siswa');

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Data Calon Siswa (PPDB)',
      message: 'Apakah Anda yakin ingin menghapus data calon siswa ini dari daftar pendaftaran PPDB?',
      itemName,
      onConfirm: async () => {
        const updated = prospectiveStudents.filter((p) => p.id !== id);
        setProspectiveStudents(updated);
        saveProspectiveStudents(updated);
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteDocFromFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, id);
        } catch (err) {
          console.error('Gagal menghapus calon siswa dari Firestore:', err);
        }

        if (target) {
          pushUndoAction({
            id: `undo-prosp-del-${target.id}-${Date.now()}`,
            title: `Hapus Calon Siswa: ${target.studentName}`,
            category: 'ppdb',
            timestamp: Date.now(),
            undo: async () => {
              setProspectiveStudents((prev) => {
                const restored = [target, ...prev];
                saveProspectiveStudents(restored);
                return restored;
              });
              await syncDocToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, target.id, target);
            },
            redo: async () => {
              setProspectiveStudents((prev) => {
                const reverted = prev.filter((p) => p.id !== target.id);
                saveProspectiveStudents(reverted);
                return reverted;
              });
              await deleteDocFromFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, target.id);
            },
          });
        } else {
          showToast(`Data pendaftar "${itemName}" telah dihapus.`);
        }
      },
    });
  };

  const handleConvertToStudent = (newStudent: Student, updatedProspective: ProspectiveStudent) => {
    // 1. Identify if student already exists by ID, or by convertedStudentId, or by Code, or by exact Name + Phone
    const existingIndex = students.findIndex(
      (s) =>
        s.id === newStudent.id ||
        (updatedProspective.convertedStudentId && s.id === updatedProspective.convertedStudentId) ||
        s.code.toUpperCase() === newStudent.code.toUpperCase() ||
        (s.name.trim().toLowerCase() === newStudent.name.trim().toLowerCase() &&
          s.parentPhone.replace(/\D/g, '') === newStudent.parentPhone.replace(/\D/g, '') &&
          newStudent.parentPhone.trim().length > 5)
    );

    let updatedStudentsList: Student[];
    let finalStudent: Student;

    if (existingIndex !== -1) {
      const existing = students[existingIndex];
      finalStudent = {
        ...existing,
        ...newStudent,
        id: existing.id,
        status: 'Aktif',
      };
      updatedStudentsList = students.map((s, idx) => (idx === existingIndex ? finalStudent : s));
    } else {
      finalStudent = newStudent;
      updatedStudentsList = [newStudent, ...students];
    }

    setStudents(updatedStudentsList);
    saveStudents(updatedStudentsList);
    syncDocToFirestore(COLLECTIONS.STUDENTS, finalStudent.id, finalStudent).catch(console.error);

    // 2. Auto-create or update student portal account
    const existingAcc = users.find(
      (u) =>
        u.linkedStudentId === finalStudent.id ||
        u.username.toLowerCase() === finalStudent.code.toLowerCase()
    );
    if (!existingAcc) {
      const newStudentAccount: UserAccount = {
        id: `usr-${finalStudent.id}`,
        username: finalStudent.code.toLowerCase(),
        password: '123',
        name: finalStudent.name,
        role: 'siswa',
        code: finalStudent.code,
        linkedStudentId: finalStudent.id,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const updatedUsersList = sortUsersByRole([newStudentAccount, ...users]);
      setUsers(updatedUsersList);
      saveUsers(updatedUsersList);
      syncDocToFirestore(COLLECTIONS.USERS, newStudentAccount.id, newStudentAccount).catch(console.error);
    } else {
      const updatedAccount: UserAccount = {
        ...existingAcc,
        name: finalStudent.name,
        code: finalStudent.code,
        username: finalStudent.code.toLowerCase(),
        isActive: true,
      };
      const updatedUsersList = users.map((u) => (u.id === existingAcc.id ? updatedAccount : u));
      setUsers(updatedUsersList);
      saveUsers(updatedUsersList);
      syncDocToFirestore(COLLECTIONS.USERS, updatedAccount.id, updatedAccount).catch(console.error);
    }

    // 3. Update prospective student record with status 'Diterima' and linked student ID & Code
    const finalizedProspective: ProspectiveStudent = {
      ...updatedProspective,
      status: 'Diterima',
      convertedStudentId: finalStudent.id,
      convertedStudentCode: finalStudent.code,
    };

    const updatedProspList = prospectiveStudents.map((p) =>
      p.id === finalizedProspective.id ? finalizedProspective : p
    );
    setProspectiveStudents(updatedProspList);
    saveProspectiveStudents(updatedProspList);
    syncDocToFirestore(COLLECTIONS.PROSPECTIVE_STUDENTS, finalizedProspective.id, finalizedProspective).catch(console.error);

    showToast(
      existingIndex !== -1
        ? `✨ Data ${finalStudent.name} (${finalStudent.code}) di Database Siswa berhasil disinkronkan!`
        : `🎉 ${finalStudent.name} (${finalStudent.code}) resmi diterima menjadi Siswa Bimbel Sigma! Akun login: @${finalStudent.code.toLowerCase()} (Pass: 123)`
    );
  };

  const handleResetProspectiveMockData = () => {
    setDeleteDialog({
      isOpen: true,
      title: 'Reset Data Pendaftar PPDB ke Contoh Awal',
      message: 'Apakah Anda ingin me-reset daftar calon siswa ke data contoh awal?',
      itemName: 'Mock Data PPDB',
      onConfirm: async () => {
        setProspectiveStudents(INITIAL_PROSPECTIVE_STUDENTS);
        saveProspectiveStudents(INITIAL_PROSPECTIVE_STUDENTS);
        try {
          await replaceAllInCollection(COLLECTIONS.PROSPECTIVE_STUDENTS, INITIAL_PROSPECTIVE_STUDENTS);
        } catch (e) {
          console.error(e);
        }
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('Data PPDB berhasil di-reset ke data contoh awal!');
      },
    });
  };

  // --- Handlers: Attendance CRUD ---
  const handleOpenAttendanceModal = (recordToEdit?: AttendanceRecord) => {
    setEditingAttendance(recordToEdit);
    setIsAttendanceModalOpen(true);
  };

  // Helper to reliably match an existing attendance record for a student on a specific date
  const findMatchingAttendanceRecord = (
    records: AttendanceRecord[],
    studentInfo: { id?: string; code?: string; name?: string },
    date: string
  ): AttendanceRecord | undefined => {
    const sId = (studentInfo.id || '').trim();
    const sCode = (studentInfo.code || '').trim().toUpperCase();
    const sName = (studentInfo.name || '').trim().toLowerCase();

    return records.find((a) => {
      if (a.date !== date) return false;
      if (sId && a.studentId && a.studentId.trim() === sId) return true;
      if (sCode && a.studentCode && a.studentCode.trim().toUpperCase() === sCode) return true;
      if (sName && a.studentName && a.studentName.trim().toLowerCase() === sName) return true;
      return false;
    });
  };

  const handleSaveAttendance = (
    data: Omit<AttendanceRecord, 'id' | 'createdAt'> & { id?: string; recordedBy?: string; recordedByRole?: UserRole | 'system' }
  ) => {
    const creatorLabel = currentUser
      ? `${currentUser.name} (${currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'tutor' ? 'Tutor' : 'Siswa'})`
      : 'Sistem Bimbel';
    const modifierLabel = creatorLabel;

    if (data.id) {
      const existing = attendance.find((a) => a.id === data.id);
      const updatedRecord: AttendanceRecord = {
        ...(existing || {}),
        ...data,
        id: data.id,
        createdAt: existing?.createdAt || new Date().toISOString(),
        recordedBy: existing?.recordedBy || data.recordedBy || creatorLabel,
        recordedByRole: existing?.recordedByRole || data.recordedByRole || currentUser?.role || 'system',
        lastModifiedBy: modifierLabel,
        lastModifiedAt: new Date().toISOString(),
      };
      const updated = attendance.map((a) => (a.id === data.id ? updatedRecord : a));
      setAttendance(updated);
      saveAttendance(updated);
      syncDocToFirestore(COLLECTIONS.ATTENDANCE, data.id, updatedRecord).catch(console.error);

      if (existing) {
        pushUndoAction({
          id: `undo-att-edit-${updatedRecord.id}-${Date.now()}`,
          title: `Ubah Presensi: ${data.studentName} (${data.date})`,
          category: 'attendance',
          timestamp: Date.now(),
          undo: async () => {
            setAttendance((prev) => {
              const reverted = prev.map((a) => (a.id === existing.id ? existing : a));
              saveAttendance(reverted);
              return reverted;
            });
            await syncDocToFirestore(COLLECTIONS.ATTENDANCE, existing.id, existing);
          },
          redo: async () => {
            handleSaveAttendance(data);
          },
        });
      } else {
        showToast(`Data presensi "${data.studentName}" berhasil diperbarui.`);
      }
    } else {
      // Prevent double attendance on the same date
      const existing = findMatchingAttendanceRecord(
        attendance,
        { id: data.studentId, code: data.studentCode, name: data.studentName },
        data.date
      );

      if (existing) {
        const updatedRecord: AttendanceRecord = {
          ...existing,
          ...data,
          id: existing.id,
          recordedBy: existing.recordedBy || creatorLabel,
          recordedByRole: existing.recordedByRole || currentUser?.role || 'system',
          lastModifiedBy: modifierLabel,
          lastModifiedAt: new Date().toISOString(),
        };
        const updated = attendance.map((a) => (a.id === existing.id ? updatedRecord : a));
        setAttendance(updated);
        saveAttendance(updated);
        syncDocToFirestore(COLLECTIONS.ATTENDANCE, existing.id, updatedRecord).catch(console.error);

        pushUndoAction({
          id: `undo-att-edit-${existing.id}-${Date.now()}`,
          title: `Ubah Presensi: ${data.studentName} (${data.date})`,
          category: 'attendance',
          timestamp: Date.now(),
          undo: async () => {
            setAttendance((prev) => {
              const reverted = prev.map((a) => (a.id === existing.id ? existing : a));
              saveAttendance(reverted);
              return reverted;
            });
            await syncDocToFirestore(COLLECTIONS.ATTENDANCE, existing.id, existing);
          },
          redo: async () => {
            handleSaveAttendance(data);
          },
        });
      } else {
        const newRecord: AttendanceRecord = {
          ...data,
          id: `att-${Date.now()}`,
          createdAt: new Date().toISOString(),
          recordedBy: data.recordedBy || creatorLabel,
          recordedByRole: data.recordedByRole || currentUser?.role || 'system',
        };
        const updated = [newRecord, ...attendance];
        setAttendance(updated);
        saveAttendance(updated);
        syncDocToFirestore(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord).catch(console.error);

        pushUndoAction({
          id: `undo-att-add-${newRecord.id}`,
          title: `Catat Presensi: ${newRecord.studentName} [${newRecord.status}]`,
          category: 'attendance',
          timestamp: Date.now(),
          undo: async () => {
            setAttendance((prev) => {
              const reverted = prev.filter((a) => a.id !== newRecord.id);
              saveAttendance(reverted);
              return reverted;
            });
            await deleteDocFromFirestore(COLLECTIONS.ATTENDANCE, newRecord.id);
          },
          redo: async () => {
            setAttendance((prev) => {
              const restored = [newRecord, ...prev];
              saveAttendance(restored);
              return restored;
            });
            await syncDocToFirestore(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord);
          },
        });
      }
    }
  };

  const handleBatchAttendance = (newRecords: Omit<AttendanceRecord, 'id' | 'createdAt'>[]) => {
    const creatorLabel = currentUser
      ? `${currentUser.name} (${currentUser.role === 'owner' ? 'Owner' : 'Tutor'})`
      : 'Tutor Bimbel';
    const modifierLabel = creatorLabel;

    setAttendance((prevAttendance) => {
      let currentList = [...prevAttendance];
      const recordsToSync: AttendanceRecord[] = [];

      newRecords.forEach((item, i) => {
        const existing = findMatchingAttendanceRecord(
          currentList,
          { id: item.studentId, code: item.studentCode, name: item.studentName },
          item.date
        );

        if (existing) {
          const updatedRecord: AttendanceRecord = {
            ...existing,
            ...item,
            id: existing.id,
            recordedBy: existing.recordedBy || creatorLabel,
            recordedByRole: existing.recordedByRole || currentUser?.role || 'tutor',
            lastModifiedBy: modifierLabel,
            lastModifiedAt: new Date().toISOString(),
          };
          currentList = currentList.map((a) => (a.id === existing.id ? updatedRecord : a));
          recordsToSync.push(updatedRecord);
        } else {
          const newRecord: AttendanceRecord = {
            ...item,
            id: `att-${Date.now()}-${i}`,
            createdAt: new Date().toISOString(),
            recordedBy: creatorLabel,
            recordedByRole: currentUser?.role || 'tutor',
          };
          currentList = [newRecord, ...currentList];
          recordsToSync.push(newRecord);
        }
      });

      saveAttendance(currentList);
      batchSeedToFirestore(COLLECTIONS.ATTENDANCE, recordsToSync).catch(console.error);
      showToast(`Presensi batch ${newRecords.length} siswa berhasil diproses tanpa duplikasi!`);
      return currentList;
    });
  };

  const handleSelfAttendance = (
    student: Student,
    topic: string,
    notes: string,
    time: string,
    tutorName?: string
  ) => {
    const todayStr = getTodayDateString();
    const effectiveTutor = tutorName || student.tutorName || settings.ownerName || 'Nanik Susilowati, M.Pd';
    const selfCreatorLabel = `${student.name} (Mandiri Portal)`;

    setAttendance((prevAttendance) => {
      const existing = findMatchingAttendanceRecord(prevAttendance, student, todayStr);

      if (existing) {
        const updatedRecord: AttendanceRecord = {
          ...existing,
          time,
          status: 'Hadir' as const,
          topic: topic || existing.topic,
          tutorNotes: notes ? `[Siswa]: ${notes}` : existing.tutorNotes,
          tutorName: effectiveTutor,
          recordedBy: existing.recordedBy || selfCreatorLabel,
          recordedByRole: existing.recordedByRole || 'siswa',
          lastModifiedBy: selfCreatorLabel,
          lastModifiedAt: new Date().toISOString(),
        };
        const updated = prevAttendance.map((a) => (a.id === existing.id ? updatedRecord : a));
        saveAttendance(updated);
        syncDocToFirestore(COLLECTIONS.ATTENDANCE, existing.id, updatedRecord).catch(console.error);
        showToast(`Absen mandiri ${student.name} diperbarui pada pukul ${time}`);
        return updated;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-self-${Date.now()}`,
          date: todayStr,
          time,
          studentId: student.id,
          studentCode: student.code,
          studentName: student.name,
          classType: student.classType,
          status: 'Hadir',
          topic: topic || 'Belajar Mandiri & Pendalaman Materi',
          tutorNotes: notes ? `[Absen Mandiri Siswa]: ${notes}` : 'Hadir mandiri melalui portal siswa',
          tutorName: effectiveTutor,
          createdAt: new Date().toISOString(),
          recordedBy: selfCreatorLabel,
          recordedByRole: 'siswa',
        };
        const updated = [newRecord, ...prevAttendance];
        saveAttendance(updated);
        syncDocToFirestore(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord).catch(console.error);
        showToast(`Berhasil Absen Masuk! Data tersimpan di Cloud.`);
        return updated;
      }
    });
  };

  const handleQRScanAttendance = (
    student: Student,
    topic: string,
    notes: string,
    time: string
  ) => {
    const todayStr = getTodayDateString();
    const effectiveTutor = currentUser?.name || student.tutorName || settings.ownerName || 'Nanik Susilowati, M.Pd';
    const cleanTime = time || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const qrCreatorLabel = currentUser
      ? `${currentUser.name} (Scan QR)`
      : `${student.name} (Scan QR)`;
    const qrCreatorRole = currentUser?.role || 'siswa';

    setAttendance((prevAttendance) => {
      const existing = findMatchingAttendanceRecord(prevAttendance, student, todayStr);

      if (existing) {
        const updatedRecord: AttendanceRecord = {
          ...existing,
          time: cleanTime,
          status: 'Hadir',
          topic: topic || existing.topic,
          tutorNotes: notes ? `[Scan QR]: ${notes}` : (existing.tutorNotes || 'Presensi via Scan QR Pelajar'),
          tutorName: effectiveTutor,
          recordedBy: existing.recordedBy || qrCreatorLabel,
          recordedByRole: existing.recordedByRole || qrCreatorRole,
          lastModifiedBy: qrCreatorLabel,
          lastModifiedAt: new Date().toISOString(),
        };
        const updated = prevAttendance.map((a) => (a.id === existing.id ? updatedRecord : a));
        saveAttendance(updated);
        syncDocToFirestore(COLLECTIONS.ATTENDANCE, existing.id, updatedRecord).catch(console.error);
        showToast(`Presensi ${student.name} diperbarui pukul ${cleanTime}`);
        return updated;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-qr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          date: todayStr,
          time: cleanTime,
          studentId: student.id,
          studentCode: student.code,
          studentName: student.name,
          classType: student.classType,
          status: 'Hadir',
          topic: topic || 'Bimbingan Belajar & Latihan Soal Harian',
          tutorNotes: notes ? `[Scan QR Presensi]: ${notes}` : 'Presensi via Scan QR Pelajar',
          tutorName: effectiveTutor,
          createdAt: new Date().toISOString(),
          recordedBy: qrCreatorLabel,
          recordedByRole: qrCreatorRole,
        };
        const updated = [newRecord, ...prevAttendance];
        saveAttendance(updated);
        syncDocToFirestore(COLLECTIONS.ATTENDANCE, newRecord.id, newRecord).catch(console.error);
        showToast(`✅ Absen Hadir: ${student.name} (${student.code}) pukul ${newRecord.time}`);
        return updated;
      }
    });
  };

  // Helper to purge any legacy duplicate attendance records across the system
  const handleDeduplicateAttendance = () => {
    setAttendance((prevAttendance) => {
      const { cleanList, removedCount } = deduplicateAttendanceList(prevAttendance);
      if (removedCount > 0) {
        saveAttendance(cleanList);
        replaceAllInCollection(COLLECTIONS.ATTENDANCE, cleanList).catch(console.error);
        showToast(`Berhasil membersihkan ${removedCount} data presensi ganda/duplikat!`);
      } else {
        showToast('Tidak ada data presensi ganda yang ditemukan.');
      }
      return cleanList;
    });
  };

  const handleDeleteAttendance = (recordOrId: AttendanceRecord | string, customName?: string) => {
    const id = typeof recordOrId === 'string' ? recordOrId : recordOrId.id;
    const target = typeof recordOrId === 'object' ? recordOrId : attendance.find((a) => a.id === id);
    const itemName = customName || (target ? `${target.studentName} - Tanggal ${target.date} (${target.status})` : 'Data Presensi');

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Log Presensi',
      message: 'Apakah Anda yakin ingin menghapus data presensi ini?',
      itemName,
      onConfirm: () => {
        const updated = attendance.filter((a) => a.id !== id);
        setAttendance(updated);
        saveAttendance(updated);
        deleteDocFromFirestore(COLLECTIONS.ATTENDANCE, id).catch(console.error);
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));

        if (target) {
          pushUndoAction({
            id: `undo-att-del-${target.id}-${Date.now()}`,
            title: `Hapus Presensi: ${target.studentName} (${target.date})`,
            category: 'attendance',
            timestamp: Date.now(),
            undo: async () => {
              setAttendance((prev) => {
                const restored = [target, ...prev];
                saveAttendance(restored);
                return restored;
              });
              await syncDocToFirestore(COLLECTIONS.ATTENDANCE, target.id, target);
            },
            redo: async () => {
              setAttendance((prev) => {
                const reverted = prev.filter((a) => a.id !== target.id);
                saveAttendance(reverted);
                return reverted;
              });
              await deleteDocFromFirestore(COLLECTIONS.ATTENDANCE, target.id);
            },
          });
        } else {
          showToast(`Log presensi "${itemName}" berhasil dihapus.`);
        }
      },
    });
  };

  // --- Handlers: Incomes (SPP) CRUD ---
  const handleOpenIncomeModal = (recordToEdit?: IncomeRecord) => {
    setEditingIncome(recordToEdit);
    setIsIncomeModalOpen(true);
  };

  const handleSaveIncome = (
    data: Omit<IncomeRecord, 'id' | 'createdAt'> & { id?: string }
  ) => {
    const rawCat = data.category || (data.incomeCategory === 'registration' ? 'Biaya Pendaftaran / Registrasi' : getSystemSppCategory(settings));
    const normalizedCategory = normalizeIncomeCategory(rawCat, settings);
    const dateStr = data.datePaid || getTodayDateString();
    const rawNum = data.receiptNumber || generateIncomeReceiptNumber(incomes, dateStr);
    const normalizedReceiptNumber = normalizeIncomeReceiptNumber(rawNum, dateStr);

    if (data.id) {
      const prevIncome = incomes.find((i) => i.id === data.id);
      const updated = incomes.map((inc) => (inc.id === data.id ? { ...inc, ...data, category: normalizedCategory as any, receiptNumber: normalizedReceiptNumber } : inc));
      setIncomes(updated);
      saveIncomes(updated);
      const targetObj = updated.find((i) => i.id === data.id)!;
      syncDocToFirestore(COLLECTIONS.INCOMES, data.id, targetObj).catch(console.error);

      if (prevIncome) {
        pushUndoAction({
          id: `undo-inc-edit-${data.id}-${Date.now()}`,
          title: `Ubah Kas Masuk: ${prevIncome.studentName || prevIncome.sourceName} (${formatRupiah(data.amount)})`,
          category: 'income',
          timestamp: Date.now(),
          undo: async () => {
            setIncomes((prev) => {
              const reverted = prev.map((i) => (i.id === prevIncome.id ? prevIncome : i));
              saveIncomes(reverted);
              return reverted;
            });
            await syncDocToFirestore(COLLECTIONS.INCOMES, prevIncome.id, prevIncome);
          },
          redo: async () => {
            handleSaveIncome(data);
          },
        });
      } else {
        showToast(`Pencatatan kas masuk "${data.studentName || data.sourceName}" berhasil diperbarui.`);
      }
    } else {
      const newIncome: IncomeRecord = {
        ...data,
        category: normalizedCategory as any,
        receiptNumber: normalizedReceiptNumber,
        id: `inc-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newIncome, ...incomes];
      setIncomes(updated);
      saveIncomes(updated);
      syncDocToFirestore(COLLECTIONS.INCOMES, newIncome.id, newIncome).catch(console.error);

      // Auto top up student quota if buying session pack
      if (data.incomeCategory === 'session_pack' && data.studentId && data.sessionsCount) {
        const targetStudent = students.find((s) => s.id === data.studentId);
        if (targetStudent) {
          const currentQuota = targetStudent.sessionQuota || 0;
          const currentRemaining = targetStudent.remainingSessions !== undefined ? targetStudent.remainingSessions : currentQuota;
          const updatedStudent: Student = {
            ...targetStudent,
            packageType: 'session_pack',
            sessionQuota: currentQuota + data.sessionsCount,
            remainingSessions: currentRemaining + data.sessionsCount,
          };
          const updatedStudentsList = students.map((s) => (s.id === targetStudent.id ? updatedStudent : s));
          setStudents(updatedStudentsList);
          saveStudents(updatedStudentsList);
          syncDocToFirestore(COLLECTIONS.STUDENTS, updatedStudent.id, updatedStudent).catch(console.error);
        }
      }

      pushUndoAction({
        id: `undo-inc-add-${newIncome.id}`,
        title: `Kas Masuk: ${newIncome.studentName || newIncome.sourceName} (${formatRupiah(newIncome.amount)})`,
        category: 'income',
        timestamp: Date.now(),
        undo: async () => {
          setIncomes((prev) => {
            const reverted = prev.filter((i) => i.id !== newIncome.id);
            saveIncomes(reverted);
            return reverted;
          });
          await deleteDocFromFirestore(COLLECTIONS.INCOMES, newIncome.id);
          if (data.incomeCategory === 'session_pack' && data.studentId && data.sessionsCount) {
            const targetStudent = students.find((s) => s.id === data.studentId);
            if (targetStudent) {
              const revertedStudent: Student = {
                ...targetStudent,
                sessionQuota: Math.max(0, (targetStudent.sessionQuota || 0) - data.sessionsCount),
                remainingSessions: Math.max(0, (targetStudent.remainingSessions || 0) - data.sessionsCount),
              };
              setStudents((prev) => {
                const list = prev.map((s) => (s.id === targetStudent.id ? revertedStudent : s));
                saveStudents(list);
                return list;
              });
              await syncDocToFirestore(COLLECTIONS.STUDENTS, revertedStudent.id, revertedStudent);
            }
          }
        },
        redo: async () => {
          setIncomes((prev) => {
            const restored = [newIncome, ...prev];
            saveIncomes(restored);
            return restored;
          });
          await syncDocToFirestore(COLLECTIONS.INCOMES, newIncome.id, newIncome);
        },
      });

      setReceiptIncome(newIncome);
    }
  };

  const handleRecordStudentPayment = (paymentData: {
    student: Student;
    month: number;
    year: number;
    amount: number;
    originalAmount?: number;
    discountType?: 'percentage' | 'nominal';
    discountValue?: number;
    discountAmount?: number;
    discountReason?: string;
    totalBill: number;
    remainingBill: number;
    sessionsCount: number;
    paymentMethod: string;
    datePaid: string;
    notes?: string;
    autoOpenReceipt?: boolean;
  }) => {
    const receiptNum = generateIncomeReceiptNumber(incomes, paymentData.datePaid);
    const activeSppCategory = getSystemSppCategory(settings);
    const newIncome: IncomeRecord = {
      id: `inc-${Date.now()}`,
      datePaid: paymentData.datePaid,
      category: activeSppCategory as any,
      incomeCategory: 'spp_monthly',
      accrualMonth: paymentData.month,
      accrualYear: paymentData.year,
      studentId: paymentData.student.id,
      studentCode: paymentData.student.code,
      studentName: paymentData.student.name,
      amount: paymentData.amount,
      originalAmount: paymentData.originalAmount,
      discountType: paymentData.discountType,
      discountValue: paymentData.discountValue,
      discountAmount: paymentData.discountAmount,
      discountReason: paymentData.discountReason,
      totalBill: paymentData.totalBill,
      remainingBill: paymentData.remainingBill,
      paymentStatus: paymentData.remainingBill === 0 ? 'Lunas' : 'Cicilan',
      sessionsCount: paymentData.sessionsCount,
      paymentMethod: paymentData.paymentMethod,
      receiptNumber: receiptNum,
      notes: paymentData.notes || `Pembayaran Iuran Les Periode ${getMonthNameIndo(paymentData.month)} ${paymentData.year} (${paymentData.sessionsCount} Sesi)`,
      receivedBy: currentUser?.name || settings.ownerName || 'Petugas Kasir',
      createdAt: new Date().toISOString(),
    };

    const updated = [newIncome, ...incomes];
    setIncomes(updated);
    saveIncomes(updated);
    syncDocToFirestore(COLLECTIONS.INCOMES, newIncome.id, newIncome).catch(console.error);

    pushUndoAction({
      id: `undo-inc-pay-${newIncome.id}`,
      title: `Pembayaran Les: ${paymentData.student.name} (${formatRupiah(paymentData.amount)})`,
      category: 'income',
      timestamp: Date.now(),
      undo: async () => {
        setIncomes((prev) => {
          const reverted = prev.filter((i) => i.id !== newIncome.id);
          saveIncomes(reverted);
          return reverted;
        });
        await deleteDocFromFirestore(COLLECTIONS.INCOMES, newIncome.id);
      },
      redo: async () => {
        setIncomes((prev) => {
          const restored = [newIncome, ...prev];
          saveIncomes(restored);
          return restored;
        });
        await syncDocToFirestore(COLLECTIONS.INCOMES, newIncome.id, newIncome);
      },
    });

    if (paymentData.autoOpenReceipt) {
      setReceiptIncome(newIncome);
    }
  };

  const handleDeleteIncome = (incomeOrId: IncomeRecord | string, customLabel?: string) => {
    const id = typeof incomeOrId === 'string' ? incomeOrId : incomeOrId.id;
    const target = typeof incomeOrId === 'object' ? incomeOrId : incomes.find((i) => i.id === id);
    const itemName = customLabel || (target ? `${target.receiptNumber} - ${target.studentName} (Rp ${target.amount.toLocaleString('id-ID')})` : 'Penerimaan SPP');

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Kas Masuk SPP',
      message: 'Apakah Anda yakin ingin menghapus catatan penerimaan kas SPP ini?',
      itemName,
      onConfirm: () => {
        const updated = incomes.filter((i) => i.id !== id);
        setIncomes(updated);
        saveIncomes(updated);
        deleteDocFromFirestore(COLLECTIONS.INCOMES, id).catch(console.error);
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));

        if (target) {
          pushUndoAction({
            id: `undo-inc-del-${target.id}-${Date.now()}`,
            title: `Hapus Kas Masuk: ${target.studentName || target.sourceName} (${formatRupiah(target.amount)})`,
            category: 'income',
            timestamp: Date.now(),
            undo: async () => {
              setIncomes((prev) => {
                const restored = [target, ...prev];
                saveIncomes(restored);
                return restored;
              });
              await syncDocToFirestore(COLLECTIONS.INCOMES, target.id, target);
            },
            redo: async () => {
              setIncomes((prev) => {
                const reverted = prev.filter((i) => i.id !== target.id);
                saveIncomes(reverted);
                return reverted;
              });
              await deleteDocFromFirestore(COLLECTIONS.INCOMES, target.id);
            },
          });
        } else {
          showToast(`Catatan kas masuk SPP telah dihapus.`);
        }
      },
    });
  };

  // --- Handlers: Expenses CRUD ---
  const handleOpenExpenseModal = (expenseToEdit?: ExpenseRecord) => {
    setEditingExpense(expenseToEdit);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (
    data: Omit<ExpenseRecord, 'id' | 'createdAt'> & { id?: string }
  ) => {
    const rawCat = data.category || getSystemSalaryCategory(settings);
    const normalizedCategory = normalizeExpenseCategory(rawCat, settings);
    const dateStr = data.date || getTodayDateString();
    const rawRef = data.receiptRef || generateExpenseRefNumber(expenses, dateStr);
    const normalizedRef = normalizeExpenseRefNumber(rawRef, dateStr);

    if (data.id) {
      const prevExpense = expenses.find((e) => e.id === data.id);
      const updated = expenses.map((exp) => (exp.id === data.id ? { ...exp, ...data, category: normalizedCategory as any, receiptRef: normalizedRef } : exp));
      setExpenses(updated);
      saveExpenses(updated);
      const targetObj = updated.find((e) => e.id === data.id)!;
      syncDocToFirestore(COLLECTIONS.EXPENSES, data.id, targetObj).catch(console.error);

      if (prevExpense) {
        pushUndoAction({
          id: `undo-exp-edit-${data.id}-${Date.now()}`,
          title: `Ubah Pengeluaran: ${prevExpense.title || prevExpense.description} (${formatRupiah(data.amount)})`,
          category: 'expense',
          timestamp: Date.now(),
          undo: async () => {
            setExpenses((prev) => {
              const reverted = prev.map((e) => (e.id === prevExpense.id ? prevExpense : e));
              saveExpenses(reverted);
              return reverted;
            });
            await syncDocToFirestore(COLLECTIONS.EXPENSES, prevExpense.id, prevExpense);
          },
          redo: async () => {
            handleSaveExpense(data);
          },
        });
      } else {
        showToast(`Biaya pengeluaran "${data.title || data.description}" berhasil diperbarui.`);
      }
    } else {
      const newExpense: ExpenseRecord = {
        ...data,
        category: normalizedCategory as any,
        receiptRef: normalizedRef,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      saveExpenses(updated);
      syncDocToFirestore(COLLECTIONS.EXPENSES, newExpense.id, newExpense).catch(console.error);

      pushUndoAction({
        id: `undo-exp-add-${newExpense.id}`,
        title: `Pengeluaran: ${newExpense.title || newExpense.description} (${formatRupiah(newExpense.amount)})`,
        category: 'expense',
        timestamp: Date.now(),
        undo: async () => {
          setExpenses((prev) => {
            const reverted = prev.filter((e) => e.id !== newExpense.id);
            saveExpenses(reverted);
            return reverted;
          });
          await deleteDocFromFirestore(COLLECTIONS.EXPENSES, newExpense.id);
        },
        redo: async () => {
          setExpenses((prev) => {
            const restored = [newExpense, ...prev];
            saveExpenses(restored);
            return restored;
          });
          await syncDocToFirestore(COLLECTIONS.EXPENSES, newExpense.id, newExpense);
        },
      });
    }
  };

  const handleDeleteExpense = (expenseOrId: ExpenseRecord | string, customLabel?: string) => {
    const id = typeof expenseOrId === 'string' ? expenseOrId : expenseOrId.id;
    const target = typeof expenseOrId === 'object' ? expenseOrId : expenses.find((e) => e.id === id);
    const itemName = customLabel || (target ? `${target.category} - ${target.title || target.description} (Rp ${target.amount.toLocaleString('id-ID')})` : 'Biaya Pengeluaran');

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Biaya Pengeluaran',
      message: 'Apakah Anda yakin ingin menghapus catatan biaya pengeluaran ini?',
      itemName,
      onConfirm: () => {
        const updated = expenses.filter((e) => e.id !== id);
        setExpenses(updated);
        saveExpenses(updated);
        deleteDocFromFirestore(COLLECTIONS.EXPENSES, id).catch(console.error);
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));

        if (target) {
          pushUndoAction({
            id: `undo-exp-del-${target.id}-${Date.now()}`,
            title: `Hapus Pengeluaran: ${target.title || target.description} (${formatRupiah(target.amount)})`,
            category: 'expense',
            timestamp: Date.now(),
            undo: async () => {
              setExpenses((prev) => {
                const restored = [target, ...prev];
                saveExpenses(restored);
                return restored;
              });
              await syncDocToFirestore(COLLECTIONS.EXPENSES, target.id, target);
            },
            redo: async () => {
              setExpenses((prev) => {
                const reverted = prev.filter((e) => e.id !== target.id);
                saveExpenses(reverted);
                return reverted;
              });
              await deleteDocFromFirestore(COLLECTIONS.EXPENSES, target.id);
            },
          });
        } else {
          showToast(`Biaya pengeluaran telah dihapus.`);
        }
      },
    });
  };

  // --- Handlers: User Accounts CRUD ---
  const handleOpenUserModal = (accountToEdit?: UserAccount) => {
    setEditingUser(accountToEdit);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (
    accountData: Omit<UserAccount, 'id' | 'createdAt'> & { id?: string }
  ) => {
    const cleanUsername = (accountData.username || '').trim().toLowerCase();
    const cleanName = (accountData.name || '').trim();

    // Check duplicate username across other accounts
    const duplicate = users.find(
      (u) => u.id !== accountData.id && (u.username || '').trim().toLowerCase() === cleanUsername
    );
    if (duplicate) {
      alert(
        `❌ Gagal: Username "${cleanUsername}" sudah digunakan oleh akun "${duplicate.name}" (Peran: ${duplicate.role.toUpperCase()}).\n\nSetiap akun wajib memiliki username yang unik agar login tidak tertukar.`
      );
      return;
    }

    // Check if non-owner is trying to use "owner"
    if (accountData.role !== 'owner' && cleanUsername === 'owner') {
      alert('❌ Username "owner" hanya diperuntukkan bagi akun Kepala Bimbel (Owner). Silakan gunakan username lain.');
      return;
    }

    if (accountData.id) {
      const existingUser = users.find((u) => u.id === accountData.id);
      const prevUsers = [...users];
      const prevAttendance = [...attendance];
      const prevStudents = [...students];
      const prevExpenses = [...expenses];

      const rawUpdated = users.map((u) =>
        u.id === accountData.id ? { ...u, ...accountData, username: cleanUsername, name: cleanName } : u
      );
      const updated = sortUsersByRole(rawUpdated);
      setUsers(updated);
      saveUsers(updated);
      const targetObj = updated.find((u) => u.id === accountData.id)!;
      syncDocToFirestore(COLLECTIONS.USERS, accountData.id, targetObj).catch(console.error);
      // If updating the currently logged in user, refresh session
      if (currentUser && currentUser.id === accountData.id) {
        const updatedSession = { ...currentUser, ...accountData, username: cleanUsername, name: cleanName };
        setCurrentUser(updatedSession);
        localStorage.setItem('bimbel_sigma_auth_user', JSON.stringify(updatedSession));
      }

      // If tutor name or details changed, synchronize historical records across attendance, students & expenses
      const syncRes = synchronizeTutorNames(updated, attendance, students, expenses);
      if (syncRes.attendanceChangesCount > 0) {
        setAttendance(syncRes.updatedAttendance);
        saveAttendance(syncRes.updatedAttendance);
        replaceAllInCollection(COLLECTIONS.ATTENDANCE, syncRes.updatedAttendance).catch(console.error);
      }
      if (syncRes.studentChangesCount > 0) {
        setStudents(syncRes.updatedStudents);
        saveStudents(syncRes.updatedStudents);
        replaceAllInCollection(COLLECTIONS.STUDENTS, syncRes.updatedStudents).catch(console.error);
      }
      if (syncRes.expenseChangesCount > 0) {
        setExpenses(syncRes.updatedExpenses);
        saveExpenses(syncRes.updatedExpenses);
        replaceAllInCollection(COLLECTIONS.EXPENSES, syncRes.updatedExpenses).catch(console.error);
      }

      if (existingUser) {
        pushUndoAction({
          id: `undo-user-edit-${existingUser.id}-${Date.now()}`,
          title: `Ubah Akun: @${existingUser.username} (${existingUser.name})`,
          category: 'user',
          timestamp: Date.now(),
          undo: async () => {
            setUsers(prevUsers);
            saveUsers(prevUsers);
            setAttendance(prevAttendance);
            saveAttendance(prevAttendance);
            setStudents(prevStudents);
            saveStudents(prevStudents);
            setExpenses(prevExpenses);
            saveExpenses(prevExpenses);
            await syncDocToFirestore(COLLECTIONS.USERS, existingUser.id, existingUser);
            if (currentUser && currentUser.id === existingUser.id) {
              setCurrentUser(existingUser);
              localStorage.setItem('bimbel_sigma_auth_user', JSON.stringify(existingUser));
            }
          },
          redo: async () => {
            handleSaveUser(accountData);
          },
        });
      } else {
        showToast(`Akun pengguna "${cleanName}" (@${cleanUsername}) berhasil diperbarui.`);
      }
    } else {
      const newAccount: UserAccount = {
        ...accountData,
        name: cleanName,
        username: cleanUsername,
        id: `usr-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = sortUsersByRole([newAccount, ...users]);
      setUsers(updated);
      saveUsers(updated);
      syncDocToFirestore(COLLECTIONS.USERS, newAccount.id, newAccount).catch(console.error);

      // If new tutor added, harmonize records if any
      if (newAccount.role === 'tutor') {
        const syncRes = synchronizeTutorNames(updated, attendance, students, expenses);
        if (syncRes.attendanceChangesCount > 0) {
          setAttendance(syncRes.updatedAttendance);
          saveAttendance(syncRes.updatedAttendance);
          replaceAllInCollection(COLLECTIONS.ATTENDANCE, syncRes.updatedAttendance).catch(console.error);
        }
        if (syncRes.studentChangesCount > 0) {
          setStudents(syncRes.updatedStudents);
          saveStudents(syncRes.updatedStudents);
          replaceAllInCollection(COLLECTIONS.STUDENTS, syncRes.updatedStudents).catch(console.error);
        }
      }

      pushUndoAction({
        id: `undo-user-add-${newAccount.id}`,
        title: `Buat Akun: @${newAccount.username} (${newAccount.name})`,
        category: 'user',
        timestamp: Date.now(),
        undo: async () => {
          setUsers((prev) => {
            const reverted = prev.filter((u) => u.id !== newAccount.id);
            saveUsers(reverted);
            return reverted;
          });
          await deleteDocFromFirestore(COLLECTIONS.USERS, newAccount.id);
        },
        redo: async () => {
          setUsers((prev) => {
            const restored = sortUsersByRole([newAccount, ...prev]);
            saveUsers(restored);
            return restored;
          });
          await syncDocToFirestore(COLLECTIONS.USERS, newAccount.id, newAccount);
        },
      });
    }
  };

  const handleSyncTutorNames = () => {
    const syncRes = synchronizeTutorNames(users, attendance, students, expenses);
    let totalUpdated = 0;

    if (syncRes.attendanceChangesCount > 0) {
      setAttendance(syncRes.updatedAttendance);
      saveAttendance(syncRes.updatedAttendance);
      replaceAllInCollection(COLLECTIONS.ATTENDANCE, syncRes.updatedAttendance).catch(console.error);
      totalUpdated += syncRes.attendanceChangesCount;
    }
    if (syncRes.studentChangesCount > 0) {
      setStudents(syncRes.updatedStudents);
      saveStudents(syncRes.updatedStudents);
      replaceAllInCollection(COLLECTIONS.STUDENTS, syncRes.updatedStudents).catch(console.error);
      totalUpdated += syncRes.studentChangesCount;
    }
    if (syncRes.expenseChangesCount > 0) {
      setExpenses(syncRes.updatedExpenses);
      saveExpenses(syncRes.updatedExpenses);
      replaceAllInCollection(COLLECTIONS.EXPENSES, syncRes.updatedExpenses).catch(console.error);
      totalUpdated += syncRes.expenseChangesCount;
    }

    if (totalUpdated > 0) {
      showToast(`✅ Berhasil menyinkronkan nama tutor: ${syncRes.attendanceChangesCount} presensi & ${syncRes.studentChangesCount} siswa diperbarui sesuai database akun.`);
    } else {
      showToast('ℹ️ Seluruh nama tutor di catatan presensi dan data siswa sudah sesuai dengan database akun.');
    }
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    if (currentUser && currentUser.id === userId) {
      showToast('Tidak dapat menghapus akun yang sedang Anda gunakan saat ini.');
      return;
    }

    setDeleteDialog({
      isOpen: true,
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun @${target.username} (${target.name})? Pengguna ini tidak akan bisa login lagi ke sistem.`,
      itemName: `${target.name} (@${target.username})`,
      onConfirm: () => {
        const rawUpdated = users.filter((u) => u.id !== userId);
        const updated = sortUsersByRole(rawUpdated);
        setUsers(updated);
        saveUsers(updated);
        deleteDocFromFirestore(COLLECTIONS.USERS, userId).catch(console.error);
        setDeleteDialog((prev) => ({ ...prev, isOpen: false }));

        if (target) {
          pushUndoAction({
            id: `undo-user-del-${target.id}-${Date.now()}`,
            title: `Hapus Akun: @${target.username} (${target.name})`,
            category: 'user',
            timestamp: Date.now(),
            undo: async () => {
              setUsers((prev) => {
                const restored = sortUsersByRole([target, ...prev]);
                saveUsers(restored);
                return restored;
              });
              await syncDocToFirestore(COLLECTIONS.USERS, target.id, target);
            },
            redo: async () => {
              setUsers((prev) => {
                const reverted = prev.filter((u) => u.id !== target.id);
                saveUsers(reverted);
                return reverted;
              });
              await deleteDocFromFirestore(COLLECTIONS.USERS, target.id);
            },
          });
        } else {
          showToast(`Akun @${target.username} berhasil dihapus.`);
        }
      },
    });
  };

  const handleOpenChangePasswordModal = (targetUser?: UserAccount | UserSession) => {
    setPasswordTargetUser(targetUser || currentUser || undefined);
    setIsChangePasswordModalOpen(true);
  };

  const handleSavePassword = (username: string, newPass: string) => {
    const rawUpdated = users.map((u) => (u.username === username ? { ...u, password: newPass } : u));
    const updatedUsers = sortUsersByRole(rawUpdated);
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    const targetObj = updatedUsers.find((u) => u.username === username);
    if (targetObj) {
      syncDocToFirestore(COLLECTIONS.USERS, targetObj.id, targetObj).catch(console.error);
    }

    // If changing current logged in user's password, sync session
    if (currentUser && currentUser.username === username) {
      const updatedSession = { ...currentUser, password: newPass };
      setCurrentUser(updatedSession);
      localStorage.setItem('bimbel_sigma_auth_user', JSON.stringify(updatedSession));
    }

    showToast(`Kata sandi untuk @${username} berhasil diperbarui dan tersinkronisasi.`);
  };

  // --- Handlers: Settings & Backup ---
  const handleSaveSettings = (newSettings: BimbelSettings) => {
    const prevSettings = { ...settings };
    setSettings(newSettings);
    saveSettings(newSettings);
    syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...newSettings }).catch(console.error);

    pushUndoAction({
      id: `undo-settings-${Date.now()}`,
      title: 'Ubah Pengaturan Bimbel',
      category: 'settings',
      timestamp: Date.now(),
      undo: async () => {
        setSettings(prevSettings);
        saveSettings(prevSettings);
        await syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...prevSettings });
      },
      redo: async () => {
        setSettings(newSettings);
        saveSettings(newSettings);
        await syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...newSettings });
      },
    });

    showToast('Pengaturan sistem & profil bimbel berhasil disimpan.');
  };

  // Cascade rename existing transactions when category name is edited in Settings
  const handleRenameExpenseCategory = (oldCategory: string, newCategory: string) => {
    const affectedExpenses = expenses.filter((e) => e.category === oldCategory);
    if (affectedExpenses.length > 0) {
      const updated = expenses.map((e) => (e.category === oldCategory ? { ...e, category: newCategory as any } : e));
      setExpenses(updated);
      saveExpenses(updated);
      const updatedAffected = updated.filter((e) => e.category === newCategory);
      batchSeedToFirestore(COLLECTIONS.EXPENSES, updatedAffected).catch(console.error);
      showToast(`${affectedExpenses.length} data pengeluaran di buku kas otomatis diperbarui ke kategori baru.`);
    }
  };

  const handleRenameIncomeCategory = (oldCategory: string, newCategory: string) => {
    const affectedIncomes = incomes.filter((i) => i.category === oldCategory);
    if (affectedIncomes.length > 0) {
      const updated = incomes.map((i) => (i.category === oldCategory ? { ...i, category: newCategory as any } : i));
      setIncomes(updated);
      saveIncomes(updated);
      const updatedAffected = updated.filter((i) => i.category === newCategory);
      batchSeedToFirestore(COLLECTIONS.INCOMES, updatedAffected).catch(console.error);
      showToast(`${affectedIncomes.length} data kas masuk di buku kas otomatis diperbarui ke kategori baru.`);
    }
  };

  // Harmonize all historical transactions to match current settings
  const handleHarmonizeCategories = () => {
    const activeSalaryCategory = getSystemSalaryCategory(settings);
    const activeSppCategory = getSystemSppCategory(settings);

    let expUpdatedCount = 0;
    const updatedExpenses = expenses.map((exp) => {
      const isSalaryRelated = isSystemExpenseCategory(exp.category, settings);
      if (isSalaryRelated && exp.category !== activeSalaryCategory) {
        expUpdatedCount++;
        return { ...exp, category: activeSalaryCategory as any };
      }
      return exp;
    });

    let incUpdatedCount = 0;
    const updatedIncomes = incomes.map((inc) => {
      const isSppRelated = isSystemIncomeCategory(inc.category, settings);
      if (isSppRelated && inc.category !== activeSppCategory) {
        incUpdatedCount++;
        return { ...inc, category: activeSppCategory as any };
      }
      return inc;
    });

    if (expUpdatedCount > 0) {
      setExpenses(updatedExpenses);
      saveExpenses(updatedExpenses);
      batchSeedToFirestore(COLLECTIONS.EXPENSES, updatedExpenses).catch(console.error);
    }

    if (incUpdatedCount > 0) {
      setIncomes(updatedIncomes);
      saveIncomes(updatedIncomes);
      batchSeedToFirestore(COLLECTIONS.INCOMES, updatedIncomes).catch(console.error);
    }

    const totalUpdated = expUpdatedCount + incUpdatedCount;
    if (totalUpdated > 0) {
      showToast(`✅ Berhasil menyelaraskan ${totalUpdated} data transaksi (Honor: ${expUpdatedCount}, SPP: ${incUpdatedCount}) ke master kategori aktif.`);
    } else {
      showToast('Seluruh kategori pengeluaran dan pemasukan di buku kas sudah 100% selaras.');
    }
  };

  const handleResetAllData = async () => {
    const data = resetToMockData();
    setStudents(data.students);
    setAttendance(data.attendance);
    setIncomes(data.incomes);
    setExpenses(data.expenses);
    setUsers(data.users);
    setSettings(data.settings);

    try {
      await replaceAllInCollection(COLLECTIONS.USERS, data.users);
      await replaceAllInCollection(COLLECTIONS.STUDENTS, data.students);
      await clearFirestoreCollection(COLLECTIONS.ATTENDANCE);
      await clearFirestoreCollection(COLLECTIONS.INCOMES);
      await clearFirestoreCollection(COLLECTIONS.EXPENSES);
      await syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...data.settings });
    } catch (e) {
      console.warn('Reset cloud seed error:', e);
    }

    showToast('Seluruh data demo transaksi & presensi berhasil dibersihkan.');
  };

  const handleImportFullData = async (data: {
    students: Student[];
    attendance: AttendanceRecord[];
    incomes: IncomeRecord[];
    expenses: ExpenseRecord[];
    users: UserAccount[];
    settings: BimbelSettings;
  }) => {
    const sortedUsers = sortUsersByRole(data.users || []);
    setStudents(data.students);
    setAttendance(data.attendance);
    setIncomes(data.incomes);
    setExpenses(data.expenses);
    setUsers(sortedUsers);
    setSettings(data.settings);
    saveStudents(data.students);
    saveAttendance(data.attendance);
    saveIncomes(data.incomes);
    saveExpenses(data.expenses);
    saveUsers(sortedUsers);
    saveSettings(data.settings);

    try {
      await batchSeedToFirestore(COLLECTIONS.USERS, sortedUsers);
      await batchSeedToFirestore(COLLECTIONS.STUDENTS, data.students);
      await batchSeedToFirestore(COLLECTIONS.ATTENDANCE, data.attendance);
      await batchSeedToFirestore(COLLECTIONS.INCOMES, data.incomes);
      await batchSeedToFirestore(COLLECTIONS.EXPENSES, data.expenses);
      await syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...data.settings });
    } catch (e) {
      console.warn('Import cloud sync error:', e);
    }

    showToast('Seluruh data berhasil dipulihkan dari file backup dan disinkronkan ke Cloud!');
  };

  const handleSyncAllToCloud = async () => {
    const sortedUsers = sortUsersByRole(users);
    await batchSeedToFirestore(COLLECTIONS.USERS, sortedUsers);
    await batchSeedToFirestore(COLLECTIONS.STUDENTS, students);
    await batchSeedToFirestore(COLLECTIONS.ATTENDANCE, attendance);
    await batchSeedToFirestore(COLLECTIONS.INCOMES, incomes);
    await batchSeedToFirestore(COLLECTIONS.EXPENSES, expenses);
    await syncDocToFirestore(COLLECTIONS.SETTINGS, 'default', { id: 'default', ...settings });
    showToast('Seluruh data berhasil diunggah dan disinkronkan ke Firebase Cloud!');
  };

  // Fallback / Siswa object for student portal
  const today = getTodayDateString();
  const todayAttendanceCount = attendance.filter((a) => a.date === today && a.status === 'Hadir').length;

  const currentStudentObj: Student =
    // 1. Match by linkedStudentId if set on currentUser session
    (currentUser?.linkedStudentId ? students.find((s) => s.id === currentUser.linkedStudentId) : undefined) ||
    // 2. Match by direct ID or stripped usr- prefix (e.g. usr-std-02 -> std-02)
    (currentUser?.id
      ? students.find(
          (s) =>
            s.id === currentUser.id ||
            s.id === currentUser.id.replace(/^usr-/, '') ||
            `usr-${s.id}` === currentUser.id
        )
      : undefined) ||
    // 3. Match by student code / NIS (case-insensitive)
    (currentUser?.code
      ? students.find((s) => s.code && s.code.toUpperCase() === currentUser.code?.toUpperCase())
      : undefined) ||
    // 4. Match by username (e.g. username is 'k2' or 'std-02')
    (currentUser?.username
      ? students.find(
          (s) =>
            (s.code && s.code.toLowerCase() === currentUser.username.toLowerCase()) ||
            (s.id && s.id.toLowerCase() === currentUser.username.toLowerCase())
        )
      : undefined) ||
    // 5. Match by student full name
    (currentUser?.name
      ? students.find(
          (s) =>
            s.name &&
            (s.name.toLowerCase() === currentUser.name.toLowerCase() ||
              s.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
              currentUser.name.toLowerCase().includes(s.name.toLowerCase()))
        )
      : undefined) ||
    // 6. If explicitly the default demo account with code 'SISWA', use first student;
    // otherwise, generate a personalized student object so other student IDs never get hijacked into Naureen!
    (currentUser?.role === 'siswa' && currentUser?.code === 'SISWA' && currentUser?.username === 'siswa'
      ? students[0]
      : {
          id: currentUser?.id || 'std-fallback',
          code: currentUser?.code || (currentUser?.username ? currentUser.username.toUpperCase() : 'SGM-001'),
          name: currentUser?.name || 'Siswa Bimbel',
          level: 'SD',
          gradeDetail: 'Kelas Siswa',
          classType: 'Privat',
          pricePerSession: 40000,
          parentName: `Wali ${currentUser?.name || 'Siswa'}`,
          parentPhone: currentUser?.phone || '081234567890',
          status: 'Aktif',
          joinDate: today,
        });

  // If showPublicPortal is active, render PublicPortalView
  if (showPublicPortal) {
    return (
      <PublicPortalView
        settings={settings}
        students={students}
        attendance={attendance}
        incomes={incomes}
        prospectiveStudents={prospectiveStudents}
        users={users}
        currentUser={currentUser}
        onRegisterProspectiveStudent={handleSaveProspectiveStudent}
        onOpenLogin={() => {
          setShowPublicPortal(false);
          setCurrentUser(null);
        }}
        onBackToDashboard={() => setShowPublicPortal(false)}
        onLogout={handleLogout}
      />
    );
  }

  // If user is not logged in, show AuthLoginView
  if (!currentUser) {
    return (
      <AuthLoginView
        onLoginSuccess={handleLoginSuccess}
        users={users}
        students={students}
        settings={settings}
        onOpenPublicPortal={() => setShowPublicPortal(true)}
      />
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col antialiased text-slate-900 selection:bg-indigo-500 selection:text-white overflow-hidden print:h-auto print:overflow-visible">
      {/* Toast Notification Banner with Undo Support */}
      <UndoToast
        toast={activeToast}
        onUndo={(item) => performUndo(item)}
        onClose={() => setActiveToast(null)}
      />

      {/* 1. Global Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        users={users}
        settings={settings}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        onToggleDesktopSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
        todayAttendanceCount={todayAttendanceCount}
        totalStudentsCount={students.length}
        onOpenChangePasswordModal={() => handleOpenChangePasswordModal(currentUser)}
        onOpenPublicPortal={() => setShowPublicPortal(true)}
        isCloudConnected={isCloudConnected}
        undoStack={undoStack}
        redoStack={redoStack}
        onUndo={() => performUndo()}
        onRedo={() => performRedo()}
      />

      {/* 2. Main Content Layout with Responsive Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          currentUser={currentUser}
          settings={settings}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          todayAttendanceCount={todayAttendanceCount}
          totalStudentsCount={students.length}
          prospectiveStudentsCount={
            prospectiveStudents.filter((p) => p.status === 'Baru' || p.status === 'Jadwal Trial').length
          }
        />

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 min-h-0">
          {/* TAB 1: DASHBOARD (Role-Based Display) */}
          {currentTab === 'dashboard' && currentUser.role === 'owner' && (
            <DashboardOwner
              students={students}
              attendance={attendance}
              incomes={incomes}
              expenses={expenses}
              settings={settings}
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              onOpenStudentModal={() => handleOpenStudentModal()}
              onOpenAttendanceModal={(rec) => handleOpenAttendanceModal(rec)}
              onOpenIncomeModal={() => handleOpenIncomeModal()}
              onOpenExpenseModal={() => handleOpenExpenseModal()}
              onOpenChangePasswordModal={() => handleOpenChangePasswordModal(currentUser)}
              onDeleteAttendance={handleDeleteAttendance}
              onOpenQRScanner={() => setIsQRScannerModalOpen(true)}
            />
          )}

          {currentTab === 'dashboard' && currentUser.role === 'tutor' && (
            <DashboardTutor
              currentUser={currentUser}
              students={students}
              attendance={attendance}
              users={users}
              settings={settings}
              onOpenAttendanceModal={handleOpenAttendanceModal}
              onOpenBatchAttendanceModal={() => setIsBatchAttendanceModalOpen(true)}
              onDeleteAttendance={handleDeleteAttendance}
              onNavigate={setCurrentTab}
              onOpenChangePasswordModal={() => handleOpenChangePasswordModal(currentUser)}
              onOpenQRScanner={() => setIsQRScannerModalOpen(true)}
            />
          )}

          {/* TAB 2: PORTAL SISWA (For Siswa Role) */}
          {(currentTab === 'student-portal' || (currentTab === 'dashboard' && currentUser.role === 'siswa')) && (
            <DashboardSiswa
              currentUser={currentUser}
              student={currentStudentObj}
              attendance={attendance}
              allStudents={students}
              settings={settings}
              onOpenSelfAttendanceModal={() => setIsSelfAttendanceModalOpen(true)}
              onNavigate={setCurrentTab}
              onOpenChangePasswordModal={() => handleOpenChangePasswordModal(currentUser)}
              onOpenQRCard={(student) => setQrCardStudent(student)}
            />
          )}

          {/* TAB 3: DATABASE SISWA */}
          {currentTab === 'students' && (
            <StudentDatabaseView
              students={students}
              users={users}
              userRole={currentUser.role}
              onOpenStudentModal={handleOpenStudentModal}
              onDeleteStudent={handleDeleteStudent}
              onResetStudents={handleResetToScreenshotStudents}
              onOpenQRCard={(student) => setQrCardStudent(student)}
            />
          )}

          {/* TAB: PPDB & CALON SISWA (Owner & Tutor) */}
          {currentTab === 'ppdb' && (currentUser.role === 'owner' || currentUser.role === 'tutor') && (
            <PPDBManagementView
              prospectiveStudents={prospectiveStudents}
              students={students}
              users={users}
              userRole={currentUser.role}
              settings={settings}
              onSaveProspective={handleSaveProspectiveStudent}
              onDeleteProspective={(id) => handleDeleteProspectiveStudent(id)}
              onConvertToStudent={handleConvertToStudent}
              onOpenPublicPortal={() => setShowPublicPortal(true)}
            />
          )}

          {/* TAB 4: PRESENSI & MATERI */}
          {currentTab === 'attendance' && (
            <AttendanceView
              attendance={
                currentUser.role === 'siswa'
                  ? attendance.filter((a) => a.studentId === currentStudentObj.id)
                  : attendance
              }
              students={students}
              users={users}
              userRole={currentUser.role}
              currentUserName={currentUser.name}
              onOpenAttendanceModal={handleOpenAttendanceModal}
              onOpenBatchAttendanceModal={() => setIsBatchAttendanceModalOpen(true)}
              onDeleteAttendance={handleDeleteAttendance}
              onOpenQRScanner={() => setIsQRScannerModalOpen(true)}
              onDeduplicateAttendance={handleDeduplicateAttendance}
            />
          )}

          {/* TAB 5: TAGIHAN SISWA (SKEMA PASCA-BAYAR: PRESENSI × TARIF) */}
          {currentTab === 'student-billing' && (
            <StudentBillingView
              students={students}
              attendance={attendance}
              incomes={incomes}
              userRole={currentUser.role}
              currentStudentCode={currentUser.code}
              settings={settings}
              onRecordPayment={handleRecordStudentPayment}
              onViewReceipt={(inc) => setReceiptIncome(inc)}
            />
          )}

          {/* TAB 6: BUKU KAS UTAMA & ARUS KAS (KAS MASUK + KAS KELUAR) - Role Owner Only */}
          {(currentTab === 'cash-book' || currentTab === 'incomes' || currentTab === 'expenses') && currentUser.role === 'owner' && (
            <CashBookView
              incomes={incomes}
              expenses={expenses}
              userRole={currentUser.role}
              settings={settings}
              onOpenIncomeModal={handleOpenIncomeModal}
              onOpenExpenseModal={handleOpenExpenseModal}
              onDeleteIncome={handleDeleteIncome}
              onDeleteExpense={handleDeleteExpense}
              onViewReceipt={(inc) => setReceiptIncome(inc)}
              onViewExpenseReceipt={(exp) => setReceiptExpense(exp)}
            />
          )}

          {/* TAB 7: CETAK REKAP PRESENSI & KARTU (MODE A & MODE B) */}
          {currentTab === 'print-cards' && (
            <PrintCardsView
              students={
                currentUser.role === 'siswa'
                  ? [currentStudentObj]
                  : students
              }
              attendance={
                currentUser.role === 'siswa'
                  ? attendance.filter((a) => a.studentId === currentStudentObj.id)
                  : attendance
              }
              incomes={incomes}
              users={users}
              userRole={currentUser.role}
              currentStudentCode={currentUser.code}
              settings={settings}
            />
          )}

          {/* TAB 8: LAPORAN LABA RUGI (P&L) BULANAN & TAHUNAN - Role Owner Only */}
          {currentTab === 'profit-loss' && currentUser.role === 'owner' && (
            <ProfitLossView
              attendance={attendance}
              incomes={incomes}
              expenses={expenses}
              settings={settings}
              students={students}
              users={users}
              onNavigateToSettings={() => setCurrentTab('settings')}
            />
          )}

          {/* TAB 9: HONOR & GAJI TUTOR (Role Owner & Tutor) */}
          {currentTab === 'salary' && (currentUser.role === 'owner' || currentUser.role === 'tutor') && (
            <SalaryView
              currentUser={currentUser}
              tutors={users.filter((u) => u.role === 'tutor')}
              users={users}
              students={students}
              attendances={attendance}
              settings={settings}
              expenses={expenses}
              onAddExpense={handleSaveExpense}
              onNavigateToSettings={() => setCurrentTab('settings')}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {/* TAB 10: PENGATURAN SISTEM & KELOLA AKUN - Role Owner Only */}
          {currentTab === 'settings' && currentUser.role === 'owner' && (
            <SettingsView
              users={users}
              settings={settings}
              students={students}
              expenses={expenses}
              incomes={incomes}
              attendance={attendance}
              currentUserId={currentUser.id}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onSaveSettings={handleSaveSettings}
              onResetAllData={handleResetAllData}
              onOpenUserModal={handleOpenUserModal}
              onRenameExpenseCategory={handleRenameExpenseCategory}
              onRenameIncomeCategory={handleRenameIncomeCategory}
              onHarmonizeCategories={handleHarmonizeCategories}
              onSyncTutorNames={handleSyncTutorNames}
              onImportFullData={handleImportFullData}
              onSyncAllToCloud={handleSyncAllToCloud}
            />
          )}
        </main>
      </div>

      {/* --- ALL INTERACTIVE MODAL DIALOGS --- */}

      {/* 1. Student Modal (Add/Edit) */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(undefined);
        }}
        onSave={handleSaveStudent}
        initialData={editingStudent}
        existingStudentsCount={students.length}
        users={users}
      />

      {/* 2. Attendance Modal (Single Add/Edit) */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setEditingAttendance(undefined);
        }}
        onSave={handleSaveAttendance}
        students={students}
        initialData={editingAttendance}
        currentUserName={currentUser.name}
        userRole={currentUser.role}
        users={users}
        attendance={attendance}
      />

      {/* 3. Batch Attendance Modal */}
      <BatchAttendanceModal
        isOpen={isBatchAttendanceModalOpen}
        onClose={() => setIsBatchAttendanceModalOpen(false)}
        onSaveBatch={handleBatchAttendance}
        students={students}
        currentUserName={currentUser.name}
        users={users}
        attendance={attendance}
      />

      {/* 4. Self Attendance Modal (For Siswa) */}
      <SelfAttendanceModal
        isOpen={isSelfAttendanceModalOpen}
        onClose={() => setIsSelfAttendanceModalOpen(false)}
        onConfirmSelfAttendance={(record) =>
          handleSelfAttendance(
            currentStudentObj,
            record.topic,
            record.tutorNotes || '',
            record.time,
            record.tutorName
          )
        }
        student={currentStudentObj}
        existingTodayRecord={attendance.find(
          (a) => a.studentId === currentStudentObj.id && a.date === today
        )}
        users={users}
      />

      {/* 5. Income Modal (Add/Edit SPP) */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setEditingIncome(undefined);
        }}
        onSave={handleSaveIncome}
        students={students}
        attendances={attendance}
        initialData={editingIncome}
        currentUserName={currentUser.name}
        totalExistingIncomes={incomes.length}
        existingIncomes={incomes}
        paymentMethods={settings.paymentMethods}
        categories={settings.incomeCategories}
        settings={settings}
      />

      {/* 6. Expense Modal (Add/Edit Expense) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(undefined);
        }}
        onSave={handleSaveExpense}
        initialData={editingExpense}
        currentUserName={currentUser.name}
        categories={settings.expenseCategories}
        paymentMethods={settings.paymentMethods}
        existingExpenses={expenses}
        tutors={users.filter((u) => u.role === 'tutor' && u.isActive !== false)}
      />

      {/* 7. Receipt Modal (Kwitansi Kas Masuk & Kas Keluar) */}
      {receiptIncome && (
        <ReceiptModal
          isOpen={Boolean(receiptIncome)}
          onClose={() => setReceiptIncome(null)}
          income={receiptIncome}
          student={students.find((s) => s.id === receiptIncome.studentId)}
          settings={settings}
        />
      )}

      {receiptExpense && (
        <ExpenseReceiptModal
          isOpen={Boolean(receiptExpense)}
          onClose={() => setReceiptExpense(null)}
          expense={receiptExpense}
          settings={settings}
        />
      )}

      {/* 8. User Account Modal (Owner, Tutor, Siswa) */}
      <UserAccountModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(undefined);
        }}
        onSave={handleSaveUser}
        onDelete={handleDeleteUser}
        initialData={editingUser}
        students={students}
        existingUsers={users}
        currentUserId={currentUser?.id}
      />

      {/* 9. Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteDialog.isOpen}
        title={deleteDialog.title}
        message={deleteDialog.message}
        itemName={deleteDialog.itemName}
        onConfirm={deleteDialog.onConfirm}
        onClose={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
        onCancel={() => setDeleteDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 10. Change Password Modal (For all user roles & Owner sync) */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => {
          setIsChangePasswordModalOpen(false);
          setPasswordTargetUser(undefined);
        }}
        targetUser={passwordTargetUser}
        onSavePassword={handleSavePassword}
      />

      {/* 11. QR Attendance Scanner Modal (For Owner, Tutor) */}
      <QRScannerModal
        isOpen={isQRScannerModalOpen}
        onClose={() => setIsQRScannerModalOpen(false)}
        students={students}
        attendance={attendance}
        currentUserName={currentUser.name}
        users={users}
        settings={settings}
        onSaveAttendance={handleQRScanAttendance}
      />

      {/* 12. Student QR Badge Modal (Single preview, download & print) */}
      <StudentQRCardModal
        isOpen={Boolean(qrCardStudent)}
        onClose={() => setQrCardStudent(null)}
        student={qrCardStudent}
        settings={settings}
      />
    </div>
  );
}
