/**
 * TabBar
 *
 * Active tab: filled icon + label, both tinted with the accent colour the
 * student picked in Customize (theme.colors.primary is that accent).
 * Inactive:   outline icon + muted label
 * Centre tab (Portfolio): raised capsule button — always highlighted
 *
 * There used to be a sliding highlight pill behind the active tab. Its width
 * was a rounded fraction of the measured bar, so it sat short of the tab it
 * belonged to and overhung the neighbouring one. Tinting the icon and label
 * marks the active tab without geometry that can drift.
 */

import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { fs, sp, isTablet } from '../constants/responsive';

export type TabName = 'learn' | 'portfolio' | 'me';

interface TabBarProps { current: TabName; onTabPress: (tab: TabName) => void; }

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: Array<{
  name: TabName;
  label: string;
  icon: IoniconName;
  iconFilled: IoniconName;
  special?: boolean;
}> = [
  { name: 'learn',     label: 'Learn',     icon: 'book-outline',        iconFilled: 'book'         },
  { name: 'portfolio', label: 'Portfolio', icon: 'trending-up-outline', iconFilled: 'trending-up', special: true },
  { name: 'me',        label: 'Me',        icon: 'person-outline',      iconFilled: 'person'       },
];

const ICON_H  = sp(32);
const ICON_W  = sp(44);

export function TabBar({ current, onTabPress }: TabBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[s.bar, {
        backgroundColor: theme.mode === 'dark' ? 'rgba(19,19,26,0.72)' : 'rgba(255,255,255,0.72)',
        borderTopColor: theme.colors.glassBorder,
        shadowColor: theme.mode === 'dark' ? '#000' : theme.colors.primary,
      }]}
    >
      <BlurView
        pointerEvents="none"
        intensity={40}
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Tab items */}
      {TABS.map(tab => (
        <TabItem
          key={tab.name}
          tab={tab}
          active={current === tab.name}
          theme={theme}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTabPress(tab.name);
          }}
        />
      ))}
    </View>
  );
}

// ── Individual tab item ──────────────────────────────────────────────────────
function TabItem({
  tab, active, onPress, theme,
}: { tab: typeof TABS[0]; active: boolean; onPress: () => void; theme: any }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn  = () => { scale.value = withSpring(0.88, { damping: 20, stiffness: 400 }); };
  const pressOut = () => { scale.value = withSpring(1,    { damping: 16, stiffness: 300 }); };

  if (tab.special) {
    return (
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={s.tab}>
        <Animated.View style={[s.specialBtn, {
          backgroundColor: active ? theme.colors.primaryDim : theme.colors.primary,
          shadowColor: theme.colors.primary,
        }, animStyle]}>
          <Ionicons name={tab.iconFilled} size={fs(20)} color="#fff" />
        </Animated.View>
        <Text style={[s.label, { color: active ? theme.colors.primary : theme.colors.textTertiary }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Pressable>
    );
  }

  const color = active ? theme.colors.primary : theme.colors.textTertiary;

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={s.tab}>
      <Animated.View style={[{ alignItems: 'center', transform: [{ scale: active ? 1.1 : 1 }] }, animStyle]}>
        <View style={[s.iconArea, active && {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
          elevation: 4,
        }]}>
          <Ionicons
            name={active ? tab.iconFilled : tab.icon}
            size={fs(21)}
            color={color}
          />
        </View>
        <View style={[s.activeDot, {
          backgroundColor: theme.colors.primary,
          opacity: active ? 1 : 0,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: active ? 0.8 : 0,
          shadowRadius: 6,
        }]} />
      </Animated.View>
      <Text style={[s.label, { color, fontWeight: active ? '700' : '400' }]}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    position: 'relative',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    zIndex: 1,
  },
  iconArea: {
    width: ICON_W,
    height: ICON_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  label: {
    fontSize: fs(10),
    letterSpacing: 0.1,
    marginTop: 1,
  },
  specialBtn: {
    width: sp(52),
    height: sp(36),
    borderRadius: sp(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
});
