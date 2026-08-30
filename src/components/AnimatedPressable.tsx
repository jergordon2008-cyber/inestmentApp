/**
 * AnimatedPressable — Drop-in replacement for TouchableOpacity
 * Adds spring-physics press animation to any content.
 *
 * Usage:
 *   <AnimatedPressable onPress={fn} style={cardStyle}>
 *     <Text>Any content</Text>
 *   </AnimatedPressable>
 */

import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleTarget?: number;   // default 0.97
  haptic?: boolean;
  disabled?: boolean;
}

export function AnimatedPressable({
  onPress, children, style,
  scaleTarget = 0.97, haptic = false, disabled = false,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTarget, useNativeDriver: true,
      tension: 300, friction: 20,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1, useNativeDriver: true,
      tension: 220, friction: 14,
    }).start();
  };

  const press = () => {
    if (disabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable onPress={press} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
