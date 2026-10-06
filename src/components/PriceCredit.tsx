/**
 * One small line next to prices: when they're from ("Prices as of 3:58 PM",
 * "Closing prices · Oct 2", "Saved prices from …") and the credit "Prices
 * from Alpaca/Finnhub" that both providers' display approvals ask for.
 *
 * Pass `label` to show a stock's own label (e.g. on the stock page) instead
 * of the shared one. In local simulation or on the January snapshot there's
 * no provider data on screen, so no credit is shown.
 */
import React, { useSyncExternalStore } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getPriceStatus, getPricesLabel, PRICE_CREDIT, subscribePriceStatus } from '../services/priceRobotAdapter';

interface Props {
  label?: string;
  style?: StyleProp<TextStyle>;
}

export function PriceCredit({ label, style }: Props) {
  const { theme } = useTheme();
  const status = useSyncExternalStore(subscribePriceStatus, getPriceStatus, getPriceStatus);
  const showCredit = status.kind === 'live' || status.kind === 'saved';
  const text = [label ?? getPricesLabel(status), showCredit ? PRICE_CREDIT : null].filter(Boolean).join(' · ');
  return (
    <Text
      style={[{ fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: theme.colors.textTertiary }, style]}
      accessibilityRole="text"
      numberOfLines={2}
    >
      {text}
    </Text>
  );
}
