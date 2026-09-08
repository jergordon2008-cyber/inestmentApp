/**
 * Leaderboard Screen — real data only.
 *
 * Pulls every student's public_stats doc from Firestore (denormalized:
 * displayName, totalValue, totalReturnPercent, tier — see firestoreSync.ts)
 * and ranks by all-time portfolio return. No mock/random data.
 *
 * Previously this screen showed fabricated weekly/monthly numbers and a
 * hardcoded mock leaderboard with the user injected at a fake rank — removed
 * entirely rather than left in, since fake numbers are worse than none.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { changeColor, changeSign } from '../utils/change';
import { useUserStore } from '../services/userStore';
import { listLeaderboard, PublicStats } from '../services/firestoreSync';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const { theme } = useTheme();
  const user = useUserStore(state => state.user);
  const [entries, setEntries] = useState<PublicStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const board = await listLeaderboard(100);
      setEntries(board);
    } catch (e) {
      console.warn('[leaderboard] failed to load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rank = entries.findIndex(e => e.uid === user?.id) + 1;
  const userEntry = rank > 0 ? entries[rank - 1] : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Leaderboard</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      {userEntry && (
        <View style={[styles.rankBanner, { backgroundColor: theme.colors.primaryGlow }]}>
          <Text style={[styles.rankBannerLabel, { color: theme.colors.primary }]}>YOUR RANK</Text>
          <View style={styles.rankBannerRow}>
            <Text style={[styles.rankBannerNumber, { color: theme.colors.primary }]}>#{rank}</Text>
            <Text style={[styles.rankBannerReturn, {
              color: changeColor(userEntry.totalReturnPercent, theme),
            }]}>
              {changeSign(userEntry.totalReturnPercent)}{userEntry.totalReturnPercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        >
          {entries.length === 0 && (
            <View style={styles.emptyFriends}>
              <Ionicons name="podium-outline" size={48} color={theme.colors.textTertiary} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No rankings yet</Text>
              <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
                Once students start trading, real portfolio rankings will show up here.
              </Text>
            </View>
          )}

          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.uid}
              entry={entry}
              rank={i + 1}
              isCurrentUser={entry.uid === user?.id}
              theme={theme}
            />
          ))}

          {entries.length > 0 && (
            <Text style={[styles.bottomNote, { color: theme.colors.textTertiary }]}>
              Rankings based on real paper portfolio returns. Pull down to refresh.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LeaderboardRow({ entry, rank, isCurrentUser, theme }: {
  entry: PublicStats; rank: number; isCurrentUser: boolean; theme: any;
}) {
  const returnTint = changeColor(entry.totalReturnPercent, theme);
  // Top three get a medal in the app's icon set, tinted gold/silver/bronze.
  const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null;

  return (
    <View style={[
      styles.row,
      { backgroundColor: isCurrentUser ? theme.colors.primaryGlow : 'transparent', borderBottomColor: theme.colors.border },
    ]}>
      <View style={styles.rankCol}>
        {medalColor ? <Ionicons name="medal" size={20} color={medalColor} />
          : <Text style={[styles.rankNum, { color: theme.colors.textTertiary }]}>{rank}</Text>}
      </View>

      <View style={[styles.avatar, { backgroundColor: isCurrentUser ? theme.colors.primary : theme.colors.surfaceMuted }]}>
        <Text style={[styles.avatarInitial, { color: isCurrentUser ? '#FFFFFF' : theme.colors.textSecondary }]}>
          {entry.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.nameCol}>
        <Text style={[styles.displayName, { color: theme.colors.textPrimary, fontWeight: isCurrentUser ? '700' : '500' }]} numberOfLines={1}>
          {isCurrentUser ? 'You' : entry.displayName}
        </Text>
        <Text style={[styles.tierLabel, { color: theme.colors.textTertiary }]}>Tier {entry.currentTier}</Text>
      </View>

      <Text style={[styles.returnText, { color: returnTint }]}>
        {changeSign(entry.totalReturnPercent)}{entry.totalReturnPercent.toFixed(2)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  backText: { fontSize: 16, fontWeight: '500', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '600' },

  rankBanner: { paddingHorizontal: 20, paddingVertical: 12 },
  rankBannerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  rankBannerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  rankBannerNumber: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  rankBannerReturn: { fontSize: 18, fontWeight: '600' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 0.5, gap: 10,
  },
  rankCol: { width: 32, alignItems: 'center' },
  medal: { fontSize: 20 },
  rankNum: { fontSize: 14, fontWeight: '600' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 15, fontWeight: '700' },
  nameCol: { flex: 1 },
  displayName: { fontSize: 15, marginBottom: 2 },
  tierLabel: { fontSize: 11, fontWeight: '500' },
  returnText: { fontSize: 16, fontWeight: '700', minWidth: 70, textAlign: 'right' },

  emptyFriends: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

  bottomNote: { fontSize: 11, textAlign: 'center', lineHeight: 17, paddingHorizontal: 24, marginTop: 20 },
});
