/**
 * AI Explain Modal
 * 
 * Appears as a bottom sheet when user taps "Explain like I'm new" anywhere
 * in the app. Loads explanation tailored to user's current tier.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { explainTerm, ExplanationResult } from '../services/aiExplainService';
import { Button } from './Button';

interface AIExplainModalProps {
  term: string | null;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

export function AIExplainModal({ term, onClose }: AIExplainModalProps) {
  const { theme } = useTheme();
  const user = useUserStore((state) => state.user);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (term && user) {
      setLoading(true);
      setResult(null);
      explainTerm(term, user.currentTier)
        .then(setResult)
        .finally(() => setLoading(false));
    }
  }, [term, user]);
  
  if (!term) return null;
  
  return (
    <Modal
      visible={!!term}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheet, { backgroundColor: theme.colors.surfaceElevated }]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.aiBadge, { backgroundColor: theme.colors.primaryGlow }]}>
                <Text style={[styles.aiBadgeText, { color: theme.colors.primary }]}>✨ AI TUTOR</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {/* Term */}
          <Text style={[styles.term, { color: theme.colors.textPrimary }]}>
            {term}
          </Text>
          <Text style={[styles.tierLabel, { color: theme.colors.textTertiary }]}>
            Explained for {user?.currentTier === 1 ? 'beginners' : user?.currentTier === 2 ? 'active investors' : 'advanced strategists'}
          </Text>
          
          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Generating explanation...
                </Text>
              </View>
            )}
            
            {result && !loading && (
              <>
                <Text style={[styles.explanation, { color: theme.colors.textPrimary }]}>
                  {result.explanation}
                </Text>
                
                {result.examples && result.examples.length > 0 && (
                  <View style={styles.examplesSection}>
                    <Text style={[styles.examplesLabel, { color: theme.colors.textSecondary }]}>
                      RELATED EXAMPLES
                    </Text>
                    <View style={styles.examplesList}>
                      {result.examples.map((symbol) => (
                        <View
                          key={symbol}
                          style={[
                            styles.exampleChip,
                            { backgroundColor: theme.colors.primaryGlow },
                          ]}
                        >
                          <Text style={[styles.exampleText, { color: theme.colors.primary }]}>
                            ${symbol}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                <View style={[styles.feedbackSection, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.feedbackLabel, { color: theme.colors.textSecondary }]}>
                    Was this helpful?
                  </Text>
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity
                      style={[
                        styles.feedbackButton,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={styles.feedbackEmoji}>👍</Text>
                      <Text style={[styles.feedbackText, { color: theme.colors.textPrimary }]}>
                        Yes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.feedbackButton,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                      ]}
                    >
                      <Text style={styles.feedbackEmoji}>🤔</Text>
                      <Text style={[styles.feedbackText, { color: theme.colors.textPrimary }]}>
                        Confusing
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
          
          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <Button
              label="Got it"
              onPress={onClose}
              variant="primary"
              size="md"
              fullWidth
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: height * 0.8,
    minHeight: height * 0.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '500',
  },
  
  term: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tierLabel: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  
  content: {
    paddingHorizontal: 20,
  },
  
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  
  explanation: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  
  examplesSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 8,
  },
  examplesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  exampleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  feedbackSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  feedbackEmoji: {
    fontSize: 18,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
