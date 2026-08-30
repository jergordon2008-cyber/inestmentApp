import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, } from 'react-native';
import { showAlert } from '../utils/alert';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getPlaybookById } from '../data/playbooks';
import { usePlaybookStore } from '../services/playbookStore';

interface Props {
  playbookId: string;
  onBack: () => void;
  onLessonPress?: (lessonId: string) => void;
}

export function PlaybookDetailScreen({ playbookId, onBack, onLessonPress }: Props) {
  const { theme } = useTheme();
  const playbook = getPlaybookById(playbookId);
  const { activePlaybooks, activatePlaybook, deactivatePlaybook, toggleStep, getPlaybookProgress } = usePlaybookStore();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (!playbook) return null;

  const prog = getPlaybookProgress(playbookId);
  const isActive = !!prog;
  const completedCount = prog?.completedSteps.length ?? 0;
  const totalSteps = playbook.steps.length;
  const pct = Math.round((completedCount / totalSteps) * 100);

  const handleActivate = () => {
    activatePlaybook(playbookId);
  };

  const handleDeactivate = () => {
    showAlert('Remove Playbook?', 'Your progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deactivatePlaybook(playbookId) },
    ]);
  };

  const diffColor =
    playbook.difficulty === 'Beginner' ? theme.colors.success :
    playbook.difficulty === 'Intermediate' ? '#F59E0B' :
    theme.colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {playbook.emoji} {playbook.name}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Card style={styles.heroCard}>
          <Text style={styles.heroEmoji}>{playbook.emoji}</Text>
          <Text style={[styles.heroName, { color: theme.colors.textPrimary }]}>{playbook.name}</Text>
          <Text style={[styles.heroTagline, { color: theme.colors.primary }]}>{playbook.tagline}</Text>
          <Text style={[styles.heroDesc, { color: theme.colors.textSecondary }]}>{playbook.description}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: diffColor + '20' }]}>
              <Text style={[styles.metaBadgeTxt, { color: diffColor }]}>{playbook.difficulty}</Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.metaBadgeTxt, { color: theme.colors.textSecondary }]}>⏱ {playbook.timeCommitment}</Text>
            </View>
          </View>

          <Text style={[styles.bestFor, { color: theme.colors.textTertiary }]}>
            Best for: {playbook.bestFor}
          </Text>
        </Card>

        {/* Progress (if active) */}
        {isActive && (
          <Card style={styles.progressCard}>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>Your Progress</Text>
            <View style={[styles.progTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
              <View style={[styles.progFill, { backgroundColor: theme.colors.primary, width: `${pct}%` }]} />
            </View>
            <Text style={[styles.progTxt, { color: theme.colors.textSecondary }]}>
              {completedCount} of {totalSteps} steps complete ({pct}%)
            </Text>
          </Card>
        )}

        {/* Steps */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>The {totalSteps}-Step Process</Text>
        {playbook.steps.map((step, idx) => {
          const isCompleted = prog?.completedSteps.includes(step.id) ?? false;
          const isExpanded = expandedStep === step.id;

          return (
            <Card key={step.id} style={styles.stepCard}>
              <TouchableOpacity
                onPress={() => setExpandedStep(isExpanded ? null : step.id)}
                style={styles.stepHeader}
                activeOpacity={0.7}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  onPress={() => isActive && toggleStep(playbookId, step.id)}
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isCompleted ? theme.colors.success : theme.colors.border,
                      backgroundColor: isCompleted ? theme.colors.success : 'transparent',
                    },
                  ]}
                >
                  {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepNum, { color: theme.colors.textTertiary }]}>Step {idx + 1}</Text>
                  <Text style={[styles.stepTitle, { color: isCompleted ? theme.colors.textTertiary : theme.colors.textPrimary }]}>
                    {step.title}
                  </Text>
                </View>
                <Text style={[styles.chevron, { color: theme.colors.textTertiary }]}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.stepBody}>
                  <Text style={[styles.stepDesc, { color: theme.colors.textSecondary }]}>{step.description}</Text>

                  <Text style={[styles.actionLabel, { color: theme.colors.textPrimary }]}>Action items:</Text>
                  {step.actionItems.map((item, i) => (
                    <View key={i} style={styles.actionItem}>
                      <Text style={[styles.bullet, { color: theme.colors.primary }]}>→</Text>
                      <Text style={[styles.actionTxt, { color: theme.colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))}

                  {step.relatedLessonIds.length > 0 && (
                    <View style={[styles.lessonsBox, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <Text style={[styles.lessonsLabel, { color: theme.colors.textTertiary }]}>Related lessons:</Text>
                      <View style={styles.lessonLinks}>
                        {step.relatedLessonIds.map(id => (
                          <TouchableOpacity
                            key={id}
                            onPress={() => onLessonPress?.(id)}
                            style={[styles.lessonChip, { backgroundColor: theme.colors.primary + '20' }]}
                          >
                            <Text style={[styles.lessonChipTxt, { color: theme.colors.primary }]}>{id}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {isActive && (
                    <Button
                      title={isCompleted ? 'Mark Incomplete' : 'Mark Complete ✓'}
                      variant={isCompleted ? 'secondary' : 'primary'}
                      onPress={() => toggleStep(playbookId, step.id)}
                      style={{ marginTop: 12 }}
                    />
                  )}
                </View>
              )}
            </Card>
          );
        })}

        {/* Metrics */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Success Metrics</Text>
        <Card style={styles.metricsCard}>
          {playbook.metrics.map((m, i) => (
            <View key={i} style={[styles.metricRow, i < playbook.metrics.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.metricName, { color: theme.colors.textPrimary }]}>{m.name}</Text>
              <Text style={[styles.metricDesc, { color: theme.colors.textSecondary }]}>{m.description}</Text>
              <View style={[styles.targetBox, { backgroundColor: theme.colors.success + '15' }]}>
                <Text style={[styles.targetTxt, { color: theme.colors.success }]}>Target: {m.target}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.successBox, { backgroundColor: theme.colors.primaryGlow }]}>
            <Text style={[styles.successLabel, { color: theme.colors.primary }]}>Success looks like:</Text>
            <Text style={[styles.successTxt, { color: theme.colors.textSecondary }]}>{playbook.successCriteria}</Text>
          </View>
        </Card>

        {/* CTA */}
        {isActive ? (
          <Button title="Remove This Playbook" variant="destructive" onPress={handleDeactivate} style={{ marginTop: 8, marginBottom: 8 }} />
        ) : (
          <Button title={`Start ${playbook.name} →`} variant="primary" onPress={handleActivate} style={{ marginTop: 8, marginBottom: 8 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 50 },
  heroCard: { alignItems: 'center', marginBottom: 16 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroName: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  heroTagline: { fontSize: 14, fontWeight: '500', textAlign: 'center', marginBottom: 12 },
  heroDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaBadgeTxt: { fontSize: 12, fontWeight: '600' },
  bestFor: { fontSize: 12, textAlign: 'center' },
  progressCard: { marginBottom: 16 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  progTrack: { height: 8, borderRadius: 4, marginBottom: 6 },
  progFill: { height: 8, borderRadius: 4 },
  progTxt: { fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  stepCard: { marginBottom: 10 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepNum: { fontSize: 11, marginBottom: 1 },
  stepTitle: { fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 12 },
  stepBody: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#ffffff10' },
  stepDesc: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  actionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  actionItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  actionTxt: { flex: 1, fontSize: 13, lineHeight: 18 },
  lessonsBox: { padding: 10, borderRadius: 8, marginTop: 12 },
  lessonsLabel: { fontSize: 11, marginBottom: 6 },
  lessonLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lessonChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  lessonChipTxt: { fontSize: 12, fontWeight: '600' },
  metricsCard: { marginBottom: 16 },
  metricRow: { paddingVertical: 12 },
  metricName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  metricDesc: { fontSize: 13, marginBottom: 6 },
  targetBox: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  targetTxt: { fontSize: 12, fontWeight: '600' },
  successBox: { marginTop: 12, padding: 12, borderRadius: 8 },
  successLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  successTxt: { fontSize: 13, lineHeight: 18 },
});
