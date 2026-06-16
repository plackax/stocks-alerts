import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { FinnhubService } from './finnhub.service';
import { PriceUpdate } from './stock-price';

jest.mock('ws');

describe('FinnhubService price math', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockRejectedValue(new Error('offline'));
  });

  async function buildService() {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FinnhubService,
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('test-key') } },
      ],
    }).compile();
    return moduleRef.get(FinnhubService);
  }

  it('computes change percent relative to the first baseline tick when the REST seed fails', async () => {
    const service = await buildService();

    service.simulateTick('AAPL', 100);
    service.simulateTick('AAPL', 110);

    const prices = service.getPrices();
    const apple = prices.find((entry) => entry.symbol === 'AAPL');
    expect(apple).toMatchObject({ symbol: 'AAPL', name: 'Apple Inc.', price: 110, change: 10 });

    const untracked = prices.find((entry) => entry.symbol === 'GOOGL');
    expect(untracked).toMatchObject({ price: 0, change: 0 });
  });

  it('reports change 0 on the baseline tick and ignores unknown symbols', async () => {
    const service = await buildService();

    service.simulateTick('MSFT', 200);
    service.simulateTick('UNKNOWN', 999);

    const prices = service.getPrices();
    expect(prices.find((entry) => entry.symbol === 'MSFT')).toMatchObject({ price: 200, change: 0 });
    expect(prices.some((entry) => entry.symbol === 'UNKNOWN')).toBe(false);
  });

  it('seeds the baseline from the REST previous-close so change reflects the daily move', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ pc: 100 }) });
    const service = await buildService();

    service.simulateTick('AAPL', 110);
    await new Promise((resolve) => setImmediate(resolve));

    const apple = service.getPrices().find((entry) => entry.symbol === 'AAPL');
    expect(apple).toMatchObject({ price: 110, change: 10 });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('symbol=AAPL'));
  });

  it('coalesces ticks and flushes only changed symbols to flush listeners', async () => {
    jest.useFakeTimers();
    const service = await buildService();
    const batches: PriceUpdate[][] = [];
    service.onFlush((updates) => batches.push(updates));
    service.onModuleInit();

    service.simulateTick('AAPL', 100);
    service.simulateTick('AAPL', 105);
    service.simulateTick('MSFT', 200);

    jest.advanceTimersByTime(400);

    expect(batches).toHaveLength(1);
    const symbols = batches[0].map((update) => update.symbol).sort();
    expect(symbols).toEqual(['AAPL', 'MSFT']);
    const apple = batches[0].find((update) => update.symbol === 'AAPL');
    expect(apple?.price).toBe(105);

    jest.advanceTimersByTime(400);
    expect(batches).toHaveLength(1);

    service.onModuleDestroy();
    jest.useRealTimers();
  });
});
