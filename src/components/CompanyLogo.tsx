import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LOGO_MAP: Record<string, string> = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com',
  GOOG: 'google.com', AMZN: 'amazon.com', META: 'meta.com',
  NVDA: 'nvidia.com', TSLA: 'tesla.com', JPM: 'jpmorganchase.com',
  V: 'visa.com', WMT: 'walmart.com', JNJ: 'jnj.com',
  PG: 'pg.com', MA: 'mastercard.com', HD: 'homedepot.com',
  CVX: 'chevron.com', KO: 'coca-cola.com', PEP: 'pepsico.com',
  MRK: 'merck.com', ABBV: 'abbvie.com', PFE: 'pfizer.com',
  TMO: 'thermofisher.com', COST: 'costco.com', AVGO: 'broadcom.com',
  NKE: 'nike.com', MCD: 'mcdonalds.com', CSCO: 'cisco.com',
  DIS: 'thewaltdisneycompany.com', ADBE: 'adobe.com',
  NFLX: 'netflix.com', INTC: 'intel.com', CMCSA: 'comcast.com',
  XOM: 'exxonmobil.com', BAC: 'bankofamerica.com', UNH: 'unitedhealthgroup.com',
  VZ: 'verizon.com', T: 'att.com', IBM: 'ibm.com',
  GE: 'ge.com', F: 'ford.com', 'BRK.B': 'berkshirehathaway.com',
  SPY: 'ssga.com', QQQ: 'invesco.com', VOO: 'vanguard.com',
  VTI: 'vanguard.com', PYPL: 'paypal.com', CRM: 'salesforce.com',
  ORCL: 'oracle.com', AMD: 'amd.com', QCOM: 'qualcomm.com',
  TXN: 'ti.com', SBUX: 'starbucks.com', LOW: 'lowes.com',
};

function getInitials(symbol: string) {
  return symbol.slice(0, 2).toUpperCase();
}

function getLogoColor(symbol: string) {
  const colors = ['#00D97E', '#4D9EFF', '#F0B429', '#FF4D6A', '#9B6EFF', '#00C8E0', '#F0A020'];
  const idx = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

interface Props { symbol: string; size?: number; style?: any; }

export function CompanyLogo({ symbol, size = 44, style }: Props) {
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);
  const domain = LOGO_MAP[symbol];
  const color = getLogoColor(symbol);
  const radius = size * 0.25;

  if (domain && !failed) {
    return (
      <Image
        source={{ uri: `https://logo.clearbit.com/${domain}?size=${size * 2}` }}
        style={[{ width: size, height: size, borderRadius: radius }, style]}
        onError={() => setFailed(true)}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, backgroundColor: color + '20', borderWidth: 1, borderColor: color + '40', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color, fontSize: size * 0.33, fontWeight: '800', letterSpacing: -0.5 }}>
        {getInitials(symbol)}
      </Text>
    </View>
  );
}
