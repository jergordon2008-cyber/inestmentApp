/**
 * SocialScreen — Community Hub
 *
 * Unified social tab replacing the scattered community features.
 * One place to: compete, learn together, and connect with other investors.
 *
 * Sections:
 *   🏆 Leagues           — friend competitions
 *   🎯 Challenges        — weekly investing challenges
 *   🏅 Leaderboard       — global rankings
 *   🏫 Classroom         — group learning
 *   👥 Community Forum   — discussion feed
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { usePortfolioStore } from '../services/portfolioStore';
import { useUserStore } from '../services/userStore';
import {
  listLeaderboard, listRecentActivity, ActivityEvent,
  joinChallenge, getChallengeParticipantCounts, hasJoinedChallenge,
} from '../services/firestoreSync';
import { showAlert } from '../utils/alert';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  onClassroomPress:      () => void;
  onCommunityPress?:     () => void;
  onChallengesPress?:    () => void;
}

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 140, friction: 20, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: a, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

// Relative time formatting for the real activity feed (e.g. "2m ago").
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Weekly Challenges ─────────────────────────────────────────────────────────
// Deadlines are real fixed dates (computed relative to app load, refreshed
// weekly) — previously these were hardcoded strings like "3d left" that
// never actually counted down and were wrong within a day of shipping.
function nextDeadline(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

function formatDeadline(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diffMs / 86400000);
  if (days <= 0) return 'Ends today';
  if (days === 1) return '1d left';
  return `${days}d left`;
}

const CHALLENGES = [
  {
    id: 'c2', emoji: '💎', title: 'Find a Hidden Gem',
    desc: 'Discover a stock with P/E under 15 and revenue growth 20%+.',
    prize: '750 XP', deadline: nextDeadline(5), difficulty: 'Hard', color: '#34D399',
  },
  {
    id: 'c3', emoji: '🛡️', title: 'Defensive Portfolio',
    desc: 'Build a portfolio that loses less than 3% in a simulated market crash.',
    prize: '400 XP', deadline: nextDeadline(1), difficulty: 'Easy', color: '#F5A623',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export function SocialScreen({ onClassroomPress, onCommunityPress, onChallengesPress }: Props) {
  const { theme }  = useTheme();
  const user       = useUserStore(s => s.user);
  const portfolio  = usePortfolioStore(s => s.portfolio);

  const totalReturn = portfolio?.totalReturnPercent ?? 0;
  const isUp        = totalReturn >= 0;

  // Real rank + member count (replaces a previously fabricated "#1,847 · Top
  // 15%" and "12.4K members" that had no data behind them), and the real
  // trade activity feed (replaces fake students like "Alex C. bought NVDA").
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [challengeCounts, setChallengeCounts] = useState<Record<string, number>>({});
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(new Set());

  useEffect(() => {
    listLeaderboard(500).then(board => {
      setMemberCount(board.length);
      const idx = board.findIndex(e => e.uid === user?.id);
      setRank(idx >= 0 ? idx + 1 : null);
    }).catch(() => {});
    listRecentActivity(20).then(setActivity).catch(() => {});
    getChallengeParticipantCounts(CHALLENGES.map(c => c.id)).then(setChallengeCounts).catch(() => {});
    if (user?.id) {
      Promise.all(CHALLENGES.map(c => hasJoinedChallenge(c.id, user.id).then(joined => [c.id, joined] as const)))
        .then(results => setJoinedChallenges(new Set(results.filter(([, j]) => j).map(([id]) => id))))
        .catch(() => {});
    }
  }, [user?.id]);

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user || joinedChallenges.has(challengeId)) return;
    setJoinedChallenges(prev => new Set(prev).add(challengeId));
    setChallengeCounts(prev => ({ ...prev, [challengeId]: (prev[challengeId] ?? 0) + 1 }));
    try {
      await joinChallenge(challengeId, user.id);
    } catch {
      showAlert('Could not join', 'Please try again.');
    }
  };

  const percentile = rank && memberCount ? Math.max(1, Math.round((1 - rank / memberCount) * 100)) : null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <FadeUp delay={0}>
          <View style={s.header}>
            <View>
              <Text style={[s.title, { color: theme.colors.textPrimary }]}>Connect</Text>
              <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
                Compete · Learn Together · Share
              </Text>
            </View>
            <View style={[s.memberBadge, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '35' }]}>
              <Ionicons name="people" size={14} color={theme.colors.primary} />
              <Text style={[s.memberText, { color: theme.colors.primary }]}>
                {memberCount === null ? '—' : memberCount}
              </Text>
            </View>
          </View>
        </FadeUp>

        {/* ── Your rank card ── */}
        <FadeUp delay={60}>
          <LinearGradient
            colors={[theme.colors.primary + '20', theme.colors.primary + '06']}
            style={[s.rankCard, { borderColor: theme.colors.primary + '35' }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.rankLabel, { color: theme.colors.textTertiary }]}>YOUR GLOBAL RANK</Text>
              <Text style={[s.rankNum, { color: theme.colors.primary }]}>
                {rank ? `#${rank}` : '—'}
              </Text>
              <Text style={[s.rankSub, { color: theme.colors.textSecondary }]}>
                {percentile ? `Top ${percentile}% of all investors` : 'Make a trade to get ranked'}
              </Text>
            </View>
            <View style={s.rankRight}>
              <Text style={[s.rankReturn, { color: isUp ? theme.colors.success : theme.colors.danger }]}>
                {isUp ? '+' : ''}{totalReturn.toFixed(2)}%
              </Text>
              <Text style={[s.rankReturnLabel, { color: theme.colors.textTertiary }]}>portfolio</Text>
            </View>
          </LinearGradient>
        </FadeUp>

        {/* ── Main feature cards ── */}
        <FadeUp delay={100}>
          <Text style={[s.sectionTitle, { color: theme.colors.textTertiary }]}>COMMUNITY</Text>
          <View style={s.featureGrid}>
            <FeatureCard
              icon="school-outline" label="Classroom" sub="Group learning · rankings"
              color="#34D399" onPress={onClassroomPress} theme={theme}
            />
            {onCommunityPress && (
              <FeatureCard
                icon="chatbubbles-outline" label="Forum" sub="Discuss & share"
                color="#F87171" onPress={onCommunityPress} theme={theme}
              />
            )}
          </View>
        </FadeUp>

        {/* ── Weekly Challenges ── */}
        <FadeUp delay={140}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.colors.textTertiary }]}>WEEKLY CHALLENGES</Text>
            <TouchableOpacity onPress={onChallengesPress}>
              <Text style={[s.seeAll, { color: theme.colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {CHALLENGES.map((ch, i) => {
            const joined = joinedChallenges.has(ch.id);
            const count = challengeCounts[ch.id] ?? 0;
            return (
            <FadeUp key={ch.id} delay={160 + i * 40}>
              <TouchableOpacity
                style={[s.challengeCard, { backgroundColor: theme.colors.surface, borderColor: ch.color + '35' }]}
                activeOpacity={0.8}
                onPress={() => handleJoinChallenge(ch.id)}
              >
                <View style={[s.challengeEmoji, { backgroundColor: ch.color + '18' }]}>
                  <Text style={{ fontSize: 24 }}>{ch.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <Text style={[s.challengeTitle, { color: theme.colors.textPrimary }]}>{ch.title}</Text>
                    <View style={[s.diffPill, { backgroundColor: ch.color + '20' }]}>
                      <Text style={[s.diffText, { color: ch.color }]}>{ch.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={[s.challengeDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {ch.desc}
                  </Text>
                  <View style={s.challengeMeta}>
                    <Ionicons name="star-outline" size={11} color={theme.colors.gold} />
                    <Text style={[s.challengeMetaText, { color: theme.colors.gold }]}>{ch.prize}</Text>
                    <Text style={[s.challengeMetaSep, { color: theme.colors.textTertiary }]}>·</Text>
                    <Ionicons name="time-outline" size={11} color={theme.colors.textTertiary} />
                    <Text style={[s.challengeMetaText, { color: theme.colors.textTertiary }]}>{formatDeadline(ch.deadline)}</Text>
                    <Text style={[s.challengeMetaSep, { color: theme.colors.textTertiary }]}>·</Text>
                    <Ionicons name="people-outline" size={11} color={theme.colors.textTertiary} />
                    <Text style={[s.challengeMetaText, { color: theme.colors.textTertiary }]}>{count.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={[s.joinBtn, { backgroundColor: joined ? theme.colors.surfaceMuted : ch.color }]}>
                  <Text style={[s.joinBtnText, joined && { color: theme.colors.textSecondary }]}>{joined ? '✓ Joined' : 'Join'}</Text>
                </View>
              </TouchableOpacity>
            </FadeUp>
            );
          })}
        </FadeUp>

        {/* ── Live Activity Feed (real trades) ── */}
        <FadeUp delay={300}>
          <Text style={[s.sectionTitle, { color: theme.colors.textTertiary, marginTop: 8 }]}>LIVE ACTIVITY</Text>
          <View style={[s.activityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {activity.length === 0 ? (
              <Text style={[s.activityTime, { color: theme.colors.textTertiary, padding: 14 }]}>
                No trades yet — be the first to show up here.
              </Text>
            ) : activity.map((item, i) => (
              <View key={item.id} style={[s.activityRow, { borderBottomColor: theme.colors.border }, i === activity.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.activityAvatar}>{item.action === 'buy' ? '📈' : '📉'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.activityText, { color: theme.colors.textPrimary }]}>
                    <Text style={{ fontWeight: '700' }}>{item.displayName}</Text>
                    {' '}{item.action === 'buy' ? 'bought' : 'sold'}{' '}
                    <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{item.symbol}</Text>
                  </Text>
                  <Text style={[s.activityTime, { color: theme.colors.textTertiary }]}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeUp>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Feature Card (2x2 grid) ────────────────────────────────────────────────────
function FeatureCard({ icon, label, sub, color, onPress, theme, badge }: {
  icon: IoniconName; label: string; sub: string; color: string;
  onPress: () => void; theme: any; badge?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.featureCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {badge && (
        <View style={[s.featureBadge, { backgroundColor: color + '20' }]}>
          <Text style={[s.featureBadgeText, { color }]}>{badge}</Text>
        </View>
      )}
      <View style={[s.featureIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[s.featureLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Text style={[s.featureSub, { color: theme.colors.textTertiary }]}>{sub}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  title:       { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  subtitle:    { fontSize: 12, marginTop: 2 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  memberText:  { fontSize: 13, fontWeight: '800' },

  rankCard:    { marginHorizontal: 16, borderRadius: 22, borderWidth: 1, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  rankLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  rankNum:     { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  rankSub:     { fontSize: 12, fontWeight: '500', marginTop: 4 },
  rankRight:   { alignItems: 'flex-end' },
  rankReturn:  { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  rankReturnLabel: { fontSize: 10, fontWeight: '600' },

  sectionTitle:  { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, paddingHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, marginBottom: 12 },
  seeAll:        { fontSize: 12, fontWeight: '700' },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 22 },
  featureCard: { width: '47%', borderRadius: 18, borderWidth: 1, padding: 16, position: 'relative', overflow: 'hidden' },
  featureBadge:    { position: 'absolute', top: 10, right: 10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  featureBadgeText:{ fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureLabel:{ fontSize: 14, fontWeight: '800', marginBottom: 3 },
  featureSub:  { fontSize: 11, fontWeight: '500' },

  challengeCard:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10 },
  challengeEmoji: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  challengeTitle: { fontSize: 13, fontWeight: '700' },
  diffPill:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  diffText:       { fontSize: 9, fontWeight: '800' },
  challengeDesc:  { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  challengeMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  challengeMetaText:  { fontSize: 10, fontWeight: '600' },
  challengeMetaSep:   { fontSize: 10 },
  joinBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginLeft: 8 },
  joinBtnText:    { fontSize: 12, fontWeight: '800', color: '#07070D' },

  activityCard:   { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  activityRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, gap: 10 },
  activityAvatar: { fontSize: 24 },
  activityText:   { fontSize: 13, lineHeight: 18 },
  activityTime:   { fontSize: 10, marginTop: 2 },
  activityChange: { fontSize: 13, fontWeight: '800' },
});
