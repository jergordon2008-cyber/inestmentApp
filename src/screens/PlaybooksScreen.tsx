import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { playbooks, Playbook } from '../data/playbooks';
import { usePlaybookStore } from '../services/playbookStore';
import { useUserStore } from '../services/userStore';
import { useSubscriptionStore } from '../services/subscriptionStore';

interface Props {
  onPlaybookPress: (playbookId: string) => void;
  onSubscribePress: () => void;
  onBack: () => void;
}

export function PlaybooksScreen({ onPlaybookPress, onSubscribePress, onBack }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const { activePlaybooks } = usePlaybookStore();
  const canUseFeature = useSubscriptionStore(s => s.canUseFeature);

  const diffColor = (d: Playbook['difficulty']) =>
    d === 'Beginner' ? theme.colors.success : d === 'Intermediate' ? '#F59E0B' : theme.colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Playbooks</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>
          Choose a strategy that fits your goals. Each playbook gives you step-by-step guidance.
        </Text>

        {playbooks.map(pb => {
          const prog = activePlaybooks.find(a => a.playbookId === pb.id);
          const isActive = !!prog;
          const pct = prog ? Math.round((prog.completedSteps.length / pb.steps.length) * 100) : 0;
          // Tier 1 playbooks are free for everyone; tier 2/3 ("advanced")
          // playbooks require the advancedPlaybooks premium feature.
          const locked = pb.tier > 1 && !canUseFeature('advancedPlaybooks');

          return (
            <TouchableOpacity
              key={pb.id}
              onPress={() => (locked ? onSubscribePress() : onPlaybookPress(pb.id))}
              activeOpacity={0.75}
            >
              <Card style={[styles.card, locked && { opacity: 0.45 }]}>
                <View style={styles.row}>
                  <Text style={styles.emoji}>{pb.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{pb.name}</Text>
                    <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>{pb.tagline}</Text>
                  </View>
                  {locked && <Text style={[styles.lockTag, { color: theme.colors.textTertiary }]}>🔒 Premium</Text>}
                </View>

                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: diffColor(pb.difficulty) + '20' }]}>
                    <Text style={[styles.badgeTxt, { color: diffColor(pb.difficulty) }]}>{pb.difficulty}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Text style={[styles.badgeTxt, { color: theme.colors.textSecondary }]}>⏱ {pb.timeCommitment}</Text>
                  </View>
                  {isActive && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                      <Text style={[styles.badgeTxt, { color: theme.colors.primary }]}>✓ Active</Text>
                    </View>
                  )}
                </View>

                {isActive && (
                  <View style={styles.progRow}>
                    <View style={[styles.progTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <View style={[styles.progFill, { backgroundColor: theme.colors.primary, width: `${pct}%` }]} />
                    </View>
                    <Text style={[styles.progLabel, { color: theme.colors.textSecondary }]}>
                      {prog!.completedSteps.length}/{pb.steps.length} steps
                    </Text>
                  </View>
                )}

                <Text style={[styles.bestFor, { color: theme.colors.textTertiary }]}>
                  Best for: {pb.bestFor}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  card: { marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  emoji: { fontSize: 32 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  tagline: { fontSize: 13, lineHeight: 18 },
  lockTag: { fontSize: 11 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },
  progRow: { marginBottom: 8 },
  progTrack: { height: 4, borderRadius: 2, marginBottom: 4 },
  progFill: { height: 4, borderRadius: 2 },
  progLabel: { fontSize: 11 },
  bestFor: { fontSize: 11, lineHeight: 16 },
});
