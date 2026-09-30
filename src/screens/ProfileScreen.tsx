import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Animated, Easing, Switch, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { changeColor, changeSign } from '../utils/change';
import { useUserStore, useCurrentStreak } from '../services/userStore';
import { usePortfolioStore } from '../services/portfolioStore';
import { AnimatedNumber } from '../components/AnimatedNumber';
import {
  useSyncStatusStore, selectHasUnsaved, selectHasFailed, selectIsRetrying, selectIsSaving, retryNow,
} from '../services/syncStatus';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  onBehavioralAssessmentPress?: () => void;
  onPlaybooksPress?: () => void;
  onMacroDashboardPress?: () => void;
  onCommunityPress?: () => void;
  onTutorChatPress?: () => void;
  onSignOut: () => void;
  onRestartOnboarding: () => void;
  /** Shows the first-run tour again. */
  onReplayTourPress?: () => void;
  onJournalPress?: () => void;
  onClassroomPress?: () => void;
  onCustomizePress?: () => void;
  onPrivacyPress: () => void;
  onTermsPress: () => void;
  onAdminPress?: () => void;
  isAdmin?: boolean;
}

function FadeSlide({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y       = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 160, friction: 22, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

/** What signing out with unsaved changes does to each kind of change. */
const SIGN_OUT_NOTE =
  "If you sign out now, portfolio and journal changes won't reach your account; a backup copy stays on this device only. " +
  "Profile details are kept on this device and saved the next time you sign in here.";

export function ProfileScreen({
  onSignOut, onRestartOnboarding, onReplayTourPress, onJournalPress, onClassroomPress, onPrivacyPress, onTermsPress,
  onBehavioralAssessmentPress, onPlaybooksPress, onMacroDashboardPress,
  onCommunityPress, onTutorChatPress, onCustomizePress,
  onAdminPress, isAdmin,
}: Props) {
  const { theme, toggleTheme, mode } = useTheme();
  const user      = useUserStore(s => s.user);
  const portfolio = usePortfolioStore(s => s.portfolio);
  const streak    = useCurrentStreak();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  // Signing out clears this account's portfolio and journal from the device,
  // so anything not yet in the cloud would be lost. The sheet warns first and
  // offers to retry; it switches back to the plain confirmation by itself
  // once everything has saved.
  const hasUnsaved = useSyncStatusStore(selectHasUnsaved);
  const hasFailed  = useSyncStatusStore(selectHasFailed);
  const retrying   = useSyncStatusStore(selectIsRetrying);
  const saving     = useSyncStatusStore(selectIsSaving);

  if (!user) return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={s.loading}><Text style={{ color: theme.colors.textSecondary }}>Loading…</Text></View>
    </SafeAreaView>
  );

  const tierLabel = ['', 'Foundation', 'Active', 'Advanced'][user.currentTier] ?? 'Foundation';
  const initial   = user.displayName.charAt(0).toUpperCase();
  const returnTint = changeColor(portfolio?.totalReturn, theme);

  const handleSignOut = () => setShowSignOutModal(true);
  const confirmSignOut = () => { setShowSignOutModal(false); onSignOut(); };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <FadeSlide delay={0}>
          <LinearGradient
            colors={[theme.colors.primary + '18', 'transparent']}
            style={s.headerCard}
          >
            <View style={[s.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <Text style={[s.displayName, { color: theme.colors.textPrimary }]}>{user.displayName}</Text>
            <Text style={[s.email, { color: theme.colors.textTertiary }]}>{user.email}</Text>
            <View style={[s.tierPill, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary + '35' }]}>
              <Text style={[s.tierPillText, { color: theme.colors.primary }]}>Tier {user.currentTier} · {tierLabel}</Text>
            </View>
          </LinearGradient>
        </FadeSlide>

        {/* ── Stats row ── */}
        <FadeSlide delay={80}>
          <View style={[s.statsRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Until the portfolio loads there's no real value or return to
                show — a shimmer, as on Home, not a made-up $100,000 / 0.0%. */}
            <View style={s.statItem}>
              {portfolio ? (
                <AnimatedNumber
                  value={portfolio.totalValue}
                  formatter={n => `$${Math.round(n).toLocaleString()}`}
                  style={[s.statVal, { color: theme.colors.textPrimary }]}
                />
              ) : (
                <View accessibilityLabel="Loading portfolio" style={[s.statSkeleton, { width: 72, backgroundColor: theme.colors.shimmer }]} />
              )}
              <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Portfolio</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={s.statItem}>
              {portfolio ? (
                <Text style={[s.statVal, { color: returnTint }]}>
                  {changeSign(portfolio.totalReturn)}{portfolio.totalReturnPercent.toFixed(1)}%
                </Text>
              ) : (
                <View accessibilityLabel="Loading return" style={[s.statSkeleton, { width: 48, backgroundColor: theme.colors.shimmer }]} />
              )}
              <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Return</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statVal, { color: theme.colors.gold }]}>{streak}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Streak</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{user.lessonsCompleted.length}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Lessons</Text>
            </View>
          </View>
        </FadeSlide>

        {/* ── Activity section ── */}
        <FadeSlide delay={220}>
          <SectionGroup title="Activity" theme={theme}>
            {onJournalPress && (
              <SettingRow icon="journal-outline" label="Trade Journal" meta="Review your trades" onPress={onJournalPress} theme={theme} />
            )}
            {onClassroomPress && (
              <SettingRow icon="school-outline" label="Classroom" meta="Your class · rankings" onPress={onClassroomPress} theme={theme} />
            )}
            {onCommunityPress && (
              <SettingRow icon="people-outline" label="Community" meta="Challenges · Forum" onPress={onCommunityPress} theme={theme} />
            )}
            {onTutorChatPress && (
              <SettingRow icon="chatbubble-ellipses-outline" label="AI Tutor" meta="Coming soon" onPress={onTutorChatPress} theme={theme} />
            )}
            {onPlaybooksPress && (
              <SettingRow icon="book-outline" label="Playbooks" meta="6 investment strategies" onPress={onPlaybooksPress} theme={theme} />
            )}
            {onMacroDashboardPress && (
              <SettingRow icon="globe-outline" label="Market Cycle" meta="Economic dashboard" onPress={onMacroDashboardPress} theme={theme} />
            )}
            {onBehavioralAssessmentPress && (
              <SettingRow icon="analytics-outline" label="Behavioral Quiz" meta="Discover your biases" onPress={onBehavioralAssessmentPress} theme={theme} />
            )}
          </SectionGroup>
        </FadeSlide>

        {/* ── Admin (only visible to accounts in the admins/ Firestore collection) ── */}
        {isAdmin && onAdminPress && (
          <FadeSlide delay={240}>
            <SectionGroup title="Admin" theme={theme}>
              <SettingRow
                icon="shield-checkmark-outline"
                label="Admin Dashboard"
                meta="View all student accounts"
                onPress={onAdminPress}
                theme={theme}
                accent={theme.colors.gold}
              />
            </SectionGroup>
          </FadeSlide>
        )}

        {/* ── Customize App ── */}
        <FadeSlide delay={260}>
          <SectionGroup title="Appearance & Customize" theme={theme}>
            <SettingRow
              icon="color-palette-outline"
              label="Appearance"
              meta="Theme · colors · font size · layout"
              onPress={onCustomizePress}
              theme={theme}
              accent={theme.colors.primary}
            />
            <View style={s.switchRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={18} color={theme.colors.textSecondary} />
                <Text style={[s.switchLabel, { color: theme.colors.textPrimary }]}>Dark Mode</Text>
              </View>
              <Switch value={mode === 'dark'} onValueChange={toggleTheme} />
            </View>
          </SectionGroup>
        </FadeSlide>

        {/* ── Settings ── */}
        <FadeSlide delay={300}>
          <SectionGroup title="Settings" theme={theme}>
            {onReplayTourPress && (
              <SettingRow icon="map-outline" label="App Tour" meta="Replay" onPress={onReplayTourPress} theme={theme} />
            )}
            <SettingRow icon="document-text-outline" label="Privacy Policy" meta="View" onPress={onPrivacyPress} theme={theme} />
            <SettingRow icon="receipt-outline" label="Terms of Service" meta="View" onPress={onTermsPress} theme={theme} />
            <SettingRow icon="information-circle-outline" label="App Version" meta="0.1.0 · MVP" theme={theme} />
          </SectionGroup>
        </FadeSlide>

        {/* ── Account ── */}
        <FadeSlide delay={340}>
          <SectionGroup title="Account" theme={theme}>
            <SettingRow icon="refresh-outline" label="Restart Onboarding" meta="Reset flow" onPress={onRestartOnboarding} theme={theme} />
          </SectionGroup>

          <TouchableOpacity onPress={handleSignOut} style={[s.signOutBtn, { backgroundColor: theme.colors.danger + '14', borderColor: theme.colors.danger + '30' }]}>
            <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
            <Text style={[s.signOutText, { color: theme.colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </FadeSlide>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sign-out confirmation — replaces a showAlert() call that degraded
          to a raw window.confirm() on web (see src/utils/alert.ts), which
          rendered the browser's own generic dialog instead of the app. */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
          <View style={[s.modalCard, { backgroundColor: theme.colors.surface }]}>
            {hasUnsaved ? (
              <>
                <View style={[s.modalIconWrap, { backgroundColor: theme.colors.warning + '18' }]}>
                  <Ionicons name="cloud-offline-outline" size={26} color={theme.colors.warning} />
                </View>
                <Text style={[s.modalTitle, { color: theme.colors.textPrimary }]}>You have unsaved changes</Text>
                <Text style={[s.modalBody, { color: theme.colors.textSecondary }]}>
                  {/* Portfolio and journal changes only get a device backup; an
                      unsaved profile is stashed and saved at the next sign-in on
                      this device (profileReconcile). Only portfolio and journal
                      carry "unsaved" across sessions, so the last-session case
                      names them. */}
                  {hasFailed
                    ? `Your latest changes haven't saved to the cloud. ${SIGN_OUT_NOTE} Retry to save everything first.`
                    : saving
                      ? `Your latest changes are still saving to the cloud. ${SIGN_OUT_NOTE}`
                      : "Portfolio or journal changes from your last session haven't saved to the cloud. If you sign out now they won't reach your account; a backup copy stays on this device only. Reconnect and reopen the app to save them."}
                </Text>
                {(hasFailed || saving) && (
                  <TouchableOpacity
                    onPress={() => { retryNow(); }}
                    disabled={retrying || !hasFailed}
                    style={[s.modalBtn, {
                      backgroundColor: theme.colors.primary + '14', borderColor: theme.colors.primary + '30',
                      opacity: retrying || !hasFailed ? 0.6 : 1,
                    }]}
                  >
                    <Text style={[s.modalBtnText, { color: theme.colors.primary }]}>
                      {retrying ? 'Retrying…' : hasFailed ? 'Retry' : 'Saving…'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={confirmSignOut}
                  style={[s.modalBtn, { backgroundColor: theme.colors.danger + '14', borderColor: theme.colors.danger + '30' }]}
                >
                  <Text style={[s.modalBtnText, { color: theme.colors.danger }]}>Sign out and lose changes</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[s.modalIconWrap, { backgroundColor: theme.colors.danger + '18' }]}>
                  <Ionicons name="log-out-outline" size={26} color={theme.colors.danger} />
                </View>
                <Text style={[s.modalTitle, { color: theme.colors.textPrimary }]}>Sign out?</Text>
                <Text style={[s.modalBody, { color: theme.colors.textSecondary }]}>
                  Your progress is saved to your account and will be here when you sign back in.
                </Text>
                <TouchableOpacity
                  onPress={confirmSignOut}
                  style={[s.modalBtn, { backgroundColor: theme.colors.danger + '14', borderColor: theme.colors.danger + '30' }]}
                >
                  <Text style={[s.modalBtnText, { color: theme.colors.danger }]}>Sign Out</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setShowSignOutModal(false)} style={s.modalCancelBtn}>
              <Text style={[s.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionGroup({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={s.sectionGroup}>
      <Text style={[s.sectionTitle, { color: theme.colors.textTertiary }]}>{title.toUpperCase()}</Text>
      <View style={[s.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon, label, meta, onPress, theme, accent,
}: { icon: IoniconName; label: string; meta?: string; onPress?: () => void; theme: any; accent?: string }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[s.row, { borderBottomColor: theme.colors.border }]} activeOpacity={0.7}>
      <View style={[s.rowIcon, { backgroundColor: (accent ?? theme.colors.textSecondary) + '14' }]}>
        <Ionicons name={icon} size={16} color={accent ?? theme.colors.textSecondary} />
      </View>
      <Text style={[s.rowLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {meta && <Text style={[s.rowMeta, { color: theme.colors.textTertiary }]}>{meta}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={14} color={theme.colors.textTertiary} style={{ marginLeft: 6 }} />}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { paddingBottom: 24 },

  headerCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  avatar:     { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  displayName:{ fontSize: 20, fontWeight: '800', marginBottom: 2 },
  email:      { fontSize: 13, marginBottom: 10 },
  tierPill:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tierPillText: { fontSize: 12, fontWeight: '700' },

  statsRow:    { flexDirection: 'row', marginHorizontal: 16, borderRadius: 18, borderWidth: 1, paddingVertical: 16, marginBottom: 8 },
  statItem:    { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 30, alignSelf: 'center' },
  statVal:     { fontSize: 15, fontWeight: '800' },
  statLabel:   { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },

  sectionGroup:  { marginHorizontal: 16, marginTop: 18 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  sectionCard:   { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 0.5, gap: 12 },
  rowIcon:  { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowMeta:  { fontSize: 12 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  switchLabel: { fontSize: 14, fontWeight: '600' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 20, paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  signOutText: { fontSize: 14, fontWeight: '700' },

  statSkeleton: { height: 20, borderRadius: 6, marginBottom: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, alignItems: 'center',
  },
  modalIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 22 },
  modalBtn: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
  modalCancelBtn: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
});
