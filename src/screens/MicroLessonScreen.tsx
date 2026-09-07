/**
 * Micro-Lesson Screen
 * 
 * The daily 3-minute micro-lesson — a Duolingo-style habit hook.
 * Every day, a new bite-sized lesson appears. Reading it:
 *   - Marks today as "active" → maintains/extends streak
 *   - Earns the user a small badge of progress
 *   - Sometimes ties to a stock they can immediately explore
 * 
 * This is what gets users opening the app daily, even when they don't
 * have time for a full lesson or paper trade.
 * 
 * UX pattern: single-screen scroll, big text, no quiz (low friction).
 * "Mark as read" only enables after a minimum dwell time.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useStreakStore, getTodaysMicroLesson, MicroLesson } from '../services/streakStore';
import { useUserStore } from '../services/userStore';
import { getRetrievalQuestions } from '../data/lessonInlineQuestions';
import { QuizQuestion } from '../types';
import { logEvent } from '../services/analyticsService';

interface MicroLessonScreenProps {
  onBack: () => void;
  onStockPress?: (symbol: string) => void;
  onComplete?: () => void;
}

const MIN_READ_SECONDS = 20; // Must spend at least 20s on the lesson

export function MicroLessonScreen({ onBack, onStockPress, onComplete }: MicroLessonScreenProps) {
  const { theme } = useTheme();
  const todaysMicroLessonRead = useStreakStore(state => state.todaysMicroLessonRead);
  const markRead = useStreakStore(state => state.markMicroLessonRead);
  const recordActivity = useStreakStore(state => state.recordActivity);
  const currentStreak = useStreakStore(state => state.currentStreak);
  const completedLessons = useUserStore(s => s.user?.lessonsCompleted ?? []);

  const [lesson] = useState<MicroLesson>(() => getTodaysMicroLesson());
  const [secondsRead, setSecondsRead] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [streakUpdate, setStreakUpdate] = useState<{ before: number; after: number } | null>(null);

  // Spaced retrieval — 1-2 quick questions pulled from lessons already
  // completed, so today's habit includes actual recall, not just reading.
  const [questions] = useState<QuizQuestion[]>(() => getRetrievalQuestions(completedLessons, 2));
  const [qIndex, setQIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const quizDone = questions.length === 0 || qIndex >= questions.length;
  
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  
  // Track read time
  useEffect(() => {
    if (todaysMicroLessonRead) return;
    const interval = setInterval(() => {
      setSecondsRead(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [todaysMicroLessonRead]);
  
  const canMarkComplete = (secondsRead >= MIN_READ_SECONDS && quizDone) || todaysMicroLessonRead;
  
  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const before = currentStreak;
    markRead(lesson.id);
    const update = recordActivity();
    logEvent('micro_lesson_completed', { lesson_id: lesson.id });

    setStreakUpdate({ before, after: update.newStreak });
    setShowCelebration(true);
    
    Animated.spring(celebrateAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    const t = setTimeout(() => onComplete?.(), 3500);
    return () => clearTimeout(t);
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.closeText, { color: theme.colors.textSecondary }]}>
            Close
          </Text>
        </TouchableOpacity>
        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={13} color={theme.colors.gold} />
          <Text style={styles.streakBadgeText}>
            {currentStreak} day{currentStreak === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={{ minWidth: 60 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Category & date */}
        <View style={styles.metaRow}>
          <Text style={[styles.categoryLabel, { color: theme.colors.primary }]}>
            {categoryLabel(lesson.category).toUpperCase()}
          </Text>
          <Text style={[styles.dateLabel, { color: theme.colors.textTertiary }]}>
            Today's micro-lesson · {lesson.estimatedReadSeconds}s read
          </Text>
        </View>
        
        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {lesson.title}
        </Text>
        
        {/* Content */}
        <View style={styles.contentContainer}>
          {parseMarkdownContent(lesson.contentMarkdown).map((block, i) => {
            if (block.type === 'paragraph') {
              return (
                <Text 
                  key={i}
                  style={[styles.paragraph, { color: theme.colors.textPrimary }]}
                >
                  {block.text}
                </Text>
              );
            } else if (block.type === 'callout') {
              return (
                <Card 
                  key={i}
                  variant="default" 
                  padding="md" 
                  style={{ marginVertical: 12, backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary, borderWidth: 1 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
                    <Text style={[styles.calloutText, { color: theme.colors.textPrimary, flex: 1 }]}>
                      {block.text}
                    </Text>
                  </View>
                </Card>
              );
            }
            return null;
          })}
        </View>
        
        {/* Related stocks */}
        {lesson.relatedStockSymbols && lesson.relatedStockSymbols.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.relatedLabel, { color: theme.colors.textSecondary }]}>
              EXPLORE THESE STOCKS
            </Text>
            <View style={styles.relatedChips}>
              {lesson.relatedStockSymbols.map(symbol => (
                <TouchableOpacity 
                  key={symbol}
                  onPress={() => onStockPress?.(symbol)}
                  style={[
                    styles.stockChip,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stockChipText, { color: theme.colors.textPrimary }]}>
                    {symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        {/* Reading progress bar */}
        {!todaysMicroLessonRead && (
          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
              <View style={[
                styles.progressFill,
                {
                  backgroundColor: theme.colors.primary,
                  width: `${Math.min((secondsRead / MIN_READ_SECONDS) * 100, 100)}%`,
                },
              ]} />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textTertiary }]}>
              {secondsRead >= MIN_READ_SECONDS
                ? (quizDone ? '✓ Ready to mark complete' : 'Quick check below before you finish')
                : `Read time: ${secondsRead}s / ${MIN_READ_SECONDS}s minimum`}
            </Text>
          </View>
        )}

        {/* Quick check — recall practice, not just recognition */}
        {!todaysMicroLessonRead && secondsRead >= MIN_READ_SECONDS && !quizDone && (
          <QuickCheck
            key={qIndex}
            question={questions[qIndex]}
            selectedIdx={selectedIdx}
            revealed={revealed}
            onSelect={setSelectedIdx}
            onReveal={() => setRevealed(true)}
            onNext={() => { setQIndex(i => i + 1); setSelectedIdx(null); setRevealed(false); }}
            theme={theme}
          />
        )}

      </ScrollView>
      
      {/* Bottom action */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        {todaysMicroLessonRead ? (
          <Button
            label="✓ Already read today"
            onPress={onBack}
            variant="secondary"
            size="lg"
            fullWidth
            disabled
          />
        ) : (
          <Button
            label="Mark complete & extend streak"
            onPress={handleComplete}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canMarkComplete}
          />
        )}
      </View>
      
      {/* Celebration overlay */}
      {showCelebration && streakUpdate && (
        <View style={styles.celebrationOverlay}>
          <Animated.View style={[
            styles.celebrationCard,
            { 
              backgroundColor: theme.colors.surface,
              transform: [{ scale: celebrateAnim }],
              opacity: celebrateAnim,
            },
          ]}>
            <Ionicons name="flame" size={48} color={theme.colors.gold} style={{ marginBottom: 8 }} />
            <Text style={[styles.celebrationTitle, { color: theme.colors.textPrimary }]}>
              {streakUpdate.after > streakUpdate.before 
                ? `${streakUpdate.after} day streak!`
                : `Day ${streakUpdate.after} complete`}
            </Text>
            <Text style={[styles.celebrationSubtitle, { color: theme.colors.textSecondary }]}>
              {streakUpdate.after === 1 ? "Welcome to your streak. See you tomorrow." :
               streakUpdate.after === 7 ? "A full week! You're building the habit." :
               streakUpdate.after === 30 ? "30 days. You're in the top 1%." :
               streakUpdate.after === 100 ? "100 days. Legendary." :
               "One more step on the path."}
            </Text>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function QuickCheck({
  question, selectedIdx, revealed, onSelect, onReveal, onNext, theme,
}: {
  question: QuizQuestion; selectedIdx: number | null; revealed: boolean;
  onSelect: (i: number) => void; onReveal: () => void; onNext: () => void; theme: any;
}) {
  const isCorrect = selectedIdx === question.correctIndex;
  return (
    <Card variant="default" padding="md" style={{ marginTop: 8, backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong, borderWidth: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: theme.colors.primary, marginBottom: 8 }}>
        QUICK CHECK
      </Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 12, lineHeight: 21 }}>
        {question.question}
      </Text>
      {question.options.map((opt, i) => {
        const isSelected = selectedIdx === i;
        const showCorrect = revealed && i === question.correctIndex;
        const showWrong = revealed && isSelected && i !== question.correctIndex;
        return (
          <TouchableOpacity
            key={i}
            disabled={revealed}
            onPress={() => onSelect(i)}
            style={{
              padding: 12, borderRadius: 10, borderWidth: 1.5, marginBottom: 8,
              borderColor: showCorrect ? theme.colors.success : showWrong ? theme.colors.danger : isSelected ? theme.colors.primary : theme.colors.border,
              backgroundColor: showCorrect ? theme.colors.success + '18' : showWrong ? theme.colors.danger + '18' : isSelected ? theme.colors.primaryGlow : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
      {revealed && (
        <Text style={{ fontSize: 12, lineHeight: 18, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
          {isCorrect ? '✓ Correct. ' : '✗ Not quite. '}{question.explanation}
        </Text>
      )}
      <Button
        label={revealed ? 'Continue' : 'Check answer'}
        onPress={revealed ? onNext : onReveal}
        variant="primary"
        size="md"
        fullWidth
        disabled={!revealed && selectedIdx === null}
      />
    </Card>
  );
}

function categoryLabel(cat: MicroLesson['category']): string {
  switch (cat) {
    case 'concept':     return 'Concept';
    case 'market_news': return 'Market news';
    case 'tip':         return 'Pro tip';
    case 'history':     return 'History';
  }
}

/**
 * Very simple markdown parser. Supports:
 * - Plain paragraphs (blank line between)
 * - "> Callout text" → highlighted callout block
 */
function parseMarkdownContent(md: string): Array<{ type: 'paragraph' | 'callout'; text: string }> {
  const blocks = md.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    if (block.startsWith('> ')) {
      return { type: 'callout' as const, text: block.slice(2).trim() };
    }
    return { type: 'paragraph' as const, text: block };
  });
}

// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeText: { fontSize: 16, fontWeight: '500' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  streakBadgeText: { fontSize: 13, fontWeight: '600', color: '#F59E0B' },
  
  scrollContent: { padding: 24, paddingBottom: 32 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  categoryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  dateLabel: { fontSize: 11, fontWeight: '500' },
  
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, lineHeight: 33, marginBottom: 20 },
  
  contentContainer: { marginBottom: 8 },
  paragraph: { fontSize: 17, lineHeight: 27, marginBottom: 14 },
  calloutText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  
  relatedSection: { marginTop: 16, marginBottom: 16 },
  relatedLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  relatedChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stockChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  stockChipText: { fontSize: 13, fontWeight: '600' },
  
  progressSection: { marginTop: 20 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%' },
  progressText: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  
  footer: { paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 24, borderTopWidth: 1 },
  
  celebrationOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  celebrationCard: {
    paddingHorizontal: 32,
    paddingVertical: 32,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 32,
    minWidth: 280,
  },
  celebrationEmoji: { fontSize: 64, marginBottom: 12 },
  celebrationTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  celebrationSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
