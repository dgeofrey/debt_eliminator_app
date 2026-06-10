/**
 * Currency formatting (no fractional cents for big numbers).
 */
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const fmtCurrency = (n: number): string =>
  currencyFormatter.format(Math.round(Number(n) || 0));

export const fmtPercent = (n: number, digits = 2): string =>
  `${(Number(n) || 0).toFixed(digits)}%`;

export const fmtMonths = (m: number | null): string => {
  if (m === null) return '—';
  if (m === 0) return 'Debt free';
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr`;
  return `${years} yr ${months} mo`;
};
