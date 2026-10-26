/**
 * Wording for the in-app confirmation shown after a trade fills. On web,
 * showAlert is a browser pop-up, so the TradeScreen shows this inline instead.
 */
export interface FillMessage {
  title: string;
  detail: string;
}

export function fillMessage(
  action: 'buy' | 'sell',
  symbol: string,
  shares: number,
  price: number,
): FillMessage {
  return {
    title: action === 'buy' ? '✅ Order Filled' : '✅ Sold',
    detail: `${action === 'buy' ? 'Bought' : 'Sold'} ${shares.toFixed(4)} shares of ${symbol} at $${price.toFixed(2)}`,
  };
}
