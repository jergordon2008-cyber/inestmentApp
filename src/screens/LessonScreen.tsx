/**
 * LessonScreen — Interactive Notes Format
 *
 * Lessons are structured reading experiences with:
 * - Rich text sections with animated entrances
 * - Inline quiz questions woven throughout
 * - Key concept callout cards
 * - Real-world example blocks
 * - Progress bar across the top
 * - Lesson completion celebration
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Animated, Easing, Dimensions, Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { useSkillTreeStore } from '../services/skillTreeStore';
import { LessonCompleteAnimation } from '../components/LessonCompleteAnimation';
import { getInlineQuestions } from '../data/lessonInlineQuestions';
import { Lesson, LessonSection, QuizQuestion } from '../types';
import { LESSON_VIDEOS } from '../data/lessonVideos';
import { logEvent } from '../services/analyticsService';

const { width: SW } = Dimensions.get('window');

interface Props {
  lesson: Lesson;
  onBack: () => void;
  onLessonComplete: (lessonId: string) => void;
}

// ── Animated Block Wrapper ───────────────────────────────────────────────────
function AnimatedBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 200, friction: 20, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ── Section Renderers ─────────────────────────────────────────────────────────
function TextBlock({ section, theme, index }: { section: LessonSection; theme: any; index: number }) {
  const s = blockStyles(theme);
  return (
    <AnimatedBlock delay={index * 80}>
      <View style={s.textBlock}>
        {section.title ? (
          <Text style={[s.sectionTitle, { color: theme.colors.textPrimary }]}>{section.title}</Text>
        ) : null}
        <Text style={[s.sectionBody, { color: theme.colors.textSecondary }]}>{section.content}</Text>
      </View>
    </AnimatedBlock>
  );
}

function ExampleBlock({ section, theme, index }: { section: LessonSection; theme: any; index: number }) {
  const s = blockStyles(theme);
  return (
    <AnimatedBlock delay={index * 80}>
      <View style={[s.exampleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '30', borderLeftColor: theme.colors.primary }]}>
        <View style={[s.exampleTag, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
          <Ionicons name="trending-up" size={11} color={theme.colors.primary} />
          <Text style={[s.exampleTagText, { color: theme.colors.primary }]}>REAL EXAMPLE</Text>
        </View>
        {section.title ? (
          <Text style={[s.exampleTitle, { color: theme.colors.textPrimary }]}>{section.title}</Text>
        ) : null}
        <Text style={[s.sectionBody, { color: theme.colors.textSecondary }]}>{section.content}</Text>
      </View>
    </AnimatedBlock>
  );
}

// ── Video Card ─────────────────────────────────────────────────────────────────
const THUMB_H = 130;
const TIER_COLOR: Record<number, string> = { 1: '#34D399', 2: '#6C47FF', 3: '#F5A623' };

function VideoCard({ lessonId, theme }: { lessonId: string; theme: any }) {
  const video = LESSON_VIDEOS[lessonId];
  if (!video) return null;

  const thumbnailUri = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
  const youtubeUrl   = `https://www.youtube.com/watch?v=${video.videoId}`;
  const accentColor  = TIER_COLOR[video.tier] ?? theme.colors.primary;

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await WebBrowser.openBrowserAsync(youtubeUrl, {
      toolbarColor: '#0A0A0F',
      controlsColor: accentColor,
      dismissButtonStyle: 'close',
    });
  };

  return (
    <AnimatedBlock delay={5}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.82}
        style={[vc.card, { backgroundColor: theme.colors.surface, borderColor: accentColor + '40' }]}
      >
        {/* Thumbnail area */}
        <View style={vc.thumbWrap}>
          <Image
            source={{ uri: thumbnailUri }}
            style={vc.thumb}
            resizeMode="cover"
          />
          {/* Dark gradient overlay */}
          <View style={vc.overlay} />

          {/* Centered play button */}
          <View style={[vc.playBtn, { backgroundColor: accentColor }]}>
            <Ionicons name="play" size={20} color="#07070D" style={{ marginLeft: 2 }} />
          </View>

          {/* Duration badge (bottom-right) */}
          <View style={vc.durationBadge}>
            <Text style={vc.durationText}>{video.duration}</Text>
          </View>

          {/* Tier badge (top-left) */}
          <View style={[vc.tierBadge, { backgroundColor: accentColor + '22', borderColor: accentColor + '50' }]}>
            <Text style={[vc.tierText, { color: accentColor }]}>TIER {video.tier} VIDEO</Text>
          </View>
        </View>

        {/* Info row below thumbnail */}
        <View style={vc.infoRow}>
          <View style={[vc.ytIcon, { backgroundColor: '#FF0000' }]}>
            <Ionicons name="logo-youtube" size={14} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[vc.title, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {video.title}
            </Text>
            <Text style={[vc.channel, { color: theme.colors.textTertiary }]}>
              {video.channel}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.textTertiary} />
        </View>
      </TouchableOpacity>
    </AnimatedBlock>
  );
}

