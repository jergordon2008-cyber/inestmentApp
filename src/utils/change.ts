/**
 * Price/return change formatting.
 *
 * Zero is neutral — not a gain. Rendering 0.00 as a green up-arrow told every
 * student with no activity yet that they were up, which on launch day is
 * everyone. Values that round to 0.00 at the 2dp these screens display
 * (anything under half a cent / half a basis point) count as flat too, so a
 * -0.004 never renders as a red "-0.00".
 */

/** Half of the smallest value distinguishable at 2dp. */
const FLAT_EPSILON = 0.005;

export type ChangeTone = 'up' | 'down' | 'flat';

export function changeTone(value: number | null | undefined): ChangeTone {
  if (value == null || Math.abs(value) < FLAT_EPSILON) return 'flat';
  return value > 0 ? 'up' : 'down';
}

/** Accent for a change value: green up, red down, muted at zero. */
export function changeColor(value: number | null | undefined, theme: any): string {
  const tone = changeTone(value);
  if (tone === 'up') return theme.colors.success;
  if (tone === 'down') return theme.colors.danger;
  return theme.colors.textSecondary;
}

/** '+' for gains only — negatives carry their own '-', zero gets nothing. */
export function changeSign(value: number | null | undefined): string {
  return changeTone(value) === 'up' ? '+' : '';
}

/** Ionicons caret for a change value, or null when flat (no arrow at zero). */
export function changeCaret(value: number | null | undefined): 'caret-up' | 'caret-down' | null {
  const tone = changeTone(value);
  if (tone === 'up') return 'caret-up';
  if (tone === 'down') return 'caret-down';
  return null;
}

/**
 * Signed dollar change: "+$1.20", "-$0.19", "$0.00". The screens used
 * changeSign + Math.abs, which supplies '+' for gains but drops the minus on a
 * loss, so a $0.19 loss read like a $0.19 gain next to a "-0.00%".
 */
export function formatMoneyChange(value: number | null | undefined): string {
  const v = value ?? 0;
  const tone = changeTone(v);
  return `${tone === 'up' ? '+' : tone === 'down' ? '-' : ''}$${Math.abs(v).toFixed(2)}`;
}

/**
 * Signed percent change at 2dp, e.g. "+1.50%", "-0.40%". A nonzero change too
 * small for 2dp reads "<0.01%" rather than "-0.00%"; pass the paired dollar
 * change so a percent that is tiny only because the dollars are flat stays "0.00%".
 */
export function formatPercentChange(pct: number | null | undefined, dollars?: number | null): string {
  const p = pct ?? 0;
  if (changeTone(p) === 'flat') {
    const moved = dollars != null ? changeTone(dollars) !== 'flat' : p !== 0;
    return moved && p !== 0 ? '<0.01%' : '0.00%';
  }
  return `${changeSign(p)}${p.toFixed(2)}%`;
}
