/**
 * AuthScreen — real email/password signup and login.
 *
 * Two modes controlled by `mode` prop:
 * - 'signup': create a new Firebase Auth account (used before onboarding)
 * - 'login':  sign an existing student back in on any device/browser
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { signUp, signIn } from '../services/authService';
import { showAlert } from '../utils/alert';
import { sp, fs } from '../constants/responsive';

interface Props {
  mode: 'signup' | 'login';
  onAuthed: (uid: string, email: string, name?: string) => void;
  onBack: () => void;
  onSwitchMode: () => void;
}

export function AuthScreen({ mode, onAuthed, onBack, onSwitchMode }: Props) {
  const { theme } = useTheme();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const isSignup = mode === 'signup';

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (isSignup && trimmedName.length < 2) {
      showAlert('Enter your name', 'This is what other students will see on the leaderboard.');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      showAlert('Enter a valid email', 'We need a real email so your progress is saved to your account.');
      return;
    }
    if (password.length < 6) {
      showAlert('Password too short', 'Use at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = isSignup ? await signUp(trimmedEmail, password) : await signIn(trimmedEmail, password);
    setLoading(false);

    if (!result.success || !result.uid) {
      showAlert(isSignup ? 'Could not create account' : 'Could not sign in', result.error ?? 'Please try again.');
      return;
    }

    onAuthed(result.uid, result.email ?? trimmedEmail, isSignup ? trimmedName : undefined);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.content}>
          <TouchableOpacity onPress={onBack} style={[s.backBtn, s.backRow]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={fs(17)} color={theme.colors.textSecondary} />
            <Text style={[s.backText, { color: theme.colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[s.title, { color: theme.colors.textPrimary }]}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            {isSignup
              ? 'Your progress, portfolio, and journal are saved to this account across every device.'
              : 'Sign in to pick up right where you left off.'}
          </Text>

          {isSignup && (
            <View style={s.field}>
              <Text style={[s.label, { color: theme.colors.textTertiary }]}>NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                textContentType="name"
                style={[s.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              />
            </View>
          )}

          <View style={s.field}>
            <Text style={[s.label, { color: theme.colors.textTertiary }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={[s.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            />
          </View>

          <View style={s.field}>
            <Text style={[s.label, { color: theme.colors.textTertiary }]}>PASSWORD</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry
              textContentType={isSignup ? 'newPassword' : 'password'}
              style={[s.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[s.submitBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
          >
            {loading
              ? <ActivityIndicator color="#07070D" />
              : <Text style={s.submitText}>{isSignup ? 'Create Account' : 'Sign In'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchMode} style={s.switchBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.switchText, { color: theme.colors.textSecondary }]}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                {isSignup ? 'Sign in' : 'Create one'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content:   { flex: 1, paddingHorizontal: sp(24), paddingTop: sp(20) },
  backBtn:   { marginBottom: sp(24) },
  backRow:   { flexDirection: 'row', alignItems: 'center', gap: sp(2) },
  backText:  { fontSize: fs(15), fontWeight: '600' },
  title:     { fontSize: fs(26), fontWeight: '800', letterSpacing: -0.6, marginBottom: sp(8) },
  subtitle:  { fontSize: fs(14), lineHeight: fs(20), marginBottom: sp(28) },
  field:     { marginBottom: sp(18) },
  label:     { fontSize: fs(11), fontWeight: '700', letterSpacing: 0.8, marginBottom: sp(8) },
  input: {
    height: sp(50), borderRadius: sp(14), borderWidth: 1,
    paddingHorizontal: sp(16), fontSize: fs(15),
  },
  submitBtn: {
    height: sp(52), borderRadius: sp(16), alignItems: 'center', justifyContent: 'center',
    marginTop: sp(8),
  },
  submitText: { fontSize: fs(16), fontWeight: '800', color: '#07070D' },
  switchBtn:  { alignItems: 'center', marginTop: sp(20) },
  switchText: { fontSize: fs(14) },
});
