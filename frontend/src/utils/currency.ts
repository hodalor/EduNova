export const formatCurrencyAmount = (
  currencyCode: string | null | undefined,
  value: number | string | null | undefined
) => {
  const amount = Number(value || 0);
  const normalizedCode = String(currencyCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizedCode,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (_error) {
    return `${normalizedCode} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
};

export const resolvePrimaryCurrencyCode = <
  T extends { currency_code?: string | null; currencyCode?: string | null }
>(
  items: T[] | null | undefined,
  fallback?: string | null
) =>
  (items || []).find((item) => item.currency_code || item.currencyCode)?.currency_code ||
  (items || []).find((item) => item.currencyCode || item.currency_code)?.currencyCode ||
  String(fallback || '').trim().toUpperCase() ||
  '';
