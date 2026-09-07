/**
 * Onboarding Screen
 * 
 * 5-question personalization flow. Critical for retention — users who
 * complete a personalized onboarding are 40%+ more likely to be active
 * at 30 days.
 * 
 * Flow:
 * 1. Welcome → start onboarding
 * 2. Question 1-5 (with progress bar)
 * 3. Personalized results page ("Here's your plan")
 * 4. → Home screen
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  onboardingQuestions,
  getPersonalizedPlan,
  OnboardingAnswers,
} from '../data/onboarding';
import { logEvent } from '../services/analyticsService';

interface OnboardingScreenProps {
  onComplete: (answers: OnboardingAnswers) => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [showResults, setShowResults] = useState(false);

  // Refs so the unmount-cleanup effect below can see latest values without
  // re-subscribing on every keystroke/step change.
  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;
  const completedRef = useRef(false);

  useEffect(() => {
    logEvent('onboarding_started');
    return () => {
      if (!completedRef.current) {
        logEvent('onboarding_abandoned', { step_reached: currentStepRef.current });
      }
    };
  }, []);

  const currentQuestion = onboardingQuestions[currentStep];
  const progress = ((currentStep + 1) / onboardingQuestions.length) * 100;
  
  const handleSelect = (optionValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: optionValue,
    };
    setAnswers(newAnswers);
    
    setTimeout(() => {
      if (currentStep < onboardingQuestions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowResults(true);
      }
    }, 250);
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  if (showResults) {
    return <PersonalizedResults answers={answers} onContinue={() => {
      completedRef.current = true;
      logEvent('onboarding_completed');
      onComplete(answers as OnboardingAnswers);
    }} />;
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.primary,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <TouchableOpacity onPress={handleBack} disabled={currentStep === 0} style={styles.progressBackRow}>
            <Ionicons
              name="chevron-back"
              size={15}
              color={currentStep === 0 ? theme.colors.textTertiary : theme.colors.textSecondary}
            />
            <Text style={[
              styles.progressBack,
              { color: currentStep === 0 ? theme.colors.textTertiary : theme.colors.textSecondary },
            ]}>
              Back
            </Text>
          </TouchableOpacity>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {currentStep + 1} of {onboardingQuestions.length}
          </Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Illustration */}
        {currentQuestion.illustration && (
          <View style={styles.illustration}>
            <Ionicons name={currentQuestion.illustration as any} size={64} color={theme.colors.primary} />
          </View>
        )}
        
        {/* Question */}
        <Text style={[styles.question, { color: theme.colors.textPrimary }]}>
          {currentQuestion.question}
        </Text>
        
        {currentQuestion.subtitle && (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {currentQuestion.subtitle}
          </Text>
        )}
        
        {/* Options */}
        <View style={styles.options}>
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id as keyof OnboardingAnswers] === option.value;
            
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleSelect(option.value as string)}
                activeOpacity={0.7}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSelected ? theme.colors.primaryGlow : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    { color: theme.colors.textPrimary },
                  ]}>
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={[
                      styles.optionDescription,
                      { color: theme.colors.textSecondary },
                    ]}>
                      {option.description}
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.borderStrong,
                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                  },
                ]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// PERSONALIZED RESULTS
// ============================================================================

function PersonalizedResults({
  answers,
  onContinue,
}: {
  answers: Partial<OnboardingAnswers>;
  onContinue: () => void;
}) {
  const { theme } = useTheme();
  const plan = getPersonalizedPlan(answers);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.resultsHeader}>
          <Ionicons name="sparkles" size={52} color={theme.colors.primary} style={styles.resultsIcon} />
          <Text style={[styles.resultsTitle, { color: theme.colors.textPrimary }]}>
            Your plan is ready
          </Text>
          <Text style={[styles.resultsSubtitle, { color: theme.colors.textSecondary }]}>
            We've tailored everything to your goals and risk profile
          </Text>
        </View>
        
        {/* Risk Profile Card */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            YOUR RISK PROFILE
          </Text>
          <Text style={[styles.riskLabel, { color: theme.colors.textPrimary }]}>
            {plan.riskLabel}
          </Text>
          <Text style={[styles.expectedReturn, { color: theme.colors.success }]}>
            Expected annual return: {plan.estimatedReturn}
          </Text>
        </Card>
        
        {/* Suggested Allocation */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: 16 }}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            SUGGESTED ALLOCATION
          </Text>
          
          <View style={styles.allocationRow}>
            <View style={styles.allocationItem}>
              <View style={[styles.allocationDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.allocationLabel, { color: theme.colors.textPrimary }]}>
                Stocks
              </Text>
              <Text style={[styles.allocationValue, { color: theme.colors.textPrimary }]}>
                {plan.portfolioAllocation.stocks}%
              </Text>
            </View>
            <View style={styles.allocationItem}>
              <View style={[styles.allocationDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.allocationLabel, { color: theme.colors.textPrimary }]}>
                Bonds
              </Text>
              <Text style={[styles.allocationValue, { color: theme.colors.textPrimary }]}>
                {plan.portfolioAllocation.bonds}%
              </Text>
            </View>
            <View style={styles.allocationItem}>
              <View style={[styles.allocationDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={[styles.allocationLabel, { color: theme.colors.textPrimary }]}>
                Cash
              </Text>
              <Text style={[styles.allocationValue, { color: theme.colors.textPrimary }]}>
                {plan.portfolioAllocation.cash}%
              </Text>
            </View>
          </View>
          
          {/* Visual bar */}
          <View style={styles.allocationBar}>
            <View 
              style={[
                styles.allocationBarSegment, 
                { 
                  backgroundColor: theme.colors.primary,
                  flex: plan.portfolioAllocation.stocks,
                },
              ]}
            />
            <View 
              style={[
                styles.allocationBarSegment, 
                { 
                  backgroundColor: theme.colors.success,
                  flex: plan.portfolioAllocation.bonds,
                },
              ]}
            />
            <View 
              style={[
                styles.allocationBarSegment, 
                { 
                  backgroundColor: theme.colors.warning,
                  flex: plan.portfolioAllocation.cash,
                },
              ]}
            />
          </View>
        </Card>
        
        {/* What's Next */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: 32 }}>
          <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
            WHAT YOU'LL LEARN FIRST
          </Text>
          <View style={styles.topicsList}>
            <TopicRow text="The fundamentals of how markets work" theme={theme} />
            <TopicRow text="How to evaluate a company before investing" theme={theme} />
            <TopicRow text="Building a portfolio you can sleep on" theme={theme} />
            <TopicRow text="Reading financial news without panic" theme={theme} />
          </View>
        </Card>
      </ScrollView>
      
      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <Button
          label="Start learning"
          onPress={onContinue}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

function TopicRow({ text, theme }: { text: string; theme: any }) {
  return (
    <View style={styles.topicRow}>
      <Ionicons name="checkmark" size={16} color={theme.colors.success} />
      <Text style={[styles.topicText, { color: theme.colors.textPrimary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  progressBack: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  
  illustration: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
  },
  illustrationEmoji: {
    fontSize: 64,
  },
  
  question: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  
  // Results
  resultsHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  resultsIcon: {
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  resultsSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 12,
  },
  riskLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  expectedReturn: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  allocationItem: {
    alignItems: 'center',
    flex: 1,
  },
  allocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  allocationLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  allocationValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  allocationBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  allocationBarSegment: {
    height: '100%',
  },
  
  topicsList: {
    gap: 12,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  topicText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
});
