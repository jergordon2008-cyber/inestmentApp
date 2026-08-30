/**
 * ExplainableText
 * 
 * Wraps any term to make it tappable for the AI Explain feature.
 * Shows the term with a subtle underline and ✨ indicator.
 * 
 * Usage:
 *   <Text>What is a <ExplainableText term="P/E ratio" /> anyway?</Text>
 */

import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AIExplainModal } from './AIExplainModal';

interface ExplainableTextProps {
  term: string;
  display?: string;        // Optional different display text
  style?: TextStyle;
  showIcon?: boolean;
}

export function ExplainableText({ 
  term, 
  display, 
  style,
  showIcon = true,
}: ExplainableTextProps) {
  const { theme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  
  return (
    <>
      <Text
        onPress={() => setModalOpen(true)}
        style={[
          {
            color: theme.colors.primary,
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
          },
          style,
        ]}
      >
        {display || term}{showIcon && <Text style={styles.icon}> ✨</Text>}
      </Text>
      
      <AIExplainModal
        term={modalOpen ? term : null}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 10,
  },
});
