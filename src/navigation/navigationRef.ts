/**
 * Navigation ref
 *
 * Lets code that sits outside a navigator (the trade/lesson flow provider,
 * the analytics screen-view listener) drive navigation. Screens themselves
 * should use useNavigation() rather than these helpers.
 */

import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) navigationRef.navigate(name as any, params as any);
}

/** Swap the current screen for another — the equivalent of the old
 *  setModal({ type: 'x' }) while a different modal was already open. */
export function replace<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (navigationRef.isReady()) navigationRef.dispatch(StackActions.replace(name as string, params as object));
}

export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
}
