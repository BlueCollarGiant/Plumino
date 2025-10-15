/**
 * Coerces a value to a number, returning null if the value cannot be converted.
 * Handles strings with special formatting (removes non-numeric characters except decimal point and minus).
 */
export function coerceNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formats a date value to a locale date string.
 * Returns 'Unknown' if the value is null, undefined, or invalid.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
}
