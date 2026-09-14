import { BimbelSettings } from '../types';

export interface ThemePreset {
  id: string;
  name: string;
  primaryHex: string;
  hoverHex: string;
  lightBgHex: string;
  badgeHex: string;
  description: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'indigo',
    name: 'Royal Indigo',
    primaryHex: '#4f46e5',
    hoverHex: '#4338ca',
    lightBgHex: '#eef2ff',
    badgeHex: '#6366f1',
    description: 'Modern, elegan, dan estetik (Bawaan Sistem)',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    primaryHex: '#2563eb',
    hoverHex: '#1d4ed8',
    lightBgHex: '#eff6ff',
    badgeHex: '#3b82f6',
    description: 'Formal, tenang, dan fokus edukasi',
  },
  {
    id: 'emerald',
    name: 'Emerald Fresh',
    primaryHex: '#059669',
    hoverHex: '#047857',
    lightBgHex: '#ecfdf5',
    badgeHex: '#10b981',
    description: 'Nuansa hijau segar keuangan & pertumbuhan',
  },
  {
    id: 'violet',
    name: 'Purple Amethyst',
    primaryHex: '#7c3aed',
    hoverHex: '#6d28d9',
    lightBgHex: '#f5f3ff',
    badgeHex: '#8b5cf6',
    description: 'Kreatif, anggun, dan inspiratif',
  },
  {
    id: 'amber',
    name: 'Warm Sunset',
    primaryHex: '#d97706',
    hoverHex: '#b45309',
    lightBgHex: '#fffbeb',
    badgeHex: '#f59e0b',
    description: 'Ceria, ramah, dan bersemangat',
  },
  {
    id: 'rose',
    name: 'Ruby Rose',
    primaryHex: '#e11d48',
    hoverHex: '#be123c',
    lightBgHex: '#fff1f2',
    badgeHex: '#f43f5e',
    description: 'Hangat, tegas, dan berani',
  },
  {
    id: 'teal',
    name: 'Teal Lagoon',
    primaryHex: '#0d9488',
    hoverHex: '#0f766e',
    lightBgHex: '#f0fdfa',
    badgeHex: '#14b8a6',
    description: 'Sejuk, presisi, dan modern',
  },
  {
    id: 'slate',
    name: 'Titanium Slate',
    primaryHex: '#334155',
    hoverHex: '#1e293b',
    lightBgHex: '#f8fafc',
    badgeHex: '#475569',
    description: 'Monokromatik minimalis & bersih',
  },
];

// Helper: Convert hex to lighter or darker shade
export function adjustColor(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Convert hex to rgba
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(79, 70, 229, ${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Resolve any accent color (either preset key like 'emerald' or hex like '#059669')
export function resolvePrimaryColor(accentColor?: string): string {
  if (!accentColor) return '#4f46e5';
  if (accentColor.startsWith('#')) return accentColor;
  const match = THEME_PRESETS.find((p) => p.id === accentColor);
  return match ? match.primaryHex : '#4f46e5';
}

/**
 * Injects CSS Custom Variables into document.documentElement (:root)
 * so that any UI component can use var(--theme-primary), var(--theme-primary-hover), etc.
 */
export function applyThemeVariables(accentColor?: string) {
  if (typeof document === 'undefined') return;

  const primary = resolvePrimaryColor(accentColor);
  const hover = adjustColor(primary, -20);
  const lightBg = hexToRgba(primary, 0.08);
  const subtleBorder = hexToRgba(primary, 0.22);
  const shadowGlow = hexToRgba(primary, 0.25);

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--theme-primary-hover', hover);
  root.style.setProperty('--theme-primary-light', lightBg);
  root.style.setProperty('--theme-primary-border', subtleBorder);
  root.style.setProperty('--theme-primary-shadow', shadowGlow);
}
