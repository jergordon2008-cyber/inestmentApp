import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { useBehavioralStore } from '../services/behavioralStore';
import { BIAS_LABELS } from '../data/behavioralAssessment';
import { callClaudeForTutor } from '../services/claudeAPI';

interface Message { id: string; role: 'user' | 'assistant'; text: string; timestamp: number; }

interface Props { onBack: () => void; onLessonPress?: (lessonId: string) => void; }

const SUGGESTED_QUESTIONS = [
  "What's the difference between a stock and a bond?",
  "How do I know if a stock is overvalued?",
  "What is dollar-cost averaging?",
  "How much should I invest each month?",
  "What ETF should a beginner start with?",
  "How do I read an earnings report?",
  "What is a P/E ratio and why does it matter?",
  "How does inflation affect my investments?",
];

export function AiTutorScreen({ onBack, onLessonPress }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const { profile: biasProfile } = useBehavioralStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const s = styles(theme);

  const userTier = user?.currentTier ?? 1;
  const lessonsCount = user?.lessonsCompleted?.length ?? 0;
  const topBias = biasProfile?.topBiases?.[0];

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const context = {
        tier: userTier,
        lessonsCompleted: lessonsCount,
        topBias: topBias ? BIAS_LABELS[topBias] : undefined,
        conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.text })),
      };
      const answer = await callClaudeForTutor(text.trim(), context);
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: answer, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: "I'm having trouble connecting right now. Try again in a moment — or check that your Claude API proxy is configured.", timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={[s.backText, { color: theme.colors.primary }]}>← Back</Text></TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: theme.colors.textPrimary }]}>AI Tutor</Text>
          <Text style={[s.headerSub, { color: theme.colors.textSecondary }]}>Tier {userTier} · {lessonsCount} lessons complete</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={s.messagesContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 && (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 56, textAlign: 'center', marginBottom: 16 }}>🎓</Text>
              <Text style={[s.emptyTitle, { color: theme.colors.textPrimary }]}>Ask me anything about investing</Text>
              <Text style={[s.emptySubtitle, { color: theme.colors.textSecondary }]}>
                I know your progress and tailor answers to Tier {userTier}.{biasProfile ? `
I also know your top bias is ${BIAS_LABELS[biasProfile.topBiases[0]]} — I'll call it out when relevant.` : ''}
              </Text>
              <Text style={[s.suggestedLabel, { color: theme.colors.textSecondary }]}>Try asking:</Text>
              <View style={s.suggestedGrid}>
                {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                  <TouchableOpacity key={i} style={[s.suggChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => sendMessage(q)}>
                    <Text style={[s.suggText, { color: theme.colors.textSecondary }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map(msg => (
            <View key={msg.id} style={[s.messageBubble, msg.role === 'user' ? s.userBubble : s.assistantBubble, {
              backgroundColor: msg.role === 'user' ? theme.colors.primary : theme.colors.surface,
              borderColor: msg.role === 'assistant' ? theme.colors.border : 'transparent',
            }]}>
              {msg.role === 'assistant' && <Text style={[s.roleLabel, { color: theme.colors.primary }]}>🎓 Tutor</Text>}
              <Text style={[s.messageText, { color: msg.role === 'user' ? '#fff' : theme.colors.textPrimary }]}>{msg.text}</Text>
            </View>
          ))}

          {loading && (
            <View style={[s.messageBubble, s.assistantBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
        </ScrollView>

        <View style={[s.inputRow, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[s.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about investing..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity style={[s.sendBtn, { backgroundColor: input.trim() ? theme.colors.primary : theme.colors.surfaceMuted }]} onPress={() => sendMessage(input)} disabled={!input.trim() || loading}>
            <Text style={[s.sendText, { color: input.trim() ? '#fff' : theme.colors.textTertiary }]}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { padding: 8 },
  backText: { fontSize: 15 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  suggestedLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, alignSelf: 'flex-start' },
  suggestedGrid: { width: '100%', gap: 8 },
  suggChip: { borderRadius: 12, padding: 12, borderWidth: 1 },
  suggText: { fontSize: 13, lineHeight: 19 },
  messageBubble: { borderRadius: 16, padding: 14, marginBottom: 12, maxWidth: '88%', borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderRadius: 16, borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderRadius: 16, borderBottomLeftRadius: 4 },
  roleLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  messageText: { fontSize: 15, lineHeight: 23 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 18, fontWeight: '700' },
});
