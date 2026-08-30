import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Props {
  kind: 'privacy' | 'terms';
  onBack: () => void;
}

const LAST_UPDATED = 'August 30, 2026';

const PRIVACY_BODY = `Last updated: ${LAST_UPDATED}

InvestIQ is an investing-education app. This policy explains what we collect and why.

WHAT WE COLLECT
- Account info: your name, email address, and password (handled by Firebase Authentication — we never see or store your raw password).
- App data: your lesson progress, paper-trading portfolio and trade history, journal entries, watchlist, and settings.
- Subscription status: whether you're on the free or Premium plan, and billing metadata from Stripe (we never see or store your card number — Stripe handles that entirely).
- Usage data: basic app activity (e.g. lessons completed, feature usage) to improve the product.

WHAT WE DON'T COLLECT
- Real brokerage or bank account credentials. All trading in this app is simulated with fake money — no real trades are ever placed.
- Payment card details — these go directly to Stripe, a PCI-compliant payment processor.

HOW WE USE YOUR DATA
- To run the app: save your progress, portfolio, and preferences across devices.
- To power the leaderboard/classroom features you opt into (your display name and portfolio performance become visible to other members of a classroom you join).
- To process subscription payments through Stripe.
- To improve lessons and features based on aggregate usage patterns.

WHO CAN SEE YOUR DATA
- Other students in a classroom or club you join can see your display name, portfolio value/return, and lessons completed (this is the point of joining — it's a competitive, social feature, not a leak).
- Your teacher/classroom admin can see your journal entries and portfolio in more detail, to support and grade you.
- We do not sell your data to third parties.

DATA STORAGE & SECURITY
Your data is stored in Google Firebase (Firestore), protected by security rules that only allow you (and, where applicable, your classroom's admin) to read or write your own records. Payment processing is handled entirely by Stripe.

YOUR RIGHTS
You can request a copy of your data or ask us to delete your account and associated data at any time by contacting the app owner directly.

CHILDREN
If your school or club has students under 13 using this app under adult supervision, no data beyond what's described above is collected, and parents/guardians may request account deletion at any time.

CHANGES
We'll update this page if what we collect or how we use it changes.`;

const TERMS_BODY = `Last updated: ${LAST_UPDATED}

By using InvestIQ, you agree to the following.

WHAT THIS APP IS
InvestIQ is an educational tool. All portfolios and trades in the app use simulated ("paper") money — no real securities are bought or sold, and no real money is ever placed at risk through trading in this app. Nothing in this app is financial, investment, or tax advice. Decisions you make with real money are your own responsibility — consult a licensed professional before investing for real.

ACCOUNTS
You're responsible for keeping your login credentials secure and for all activity under your account. You must provide accurate information (like your real name, since it may be shown to classmates in a classroom leaderboard).

SUBSCRIPTIONS
Premium is a recurring monthly subscription billed through Stripe. You can cancel anytime from the Manage Subscription screen; you'll keep Premium access until the end of the billing period you already paid for. We don't offer partial-month refunds except where required by law.

ACCEPTABLE USE
Don't use the app to harass other users, post false or misleading investment claims, attempt to access another user's account or data, or attempt to bypass subscription paywalls.

CLASSROOM / CLUB FEATURES
If you join a classroom or club, your display name, portfolio performance, and lesson progress become visible to other members and the classroom admin, for the purpose of the shared leaderboard and coaching. Don't join a classroom you don't want that visibility in.

NO WARRANTY
The app is provided "as is." Market data may be delayed or occasionally inaccurate, and simulated trading may not perfectly reflect real market conditions (e.g. slippage, liquidity). We're not liable for decisions made based on information in this app.

TERMINATION
We may suspend or terminate accounts that violate these terms.

CHANGES
We may update these terms as the app evolves; continued use after an update means you accept the new terms.`;

export function LegalScreen({ kind, onBack }: Props) {
  const { theme } = useTheme();
  const title = kind === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const body = kind === 'privacy' ? PRIVACY_BODY : TERMS_BODY;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[s.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        <View style={{ width: 50 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.body, { color: theme.colors.textSecondary }]}>{body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 48 },
  body: { fontSize: 14, lineHeight: 22 },
});
