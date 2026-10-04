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

function pricesBody(over: Record<string, unknown> = {}) {
  return {
    v: 1,
    asOf: '2026-10-07T18:00:00.000Z',
    market: 'open',
    final: false,
    session: { date: '2026-10-07' },
    alpacaOk: true,
    quotes: {
      AAPL: { p: 333.75, pc: 330.44, t: T, src: 'alpaca', hi: 334.5, lo: 330.6 },
      VOO: { p: 707.54, pc: 702.35, t: T, src: 'finnhub' },
      XYZ: { p: 74.35, pc: 74.03, t: T, src: 'alpaca' },
      BAD: { p: -1, t: 'nope', src: 'alpaca' },
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
    expect(aapl).toMatchObject({ price: 333.75, previousClose: 330.44, lastUpdated: T, priceSource: 'alpaca', priceOrigin: 'live', dayHigh: 334.5 });
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
    await storage.setItem('priceRobot:v1', JSON.stringify(pricesBody({ quotes: { AAPL: { p: 1, pc: 1, t: '2026-10-08T00:00:00.000Z', src: 'alpaca' } } })));
    await adapter.loadSavedPrices();
    expect(store.getStock('AAPL')).toMatchObject({ price: 333.75, priceOrigin: 'live' });
  });

  it('startPriceRobot: saved first, then live', async () => {
    const { adapter, store, storage } = await load();
    await storage.setItem('priceRobot:v1', JSON.stringify(pricesBody({ quotes: { AAPL: { p: 300, pc: 299, t: '2026-10-06T19:59:00.000Z', src: 'alpaca' } } })));
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
  it('fetchStock asks the robot for that ticker (jumps the queue)', async () => {
    const { facade } = await load();
    fetchMock.mockReturnValueOnce(okJson({ symbol: 'AAPL', quote: { p: 340, pc: 330, t: '2026-10-07T18:01:00.000Z', src: 'alpaca' } }));
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

  it('fetchStocks refreshes at most once per 2 minutes', async () => {
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
    expect(facade.getDataSourceLabel(store.getStock('AAPL'))).toMatch(/^Price as of .+ · Alpaca$/);
    expect(facade.getDataSourceLabel(store.getStock('VOO'))).toMatch(/ · Finnhub$/);
  });

  it('after the close the labels say closing prices', async () => {
    const { adapter, facade, store } = await load();
    fetchMock.mockReturnValueOnce(okJson(pricesBody({ market: 'after-close', final: true })));
    await adapter.refreshPrices();
    expect(adapter.getPricesLabel()).toMatch(/^Closing prices · /);
    expect(facade.getDataSourceLabel(store.getStock('AAPL'))).toMatch(/^Closing price · .+ · Alpaca$/);
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

describe('credit', () => {
  it('names both providers', async () => {
    expect((await load()).adapter.PRICE_CREDIT).toBe('Prices from Alpaca/Finnhub');
  });
});
