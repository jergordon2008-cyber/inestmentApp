import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme, colors } from '../constants/theme';
import { setFontScaleMultiplier } from '../constants/responsive';

type ThemeMode = 'dark' | 'light' | 'system';

export const ACCENT_OPTIONS = [
  { name: 'Electric Green', value: '#00D084', glow: 'rgba(0,208,132,0.12)', dim: '#00B873' }, // default — brand signature
  { name: 'Deep Purple',    value: '#6C47FF', glow: 'rgba(108,71,255,0.12)', dim: '#5934E0' }, // learning, AI, depth
  { name: 'Indigo',   value: '#818CF8', glow: '#818CF81A', dim: '#6366F1' },
  { name: 'Sky',      value: '#38BDF8', glow: '#38BDF81A', dim: '#0284C7' },
  { name: 'Rose',     value: '#F472B6', glow: '#F472B61A', dim: '#DB2777' },
  { name: 'Amber',    value: '#F5A623', glow: 'rgba(245,166,35,0.12)', dim: '#D9911A' },
  { name: 'Coral',    value: '#F87171', glow: '#F871711A', dim: '#EF4444' },
  { name: 'Teal',     value: '#2DD4BF', glow: '#2DD4BF1A', dim: '#14B8A6' },
];

export type FontSize = 'small' | 'default' | 'large' | 'xlarge';
export const FONT_SCALE: Record<FontSize, number> = { small: 0.9, default: 1.0, large: 1.1, xlarge: 1.2 };

export type ChartStyle = 'line' | 'area' | 'candle';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  accentColor: string;
  fontSize: FontSize;
  chartStyle: ChartStyle;
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setFontSize: (size: FontSize) => void;
  setChartStyle: (style: ChartStyle) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function buildTheme(base: Theme, accent: string, fontScale: number): Theme {
  const opt = ACCENT_OPTIONS.find(a => a.value === accent) ?? ACCENT_OPTIONS[0];
  const scaledTypography = Object.fromEntries(
    Object.entries(base.typography).map(([key, style]) => [
      key,
      {
        ...style,
        fontSize: Math.round((style as any).fontSize * fontScale),
        lineHeight: (style as any).lineHeight ? Math.round((style as any).lineHeight * fontScale) : undefined,
      },
    ])
  ) as typeof base.typography;
  return {
    ...base,
    typography: scaledTypography,
    colors: {
      ...base.colors,
      primary:     opt.value,
      primaryDim:  opt.dim,
      primaryGlow: opt.glow,
      success:     opt.value,
      successDim:  opt.dim,
      successGlow: opt.glow,
    },
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColorState] = useState('#00D084');
  const [fontSize, setFontSizeState] = useState<FontSize>('default');
  const [chartStyle, setChartStyleState] = useState<ChartStyle>('area');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedMode, savedAccent, savedFont, savedChart] = await Promise.all([
          AsyncStorage.getItem('@investapp:theme_mode'),
          AsyncStorage.getItem('@investapp:accent_color'),
          AsyncStorage.getItem('@investapp:font_size'),
          AsyncStorage.getItem('@investapp:chart_style'),
        ]);
        if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'system') setModeState(savedMode);
        if (savedAccent && ACCENT_OPTIONS.find(a => a.value === savedAccent)) setAccentColorState(savedAccent);
        if (savedFont === 'small' || savedFont === 'default' || savedFont === 'large' || savedFont === 'xlarge') setFontSizeState(savedFont as FontSize);
        if (savedChart === 'line' || savedChart === 'area' || savedChart === 'candle') setChartStyleState(savedChart);
      } catch {}
      finally { setIsLoaded(true); }
    })();
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('@investapp:theme_mode', newMode).catch(() => {});
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    AsyncStorage.setItem('@investapp:accent_color', color).catch(() => {});
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    AsyncStorage.setItem('@investapp:font_size', size).catch(() => {});
  };

  const setChartStyle = (style: ChartStyle) => {
    setChartStyleState(style);
    AsyncStorage.setItem('@investapp:chart_style', style).catch(() => {});
  };

  const toggleTheme = () => setMode(mode === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    setFontScaleMultiplier(FONT_SCALE[fontSize]);
  }, [fontSize]);

  const effectiveMode = mode === 'system' ? (systemColorScheme || 'dark') : mode;
  const baseTheme = effectiveMode === 'dark' ? darkTheme : lightTheme;
  const theme = buildTheme(baseTheme, accentColor, FONT_SCALE[fontSize]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, mode, accentColor, fontSize, chartStyle, setMode, setAccentColor, setFontSize, setChartStyle, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
