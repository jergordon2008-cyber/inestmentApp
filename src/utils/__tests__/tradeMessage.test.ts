import { describe, it, expect } from '@jest/globals';
import { fillMessage } from '../tradeMessage';

describe('fillMessage', () => {
  it('words a buy as a filled order', () => {
    expect(fillMessage('buy', 'AAPL', 2.5, 190.123)).toEqual({
      title: '✅ Order Filled',
      detail: 'Bought 2.5000 shares of AAPL at $190.12',
    });
  });

  it('words a sell as sold', () => {
    expect(fillMessage('sell', 'MSFT', 1, 400)).toEqual({
      title: '✅ Sold',
      detail: 'Sold 1.0000 shares of MSFT at $400.00',
    });
  });
});
