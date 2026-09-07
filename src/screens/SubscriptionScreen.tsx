import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { showAlert } from '../utils/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSubscriptionStore, PREMIUM_FEATURES, PremiumFeatureKey } from '../services/subscriptionStore';

interface Props {
  onBack: () => void;
  lockedFeature?: string;
  onSubscribed?: () => void;
}

export function SubscriptionScreen({ onBack, lockedFeature, onSubscribed }: Props) {
  const { theme } = useTheme();
  const { subscribe, manageSubscription, isPremium, renewsAt, cancelAtPeriodEnd } = useSubscriptionStore();
  const [loading, setLoading] = useState(false);
  const premium = isPremium();
  const renewalLabel = renewsAt
    ? new Date(renewsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const lockedFeatureInfo = lockedFeature && lockedFeature in PREMIUM_FEATURES
    ? PREMIUM_FEATURES[lockedFeature as PremiumFeatureKey]
    : null;

  const handleSubscribe = async () => {
    setLoading(true);
    const result = await subscribe();
    setLoading(false);
    if (result.error) {
      showAlert('Could not start checkout', result.error);
      return;
    }
    // On web this redirects the browser to Stripe Checkout — control leaves
    // the app here. Subscription status updates once Stripe's webhook
    // confirms payment, not optimistically.
  };

  const handleManage = async () => {
    setLoading(true);
    const result = await manageSubscription();
    setLoading(false);
    if (result.error) {
      showAlert('Could not open billing portal', result.error);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={[s.back, { color: theme.colors.primary }]}>← Back</Text></TouchableOpacity>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[theme.colors.gold + '20', 'transparent']}
          style={s.heroCard}
        >
          <Ionicons name="diamond" size={40} color={theme.colors.gold} style={{ marginBottom: 12 }} />
          <Text style={[s.heroTitle, { color: theme.colors.textPrimary }]}>InvestIQ Premium</Text>
          {lockedFeatureInfo ? (
            <Text style={[s.heroSub, { color: theme.colors.textSecondary }]}>
              Unlock "{lockedFeatureInfo.name}" and everything else in Premium.
            </Text>
          ) : (
            <Text style={[s.heroSub, { color: theme.colors.textSecondary }]}>
              Advanced simulators, unlimited AI tutor, and the full playbook library.
            </Text>
          )}
          {!premium && (
            <View style={[s.priceBadge, { backgroundColor: theme.colors.gold + '18', borderColor: theme.colors.gold + '40' }]}>
              <Text style={[s.priceText, { color: theme.colors.gold }]}>$4.99/month</Text>
            </View>
          )}
        </LinearGradient>

        <View style={s.featureList}>
          {(Object.keys(PREMIUM_FEATURES) as PremiumFeatureKey[]).map(key => {
            const f = PREMIUM_FEATURES[key];
            return (
              <View key={key} style={[s.featureRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name={f.icon as any} size={20} color={theme.colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.featureName, { color: theme.colors.textPrimary }]}>{f.name}</Text>
                  <Text style={[s.featureDesc, { color: theme.colors.textTertiary }]}>{f.description}</Text>
                </View>
                {premium && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
              </View>
            );
          })}
        </View>

        {premium ? (
          <>
            <View style={[s.activeBadge, { backgroundColor: theme.colors.success + '18', borderColor: theme.colors.success + '40' }]}>
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              <Text style={[s.activeBadgeText, { color: theme.colors.success }]}>
                {renewalLabel
                  ? (cancelAtPeriodEnd ? `Cancels ${renewalLabel}` : `Renews ${renewalLabel}`)
                  : "You're on Premium"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleManage} disabled={loading} style={[s.secondaryBtn, { borderColor: theme.colors.border }]}>
              <Text style={[s.secondaryBtnText, { color: theme.colors.textPrimary }]}>
                {loading ? 'Loading…' : 'Manage Subscription'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={handleSubscribe} disabled={loading} style={[s.primaryBtn, { backgroundColor: theme.colors.gold, opacity: loading ? 0.7 : 1 }]}>
            <Text style={s.primaryBtnText}>{loading ? 'Loading…' : 'Subscribe — $4.99/month'}</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.disclaimer, { color: theme.colors.textTertiary }]}>
          Cancel anytime. Payments processed securely by Stripe — InvestIQ never sees your card details.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  back: { fontSize: 16, fontWeight: '600' },

  scroll: { paddingHorizontal: 20 },
  heroCard: { alignItems: 'center', borderRadius: 24, padding: 28, marginBottom: 24 },
  heroTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroSub: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  priceBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  priceText: { fontSize: 16, fontWeight: '800' },

  featureList: { gap: 10, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  featureName: { fontSize: 14, fontWeight: '700' },
  featureDesc: { fontSize: 12, marginTop: 2 },

  activeBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 12, marginBottom: 12 },
  activeBadgeText: { fontSize: 14, fontWeight: '700' },

  primaryBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#07070D' },
  secondaryBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },

  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 16, paddingHorizontal: 20 },
});
