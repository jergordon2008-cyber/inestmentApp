/**
 * BehaviorCoachModal — Emotional Coaching Interceptor
 *
 * Surfaces when the user is about to make a behaviorally-biased trade:
 *  • Panic selling (selling at >8% loss without a plan)
 *  • Overtrading (4+ trades in a session)
 *  • Selling a winner too early (selling at <15% gain within 2 weeks)
 *
 * Shows the bias name, its psychological explanation, historical data,
 * and lets the user either "Override with Reason" or "Hold for Now".
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { height: SH } = Dimensions.get('window');

export type BehaviorBias =
  | 'panic_sell'       // Selling at significant loss
  | 'overtrading'      // Too many trades
  | 'premature_sell';  // Selling a winner too early

interface Props {
  visible:       boolean;
  bias:          BehaviorBias;
  lossPercent?:  number;   // for panic_sell
  gainPercent?:  number;   // for premature_sell
  tradeCount?:   number;   // for overtrading
  onOverride:    () => void;  // proceed anyway
  onHold:        () => void;  // cancel the trade
}

const BIAS_CONFIG: Record<BehaviorBias, {
  emoji:       string;
  title:       string;
  bias:        string;
  explanation: string;
  stat:        string;
  holdLabel:   string;
  color:       string;
}> = {
  panic_sell: {
    emoji:       '😰',
    title:       'Panic Selling Alert',
    bias:        'Loss Aversion',
    explanation: 'Your brain processes investment losses 2.5× more painfully than equivalent gains feel good. This makes panic-selling feel rational when it usually isn\'t. Most drawdowns of this size recover within weeks.',
    stat:        'Investors who sold during the 2020 COVID crash (-34%) and waited to "feel safe" before re-entering missed the entire 100% recovery.',
    holdLabel:   'Hold Position',
    color:       '#F87171',
  },
  overtrading: {
    emoji:       '⚡',
    title:       'Overtrading Warning',
    bias:        'Action Bias',
    explanation: 'The urge to "do something" is one of the most expensive biases in investing. Each unnecessary trade adds costs and often destroys value. Buffett says his best investment is often the one he didn\'t make.',
    stat:        'A study of 66,400 investor accounts found that those who traded most frequently earned 6.5% less per year than those who traded least.',
    holdLabel:   'Step Back',
    color:       '#F5A623',
  },
  premature_sell: {
    emoji:       '✂️',
    title:       'Selling Your Winner Early',
    bias:        'Disposition Effect',
    explanation: 'Investors systematically sell winners too early and hold losers too long — the exact opposite of what produces returns. You feel "locking in the gain" is prudent, but winners often keep winning.',
    stat:        'Stocks that have risen 20%+ in the past 6 months outperform the market by an average of 4.4% over the next 12 months (momentum factor).',
    holdLabel:   'Let It Run',
    color:       '#6C47FF',
  },
};

export function BehaviorCoachModal({
  visible, bias, lossPercent, gainPercent, tradeCount,
  onOverride, onHold,
}: Props) {
  const { theme } = useTheme();
  const cfg = BIAS_CONFIG[bias];

  const slideY = useRef(new Animated.Value(SH)).current;
  const fadeA  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeA, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeA, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: SH, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const contextLine = (() => {
    if (bias === 'panic_sell' && lossPercent)
      return `You're about to sell at a ${Math.abs(lossPercent).toFixed(1)}% loss.`;
    if (bias === 'premature_sell' && gainPercent)
      return `You're selling a position up ${gainPercent.toFixed(1)}%.`;
    if (bias === 'overtrading' && tradeCount)
      return `You've made ${tradeCount} trades this session.`;
    return '';
  })();

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* Dim overlay */}
      <Animated.View style={[bc.overlay, { opacity: fadeA }]} />

      {/* Bottom sheet */}
      <Animated.View style={[bc.sheet, { backgroundColor: theme.colors.surfaceElevated, transform: [{ translateY: slideY }] }]}>
        {/* Drag handle */}
        <View style={bc.handle} />

        {/* Bias header */}
        <View style={bc.header}>
          <Text style={bc.emoji}>{cfg.emoji}</Text>
          <View style={{ flex: 1 }}>
            <View style={[bc.biasPill, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
              <Text style={[bc.biasName, { color: cfg.color }]}>{cfg.bias.toUpperCase()}</Text>
            </View>
            <Text style={[bc.title, { color: theme.colors.textPrimary }]}>{cfg.title}</Text>
          </View>
        </View>

        {/* Context line */}
        {!!contextLine && (
          <View style={[bc.contextBox, { backgroundColor: cfg.color + '14', borderColor: cfg.color + '30' }]}>
            <Ionicons name="warning-outline" size={15} color={cfg.color} />
            <Text style={[bc.contextText, { color: cfg.color }]}>{contextLine}</Text>
          </View>
        )}

        {/* Explanation */}
        <Text style={[bc.explanation, { color: theme.colors.textSecondary }]}>
          {cfg.explanation}
        </Text>

        {/* Research stat */}
        <View style={[bc.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="bar-chart-outline" size={14} color={theme.colors.primary} />
          <Text style={[bc.statText, { color: theme.colors.textTertiary }]}>{cfg.stat}</Text>
        </View>

        {/* Action buttons */}
        <View style={bc.actions}>
          <TouchableOpacity
            onPress={onHold}
            activeOpacity={0.85}
            style={[bc.holdBtn, { backgroundColor: cfg.color, shadowColor: cfg.color }]}
          >
            <Text style={bc.holdBtnText}>{cfg.holdLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onOverride} activeOpacity={0.6} style={bc.overrideBtn}>
            <Text style={[bc.overrideText, { color: theme.colors.textTertiary }]}>
              I understand the risk — proceed anyway
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const bc = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingBottom: 40, paddingTop: 8,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#333360',
    alignSelf: 'center', marginBottom: 20,
  },

  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  emoji:      { fontSize: 44 },
  biasPill:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 6, alignSelf: 'flex-start' },
  biasName:   { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title:      { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  contextBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  contextText:{ fontSize: 13, fontWeight: '600', flex: 1 },

  explanation: { fontSize: 14, lineHeight: 22, marginBottom: 14 },

  statBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24 },
  statText: { fontSize: 12, lineHeight: 18, flex: 1 },

  actions:     { gap: 12, alignItems: 'center' },
  holdBtn: {
    width: '100%', paddingVertical: 15, borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 8,
  },
  holdBtnText:    { fontSize: 15, fontWeight: '800', color: '#07070D' },
  overrideBtn:    { paddingVertical: 10 },
  overrideText:   { fontSize: 12, fontWeight: '500' },
});
