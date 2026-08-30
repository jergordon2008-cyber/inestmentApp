/**
 * LeaguesScreen — Friend Investment Leagues
 *
 * Create a private 30/60/90-day league, invite friends with a share code,
 * and compete to grow your paper portfolio the most.
 *
 * Local-first: leagues are stored on-device. Share your code externally
 * to invite friends (they enter the code on their device).
 *
 * Previously empty slots were filled with fake AI "rivals" (invented names
 * with fabricated returns from a sine-wave formula) ranked in the same
 * leaderboard as the real user. Removed outright — a league now only ever
 * contains real participants.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Share, TextInput,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { usePortfolioStore } from '../services/portfolioStore';
import { useUserStore } from '../services/userStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeagueParticipant {
  name:      string;
  isUser:    boolean;
  strategy:  string;
  startValue:number;
  currentReturn: number; // % return since league start
  avatar:    string;     // emoji
}

interface League {
  id:          string;
  name:        string;
  code:        string;
  durationDays:number;
  startDate:   string;
  participants:LeagueParticipant[];
  status:      'active' | 'finished';
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function daysElapsed(startDate: string): number {
  return Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000);
}

function daysLeft(startDate: string, duration: number): number {
  return Math.max(0, duration - daysElapsed(startDate));
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

export function LeaguesScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const portfolio = usePortfolioStore(s => s.portfolio);
  const user      = useUserStore(s => s.user);

  const [leagues, setLeagues]       = useState<League[]>([]);
  const [view, setView]             = useState<'list' | 'create' | 'join' | 'detail'>('list');
  const [selectedLeague, setSelected] = useState<League | null>(null);
  const [joinCode, setJoinCode]     = useState('');
  const [newName, setNewName]       = useState('');
  const [duration, setDuration]     = useState(30);

  // Entry anim
  const fadeA = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeA, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      const raw = await AsyncStorage.getItem('@investapp:leagues');
      if (raw) setLeagues(JSON.parse(raw));
    } catch {}
  };

  const saveLeagues = async (ls: League[]) => {
    setLeagues(ls);
    AsyncStorage.setItem('@investapp:leagues', JSON.stringify(ls)).catch(() => {});
  };

  const createLeague = () => {
    if (!newName.trim()) { showAlert('Name required', 'Enter a league name.'); return; }
    const startDate = new Date().toISOString();
    const league: League = {
      id:           Date.now().toString(),
      name:         newName.trim(),
      code:         generateCode(),
      durationDays: duration,
      startDate,
      status:       'active',
      participants: [
        {
          name:          user?.displayName ?? 'You',
          isUser:        true,
          strategy:      'Your Portfolio',
          startValue:    portfolio?.totalValue ?? 100_000,
          currentReturn: 0,
          avatar:        '⭐',
        },
      ],
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveLeagues([...leagues, league]);
    setSelected(league);
    setView('detail');
  };

  const shareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Join my InvestIQ league! Use code: ${code}\n\nCompete to grow your paper portfolio over ${duration} days. Download InvestIQ to play.`,
        title: 'Join my InvestIQ League',
      });
    } catch {}
  };

  // Compute live returns for all leagues. Only the user's own return is
  // ever recomputed here — real participants who join via a share code
  // keep whatever return was recorded for them (no fabricated return is
  // generated for anyone).
  const liveLeagues = leagues.map(lg => ({
    ...lg,
    participants: lg.participants.map(p => {
      if (p.isUser && portfolio) {
        const ret = ((portfolio.totalValue - p.startValue) / p.startValue) * 100;
        return { ...p, currentReturn: ret };
      }
      return p;
    }),
  }));

  // ── Render views ────────────────────────────────────────────────────────────

  if (view === 'detail' && selectedLeague) {
    const live = liveLeagues.find(l => l.id === selectedLeague.id) ?? selectedLeague;
    const sorted = [...live.participants].sort((a, b) => b.currentReturn - a.currentReturn);
    const userRank = sorted.findIndex(p => p.isUser) + 1;
    const left = daysLeft(live.startDate, live.durationDays);

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={ls.header}>
            <TouchableOpacity onPress={() => setView('list')} style={ls.backBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[ls.headerTitle, { color: theme.colors.textPrimary }]}>{live.name}</Text>
            <TouchableOpacity onPress={() => shareCode(live.code)} style={ls.shareBtn}>
              <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={ls.scroll} showsVerticalScrollIndicator={false}>
            {/* Meta strip */}
            <View style={[ls.metaStrip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <MetaStat icon="time-outline"   label={`${left}d left`}   color={theme.colors.primary} theme={theme} />
              <MetaStat icon="people-outline" label={`${sorted.length} players`} color={theme.colors.gold} theme={theme} />
              <TouchableOpacity onPress={() => shareCode(live.code)} style={[ls.codePill, { backgroundColor: theme.colors.primaryGlow }]}>
                <Text style={[ls.codeText, { color: theme.colors.primary }]}>{live.code}</Text>
                <Ionicons name="copy-outline" size={12} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            {/* User rank card */}
            <LinearGradient
              colors={[theme.colors.primary + '22', theme.colors.primary + '06']}
              style={[ls.rankCard, { borderColor: theme.colors.primary + '35' }]}
            >
              <Text style={[ls.rankNum, { color: theme.colors.primary }]}>#{userRank}</Text>
              <Text style={[ls.rankLabel, { color: theme.colors.textTertiary }]}>YOUR RANK</Text>
              <Text style={[ls.rankReturn, { color: sorted[userRank - 1]?.currentReturn >= 0 ? theme.colors.success : theme.colors.danger }]}>
                {sorted[userRank - 1]?.currentReturn >= 0 ? '+' : ''}
                {sorted[userRank - 1]?.currentReturn.toFixed(2)}% return
              </Text>
            </LinearGradient>

            {/* Leaderboard */}
            <Text style={[ls.sectionTitle, { color: theme.colors.textTertiary }]}>LEADERBOARD</Text>
            {sorted.map((p, rank) => (
              <View
                key={rank}
                style={[
                  ls.row,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  p.isUser && { borderColor: theme.colors.primary + '50', backgroundColor: theme.colors.primaryGlow },
                ]}
              >
                <Text style={[ls.rankBadge, { color: rank === 0 ? '#FFD700' : rank === 1 ? '#C0C0C0' : rank === 2 ? '#CD7F32' : theme.colors.textTertiary }]}>
                  {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                </Text>
                <Text style={ls.avatar}>{p.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ls.pName, { color: p.isUser ? theme.colors.primary : theme.colors.textPrimary }]}>
                    {p.name}{p.isUser ? ' (You)' : ''}
                  </Text>
                  <Text style={[ls.pStrategy, { color: theme.colors.textTertiary }]}>{p.strategy}</Text>
                </View>
                <Text style={[ls.pReturn, { color: p.currentReturn >= 0 ? theme.colors.success : theme.colors.danger }]}>
                  {p.currentReturn >= 0 ? '+' : ''}{p.currentReturn.toFixed(2)}%
                </Text>
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (view === 'create') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={ls.header}>
            <TouchableOpacity onPress={() => setView('list')} style={ls.backBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[ls.headerTitle, { color: theme.colors.textPrimary }]}>New League</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={ls.scroll}>
            <Text style={[ls.inputLabel, { color: theme.colors.textSecondary }]}>LEAGUE NAME</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Friday Night Traders"
              placeholderTextColor={theme.colors.textTertiary}
              style={[ls.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
            />

            <Text style={[ls.inputLabel, { color: theme.colors.textSecondary, marginTop: 20 }]}>DURATION</Text>
            <View style={ls.durationRow}>
              {[30, 60, 90].map(d => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[ls.durationBtn, { backgroundColor: duration === d ? theme.colors.primary : theme.colors.surface, borderColor: duration === d ? theme.colors.primary : theme.colors.border }]}
                >
                  <Text style={[ls.durationText, { color: duration === d ? '#07070D' : theme.colors.textSecondary }]}>{d} days</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={createLeague} style={[ls.createBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]} activeOpacity={0.85}>
              <Ionicons name="trophy-outline" size={18} color="#07070D" />
              <Text style={ls.createBtnText}>Create League</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Main list view ──
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={ls.header}>
          <TouchableOpacity onPress={onBack} style={ls.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={[ls.headerTitle, { color: theme.colors.textPrimary }]}>Leagues</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.ScrollView
          contentContainerStyle={ls.scroll}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeA }}
        >
          {/* Hero */}
          <LinearGradient
            colors={['#6C47FF22', '#6C47FF06']}
            style={[ls.hero, { borderColor: '#6C47FF35' }]}
          >
            <Text style={ls.heroEmoji}>🏆</Text>
            <Text style={[ls.heroTitle, { color: theme.colors.textPrimary }]}>Compete with Friends</Text>
            <Text style={[ls.heroSub, { color: theme.colors.textSecondary }]}>
              Create a private league, invite friends with a code, and race to grow your paper portfolio.
            </Text>
          </LinearGradient>

          {/* Action buttons */}
          <View style={ls.actionRow}>
            <TouchableOpacity
              onPress={() => { setNewName(''); setView('create'); }}
              style={[ls.actionBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#07070D" />
              <Text style={ls.actionBtnText}>New League</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setView('join')}
              style={[ls.actionBtnOutline, { borderColor: theme.colors.border }]}
              activeOpacity={0.8}
            >
              <Ionicons name="enter-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[ls.actionBtnOutlineText, { color: theme.colors.textSecondary }]}>Join with Code</Text>
            </TouchableOpacity>
          </View>

          {/* Active leagues */}
          {liveLeagues.length > 0 && (
            <>
              <Text style={[ls.sectionTitle, { color: theme.colors.textTertiary, marginTop: 24 }]}>YOUR LEAGUES</Text>
              {liveLeagues.map(lg => {
                const sorted = [...lg.participants].sort((a, b) => b.currentReturn - a.currentReturn);
                const userRank = sorted.findIndex(p => p.isUser) + 1;
                const userP = sorted[userRank - 1];
                const left  = daysLeft(lg.startDate, lg.durationDays);
                return (
                  <TouchableOpacity
                    key={lg.id}
                    onPress={() => { setSelected(lg); setView('detail'); }}
                    style={[ls.leagueCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    activeOpacity={0.8}
                  >
                    <View style={ls.leagueTop}>
                      <Text style={[ls.leagueName, { color: theme.colors.textPrimary }]}>{lg.name}</Text>
                      <View style={[ls.statusPill, { backgroundColor: theme.colors.primaryGlow }]}>
                        <Text style={[ls.statusText, { color: theme.colors.primary }]}>
                          {left > 0 ? `${left}d left` : 'Ended'}
                        </Text>
                      </View>
                    </View>
                    <View style={ls.leagueMeta}>
                      <Text style={[ls.leagueRank, { color: theme.colors.textTertiary }]}>
                        Rank #{userRank} of {sorted.length}
                      </Text>
                      <Text style={[ls.leagueReturn, { color: (userP?.currentReturn ?? 0) >= 0 ? theme.colors.success : theme.colors.danger }]}>
                        {(userP?.currentReturn ?? 0) >= 0 ? '+' : ''}{(userP?.currentReturn ?? 0).toFixed(2)}%
                      </Text>
                    </View>
                    {/* Mini leaderboard avatars */}
                    <View style={ls.avatarRow}>
                      {sorted.slice(0, 5).map((p, i) => (
                        <Text key={i} style={[ls.avatarMini, { zIndex: 10 - i, marginLeft: i === 0 ? 0 : -6 }]}>{p.avatar}</Text>
                      ))}
                      {sorted.length > 5 && (
                        <View style={[ls.moreChip, { backgroundColor: theme.colors.surfaceElevated }]}>
                          <Text style={[ls.moreText, { color: theme.colors.textTertiary }]}>+{sorted.length - 5}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Empty state */}
          {liveLeagues.length === 0 && (
            <View style={ls.empty}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🤝</Text>
              <Text style={[ls.emptyTitle, { color: theme.colors.textPrimary }]}>No leagues yet</Text>
              <Text style={[ls.emptySub, { color: theme.colors.textSecondary }]}>
                Create your first league and challenge friends to a paper trading competition.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function MetaStat({ icon, label, color, theme }: { icon: IoniconName; label: string; color: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  scroll:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },
  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  shareBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  // Hero
  hero:      { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 20 },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8, textAlign: 'center' },
  heroSub:   { fontSize: 14, lineHeight: 21, textAlign: 'center' },

  // Buttons
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: '#07070D' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '700' },

  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },

  // League card
  leagueCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  leagueTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  leagueName: { fontSize: 15, fontWeight: '800', flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  leagueMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  leagueRank: { fontSize: 12, fontWeight: '600' },
  leagueReturn: { fontSize: 14, fontWeight: '800' },
  avatarRow:  { flexDirection: 'row', alignItems: 'center' },
  avatarMini: { fontSize: 22 },
  moreChip:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  moreText:   { fontSize: 10, fontWeight: '700' },

  // Detail view
  metaStrip:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  codePill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  codeText:   { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  rankCard:   { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 20 },
  rankNum:    { fontSize: 56, fontWeight: '900', lineHeight: 64 },
  rankLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  rankReturn: { fontSize: 18, fontWeight: '800' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  rankBadge:  { fontSize: 18, width: 36, textAlign: 'center' },
  avatar:     { fontSize: 24 },
  pName:      { fontSize: 14, fontWeight: '700' },
  pStrategy:  { fontSize: 11, fontWeight: '500', marginTop: 2 },
  pReturn:    { fontSize: 15, fontWeight: '800' },

  // Create form
  inputLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  durationRow:{ flexDirection: 'row', gap: 10, marginBottom: 32 },
  durationBtn:{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  durationText:{ fontSize: 14, fontWeight: '700' },
  createBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
  },
  createBtnText: { fontSize: 16, fontWeight: '800', color: '#07070D' },

  // Empty
  empty:      { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  emptySub:   { fontSize: 14, lineHeight: 21, textAlign: 'center', paddingHorizontal: 20 },
});
