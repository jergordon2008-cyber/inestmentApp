/**
 * Reported earnings (EPS actual vs. estimate), for the earnings signal.
 *
 * Turned off for now: this came from Finnhub through a key in the app
 * bundle, and keys now live only in the price robot (S6). Returning no
 * quarters means no earnings signal is shown — never a substitute number.
 * To bring it back, serve /stock/earnings through the robot and fetch it here.
 */
export interface EarningsSurprise {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

export async function getEarningsSurprises(_symbol: string): Promise<EarningsSurprise[]> {
  return [];
}
