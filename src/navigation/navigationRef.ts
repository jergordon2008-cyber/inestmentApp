/**
 * Navigation ref
 *
 * Lets code that sits outside a navigator (the trade/lesson flow provider,
 * the analytics screen-view listener) drive navigation. Screens themselves
 * should use useNavigation() rather than these helpers.
 */

import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type {
  RootStackParamList, LearnStackParamList, PortfolioStackParamList, MeStackParamList,
} from './types';

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

/** Screens reachable inside each tab's stack. */
type TabScreens = {
  Learn:     keyof LearnStackParamList;
  Portfolio: keyof PortfolioStackParamList;
  Me:        keyof MeStackParamList;
};

/**
 * Jump to a tab, optionally to a specific screen inside it. Nesting means a
 * plain navigate() can't reach another tab's stack, and hand-writing the
 * { screen, params: { screen } } shape at every call site is where typos live.
 */
export function goTab<T extends keyof TabScreens>(tab: T, screen?: TabScreens[T], params?: object) {
  navigate('Tabs', { screen: tab, params: screen ? { screen, params } : undefined } as any);
}
