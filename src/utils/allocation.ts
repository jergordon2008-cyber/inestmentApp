/**
 * Invested / cash split for the portfolio's allocation bar.
 *
 * Whole percents alone hide a small first position: one $200 share in a
 * $100,000 account is 0.2%, which rounded to "Invested 0% · Cash 100%" while
 * the student held a stock. Below 10% (and above 90%) a label keeps one
 * decimal, and anything above zero shows as at least "<0.1%".
 */
export interface AllocationSplit {
  /** 0–100, for the bar width. */
  investedPct: number;
  investedLabel: string;
  cashLabel: string;
}

function label(pct: number): string {
  if (pct <= 0) return '0%';
  if (pct >= 100) return '100%';
  if (pct < 0.1) return '<0.1%';
  if (pct > 99.9) return '>99.9%';
  return pct < 10 || pct > 90 ? `${pct.toFixed(1)}%` : `${pct.toFixed(0)}%`;
}

export function allocationSplit(cash: number, totalValue: number): AllocationSplit {
  if (!(totalValue > 0)) return { investedPct: 0, investedLabel: '0%', cashLabel: '100%' };
  const investedPct = Math.min(100, Math.max(0, ((totalValue - cash) / totalValue) * 100));
  return { investedPct, investedLabel: label(investedPct), cashLabel: label(100 - investedPct) };
}

/**
 * One-decimal share label for a single slice. toFixed(1) alone printed "0.0%"
 * for a position under 0.05% while the bar above it read "<0.1%"; any nonzero
 * share that would round to zero now shows as "<0.1%" instead.
 */
export function sliceShareLabel(pct: number): string {
  if (!(pct > 0)) return '0.0%';
  if (pct < 0.05) return '<0.1%';
  return `${pct.toFixed(1)}%`;
}
