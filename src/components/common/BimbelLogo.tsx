import React from 'react';
import { BimbelSettings } from '../../types';

/**
 * Helper to resolve logo URL or adaptive symbol for bimbel.
 * If user set a custom logoUrl, it is prioritized.
 * If logoSymbol was left as default 'Σ' but bimbel name is no longer 'Sigma' (e.g. 'RUMAH BELAJAR'),
 * it automatically generates the institution initials (e.g. 'RB') instead of sticking to Greek Sigma.
 */
export function getBimbelLogoInfo(settings?: BimbelSettings) {
  const bimbelName = settings?.bimbelName?.trim() || 'RUMAH BELAJAR';
  const logoUrl = settings?.logoUrl?.trim() || '';

  let symbol = settings?.logoSymbol?.trim() || '';

  const isSigmaNamed = bimbelName.toLowerCase().includes('sigma');
  if (!symbol || (symbol === 'Σ' && !isSigmaNamed)) {
    const words = bimbelName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      symbol = (words[0][0] + words[1][0]).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      symbol = words[0].slice(0, 2).toUpperCase();
    } else {
      symbol = (bimbelName[0] || 'RB').toUpperCase();
    }
  }

  return { logoUrl, logoSymbol: symbol, bimbelName };
}

interface BimbelLogoProps {
  settings?: BimbelSettings;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  fallbackSymbol?: string;
}

export const BimbelLogo: React.FC<BimbelLogoProps> = ({
  settings,
  className = '',
  imageClassName = '',
  textClassName = '',
  fallbackSymbol,
}) => {
  const { logoUrl, logoSymbol, bimbelName } = getBimbelLogoInfo(settings);
  const displaySymbol = fallbackSymbol || logoSymbol;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={bimbelName}
        className={`object-contain max-w-full max-h-full ${imageClassName}`}
      />
    );
  }

  return <span className={textClassName}>{displaySymbol}</span>;
};
