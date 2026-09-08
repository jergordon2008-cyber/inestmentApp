/**
 * PortfolioPieChart — Redesigned with thick rounded arc segments
 *
 * Design inspired by modern finance app donut charts:
 * ─ SVG Circle with strokeDasharray for each segment (no complex path math)
 * ─ strokeLinecap="round" gives the signature pill-shaped segment ends
 * ─ Significant gap between segments for visual clarity
 * ─ Glow layer under each arc for depth
 * ─ Staggered grow-in animation (segments sweep in left-to-right)
 * ─ Tap any arc or legend row to inspect details in the center hole
 * ─ 2-column legend matching the reference design
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import Svg, { G, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { changeCaret, changeColor } from '../utils/change';

const { width: SW } = Dimensions.get('window');

// ── Chart geometry ────────────────────────────────────────────────────────────
const SIZE     = Math.min(SW - 40, 290);
const CX       = SIZE / 2;
const CY       = SIZE / 2;
const ARC_R    = SIZE * 0.308;          // center radius of the stroke band
const ARC_W    = SIZE * 0.138;          // stroke thickness (thick = pill look)
const C        = 2 * Math.PI * ARC_R;  // circumference ≈ 561 for SIZE=290
const GAP_DEG  = 5.5;                   // degrees of clear gap between segments

// ── Colour palette ────────────────────────────────────────────────────────────
const PALETTE = [
  '#6C47FF', // indigo
  '#34D399', // emerald
  '#F5A623', // gold
  '#F87171', // rose
  '#38BDF8', // sky
  '#A78BFA', // violet
  '#FB923C', // orange
  '#2DD4BF', // teal
];
const CASH_COLOR = '#3A3A5C'; // muted for cash slice

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SliceData {
  label:    string;
  value:    number;
  pct:      number;
  color:    string;
  startDeg: number;
  spanDeg:  number;
}

interface Props {
  positions: Array<{
    symbol:               string;
    currentValue:         number;
    unrealizedGain:       number;
    unrealizedGainPercent:number;
  }>;
  cash:       number;
  totalValue: number;
  theme:      any;
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedArc — single arc segment that sweeps in on mount
// ─────────────────────────────────────────────────────────────────────────────

interface ArcProps {
  startDeg:  number;
  spanDeg:   number;
  color:     string;
  delay:     number;
  selected:  boolean;
  dimmed:    boolean;   // non-selected when something else is selected
  onPress:   () => void;
}

function AnimatedArc({ startDeg, spanDeg, color, delay, selected, dimmed, onPress }: ArcProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [segLen, setSegLen]   = useState(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setSegLen((spanDeg / 360) * C * value);
    });

    Animated.timing(progress, {
      toValue:  1,
      duration: 950,
      delay,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => progress.removeListener(id);
  }, [spanDeg]);

  if (segLen < 0.5) return null;

  // strokeDashoffset: the G is rotated -90° so 0° = top (12 o'clock).
  // A negative offset shifts the dash start forward along the clockwise path.
  const dashOffset   = -((startDeg / 360) * C);
  const strokeW      = selected ? ARC_W + 8 : ARC_W;
  const opacity      = selected ? 1 : dimmed ? 0.38 : 0.88;
  const glowOpacity  = selected ? 0.28 : dimmed ? 0.04 : 0.12;
  const dashArray    = `${segLen} ${C + 20}`;

  return (
    <>
      {/* Soft glow halo under the arc */}
      <SvgCircle
        cx={CX} cy={CY} r={ARC_R}
        fill="none"
        stroke={color}
        strokeWidth={strokeW + 18}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        opacity={glowOpacity}
      />
      {/* Main arc (interactive) */}
      <SvgCircle
        cx={CX} cy={CY} r={ARC_R}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        opacity={opacity}
        onPress={onPress}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function PortfolioPieChart({ positions, cash, totalValue, theme }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Guard: totalValue of 0 would cause division-by-zero NaN in every percentage
  if (totalValue <= 0) return null;

  // Build raw slices
  const rawItems = [
    ...positions.map((p, i) => ({
      label: p.symbol,
      value: p.currentValue,
      pct:   (p.currentValue / totalValue) * 100,
      color: PALETTE[i % PALETTE.length],
    })),
    {
      label: 'Cash',
      value: cash,
      pct:   (cash / totalValue) * 100,
      color: CASH_COLOR,
    },
  ];

  // Compute start + span angles with gap
  let angle = 0;
  const slices: SliceData[] = rawItems.map(sl => {
    const totalDeg = (sl.pct / 100) * 360;
    const spanDeg  = Math.max(0, totalDeg - GAP_DEG);
    const s = { ...sl, startDeg: angle, spanDeg };
    angle += totalDeg;
    return s;
  });

  const sel          = selectedIndex !== null ? slices[selectedIndex] : null;
  const centerLabel  = sel ? sel.label : 'Portfolio';
  const centerValue  = sel
    ? `$${sel.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  const centerSub    = sel
    ? `${sel.pct.toFixed(1)}% of portfolio`
    : `${positions.length} position${positions.length !== 1 ? 's' : ''}`;
  const centerColor  = sel ? sel.color : theme.colors.primary;

  const toggleSelect = (i: number) =>
    setSelectedIndex(prev => (prev === i ? null : i));

  return (
    <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[s.heading, { color: theme.colors.textPrimary }]}>Allocation</Text>
      <Text style={[s.subheading, { color: theme.colors.textSecondary }]}>Tap a segment to inspect</Text>

      {/* ── Donut arc chart ── */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setSelectedIndex(null)}
        style={s.chartWrap}
      >
        <Svg width={SIZE} height={SIZE}>
          {/* Background track ring */}
          <SvgCircle
            cx={CX} cy={CY} r={ARC_R}
            fill="none"
            stroke={theme.colors.border}
            strokeWidth={ARC_W}
            opacity={0.5}
          />

          {/*
            All arcs live inside a G rotated -90° around the center.
            This makes angle 0° = top (12 o'clock), positive = clockwise.
          */}
          <G transform={`rotate(-90, ${CX}, ${CY})`}>
            {slices.map((sl, i) => (
              <AnimatedArc
                key={sl.label}
                startDeg={sl.startDeg}
                spanDeg={sl.spanDeg}
                color={sl.color}
                delay={i * 100}
                selected={selectedIndex === i}
                dimmed={selectedIndex !== null && selectedIndex !== i}
                onPress={() => toggleSelect(i)}
              />
            ))}
          </G>
        </Svg>

        {/* Center hole content */}
        <View style={s.centerHole} pointerEvents="none">
          <Text style={[s.centerLabel, { color: centerColor }]} numberOfLines={1}>
            {centerLabel}
          </Text>
          <Text style={[s.centerValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {centerValue}
          </Text>
          <Text style={[s.centerSub, { color: theme.colors.textTertiary }]}>
            {centerSub}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── 2-column legend ── */}
      <View style={[s.legend, { borderTopColor: theme.colors.border }]}>
        {slices.map((sl, i) => {
          const pos   = positions[i];  // undefined for Cash
          const isSel = selectedIndex === i;
          const isDim = selectedIndex !== null && !isSel;

          return (
            <TouchableOpacity
              key={sl.label}
              onPress={() => toggleSelect(i)}
              style={[
                s.legendItem,
                { borderBottomColor: theme.colors.border },
                isSel && { backgroundColor: sl.color + '10' },
              ]}
              activeOpacity={0.7}
            >
              {/* Colour dot */}
              <View style={[s.dot, { backgroundColor: sl.color, opacity: isDim ? 0.45 : 1 }]} />

              {/* Name */}
              <Text
                numberOfLines={1}
                style={[
                  s.legendName,
                  { color: isDim ? theme.colors.textTertiary : theme.colors.textPrimary },
                ]}
              >
                {sl.label}
              </Text>

              {/* Spacer */}
              <View style={{ flex: 1 }} />

              {/* Value */}
              <View style={s.legendRight}>
                <Text style={[s.legendVal, { color: isSel ? sl.color : theme.colors.textPrimary, opacity: isDim ? 0.45 : 1 }]}>
                  ${sl.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
                {pos && (
                  <View style={[s.legendGainRow, { opacity: isDim ? 0.35 : 1 }]}>
                    {changeCaret(pos.unrealizedGain) && (
                      <Ionicons
                        name={changeCaret(pos.unrealizedGain)!}
                        size={9}
                        color={changeColor(pos.unrealizedGain, theme)}
                      />
                    )}
                    <Text style={[s.legendGain, { color: changeColor(pos.unrealizedGain, theme) }]}>
                      {Math.abs(pos.unrealizedGainPercent).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },

  heading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingHorizontal: 22,
    marginBottom: 3,
  },
  subheading: {
    fontSize: 12,
    paddingHorizontal: 22,
    marginBottom: 18,
  },

  // Chart
  chartWrap: {
    alignSelf: 'center',
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  centerHole: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ARC_R * 0.55,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  centerValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 32,
    textAlign: 'center',
  },
  centerSub: {
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },

  // Legend — 2-column grid
  legend: {
    borderTopWidth: 0.5,
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    flexShrink: 0,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  legendRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  legendVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendGain: {
    fontSize: 10,
    fontWeight: '600',
  },
  legendGainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
