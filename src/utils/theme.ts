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

/**
 * 25 Pilihan Warna Ubin Ceria (Swatch Grid) sesuai palet visual
 * Memudahkan memilih warna cerah, kontras, dan estetik dalam satu klik.
 */
export interface SwatchColor {
  id: string;
  name: string;
  hex: string;
  textColor?: 'white' | 'dark';
}

export const SWATCH_GRID_COLORS: SwatchColor[] = [
  // Baris 1
  { id: 'fuchsia-pink', name: 'Fuchsia Pink', hex: '#E91E63', textColor: 'white' },
  { id: 'sun-yellow', name: 'Vivid Yellow', hex: '#FFC107', textColor: 'dark' },
  { id: 'soft-mist', name: 'Soft Mist', hex: '#ECEFF1', textColor: 'dark' },
  { id: 'fresh-green', name: 'Fresh Green', hex: '#4CAF50', textColor: 'white' },
  { id: 'slate-indigo', name: 'Slate Indigo', hex: '#3F51B5', textColor: 'white' },

  // Baris 2
  { id: 'flame-orange', name: 'Flame Orange', hex: '#FF5722', textColor: 'white' },
  { id: 'cobalt-blue', name: 'Cobalt Blue', hex: '#1976D2', textColor: 'white' },
  { id: 'magenta-berry', name: 'Magenta Berry', hex: '#C2185B', textColor: 'white' },
  { id: 'sky-azure', name: 'Sky Azure', hex: '#00A6ED', textColor: 'white' },
  { id: 'pastel-lemon', name: 'Pastel Lemon', hex: '#FFF176', textColor: 'dark' },

  // Baris 3
  { id: 'forest-green', name: 'Forest Green', hex: '#2E7D32', textColor: 'white' },
  { id: 'midnight-navy', name: 'Midnight Navy', hex: '#1A237E', textColor: 'white' },
  { id: 'coral-orange', name: 'Coral Orange', hex: '#FF6F00', textColor: 'white' },
  { id: 'golden-amber', name: 'Golden Amber', hex: '#FF9800', textColor: 'white' },
  { id: 'crimson-red', name: 'Crimson Red', hex: '#AD1457', textColor: 'white' },

  // Baris 4
  { id: 'pumpkin-orange', name: 'Pumpkin Orange', hex: '#FB8C00', textColor: 'white' },
  { id: 'neon-pink', name: 'Neon Pink', hex: '#FF4081', textColor: 'white' },
  { id: 'mustard-gold', name: 'Mustard Gold', hex: '#FFA000', textColor: 'white' },
  { id: 'lime-chartreuse', name: 'Lime Chartreuse', hex: '#7CB342', textColor: 'white' },
  { id: 'canary-yellow', name: 'Canary Yellow', hex: '#FFEB3B', textColor: 'dark' },

  // Baris 5
  { id: 'pine-teal', name: 'Pine Teal', hex: '#00695C', textColor: 'white' },
  { id: 'electric-purple', name: 'Electric Purple', hex: '#6A1B9A', textColor: 'white' },
  { id: 'royal-blue', name: 'Royal Blue', hex: '#283593', textColor: 'white' },
  { id: 'scarlet-red', name: 'Scarlet Red', hex: '#D32F2F', textColor: 'white' },
  { id: 'kelly-green', name: 'Kelly Green', hex: '#388E3C', textColor: 'white' },
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
  if (match) return match.primaryHex;
  const swatchMatch = SWATCH_GRID_COLORS.find((s) => s.id === accentColor);
  return swatchMatch ? swatchMatch.hex : '#4f46e5';
}

/**
 * Injects CSS Custom Variables into document.documentElement (:root)
 * so that any UI component can use var(--theme-primary), var(--theme-primary-hover), etc.
 */
export function applyThemeVariables(accentColor?: string, opacity?: number) {
  if (typeof document === 'undefined') return;

  const primary = resolvePrimaryColor(accentColor);
  const rawOpacity = typeof opacity === 'number' ? opacity : 100;
  const alpha = Math.min(1, Math.max(0.2, rawOpacity / 100));

  const hover = adjustColor(primary, -20);
  const lightBg = hexToRgba(primary, 0.08 * alpha);
  const subtleBorder = hexToRgba(primary, 0.22 * alpha);
  const shadowGlow = hexToRgba(primary, 0.25 * alpha);
  const primaryRgba = hexToRgba(primary, alpha);

  const root = document.documentElement;
  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--theme-primary-rgba', primaryRgba);
  root.style.setProperty('--theme-opacity', String(alpha));
  root.style.setProperty('--theme-primary-hover', hover);
  root.style.setProperty('--theme-primary-light', lightBg);
  root.style.setProperty('--theme-primary-border', subtleBorder);
  root.style.setProperty('--theme-primary-shadow', shadowGlow);
}

/**
 * Returns document theme styling tokens based on the Bimbel accent color and opacity.
 * Used by printable receipts, slips, cards, statements, and navbar.
 */
export function getDocumentThemeStyles(accentColor?: string, opacity?: number) {
  const primary = resolvePrimaryColor(accentColor);
  const rawOpacity = typeof opacity === 'number' ? opacity : 100;
  const alpha = Math.min(1, Math.max(0.2, rawOpacity / 100));
  const primaryRgba = hexToRgba(primary, alpha);

  const dark = adjustColor(primary, -40);
  const light = adjustColor(primary, 40);
  const lightBg = hexToRgba(primary, 0.08 * alpha);
  const lightBorder = hexToRgba(primary, 0.28 * alpha);
  const subtleBorder = hexToRgba(primary, 0.18 * alpha);
  const gradient = `linear-gradient(135deg, ${adjustColor(primary, -60)} 0%, #0f172a 45%, ${primary} 100%)`;

  return {
    primary,
    primaryRgba,
    alpha,
    opacityPercent: rawOpacity,
    dark,
    light,
    lightBg,
    lightBorder,
    subtleBorder,
    gradient,
  };
}
