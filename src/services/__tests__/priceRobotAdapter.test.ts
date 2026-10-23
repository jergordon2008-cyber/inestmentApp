/**
 * Price robot client: live → saved → snapshot fallbacks, timeouts, labels.
 * Each test loads fresh module copies with jest.isolateModules. Note Expo's
 * Babel preset inlines EXPO_PUBLIC_* values when a file is first transformed
 * (as production builds do), so the URL is set before the first require and
 * this file can't also test the no-URL simulation mode.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

type Adapter = typeof import('../priceRobotAdapter');
type Store = typeof import('../stockDataService');
type Facade = typeof import('../marketDataFacade');

const URL_BASE = 'https://robot.test';
const T = '2026-10-07T17:59:30.000Z';
const AS_OF = '2026-10-07T18:00:00.000Z';
const AT = '2026-10-07T17:59:40.000Z';   // confirmed 20 s before the run that wrote the blob

function pricesBody(over: Record<string, unknown> = {}) {
  return {
    v: 1,
    asOf: AS_OF,
    market: 'open',
    quotes: {
      AAPL: { p: 333.75, pc: 330.44, t: T, src: 'finnhub', hi: 334.5, lo: 330.6, at: AT },
      VOO: { p: 707.54, pc: 702.35, t: T, src: 'finnhub', at: AT },
      XYZ: { p: 74.35, pc: 74.03, t: T, src: 'finnhub', at: AT },
      BAD: { p: -1, t: 'nope', src: 'finnhub' },
    },
    ...over,
  };
}

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

type Storage = { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void>; clear(): Promise<void> };

interface Loaded { adapter: Adapter; store: Store; facade: Facade; storage: Storage }

async function load(): Promise<Loaded> {
  process.env.EXPO_PUBLIC_PRICE_API_URL = URL_BASE;
  let out!: Loaded;
  jest.isolateModules(() => {
    const storageModule = jest.requireMock<{ default?: Storage } & Storage>('@react-native-async-storage/async-storage');
    out = {
      adapter: jest.requireActual<Adapter>('../priceRobotAdapter'),
      store: jest.requireActual<Store>('../stockDataService'),
      facade: jest.requireActual<Facade>('../marketDataFacade'),
      storage: storageModule.default ?? storageModule,
    };
  });
  return out;
}

const fetchMock = jest.fn<(url: string, init?: RequestInit) => Promise<Response>>();
beforeEach(() => {
  fetchMock.mockReset();
  (global as { fetch: unknown }).fetch = fetchMock;
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('live prices from the robot', () => {
  it('applies every valid quote, marks it live, and saves it on the device', async () => {
    const { adapter, store, storage } = await load();
    await storage.clear();
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    expect(await adapter.refreshPrices()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${URL_BASE}/v1/prices`, expect.anything());
    const aapl = store.getStock('AAPL')!;
    expect(aapl).toMatchObject({ price: 333.75, previousClose: 330.44, lastUpdated: T, priceSource: 'finnhub', priceOrigin: 'live', dayHigh: 334.5 });
    expect(store.isLiveQuote(aapl)).toBe(true);
    expect(store.getStock('VOO')?.priceSource).toBe('finnhub');
    expect(adapter.getPriceStatus()).toMatchObject({ kind: 'live', market: 'open' });
    expect(JSON.parse((await storage.getItem('priceRobot:v1'))!).quotes.AAPL.p).toBe(333.75);
  });

  it('concurrent refreshes share one request', async () => {
    const { adapter } = await load();
    fetchMock.mockReturnValue(okJson(pricesBody()));
    await Promise.all([adapter.refreshPrices(), adapter.refreshPrices(), adapter.refreshPrices()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a failed refresh leaves the snapshot in place, not blank', async () => {
    const { adapter, store } = await load();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await adapter.refreshPrices()).toBe(false);
    const aapl = store.getStock('AAPL')!;
    expect(aapl.price).toBeGreaterThan(0);
    expect(store.isLiveQuote(aapl)).toBe(false);
    expect(adapter.getPricesLabel()).toBe('Not live · Jan 15 snapshot');
  });

  it('gives up after 5 seconds instead of hanging', async () => {
    jest.useFakeTimers();
    const { adapter } = await load();
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_res, rej) => {
      init.signal?.addEventListener('abort', () => rej(new Error('aborted')));
    }));
    const p = adapter.refreshPrices();
    jest.advanceTimersByTime(5000);
    await expect(p).resolves.toBe(false);
  });

  it('rejects a malformed payload', async () => {
    const { adapter } = await load();
    fetchMock.mockReturnValueOnce(okJson({ error: 'no prices yet' }));
    expect(await adapter.refreshPrices()).toBe(false);
    expect(adapter.getPriceStatus().kind).toBe('snapshot');
  });

  it('sends the student\'s holdings so the robot refreshes them first', async () => {
    const { adapter } = await load();
    adapter.setHeldSymbolsProvider(() => ['voo', 'AAPL', 'VOO', 'bad symbol!']);
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    await adapter.refreshPrices();
    expect(fetchMock).toHaveBeenCalledWith(`${URL_BASE}/v1/prices?held=AAPL,VOO`, expect.anything());
  });

  it('a holdings provider that throws doesn\'t stop the refresh', async () => {
    const { adapter } = await load();
    adapter.setHeldSymbolsProvider(() => { throw new Error('store not ready'); });
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    expect(await adapter.refreshPrices()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(`${URL_BASE}/v1/prices`, expect.anything());
  });

  it('during the session, the 5 minutes count from the robot\'s confirmation, not from this fetch', async () => {
    const { adapter, store } = await load();
    // AAPL confirmed 4 min before the run; VOO 20 s before. Device clock is irrelevant.
    fetchMock.mockReturnValueOnce(okJson(pricesBody({ quotes: {
      AAPL: { p: 333.75, pc: 330.44, t: T, src: 'finnhub', at: '2026-10-07T17:56:00.000Z' },
      VOO: { p: 707.54, pc: 702.35, t: T, src: 'finnhub', at: AT },
      KO: { p: 70, pc: 69, t: T, src: 'finnhub' },                  // never confirmed (old blob)
    } })));
    await adapter.refreshPrices();
    const now = Date.now();
    expect(store.isLiveQuote(store.getStock('AAPL'))).toBe(true);
    expect(store.isLiveQuote(store.getStock('KO'))).toBe(false);
    jest.spyOn(Date, 'now').mockReturnValue(now + 61_000);          // 5 min + 1 s since AAPL's confirmation
    expect(store.isLiveQuote(store.getStock('AAPL'))).toBe(false);
    expect(store.isLiveQuote(store.getStock('VOO'))).toBe(true);
  });

  it('after the close, closing prices count from this fetch', async () => {
    const { adapter, store } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody({ market: 'closed', quotes: { AAPL: { p: 1, pc: 1, t: T, src: 'finnhub', at: '2026-10-07T12:00:00.000Z' } } })));
    await adapter.refreshPrices();
    expect(store.isLiveQuote(store.getStock('AAPL'))).toBe(true);
  });

  it('a live price stops counting as confirmed after 5 minutes without a refresh', async () => {
    const { adapter, store } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    await adapter.refreshPrices();
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + store.CONFIRMED_FOR_MS + 1000);
    const aapl = store.getStock('AAPL')!;
    expect(aapl.priceOrigin).toBe('saved');
    expect(store.isLiveQuote(aapl)).toBe(false);
  });
});

describe('saved prices (device storage)', () => {
  it('shows them right away, labelled saved, but never as confirmed', async () => {
    const { adapter, store, facade, storage } = await load();
    await storage.setItem('priceRobot:v1', JSON.stringify(pricesBody()));
    expect(await adapter.loadSavedPrices()).toBe(true);
    const aapl = store.getStock('AAPL')!;
    expect(aapl).toMatchObject({ price: 333.75, priceOrigin: 'saved' });
    expect(store.isLiveQuote(aapl)).toBe(false);
    expect(adapter.getPricesLabel()).toMatch(/^Saved prices from /);
    // Never written into positions.
    expect(facade.buildPositionPriceMap([aapl])).toEqual({});
  });

  it('never replace a live price', async () => {
    const { adapter, store, storage } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    await adapter.refreshPrices();
    await storage.setItem('priceRobot:v1', JSON.stringify(pricesBody({ quotes: { AAPL: { p: 1, pc: 1, t: '2026-10-08T00:00:00.000Z', src: 'finnhub' } } })));
    await adapter.loadSavedPrices();
    expect(store.getStock('AAPL')).toMatchObject({ price: 333.75, priceOrigin: 'live' });
  });

  it('startPriceRobot: saved first, then live', async () => {
    const { adapter, store, storage } = await load();
    await storage.setItem('priceRobot:v1', JSON.stringify(pricesBody({ quotes: { AAPL: { p: 300, pc: 299, t: '2026-10-06T19:59:00.000Z', src: 'finnhub' } } })));
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    await adapter.startPriceRobot();
    adapter.stopPriceRobot();
    expect(store.getStock('AAPL')).toMatchObject({ price: 333.75, priceOrigin: 'live' });
  });
});

describe('polling', () => {
  it('a second start (React dev double effect) does not add a second poller', async () => {
    jest.useFakeTimers();
    const { adapter } = await load();
    fetchMock.mockImplementation(() => okJson(pricesBody()));
    const a = adapter.startPriceRobot();
    const b = adapter.startPriceRobot();
    await Promise.all([a, b]);
    const calls = fetchMock.mock.calls.length;
    await jest.advanceTimersByTimeAsync(adapter.POLL_MS);
    expect(fetchMock.mock.calls.length - calls).toBe(1);
    adapter.stopPriceRobot();
  });
});

describe('facade', () => {
  it('fetchStock asks the robot for that ticker (and makes it a priority)', async () => {
    const { facade } = await load();
    fetchMock.mockReturnValueOnce(okJson({ symbol: 'AAPL', asOf: '2026-10-07T18:01:10.000Z', market: 'open', quote: { p: 340, pc: 330, t: '2026-10-07T18:01:00.000Z', src: 'finnhub', at: '2026-10-07T18:01:05.000Z' } }));
    const s = await facade.fetchStock('AAPL');
    expect(fetchMock).toHaveBeenCalledWith(`${URL_BASE}/v1/quote/AAPL`, expect.anything());
    expect(s).toMatchObject({ price: 340, priceOrigin: 'live' });
  });

  it('fetchStock falls back to what is on the device when the robot is down', async () => {
    const { facade } = await load();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const s = await facade.fetchStock('AAPL');
    expect(s?.price).toBeGreaterThan(0);
    expect(facade.isLiveQuote(s)).toBe(false); // so TradeScreen won't fill on it
  });

  it('fetchStocks refreshes at most once per poll interval', async () => {
    const { facade } = await load();
    fetchMock.mockReturnValue(okJson(pricesBody()));
    await facade.fetchStocks(['AAPL']);
    await facade.fetchStocks(['VOO']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('per-stock label names the time and source', async () => {
    const { adapter, facade, store } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    await adapter.refreshPrices();
    jest.spyOn(Date.prototype, 'toDateString').mockReturnValue('same day');
    expect(facade.getDataSourceLabel(store.getStock('AAPL'))).toMatch(/^Price as of .+ · Finnhub$/);
  });

  it('after the close the labels say closing prices', async () => {
    const { adapter, facade, store } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody({ market: 'after-close' })));
    await adapter.refreshPrices();
    expect(adapter.getPricesLabel()).toMatch(/^Closing prices · /);
    expect(facade.getDataSourceLabel(store.getStock('AAPL'))).toMatch(/^Closing price · .+ · Finnhub$/);
  });
});

describe('ticker change SQ → XYZ', () => {
  it('lists XYZ, and an old SQ position still gets the XYZ price under its own symbol', async () => {
    const { adapter, store, facade } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody()));
    await adapter.refreshPrices();
    expect(store.getAllStocks().some(s => s.symbol === 'SQ')).toBe(false);
    expect(store.getStock('XYZ')?.name).toBe('Block Inc.');
    const sq = store.getStock('SQ')!;
    expect(sq).toMatchObject({ symbol: 'SQ', price: 74.35, priceOrigin: 'live' });
    expect(facade.buildPositionPriceMap([sq])).toEqual({ SQ: 74.35 });
  });
});

describe('retired ticker EA', () => {
  it('ignores robot prices for EA, never asks the robot for it, and never marks a position with it', async () => {
    const { adapter, store, facade } = await load();
    const body = pricesBody();
    (body.quotes as Record<string, unknown>).EA = { p: 140, pc: 139, t: T, src: 'finnhub' };
    fetchMock.mockReturnValueOnce(okJson(body));
    await adapter.refreshPrices();
    expect(store.getStock('EA')?.priceOrigin).toBeUndefined();
    expect(facade.isLiveQuote(store.getStock('EA'))).toBe(false);

    fetchMock.mockClear();
    const ea = await facade.fetchStock('EA');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ea?.symbol).toBe('EA');

    const map = facade.buildPositionPriceMap([store.getStock('EA')!, store.getStock('AAPL')!]);
    expect(map).toEqual({ AAPL: 333.75 });
    expect(store.getAllStocks().some(s => s.symbol === 'EA')).toBe(false);
  });

  it('other tickers still need a live quote: a saved price is not one', async () => {
    const { store, facade } = await load();
    store.applyLiveQuotes({ AAPL: { p: 300, pc: 299, t: T, src: 'finnhub' } }, 'saved', 0);
    const aapl = store.getStock('AAPL')!;
    expect(facade.isLiveQuote(aapl)).toBe(false);
    expect(facade.buildPositionPriceMap([aapl])).toEqual({});
  });
});

describe('credit', () => {
  it('names the source', async () => {
    expect((await load()).adapter.PRICE_CREDIT).toBe('Prices from Finnhub');
  });

  it('a price saved on a device before the switch still says Alpaca', async () => {
    const { adapter } = await load();
    expect(adapter.getStockPriceLabel({ lastUpdated: T, priceSource: 'alpaca', priceOrigin: 'saved' }, { kind: 'saved', asOf: T, market: 'open', latestTrade: T })).toMatch(/ · Alpaca$/);
  });
});
