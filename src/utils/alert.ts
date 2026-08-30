/**
 * Cross-platform alert — React Native's Alert.alert() renders nothing on web
 * (react-native-web has no dialog implementation for it), so any screen using
 * it directly silently does nothing in the browser: no message, no button
 * callback, no error. That looked like "trading is broken" and "the journal
 * freezes" — the actions were running, but their confirmation/validation
 * dialogs never appeared and never fired their onPress callbacks.
 *
 * Use showAlert(...) anywhere Alert.alert(...) was used. Same signature.
 */
import { Alert, Platform } from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const fullMessage = message ? `${title}\n\n${message}` : title;

  // No buttons, or a single button: plain alert.
  if (!buttons || buttons.length <= 1) {
    window.alert(fullMessage);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Two+ buttons: map to confirm() — proceed action vs. cancel action.
  const cancelButton  = buttons.find(b => b.style === 'cancel');
  const proceedButton = buttons.find(b => b !== cancelButton) ?? buttons[0];

  if (window.confirm(fullMessage)) {
    proceedButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
