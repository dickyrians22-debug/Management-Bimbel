import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  LogOut,
  Clock,
  Menu,
  KeyRound,
  Globe,
  ChevronDown,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { UserSession, UserRole, UserAccount, BimbelSettings, UndoItem } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { BimbelLogo } from '../common/BimbelLogo';
import { getDocumentThemeStyles } from '../../utils/theme';
import { UndoRedoControls } from './UndoRedoControls';

interface NavbarProps {
  currentUser: UserSession;
  users?: UserAccount[];
  settings?: BimbelSettings;
  isCloudConnected?: boolean;
  onSwitchUser?: (user: UserSession) => void;
  onLogout: () => void;
  onResetData?: () => void;
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onOpenChangePasswordModal?: () => void;
  onOpenPublicPortal?: () => void;
  todayAttendanceCount?: number;
  totalStudentsCount?: number;
  undoStack?: UndoItem[];
  redoStack?: UndoItem[];
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  settings,
  isCloudConnected = true,
  onLogout,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isSidebarCollapsed = false,
  onOpenChangePasswordModal,
  onOpenPublicPortal,
  undoStack = [],
  redoStack = [],
  onUndo,
  onRedo,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const bimbelName = settings?.bimbelName || settings?.sidebarFooterTitle || 'RUMAH BELAJAR';
  const tagline = (settings?.tagline || settings?.sidebarFooterTagline || 'Belajar Sampai Paham').replace(/[“”"]/g, '');
  const appVersionBadge = settings?.appVersionBadge || 'v2.6 PRO';

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return {
          label: 'OWNER (SUPER ADMIN)',
          shortLabel: 'OWNER',
          bg: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/20',
          dotColor: 'bg-amber-400',
          icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'tutor':
        return {
          label: 'TUTOR / PENGAJAR',
          shortLabel: 'TUTOR',
          bg: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-teal-500/20',
          dotColor: 'bg-teal-400',
          icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" />,
        };
      case 'siswa':
        return {
          label: 'SISWA / ORANG TUA',
          shortLabel: 'SISWA',
          bg: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/20',
          dotColor: 'bg-indigo-400',
          icon: <Users className="w-3.5 h-3.5 shrink-0" />,
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const theme = getDocumentThemeStyles(settings?.accentColor, settings?.accentOpacity);
  const topbarStyle = settings?.topbarStyle || 'theme-tint';
  const isLight = topbarStyle === 'light-clean';

  const getHeaderStyle = () => {
    switch (topbarStyle) {
      case 'theme-solid':
        return {
          background: theme.primaryRgba,
          backdropFilter: 'blur(8px)',
          borderBottom: `2px solid ${theme.dark}`,
        };
      case 'light-clean':
        return {
          background: '#ffffff',
          borderBottom: `2px solid ${theme.primary}`,
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        };
      case 'frosted-glass':
        return {
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderBottom: `1px solid rgba(255, 255, 255, 0.12)`,
          boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.35), 0 1px 0 0 ${theme.primary}50`,
        };
      case 'vibrant-gradient':
        return {
          background: `linear-gradient(115deg, ${theme.primary} 0%, ${theme.light} 45%, ${theme.dark} 100%)`,
          borderBottom: '2px solid rgba(255, 255, 255, 0.35)',
          boxShadow: `0 6px 20px ${theme.primary}30`,
        };
      case 'aurora-glow':
        return {
          background: `radial-gradient(circle at 10% 40%, ${theme.primary}45 0%, transparent 45%), radial-gradient(circle at 90% 60%, ${theme.dark}60 0%, transparent 45%), #090d16`,
          borderBottom: `1px solid ${theme.primary}70`,
          boxShadow: `0 4px 24px rgba(0, 0, 0, 0.6)`,
        };
      case 'dark':
        return {
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
        };
      case 'theme-tint':
      default:
        return {
          background: `linear-gradient(135deg, ${theme.dark} 0%, #0f172a 65%, #020617 100%)`,
          borderBottom: `2px solid ${theme.primaryRgba}`,
        };
    }
  };

  return (
    <header 
      className={`no-print sticky top-0 z-40 ${isLight ? 'text-slate-800' : 'text-white'} shadow-xl shrink-0 w-full transition-all duration-300`}
      style={getHeaderStyle()}
    >
      <div className="h-0.5 w-full shrink-0" style={{ backgroundColor: theme.primary }} />
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onToggleMobileSidebar();
                } else if (onToggleDesktopSidebar) {
                  onToggleDesktopSidebar();
                } else {
                  onToggleMobileSidebar();
                }
              }}
              className={`p-1.5 sm:p-2 rounded-xl ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'} focus:outline-none transition cursor-pointer shrink-0 active:scale-95`}
              title={isSidebarCollapsed ? 'Buka Menu Samping' : 'Ciutkan / Tutup Menu Samping'}
              aria-label="Buka / Tutup Menu Samping"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div 
                className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-sm sm:text-2xl text-white shadow-lg shrink-0 select-none overflow-hidden p-0.5 transition-all duration-300"
                style={{
                  background: topbarStyle === 'theme-solid' 
                    ? theme.dark 
                    : `linear-gradient(135deg, ${theme.primary}, ${theme.dark})`,
                  boxShadow: `0 4px 14px ${theme.primary}50`,
                }}
              >
                <BimbelLogo settings={settings} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className={`text-xs sm:text-base md:text-lg font-black tracking-tight font-heading ${isLight ? 'text-slate-900' : 'text-white'} truncate max-w-[105px] xs:max-w-[150px] sm:max-w-xs md:max-w-md`}>
                    {bimbelName}
                  </h1>
                  {appVersionBadge && (
                    <span 
                      className="hidden md:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0"
                      style={{
                        backgroundColor: isLight ? `${theme.primary}15` : `${theme.primary}25`,
                        color: isLight ? theme.dark : '#ffffff',
                        borderColor: `${theme.primary}60`,
                      }}
                    >
                      {appVersionBadge}
                    </span>
                  )}
                </div>
                {tagline && (
                  <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-amber-300/90'} tracking-wide hidden lg:block truncate max-w-md`}>
                    “{tagline}”
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions, Live Clock, User Profile, & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Undo / Redo Global Controls */}
            {onUndo && (
              <UndoRedoControls
                undoStack={undoStack}
                redoStack={redoStack}
                onUndo={onUndo}
                onRedo={onRedo || (() => {})}
                isLight={isLight}
              />
            )}

            {/* Cloud Realtime Status (Hidden on Mobile) */}
            <div
              title={isCloudConnected ? 'Cloud Firebase Firestore Terhubung Realtime' : 'Mode Offline / Local Storage'}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${isLight ? 'bg-slate-100 border border-slate-200 text-slate-700' : 'bg-slate-800/80 border border-slate-700/60 text-slate-300'} text-[11px] font-medium`}
            >
              <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'}>{isCloudConnected ? 'Cloud Sync' : 'Local Mode'}</span>
            </div>

            {/* Live Clock (Hidden on Mobile/Tablet) */}
            <div className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${isLight ? 'bg-slate-100 border border-slate-200 text-slate-700' : 'bg-slate-800/80 border border-slate-700/60 text-slate-300'} text-xs font-mono`}>
              <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>{timeStr}</span>
            </div>

            {/* Portal Publik Button (Desktop only in topbar) */}
            {onOpenPublicPortal && (
              <button
                onClick={onOpenPublicPortal}
                title="Buka Halaman Portal Publik (PPDB & Cek Mandiri)"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer active:scale-95 shrink-0 hover:brightness-105"
                style={{
                  backgroundColor: isLight 
                    ? '#f1f5f9' 
                    : topbarStyle === 'theme-solid' 
                    ? 'rgba(0,0,0,0.2)' 
                    : `${theme.primary}20`,
                  borderColor: isLight 
                    ? '#cbd5e1' 
                    : topbarStyle === 'theme-solid' 
                    ? 'rgba(255,255,255,0.3)' 
                    : `${theme.primary}60`,
                  color: isLight ? '#0f172a' : '#ffffff',
                }}
              >
                <Globe className="w-3.5 h-3.5" style={{ color: isLight ? theme.primary : topbarStyle === 'theme-solid' ? '#ffffff' : theme.primary }} />
                <span>Portal Publik</span>
              </button>
            )}

            {/* Change Password Button (Desktop/Tablet) */}
            {onOpenChangePasswordModal && (
              <button
                onClick={onOpenChangePasswordModal}
                title={`Ganti Kata Sandi (${currentUser?.name || 'Pengguna'})`}
                className={`hidden sm:flex p-2 rounded-xl ${isLight ? 'text-slate-600 hover:text-amber-600 hover:bg-slate-100' : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'} transition cursor-pointer shrink-0`}
              >
                <KeyRound className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Card & Interactive Mobile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-1.5 sm:gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl ${isLight ? 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-900' : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-white'} border shadow-xs cursor-pointer transition active:scale-95`}
                title={`Profil: ${currentUser.name} (${badge.label})`}
              >
                <div className="relative">
                  <UserAvatar
                    avatar={currentUser.avatar}
                    name={currentUser.name}
                    role={currentUser.role}
                    size="sm"
                    rounded="rounded-lg sm:rounded-xl"
                  />
                  {/* Small role dot indicator on mobile */}
                  <span className={`sm:hidden absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isLight ? 'border-white' : 'border-slate-900'} ${badge.dotColor}`} />
                </div>

                <div className="hidden md:block text-left">
                  <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'} truncate max-w-[120px] leading-tight`}>
                    {currentUser.name}
                  </p>
                  <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'} font-mono leading-none mt-0.5`}>
                    @{currentUser.username || currentUser.code}
                  </p>
                </div>

                {/* Role badge pill on sm: and up */}
                <span
                  className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl shadow-xs ${badge.bg}`}
                >
                  {badge.icon}
                  <span className="tracking-wider">{badge.shortLabel}</span>
                </span>

                <ChevronDown className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className={`absolute right-0 mt-2 w-64 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700'} border rounded-2xl shadow-2xl p-2.5 space-y-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200`}>
                  {/* User Information Header */}
                  <div className={`p-2.5 ${isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-900/80 border-slate-700/60'} rounded-xl border space-y-1.5`}>
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        avatar={currentUser.avatar}
                        name={currentUser.name}
                        role={currentUser.role}
                        size="md"
                        rounded="rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'} truncate`}>
                          {currentUser.name}
                        </p>
                        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} font-mono`}>
                          @{currentUser.username || currentUser.code}
                        </p>
                      </div>
                    </div>

                    <div className={`pt-1 flex items-center justify-between border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        {isCloudConnected ? 'Online Sync' : 'Local'}
                      </span>
                    </div>
                  </div>

