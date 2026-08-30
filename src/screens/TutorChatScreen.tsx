import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { useBehavioralStore } from '../services/behavioralStore';
import { usePlaybookStore } from '../services/playbookStore';
import { BIAS_LABELS } from '../data/behavioralAssessment';

interface Props {
  onBack: () => void;
  onLessonPress?: (lessonId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  lessonRecs?: string[];
  followUps?: string[];
}

const SUGGESTED_QUESTIONS = [
  'Why is diversification so important?',
  'What\'s the difference between a stock and a bond?',
  'How do I know when to sell a stock?',
  'What is compound interest and why does it matter?',
  'How does inflation affect my portfolio?',
  'What are ETFs and should I use them?',
  'How much should I invest in stocks vs bonds?',
  'What is a P/E ratio and how do I use it?',
];

export function TutorChatScreen({ onBack, onLessonPress }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const { profile: biasProfile } = useBehavioralStore();
  const { activePlaybooks } = usePlaybookStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hi${user?.displayName ? ` ${user.displayName}` : ''}! I'm your AI investing tutor. I know your progress in the curriculum${biasProfile ? `, your behavioral biases (top bias: ${BIAS_LABELS[biasProfile.topBiases[0]]})` : ''}, and I'll tailor my answers to your level.\n\nAsk me anything about investing — from "what is a stock?" to "how do I structure a covered call?"`,
      timestamp: new Date(),
      followUps: SUGGESTED_QUESTIONS.slice(0, 3),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const buildSystemPrompt = () => {
    const tier = user?.currentTier ?? 1;
    const lessonsCompleted = user?.lessonsCompleted?.length ?? 0;
    const topBiases = biasProfile?.topBiases.map(b => BIAS_LABELS[b]).join(', ') ?? 'unknown';
    const playbookNames = activePlaybooks.map(p => p.playbookId).join(', ') || 'none';

    return `You are an expert investing tutor inside an investing education app. You are talking to a student investor.

STUDENT CONTEXT:
- Current tier: ${tier} (1=Beginner, 2=Active Investor, 3=Advanced)
- Lessons completed: ${lessonsCompleted}
- Top behavioral biases: ${topBiases}
- Active investment playbooks: ${playbookNames}

YOUR RULES:
1. Tailor all explanations to their tier level. Tier 1 = simple plain English. Tier 3 = can handle options, macro, advanced concepts.
2. If relevant, gently mention how their behavioral bias might be relevant to the question. Don't overdo it.
3. Be concise — 150-250 words max per response.
4. End responses with: one action item they can take right now, and 1-2 short follow-up questions in JSON format.
5. Format: Plain text response, then on a new line: FOLLOWUPS: ["question 1","question 2"]
6. If they ask about a concept covered in our curriculum, recommend the lesson ID in LESSONS: ["T2L05"]
7. Never give specific buy/sell recommendations. Teach principles, not tips.
8. Be warm, encouraging, direct. This student is building real wealth.`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
    if (!apiKey || apiKey.startsWith('sk-ant-api03-REPLACE')) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: '⚙️ Almost there! To activate the AI Tutor:\n\n1. Get a free API key at console.anthropic.com\n2. Create a file called .env in your project root\n3. Add: EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...\n4. Restart the Expo dev server (npx expo start)\n\nThen come back and ask me anything!',
        timestamp: new Date(),
      }]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for Claude
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.text }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          system: buildSystemPrompt(),
          messages: [...history, { role: 'user', content: text.trim() }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      const raw = data.content?.[0]?.text ?? 'Sorry, I couldn\'t process that. Please try again.';

      // Parse follow-up questions
      let mainText = raw;
      let followUps: string[] = [];
      let lessonRecs: string[] = [];

      const followUpMatch = raw.match(/FOLLOWUPS:\s*(\[.*?\])/s);
      if (followUpMatch) {
        try { followUps = JSON.parse(followUpMatch[1]); } catch {}
        mainText = mainText.replace(/FOLLOWUPS:\s*\[.*?\]/s, '').trim();
      }

      const lessonMatch = raw.match(/LESSONS:\s*(\[.*?\])/s);
      if (lessonMatch) {
        try { lessonRecs = JSON.parse(lessonMatch[1]); } catch {}
        mainText = mainText.replace(/LESSONS:\s*\[.*?\]/s, '').trim();
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: mainText,
        timestamp: new Date(),
        followUps,
        lessonRecs,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      const isAuth = msg.includes('401') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('api key');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: isAuth
          ? '🔑 API key issue — double-check that your EXPO_PUBLIC_ANTHROPIC_KEY in .env is correct and that you\'ve restarted the dev server after saving it.'
          : `Something went wrong: ${msg}\n\nCheck you're online and try again. If the problem persists, verify your API key at console.anthropic.com.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
          <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
        </View>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.msgList}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(msg => (
            <View key={msg.id} style={[styles.msgWrapper, msg.role === 'user' && styles.msgWrapperUser]}>
              {msg.role === 'assistant' && (
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarEmoji}>🤖</Text>
                </View>
              )}
              <View style={[
                styles.bubble,
                msg.role === 'user'
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 },
              ]}>
                <Text style={[styles.bubbleTxt, { color: msg.role === 'user' ? '#fff' : theme.colors.textPrimary }]}>
                  {msg.text}
                </Text>

                {/* Lesson recommendations */}
                {msg.lessonRecs && msg.lessonRecs.length > 0 && (
                  <View style={[styles.lessonsBox, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Text style={[styles.lessonsLabel, { color: theme.colors.primary }]}>📚 Recommended lessons:</Text>
                    <View style={styles.lessonChips}>
                      {msg.lessonRecs.map(id => (
                        <TouchableOpacity key={id} onPress={() => onLessonPress?.(id)} style={[styles.lessonChip, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.lessonChipTxt}>{id}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Follow-up questions */}
                {msg.followUps && msg.followUps.length > 0 && (
                  <View style={styles.followUps}>
                    {msg.followUps.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => sendMessage(q)}
                        style={[styles.followUpBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}
                      >
                        <Text style={[styles.followUpTxt, { color: theme.colors.textSecondary }]}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={styles.msgWrapper}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarEmoji}>🤖</Text>
              </View>
              <View style={[styles.bubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggested questions (only first open) */}
        {messages.length === 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.suggestions, { borderTopColor: theme.colors.border }]}>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => sendMessage(q)}
                style={[styles.suggestionChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.suggestionTxt, { color: theme.colors.textSecondary }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceMuted }]}
            placeholder="Ask me anything about investing..."
            placeholderTextColor={theme.colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.colors.primary : theme.colors.surfaceMuted }]}
          >
            <Text style={styles.sendBtnTxt}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '500' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  msgList: { padding: 16, paddingBottom: 8, gap: 16 },
  msgWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgWrapperUser: { flexDirection: 'row-reverse' },
  avatarBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6C47FF20', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 16 },
  bubble: { flex: 1, padding: 12, borderRadius: 16, maxWidth: '85%' },
  bubbleTxt: { fontSize: 14, lineHeight: 20 },
  lessonsBox: { marginTop: 10, padding: 8, borderRadius: 8 },
  lessonsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  lessonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lessonChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lessonChipTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followUps: { marginTop: 10, gap: 6 },
  followUpBtn: { padding: 8, borderRadius: 8, borderWidth: 1 },
  followUpTxt: { fontSize: 12 },
  suggestions: { borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  suggestionTxt: { fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 80 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sendBtnTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
