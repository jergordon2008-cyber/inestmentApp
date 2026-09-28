import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSyncStatusStore, selectHasFailed, selectIsRetrying, retryNow } from '../services/syncStatus';

/**
 * Shown while a save of the student's own data (profile, portfolio, journal)
 * has failed and not yet succeeded. Renders nothing otherwise. Everything it
 * says is true whenever it shows: all three stores persist on the device.
 */
export function SyncBanner() {
  const { theme } = useTheme();
  const failed = useSyncStatusStore(selectHasFailed);
  const retrying = useSyncStatusStore(selectIsRetrying);
  if (!failed) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[s.banner, { backgroundColor: theme.colors.warningGlow, borderColor: theme.colors.warning + '40' }]}
    >
      <Ionicons name="cloud-offline-outline" size={18} color={theme.colors.warning} style={s.icon} />
      <Text style={[s.text, { color: theme.colors.textPrimary }]}>
        Your latest changes haven't saved to the cloud. They're safe on this device.
      </Text>
      <TouchableOpacity
        onPress={() => { retryNow(); }}
        disabled={retrying}
        accessibilityRole="button"
        style={[s.btn, { borderColor: theme.colors.warning + '60', opacity: retrying ? 0.6 : 1 }]}
      >
        <Text style={[s.btnText, { color: theme.colors.warning }]}>{retrying ? 'Retrying…' : 'Retry'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1,
  },
  icon: { flexShrink: 0 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  btn: { flexShrink: 0, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: '700' },
});
