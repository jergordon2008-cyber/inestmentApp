/**
 * Button — Animated press with spring physics
 *
 * Every press: scale down → spring back + haptic.
 * Primary buttons also emit a brief glow pulse on press.
 */

import React, { useRef } from 'react';
import {
  Animated, Text, ActivityIndicator,
  StyleSheet, View, ViewStyle, TextStyle, Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'gold';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  label?: string;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress, label, title,
  variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false,
  leftIcon, rightIcon, haptic = true, style, textStyle,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale   = useRef(new Animated.Value(1)).current;
  const glow    = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96, useNativeDriver: true,
      tension: 320, friction: 18,
    }).start();
    if (variant === 'primary' || variant === 'gold') {
      Animated.timing(glow, { toValue: 1, duration: 80, useNativeDriver: false }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1, useNativeDriver: true,
      tension: 220, friction: 14,
    }).start();
    Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getColors = () => {
    if (disabled) return { bg: theme.colors.surface, border: theme.colors.border, text: theme.colors.textTertiary };
    switch (variant) {
      case 'primary':     return { bg: theme.colors.primary,  border: theme.colors.primary,  text: '#fff' };
      case 'gold':        return { bg: theme.colors.gold,     border: theme.colors.gold,     text: '#fff' };
      case 'secondary':   return { bg: 'transparent',         border: theme.colors.borderStrong, text: theme.colors.textPrimary };
      case 'ghost':       return { bg: 'transparent',         border: 'transparent',         text: theme.colors.primary };
      case 'destructive': return { bg: theme.colors.danger,   border: theme.colors.danger,   text: '#fff' };
    }
  };

  const sizes = {
    sm: { py: 8,  px: 16, fs: 13, mh: 36, r: 10 },
    md: { py: 13, px: 22, fs: 15, mh: 48, r: 14 },
    lg: { py: 16, px: 28, fs: 16, mh: 56, r: 16 },
  };

  const sz = sizes[size];
  const c  = getColors();

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', variant === 'gold' ? theme.colors.goldGlow : theme.colors.primaryGlow],
  });

  return (
    <Pressable
      onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          s.btn,
          {
            backgroundColor: c.bg,
            borderColor: c.border,
            paddingVertical: sz.py,
            paddingHorizontal: sz.px,
            minHeight: sz.mh,
            borderRadius: sz.r,
            width: fullWidth ? '100%' : undefined,
            transform: [{ scale }],
            shadowColor: c.bg,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: disabled ? 0 : 0.35,
            shadowRadius: 12,
            elevation: disabled ? 0 : 4,
          },
          style,
        ]}
      >
        <View style={s.content}>
          {loading ? (
            <ActivityIndicator color={c.text} size="small" />
          ) : (
            <>
              {leftIcon  && <View style={s.iconL}>{leftIcon}</View>}
              <Text style={[s.label, { color: c.text, fontSize: sz.fs }, textStyle]}>
                {label ?? title ?? ''}
              </Text>
              {rightIcon && <View style={s.iconR}>{rightIcon}</View>}
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn:     { borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label:   { fontWeight: '700', letterSpacing: 0.1 },
  iconL:   { marginRight: 8 },
  iconR:   { marginLeft: 8 },
});
