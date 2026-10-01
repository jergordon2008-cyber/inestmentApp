/**
 * ErrorBoundary — keeps a render error in one screen from blanking the app.
 *
 * Without one, any error thrown while rendering unmounts the whole React tree
 * and the student gets a blank page with no message (the admin dashboard did
 * exactly that on a single incomplete profile). This catches it, logs it, and
 * shows "Something went wrong" with a way back to Home.
 *
 * It catches errors thrown during render and in lifecycle methods of the
 * components below it. It does NOT catch errors in event handlers or in
 * async code (a failed network call), which never reach React's renderer —
 * those still need their own try/catch.
 *
 * "Back to Home" first lets the caller reset where the app would restart
 * (onGoHome), then re-mounts the children from scratch. On web the navigator
 * restarts from the URL, and the URL still names the screen that crashed, so
 * without that reset the same screen would just crash again.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface Props {
  children: React.ReactNode;
  /** Runs before the app is re-mounted, e.g. to point the URL at Home. */
  onGoHome?: () => void;
}

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] a screen threw while rendering', error, info.componentStack);
  }

  private goHome = () => {
    try { this.props.onGoHome?.(); } catch (e) { console.error('[ErrorBoundary] onGoHome failed', e); }
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} onHome={this.goHome} />;
    return this.props.children;
  }
}

function ErrorFallback({ error, onHome }: { error: Error; onHome: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const detail = (error.message || String(error)).slice(0, 160);
  return (
    <View accessibilityRole="alert" style={[s.wrap, { backgroundColor: c.background }]}>
      <Ionicons name="alert-circle-outline" size={44} color={c.warning} />
      <Text style={[s.title, { color: c.textPrimary }]}>Something went wrong</Text>
      <Text style={[s.body, { color: c.textSecondary }]}>
        Sorry, that screen couldn't load. Go back to Home and try again.
      </Text>
      <TouchableOpacity onPress={onHome} accessibilityRole="button" style={[s.btn, { backgroundColor: c.primary }]}>
        <Text style={s.btnText}>Back to Home</Text>
      </TouchableOpacity>
      <Text selectable style={[s.detail, { color: c.textTertiary }]}>{detail}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontSize: 20, fontWeight: '800', marginTop: 14 },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 320 },
  btn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, marginTop: 22 },
  btnText: { fontSize: 15, fontWeight: '800', color: '#07070D' },
  detail: { fontSize: 11, textAlign: 'center', marginTop: 22, maxWidth: 320 },
});
