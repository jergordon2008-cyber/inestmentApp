import { describe, expect, it } from '@jest/globals';
import { rankStockSearch } from '../stockSearch';
import { searchStocks } from '../../services/stockDataService';

const stocks = [
  { symbol: 'UNH', name: 'UnitedHealth Group', marketCap: 500 },
  { symbol: 'EAT', name: 'Brinker International', marketCap: 5 },
  { symbol: 'EA', name: 'Electronic Arts', marketCap: 50 },
  { symbol: 'AAPL', name: 'Apple', marketCap: 3000 },
  { symbol: 'PEAR', name: 'Pear Co', marketCap: 1 },
  { symbol: 'META', name: 'Meta Platforms', marketCap: 1200 },
];

describe('rankStockSearch', () => {
  it('exact symbol, then symbol prefix, then symbol contains, then name matches', () => {
    expect(rankStockSearch(stocks, 'EA').map(s => s.symbol)).toEqual(['EA', 'EAT', 'PEAR']);
  });

  it('a one- or two-letter query matches names only at a word start', () => {
    expect(rankStockSearch(stocks, 'ea').map(s => s.symbol)).not.toContain('UNH');
    expect(rankStockSearch(stocks, 'hea').map(s => s.symbol)).toEqual(['UNH']);
  });

  it('name matches rank after symbol matches, word-start before substring', () => {
    expect(rankStockSearch(stocks, 'pl').map(s => s.symbol)).toEqual(['AAPL', 'META']);
    expect(rankStockSearch(stocks, 'Electronic').map(s => s.symbol)).toEqual(['EA']);
  });

  it('is case-insensitive and ignores surrounding spaces; empty matches nothing', () => {
    expect(rankStockSearch(stocks, ' aapl ').map(s => s.symbol)).toEqual(['AAPL']);
    expect(rankStockSearch(stocks, '  ')).toEqual([]);
  });
});

describe('searchStocks (app list)', () => {
  it('lists a symbol match before name matches', () => {
    const syms = searchStocks('AA').map(s => s.symbol);
    expect(syms[0]).toBe('AAPL');
  });

  it('the retired EA stays unfindable, and "EA" no longer lists UnitedHealth', () => {
    const syms = searchStocks('EA').map(s => s.symbol);
    expect(syms).not.toContain('EA');
    expect(syms).not.toContain('UNH');
  });
});