const vc = StyleSheet.create({
  card: {
    borderRadius: 18, borderWidth: 1.5, overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  thumbWrap:     { height: THUMB_H, position: 'relative' },
  thumb:         { width: '100%', height: '100%', backgroundColor: '#111' },
  overlay:       {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  playBtn: {
    position: 'absolute', top: '50%', left: '50%',
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: -24, marginTop: -24,
    shadowColor: '#000', shadowRadius: 12, shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  durationBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  durationText:  { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  tierBadge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  tierText:      { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  ytIcon:        { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  channel:       { fontSize: 11, fontWeight: '500', marginTop: 2 },
});

// ─────────────────────────────────────────────────────────────────────────────
function KeyConceptBlock({ title, content, theme, index }: { title: string; content: string; theme: any; index: number }) {
  const s = blockStyles(theme);
  return (
    <AnimatedBlock delay={index * 80}>
      <View style={[s.conceptCard, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder, borderLeftColor: theme.colors.primary }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <View style={[s.conceptDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={[s.conceptTag, { color: theme.colors.primary }]}>KEY CONCEPT</Text>
        </View>
        <Text style={[s.conceptTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
        <Text style={[s.sectionBody, { color: theme.colors.textSecondary }]}>{content}</Text>
      </View>
    </AnimatedBlock>
  );
}

// ── Inline Quiz / Scenario Question ──────────────────────────────────────────
type AnswerState = 'idle' | 'correct' | 'incorrect';

/**
 * Colours for an inline question card in each answer state — theme tokens
 * only, so light and dark mode both follow the palette. The card's accent
 * (a scenario's info-blue left edge) is its identity and never changes; the
 * answer state only tints the other edges, the options and the result banner.
 * Applied per side: a `borderColor` shorthand on top used to repaint all four
 * sides on web and wipe the accent out.
 */
function questionCardColors(theme: any, isScenario: boolean, state: AnswerState) {
  const c = theme.colors;
  const edge =
    state === 'correct'   ? c.success + '40' :
    state === 'incorrect' ? c.danger + '40' :
    isScenario            ? c.info + '40' : c.borderStrong;
  return {
    edge,
    accent: isScenario ? c.info : edge,
    optionCorrectBg: c.successGlow,
    optionWrongBg: c.dangerGlow,
    bannerBg: state === 'correct' ? c.successGlow : c.dangerGlow,
    bannerBorder: (state === 'correct' ? c.success : c.danger) + '50',
  };
}

function InlineQuestion({
  question, index, onAnswer, theme,
}: {
  question: QuizQuestion; index: number;
  onAnswer: (correct: boolean) => void; theme: any;
}) {
  const [selected, setSelected]   = useState<number | null>(null);
  const [revealed, setRevealed]   = useState(false);
  const shakeX    = useRef(new Animated.Value(0)).current;
  const successS  = useRef(new Animated.Value(1)).current;
  const resultY   = useRef(new Animated.Value(12)).current;
  const resultA   = useRef(new Animated.Value(0)).current;
  const s = blockStyles(theme);
  const isScenario = question.type === 'scenario';
  const wasCorrect = selected !== null && selected === question.correctIndex;
  const answerState: AnswerState = !revealed ? 'idle' : wasCorrect ? 'correct' : 'incorrect';
  const colors = questionCardColors(theme, isScenario, answerState);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const animateReveal = (correct: boolean) => {
    // Card scale pop
    Animated.sequence([
      Animated.timing(successS, { toValue: correct ? 1.03 : 1.0, duration: 100, useNativeDriver: true }),
      Animated.spring(successS, { toValue: 1, tension: 260, friction: 14, useNativeDriver: true }),
    ]).start();
    // Result banner slides up
    Animated.parallel([
      Animated.timing(resultA, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(resultY, { toValue: 0, tension: 180, friction: 16, useNativeDriver: true }),
    ]).start();
  };

  const pick = (i: number) => {
    if (revealed) return;
    setSelected(i);
    const correct = i === question.correctIndex;
    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
    }
    animateReveal(correct);
    setRevealed(true);
    onAnswer(correct);
  };

  const getOptionStyle = (i: number) => {
    if (!revealed) return {
      bg: theme.colors.surface, border: theme.colors.border,
      text: theme.colors.textPrimary, icon: null,
    };
    if (i === question.correctIndex) return {
      bg: colors.optionCorrectBg, border: theme.colors.success,
      text: theme.colors.success, icon: 'checkmark' as const,
    };
    if (i === selected && i !== question.correctIndex) return {
      bg: colors.optionWrongBg, border: theme.colors.danger,
      text: theme.colors.danger, icon: 'close' as const,
    };
    return {
      bg: theme.colors.surface, border: theme.colors.border,
      text: theme.colors.textTertiary, icon: null,
    };
  };

  const badgeBg   = isScenario ? theme.colors.info + '22' : theme.colors.gold + '20';
  const badgeText = isScenario ? theme.colors.info         : theme.colors.gold;
  const badgeLabel = isScenario ? 'SCENARIO' : 'QUICK CHECK';
  const badgeIcon: IoniconName = isScenario ? 'locate-outline' : 'help-circle-outline';

  return (
    <AnimatedBlock delay={index * 80}>
      <Animated.View style={[
        s.quizCard,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderTopColor: colors.edge, borderRightColor: colors.edge, borderBottomColor: colors.edge,
          borderLeftColor: colors.accent,
          transform: [{ translateX: shakeX }, { scale: successS }],
        },
        isScenario && { borderLeftWidth: 3 },
      ]}>
        <View style={s.quizHeader}>
          <View style={[s.quizBadge, { backgroundColor: badgeBg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <Ionicons name={badgeIcon} size={11} color={badgeText} />
            <Text style={[s.quizBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
        </View>

        {/* Scenario context block */}
        {isScenario && question.context ? (
          <View style={[s.scenarioContext, { backgroundColor: theme.colors.info + '10', borderColor: theme.colors.info + '25' }]}>
            <Text style={[s.scenarioContextText, { color: theme.colors.textSecondary }]}>{question.context}</Text>
          </View>
        ) : null}

        <Text style={[s.quizQuestion, { color: theme.colors.textPrimary }]}>{question.question}</Text>

        <View style={s.options}>
          {question.options.map((opt, i) => {
            const c = getOptionStyle(i);
            return (
              <TouchableOpacity key={i} onPress={() => pick(i)} activeOpacity={0.75}
                style={[s.option, { backgroundColor: c.bg, borderColor: c.border }]}
                disabled={revealed}
              >
                <View style={[s.optionLetter, { backgroundColor: c.border + '30' }]}>
                  <Text style={[s.optionLetterText, { color: c.text }]}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={[s.optionText, { color: c.text, flex: 1 }]}>{opt}</Text>
                {c.icon && (
                  <Ionicons name={c.icon} size={16} color={c.text} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Animated result banner */}
        {revealed && (
          <Animated.View style={[
            s.resultBanner,
            { backgroundColor: colors.bannerBg, borderColor: colors.bannerBorder },
            { opacity: resultA, transform: [{ translateY: resultY }] },
          ]}>
            <Ionicons
              name={wasCorrect ? 'checkmark-circle' : 'bulb-outline'}
              size={22}
              color={wasCorrect ? theme.colors.success : theme.colors.danger}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: wasCorrect ? theme.colors.success : theme.colors.danger }]}>
                {wasCorrect ? 'Correct!' : 'Not quite'}
              </Text>
              {!wasCorrect && (
                <Text style={[s.resultCorrectHint, { color: theme.colors.textTertiary }]}>
                  Correct: {String.fromCharCode(65 + question.correctIndex)} · {question.options[question.correctIndex]}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {revealed && question.explanation ? (
          <Animated.View style={[s.explanation, {
            backgroundColor: isScenario ? theme.colors.info + '12' : theme.colors.primaryGlow,
            borderColor: isScenario ? theme.colors.info + '30' : theme.colors.primary + '25',
          }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="bulb-outline" size={15} color={theme.colors.textTertiary} style={{ marginTop: 1 }} />
              <Text style={[s.explanationText, { color: theme.colors.textSecondary, flex: 1 }]}>
                {question.explanation}
              </Text>
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
    </AnimatedBlock>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ progress, theme }: { progress: number; theme: any }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: progress, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [progress]);
  const barWidth = width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 3, backgroundColor: theme.colors.border, width: '100%' }}>
      <Animated.View style={{ height: 3, backgroundColor: theme.colors.primary, width: barWidth, borderRadius: 2, shadowColor: theme.colors.primary, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export function LessonScreen({ lesson, onBack, onLessonComplete }: Props) {
  const { theme } = useTheme();
  const completeLesson = useUserStore(s => s.completeLesson);
  // A finished lesson is one of the day's qualifying actions (dailyStreak).
  const recordActivity = useUserStore(s => s.recordActivity);
  const addXP = useSkillTreeStore(s => s.addXP);
  const s = styles(theme);

  // Build interleaved content blocks
  // Strategy: after every 2 sections → inline question; after every 3 sections → concept callout
  type ContentBlock =
    | { kind: 'section'; data: LessonSection; globalIdx: number }
    | { kind: 'question'; data: QuizQuestion; globalIdx: number }
    | { kind: 'concept'; title: string; content: string; globalIdx: number };

  const CONCEPT_CALLOUTS: Record<string, { title: string; content: string }[]> = {
    T1L01: [{ title: 'Key Term: Supply & Demand', content: 'Stock prices move because of one force: how many buyers vs. sellers exist at any moment. More buyers than sellers → price rises. More sellers than buyers → price falls. Everything else — news, earnings, the economy — only matters because it changes the balance of buyers and sellers.' }],
    T1L02: [{ title: 'Dollar-Cost Averaging', content: 'Investing a fixed dollar amount on a fixed schedule — regardless of price — is called dollar-cost averaging (DCA). When prices are high you buy fewer shares; when prices fall you automatically buy more at a discount. It removes the need to guess whether now is a good time to buy — the schedule decides for you, not your gut.' }],
    T1L03: [{ title: 'Key Term: P/E Ratio', content: 'Price-to-Earnings (P/E) tells you how many years of current profits you\'re paying for. A P/E of 20 = $20 paid per $1 of annual profit. The S&P 500 averages around 22. It\'s a starting point for valuation — always compare against peers in the same industry.' }],
    T1L04: [{ title: 'Margin of Safety — Benjamin Graham', content: '"The margin of safety is the central concept of investment." If a company is worth $100 and you pay $70, you have a $30 buffer. You can be wrong by 29% and still not lose money. The bigger the margin, the safer the investment.' }],
    T1L06: [{ title: 'What Is a Moat?', content: 'A "moat" protects a company from competition — like a moat around a castle. Types: brand (Coca-Cola), switching costs (Apple), network effects (Visa), cost advantages (Costco), patents (pharmaceutical companies). The wider and deeper the moat, the more durable the business.' }],
    T1L07: [{ title: 'Key Term: Dividend Yield', content: 'Dividend yield = annual dividend per share ÷ current stock price. A $100 stock paying $3/year has a 3% yield. The S&P 500 average yield is ~1.5%. Yields above 6-7% are often warning signs — investigate why before chasing the income.' }],
    T1L08: [{ title: 'The Four Market Cycle Phases', content: '(1) Accumulation: smart money buys quietly after a crash. (2) Markup: the uptrend becomes visible — momentum investors join. (3) Distribution: smart money sells to enthusiastic latecomers. (4) Markdown: the bear market everyone denies. Knowing the phase shapes your strategy.' }],
    T1L09: [{ title: 'Peter Lynch: Invest in What You Know', content: '"The person that turns over the most rocks wins the game." Lynch found great investments in ordinary consumer observations — a packed restaurant, a new product everyone was buying. Start with what you know, then validate with financial research.' }],
    T1L10: [{ title: 'True Diversification', content: 'True diversification = spreading across different sectors, not just different stocks. Healthcare, technology, financials, consumer staples, energy — these often move independently. When tech crashes, consumer staples usually hold. When energy booms, tech may lag. Sector spread is the foundation.' }],
    T1L11: [{ title: 'Signal vs Noise', content: 'For every piece of financial news, ask one question: "Does this change the long-term value of any company I own?" 95% of financial news doesn\'t. Market drops 2%? Noise. Fed chair mentions rates? Usually noise. A company loses a major contract or its CEO leaves? That\'s signal.' }],
    T1L12: [{ title: 'Buffett\'s Core Principle', content: '"It\'s far better to buy a wonderful company at a fair price than a fair company at a wonderful price." Quality first, price second. A great business at a reasonable valuation will outperform a mediocre business at a bargain price — every time, over the long run.' }],
  };

  const blocks: ContentBlock[] = [];
  const questions = lesson.quiz?.questions ?? [];
  const inlineQs = getInlineQuestions(lesson.id);
  const conceptCallouts = CONCEPT_CALLOUTS[lesson.id] ?? [];
  let iQIdx = 0;
  let calloutIdx = 0;
  let gIdx = 0;

  // Opening concept block using lesson description
  if (lesson.sections.length > 0) {
    blocks.push({
      kind: 'concept',
      title: lesson.title,
      content: lesson.description,
      globalIdx: gIdx++,
    });
  }

  lesson.sections.forEach((sec, i) => {
    blocks.push({ kind: 'section', data: sec, globalIdx: gIdx++ });
    // Insert inline question every 2 sections
    if ((i + 1) % 2 === 0 && iQIdx < inlineQs.length) {
      blocks.push({ kind: 'question', data: inlineQs[iQIdx++], globalIdx: gIdx++ });
    }
    // Insert a key concept callout after every 3rd section
    if ((i + 1) % 3 === 0 && calloutIdx < conceptCallouts.length) {
      const co = conceptCallouts[calloutIdx++];
      blocks.push({ kind: 'concept', title: co.title, content: co.content, globalIdx: gIdx++ });
    }
  });

  // Any remaining inline questions go at the end of content
  while (iQIdx < inlineQs.length) {
    blocks.push({ kind: 'question', data: inlineQs[iQIdx++], globalIdx: gIdx++ });
  }

  const totalBlocks     = blocks.length + 1; // +1 for final quiz
  const [answeredCount, setAnsweredCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showFinalQuiz, setShowFinalQuiz] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Final quiz state
  const finalQuestion = questions[questions.length - 1] ?? questions[0];
  const [finalAnswers, setFinalAnswers] = useState<Record<string, number>>({});
  const [quizComplete, setQuizComplete] = useState(false);

  // Analytics: lesson_started on mount, lesson_completed/lesson_abandoned
  // depending on whether completeLesson() ever fired before unmount.
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);
  const maxProgressRef = useRef(0);
  useEffect(() => {
    logEvent('lesson_started', { lesson_id: lesson.id, tier: lesson.tier });
    return () => {
      if (!completedRef.current) {
        logEvent('lesson_abandoned', {
          lesson_id: lesson.id,
          scroll_depth_pct: Math.round(maxProgressRef.current * 100),
          seconds_spent: Math.round((Date.now() - startedAtRef.current) / 1000),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markLessonComplete = () => {
    completedRef.current = true;
    logEvent('lesson_completed', {
      lesson_id: lesson.id,
      tier: lesson.tier,
      duration_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
    });
  };

  const handleInlineAnswer = (correct: boolean, questionId: string) => {
    const newCount = answeredCount + 1;
    setAnsweredCount(newCount);
    const p = newCount / totalBlocks;
    setProgress(p);
    maxProgressRef.current = Math.max(maxProgressRef.current, p);
    logEvent('quiz_answered', { lesson_id: lesson.id, question_id: questionId, correct });
  };

  const handleFinalAnswer = (qId: string, answerIdx: number) => {
    const updated = { ...finalAnswers, [qId]: answerIdx };
    setFinalAnswers(updated);
    logEvent('quiz_answered', {
      lesson_id: lesson.id, question_id: qId,
      correct: questions.find(q => q.id === qId)?.correctIndex === answerIdx,
    });
    if (Object.keys(updated).length >= questions.length) {
      // Check score
      const correct = questions.filter(q => updated[q.id] === q.correctIndex).length;
      const score = correct / questions.length;
      if (score >= (lesson.quiz?.passingScore ?? 0.75)) {
        setQuizComplete(true);
        completeLesson(lesson.id);
        recordActivity();
        addXP(lesson.xpReward ?? (lesson.difficulty * 80 + 60));
        markLessonComplete();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowCelebration(true), 400);
      } else {
        // Allow retry
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setTimeout(() => {
          setFinalAnswers({});
        }, 1500);
      }
    }
  };

  const readingProgress = Math.min(1, (answeredCount + 1) / Math.max(1, blocks.filter(b => b.kind === 'question').length + 1));
  maxProgressRef.current = Math.max(maxProgressRef.current, showFinalQuiz ? readingProgress : progress);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Progress bar */}
      <ProgressBar progress={showFinalQuiz ? readingProgress : progress} theme={theme} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={[s.backBtn, s.backRow]}>
          <Ionicons name="chevron-back" size={17} color={theme.colors.textSecondary} />
          <Text style={[s.backText, { color: theme.colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={[s.tierPill, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '30' }]}>
            <Text style={[s.tierText, { color: theme.colors.primary }]}>
              TIER {lesson.tier}  ·  {lesson.estimatedMinutes} MIN
            </Text>
          </View>
        </View>
        <View style={{ width: 60, alignItems: 'flex-end' }}>
          <View style={[s.diffDots, {}]}>
            {[1,2,3,4,5].map(d => (
              <View key={d} style={[s.diffDot, { backgroundColor: d <= lesson.difficulty ? theme.colors.primary : theme.colors.border }]} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Lesson Hero */}
        <AnimatedBlock delay={0}>
          <View style={[s.hero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
            <Text style={[s.heroLabel, { color: theme.colors.textTertiary }]}>
              LESSON {lesson.order}
            </Text>
            <Text style={[s.heroTitle, { color: theme.colors.textPrimary }]}>{lesson.title}</Text>
            <Text style={[s.heroSub, { color: theme.colors.textSecondary }]}>{lesson.subtitle}</Text>
            <View style={s.heroMeta}>
              {lesson.topics.slice(0, 3).map(t => (
                <View key={t} style={[s.topicChip, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
                  <Text style={[s.topicText, { color: theme.colors.textTertiary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedBlock>

        {/* Featured video (if available for this lesson) */}
        <VideoCard lessonId={lesson.id} theme={theme} />

        {/* Section divider */}
        <View style={s.divider}>
          <View style={[s.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[s.dividerLabel, { color: theme.colors.textTertiary }]}>LESSON NOTES</Text>
          <View style={[s.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Content Blocks */}
        {blocks.map((block, i) => {
          if (block.kind === 'section') {
            if (block.data.type === 'example') {
              return <ExampleBlock key={block.data.id} section={block.data} theme={theme} index={i + 1} />;
            }
            return <TextBlock key={block.data.id} section={block.data} theme={theme} index={i + 1} />;
          }
          if (block.kind === 'question') {
            return (
              <InlineQuestion
                key={block.data.id} question={block.data}
                index={i + 1} theme={theme}
                onAnswer={(correct) => handleInlineAnswer(correct, block.data.id)}
              />
            );
          }
          if (block.kind === 'concept') {
            return <KeyConceptBlock key={`concept-${i}`} title={block.title} content={block.content} theme={theme} index={i + 1} />;
          }
          return null;
        })}

        {/* Lessons with a quiz → show quiz CTA */}
        {questions.length > 0 && !showFinalQuiz && (
          <AnimatedBlock delay={200}>
            <View style={[s.quizCTA, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
              <Ionicons name="create-outline" size={36} color={theme.colors.primary} style={{ marginBottom: 12 }} />
              <Text style={[s.quizCTATitle, { color: theme.colors.textPrimary }]}>Ready for the final quiz?</Text>
              <Text style={[s.quizCTASub, { color: theme.colors.textSecondary }]}>
                {questions.length} questions · Pass {Math.round((lesson.quiz?.passingScore ?? 0.75) * 100)}% to complete the lesson
              </Text>
              <TouchableOpacity onPress={() => setShowFinalQuiz(true)} activeOpacity={0.8}
                style={[s.quizCTABtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
                <Text style={s.quizCTABtnText}>Start Final Quiz →</Text>
              </TouchableOpacity>
            </View>
          </AnimatedBlock>
        )}

        {/* Lessons with NO quiz → show a direct "Mark Complete" button */}
        {questions.length === 0 && !quizComplete && (
          <AnimatedBlock delay={200}>
            <View style={[s.quizCTA, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
              <Ionicons name="checkmark-circle" size={36} color={theme.colors.success} style={{ marginBottom: 12 }} />
              <Text style={[s.quizCTATitle, { color: theme.colors.textPrimary }]}>Lesson Complete!</Text>
              <Text style={[s.quizCTASub, { color: theme.colors.textSecondary }]}>
                You've read through this lesson. Mark it complete to earn your XP.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setQuizComplete(true);
                  completeLesson(lesson.id);
                  recordActivity();
                  addXP(lesson.xpReward ?? (lesson.difficulty * 80 + 60));
                  markLessonComplete();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setTimeout(() => setShowCelebration(true), 400);
                }}
                activeOpacity={0.8}
                style={[s.quizCTABtn, { backgroundColor: theme.colors.success, shadowColor: theme.colors.success }]}
              >
                <Text style={s.quizCTABtnText}>Mark Complete →</Text>
              </TouchableOpacity>
            </View>
          </AnimatedBlock>
        )}

        {/* Final Quiz */}
        {showFinalQuiz && (
          <>
            <View style={s.divider}>
              <View style={[s.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[s.dividerLabel, { color: theme.colors.gold }]}>FINAL QUIZ</Text>
              <View style={[s.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            {questions.map((q, qi) => (
              <FinalQuizQuestion
                key={q.id} question={q} index={qi}
                answered={finalAnswers[q.id] !== undefined}
                selected={finalAnswers[q.id]}
                onAnswer={(ans) => handleFinalAnswer(q.id, ans)}
                theme={theme}
                locked={quizComplete}
              />
            ))}

            {Object.keys(finalAnswers).length > 0 && Object.keys(finalAnswers).length < questions.length && (
              <AnimatedBlock delay={0}>
                <View style={[s.progressIndicator, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Text style={[{ color: theme.colors.textSecondary, fontSize: 13 }]}>
                    {Object.keys(finalAnswers).length}/{questions.length} answered
                  </Text>
                  <View style={[{ flex: 1, height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginLeft: 12 }]}>
                    <View style={[{ height: 4, backgroundColor: theme.colors.primary, borderRadius: 2, width: `${(Object.keys(finalAnswers).length / questions.length) * 100}%` }]} />
                  </View>
                </View>
              </AnimatedBlock>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Celebration overlay */}
      <LessonCompleteAnimation
        visible={showCelebration}
        lessonTitle={lesson.title}
        xpEarned={lesson.xpReward ?? (lesson.difficulty * 80 + 60)}
        onContinue={() => { setShowCelebration(false); onLessonComplete(lesson.id); }}
      />
    </SafeAreaView>
  );
}

// ── Final Quiz Question (full answer, not inline) ─────────────────────────────
function FinalQuizQuestion({ question, index, answered, selected, onAnswer, theme, locked }: {
  question: QuizQuestion; index: number; answered: boolean; selected: number | undefined;
  onAnswer: (i: number) => void; theme: any; locked: boolean;
}) {
  const bs = blockStyles(theme);
  const shakeX = useRef(new Animated.Value(0)).current;

  const pick = (i: number) => {
    if (answered || locked) return;
    const correct = i === question.correctIndex;
    if (!correct) {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -5, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue:  0, duration: 45, useNativeDriver: true }),
      ]).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAnswer(i);
  };

  const getOpt = (i: number) => {
    if (!answered) return { bg: theme.colors.surface, border: theme.colors.border, text: theme.colors.textPrimary };
    if (i === question.correctIndex) return { bg: theme.colors.successGlow, border: theme.colors.primary, text: theme.colors.primary };
    if (i === selected) return { bg: theme.colors.dangerGlow, border: theme.colors.danger, text: theme.colors.danger };
    return { bg: theme.colors.surface, border: theme.colors.border, text: theme.colors.textTertiary };
  };

  return (
    <AnimatedBlock delay={index * 60}>
      <Animated.View style={[bs.quizCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.borderStrong, transform: [{ translateX: shakeX }] }]}>
        <View style={bs.quizHeader}>
          <View style={[bs.quizBadge, { backgroundColor: theme.colors.goldGlow }]}>
            <Text style={[bs.quizBadgeText, { color: theme.colors.gold }]}>Q{index + 1} of {5}</Text>
          </View>
          {answered && (
            <View style={bs.quizResultRow}>
              <Ionicons
                name={selected === question.correctIndex ? 'checkmark' : 'close'}
                size={12}
                color={selected === question.correctIndex ? theme.colors.primary : theme.colors.danger}
              />
              <Text style={[bs.quizResult, { color: selected === question.correctIndex ? theme.colors.primary : theme.colors.danger }]}>
                {selected === question.correctIndex ? 'Correct' : 'Try again next time'}
              </Text>
            </View>
          )}
        </View>
        <Text style={[bs.quizQuestion, { color: theme.colors.textPrimary }]}>{question.question}</Text>
        <View style={bs.options}>
          {question.options.map((opt, i) => {
            const c = getOpt(i);
            return (
              <TouchableOpacity key={i} onPress={() => pick(i)} activeOpacity={answered ? 1 : 0.75}
                style={[bs.option, { backgroundColor: c.bg, borderColor: c.border }]}>
                <View style={[bs.optionLetter, { backgroundColor: c.border + '25' }]}>
                  <Text style={[bs.optionLetterText, { color: c.text }]}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={[bs.optionText, { color: c.text, flex: 1 }]}>{opt}</Text>
                {answered && i === question.correctIndex && <Ionicons name="checkmark" size={14} color={theme.colors.primary} />}
                {answered && i === selected && i !== question.correctIndex && <Ionicons name="close" size={14} color={theme.colors.danger} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {answered && question.explanation ? (
          <View style={[bs.explanation, { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary + '25' }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Ionicons name="bulb-outline" size={15} color={theme.colors.textTertiary} style={{ marginTop: 1 }} />
              <Text style={[bs.explanationText, { color: theme.colors.textSecondary, flex: 1 }]}>{question.explanation}</Text>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </AnimatedBlock>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = (theme: any) => StyleSheet.create({
  container:  { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:    { width: 60 },
  backRow:    { flexDirection: 'row', alignItems: 'center', gap: 1 },
  backText:   { fontSize: 15, fontWeight: '500' },
  tierPill:   { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tierText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  diffDots:   { flexDirection: 'row', gap: 3 },
  diffDot:    { width: 6, height: 6, borderRadius: 3 },
  scroll:     { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  hero: {
    borderRadius: 20, borderWidth: 1, padding: 22, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 6,
  },
  heroLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  heroTitle:  { fontSize: 26, fontWeight: '800', letterSpacing: -0.8, lineHeight: 32, marginBottom: 6 },
  heroSub:    { fontSize: 15, lineHeight: 22, marginBottom: 14 },
  heroMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  topicText:  { fontSize: 11, fontWeight: '600' },
  divider:    { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine:{ flex: 1, height: 1 },
  dividerLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  quizCTA: {
    borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 8,
  },
  quizCTATitle:   { fontSize: 20, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  quizCTASub:     { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  quizCTABtn:     {
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 5,
  },
  quizCTABtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  progressIndicator: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
});

const blockStyles = (theme: any) => StyleSheet.create({
  textBlock:   { marginBottom: 12 },
  sectionTitle:{ fontSize: 17, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24, marginBottom: 8, color: theme.colors.textPrimary },
  sectionBody: { fontSize: 15, lineHeight: 25, letterSpacing: 0.1 },
  exampleCard: {
    borderRadius: 16, borderWidth: 1, borderLeftWidth: 3, padding: 16, marginBottom: 12,
  },
  exampleTag:  { marginBottom: 8 },
  exampleTagText:{ fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  exampleTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  conceptCard: { borderRadius: 18, borderWidth: 1, borderLeftWidth: 3, padding: 18, marginBottom: 12 },
  conceptDot:  { width: 8, height: 8, borderRadius: 4 },
  conceptTag:  { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  conceptTitle:{ fontSize: 16, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
  quizCard: {
    borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 4,
  },
  quizHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  quizBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  quizBadgeText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  quizResult:     { fontSize: 12, fontWeight: '700' },
  quizResultRow:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  quizQuestion:   { fontSize: 16, fontWeight: '700', lineHeight: 24, marginBottom: 14, letterSpacing: -0.2 },
  options:        { gap: 8 },
  option:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  optionLetter:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionLetterText:{ fontSize: 12, fontWeight: '800' },
  optionText:     { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },
  explanation:          { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  explanationText:      { fontSize: 13, lineHeight: 19 },
  scenarioContext:      { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12 },
  scenarioContextText:  { fontSize: 14, lineHeight: 21, fontStyle: 'italic' },
  // Result banner
  resultBanner:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 14 },
  resultTitle:          { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  resultCorrectHint:    { fontSize: 12, fontWeight: '500', lineHeight: 17 },
});