                  {/* Actions inside Dropdown */}
                  <div className="space-y-1">
                    {onOpenChangePasswordModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenChangePasswordModal();
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${isLight ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-200 hover:text-white hover:bg-slate-700/70'} rounded-xl transition cursor-pointer text-left`}
                      >
                        <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Ganti Kata Sandi</span>
                      </button>
                    )}

                    {onOpenPublicPortal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenPublicPortal();
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${isLight ? 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50' : 'text-indigo-300 hover:text-white hover:bg-indigo-900/50'} rounded-xl transition cursor-pointer text-left`}
                      >
                        <Globe className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'} shrink-0`} />
                        <span>Buka Portal Publik PPDB</span>
                      </button>
                    )}

                    <div className={`pt-1 border-t ${isLight ? 'border-slate-200' : 'border-slate-700/60'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout();
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold ${isLight ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50' : 'text-rose-300 hover:text-white hover:bg-rose-900/60'} rounded-xl transition cursor-pointer text-left`}
                      >
                        <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Keluar dari Akun (Logout)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Logout Button (Always Accessible with Zero Clipping) */}
            <button
              onClick={onLogout}
              title="Keluar dari Akun (Logout)"
              className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl ${isLight ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300' : 'bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 border-rose-800/60 hover:border-rose-700'} border text-xs font-bold transition cursor-pointer active:scale-95 shrink-0`}
              aria-label="Keluar dari Akun"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
