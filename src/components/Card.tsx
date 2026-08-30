/**
 * Card Component
 * 
 * Container for grouped content. Use throughout the app for:
 * - Lesson previews on home screen
 * - Position cards in portfolio
 * - Signal cards
 * - Settings groups
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function Card({ 
  children, 
  onPress, 
  variant = 'default', 
  padding = 'md',
  style,
}: CardProps) {
  const { theme } = useTheme();
  
  const paddingValues = {
    none: 0,
    sm: 12,
    md: 16,
    lg: 20,
  };
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'default': return theme.colors.surface;
      case 'elevated': return theme.colors.surfaceElevated;
      case 'outlined': return 'transparent';
    }
  };
  
  const cardStyle = [
    styles.card,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: theme.colors.border,
      padding: paddingValues[padding],
    },
    variant === 'elevated' && theme.shadows.md,
    style,
  ];
  
  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.7}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
});
