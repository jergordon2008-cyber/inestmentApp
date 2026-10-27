/**
 * Stock search ranking. A plain "symbol or name contains the query" filter
 * listed matches in market-cap order, so a short query like "EA" surfaced
 * UnitedHealth (Unit-ed-H-ea-lth) ahead of any ticker. Symbol matches come
 * first (exact, then prefix, then anywhere), then name matches (a word that
 * starts with the query before one that merely contains it); ties go to the
 * larger company. A query of one or two letters is read as a ticker, so it
 * only matches names at the start of a word: "EA" no longer finds
 * UnitedHealth at all.
 */
interface Searchable {
  symbol: string;
  name: string;
  marketCap?: number;
}

function tier(s: Searchable, q: string): number {
  const sym = s.symbol.toLowerCase();
  if (sym === q) return 0;
  if (sym.startsWith(q)) return 1;
  if (sym.includes(q)) return 2;
  const name = s.name.toLowerCase();
  if (name.startsWith(q) || name.includes(` ${q}`)) return 3;
  if (q.length >= 3 && name.includes(q)) return 4;
  return -1;
}

/** The stocks matching `query`, best match first. An empty query matches nothing here. */
export function rankStockSearch<T extends Searchable>(stocks: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return stocks
    .map(s => ({ s, t: tier(s, q) }))
    .filter(x => x.t >= 0)
    .sort((a, b) => a.t - b.t || (b.s.marketCap ?? 0) - (a.s.marketCap ?? 0))
    .map(x => x.s);
}
