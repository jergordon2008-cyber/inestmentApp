/**
 * RootNavigator
 *
 * The whole navigation map. Replaces the currentTab string + 28-variant
 * ModalScreen union that App.tsx used to switch on by hand.
 *
 * Structure:
 *   Root stack
 *     ├── auth group (Welcome / Login / Signup / Onboarding) — unauthenticated
 *     └── app group
 *           ├── Tabs (the six-tab bar; step 3 consolidates to three)
 *           └── every detail screen, as a route with a URL
 *
 * The screens themselves are untouched: each one still takes onBack/onXPress
 * callbacks, and a thin wrapper here maps navigation onto those props. That
 * keeps this step to one concern — how screens are reached — rather than
 * rewriting 40 screens at the same time.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useUserStore } from '../services/userStore';
import { useSubscriptionStore } from '../services/subscriptionStore';
import { tier1Lessons } from '../data/curriculum';
import { tier2Lessons } from '../data/tier2curriculum';
import { tier3Lessons } from '../data/tier3curriculum';
import { getChallengeForLesson } from '../data/lessonChallenges';
import { TabBar, TabName } from '../components/TabBar';
import { useAppFlow } from './AppFlow';
import { useAuthActions } from './AuthFlow';
import { navigate, replace } from './navigationRef';
import type { RootStackParamList, TransitionalTabParamList } from './types';
import type { TradeType } from '../types';

// Auth
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// Tabs
import { HomeScreen } from '../screens/HomeScreen';
import { LessonsListScreen } from '../screens/LessonsListScreen';
import { MarketScreen } from '../screens/MarketScreen';
import { SocialScreen } from '../screens/SocialScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Details
import { LessonScreen } from '../screens/LessonScreen';
import { LessonChallengeScreen } from '../screens/LessonChallengeScreen';
import { StockBrowserScreen } from '../screens/StockBrowserScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { TradeScreen } from '../screens/TradeScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { SkillTreeScreen } from '../screens/SkillTreeScreen';
import { MicroLessonScreen } from '../screens/MicroLessonScreen';
import { TradeJournalReviewScreen } from '../screens/TradeJournalReviewScreen';
import { DecisionJournalScreen } from '../screens/DecisionJournalScreen';
import { ClassroomScreen } from '../screens/ClassroomScreen';
import { CustomizeScreen } from '../screens/CustomizeScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { AnalyticsDashboardScreen } from '../screens/AnalyticsDashboardScreen';

// Screens step 4 puts behind a feature flag — wired here unchanged for now.
import { PlaybooksScreen } from '../screens/PlaybooksScreen';
import { PlaybookDetailScreen } from '../screens/PlaybookDetailScreen';
import { MacroDashboardScreen } from '../screens/MacroDashboardScreen';
import { BehavioralAssessmentScreen } from '../screens/BehavioralAssessmentScreen';
import { AiTutorScreen } from '../screens/AiTutorScreen';
import { TimeMachineScreen } from '../screens/TimeMachineScreen';
import { InvestorDNAScreen } from '../screens/InvestorDNAScreen';
import { FutureSimulatorScreen } from '../screens/FutureSimulatorScreen';
import { PortfolioHealthScreen } from '../screens/PortfolioHealthScreen';
import { CommunityScreen } from '../screens/CommunityScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TransitionalTabParamList>();

function useNav() { return useNavigation<Nav>(); }

/**
 * Back, safe for deep links. A screen reached by pasting a URL is the only
 * entry on the stack, so goBack() would be a no-op and strand the student on
 * it — in that case land them on the tabs instead.
 */
function useGoBack() {
  const nav = useNav();
  const back = useGoBack();
  return React.useCallback(() => {
    if (nav.canGoBack()) nav.goBack();
    else navigate('Tabs', { screen: 'Home' } as any);
  }, [nav]);
}
const findLesson = (id: string) =>
  tier1Lessons.find(l => l.id === id) || tier2Lessons.find(l => l.id === id) || tier3Lessons.find(l => l.id === id) || null;

// ── Tabs ─────────────────────────────────────────────────────────────────────
// The existing Reanimated TabBar is reused as-is; only the source of "which
// tab is active" changes, from component state to the navigator's state.

const ROUTE_TO_TAB: Record<keyof TransitionalTabParamList, TabName> = {
  Home: 'home', Learn: 'learn', Market: 'market', Social: 'social', Discover: 'discover', Me: 'profile',
};
const TAB_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route]),
) as Record<TabName, keyof TransitionalTabParamList>;

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const routeName = state.routeNames[state.index] as keyof TransitionalTabParamList;
  return (
    <TabBar
      current={ROUTE_TO_TAB[routeName]}
      onTabPress={(tab) => navigation.navigate(TAB_TO_ROUTE[tab])}
    />
  );
}

function HomeTab() {
  const flow = useAppFlow();
  return (
    <HomeScreen
      onLessonPress={flow.openLesson}
      onPortfolioPress={() => navigate('Tabs', { screen: 'Market' } as any)}
      onSignalPress={flow.openStock}
      onMicroLessonPress={() => navigate('MicroLesson')}
      onJournalPress={() => navigate('TradeJournal')}
      onBrowseStocksPress={() => navigate('StockBrowser')}
    />
  );
}

function LearnTab() {
  const flow = useAppFlow();
  return (
    <LessonsListScreen
      onLessonPress={flow.openLesson}
      onSkillTreePress={() => navigate('SkillTree')}
      onSubscribePress={() => flow.openSubscription('Tier 2 & 3 Lessons')}
    />
  );
}

function MarketTab() {
  const flow = useAppFlow();
  return (
    <MarketScreen
      onStockPress={flow.openStock}
      onTradePress={flow.openTradeDirect}
      onBrowsePress={() => navigate('StockBrowser')}
    />
  );
}

function SocialTab() {
  return <SocialScreen onClassroomPress={() => navigate('Classroom')} />;
}

function DiscoverTab() {
  const flow = useAppFlow();
  return (
    <DiscoverScreen
      onBehavioralAssessmentPress={() => navigate('BehavioralAssessment')}
      onPlaybooksPress={() => navigate('Playbooks')}
      onMacroDashboardPress={() => navigate('MacroDashboard')}
      onTutorChatPress={flow.openTutorChat}
      onCustomizePress={() => navigate('Customize')}
      onClassroomPress={() => navigate('Classroom')}
      onTimeMachinePress={() => flow.openGated('TimeMachine', 'timeMachine', 'Time Machine')}
      onInvestorDNAPress={() => flow.openGated('InvestorDNA', 'investorDNA', 'Investor DNA')}
      onFutureSimPress={() => flow.openGated('FutureSimulator', 'futureSim', 'Future Simulator')}
      onHealthScorePress={() => flow.openGated('PortfolioHealth', 'healthScore', 'Portfolio Health Score')}
      onSkillTreePress={() => navigate('SkillTree')}
      onDecisionJournalPress={() => navigate('DecisionJournal')}
      onSubscribePress={() => flow.openSubscription()}
    />
  );
}

function MeTab() {
  const flow = useAppFlow();
  const auth = useAuthActions();
  return (
    <ProfileScreen
      onSignOut={auth.onSignOut}
      onRestartOnboarding={auth.onRestartOnboarding}
      onJournalPress={() => navigate('TradeJournal')}
      onPrivacyPress={() => navigate('Legal', { kind: 'privacy' })}
      onTermsPress={() => navigate('Legal', { kind: 'terms' })}
      onBehavioralAssessmentPress={() => navigate('BehavioralAssessment')}
      onPlaybooksPress={() => navigate('Playbooks')}
      onMacroDashboardPress={() => navigate('MacroDashboard')}
      onTutorChatPress={flow.openTutorChat}
      onCustomizePress={() => navigate('Customize')}
      onAdminPress={() => navigate('Admin')}
      isAdmin={auth.isAdmin}
    />
  );
}

function Tabs() {
  return (
    <Tab.Navigator id={undefined} screenOptions={{ headerShown: false }} tabBar={props => <AppTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen name="Learn" component={LearnTab} />
      <Tab.Screen name="Market" component={MarketTab} />
      <Tab.Screen name="Social" component={SocialTab} />
      <Tab.Screen name="Discover" component={DiscoverTab} />
      <Tab.Screen name="Me" component={MeTab} />
    </Tab.Navigator>
  );
}

// ── Auth screens ─────────────────────────────────────────────────────────────

function WelcomeRoute() {
  const nav = useNav();
  const back = useGoBack();
  return <WelcomeScreen onGetStarted={() => nav.navigate('Signup')} onSignIn={() => nav.navigate('Login')} />;
}

function SignupRoute() {
  const nav = useNav();
  const back = useGoBack();
  const auth = useAuthActions();
  return (
    <AuthScreen
      mode="signup"
      onBack={() => nav.navigate('Welcome')}
      onSwitchMode={() => nav.navigate('Login')}
      onAuthed={(uid, email, name) => {
        auth.onSignupAuthed(uid, email, name);
        nav.navigate('Onboarding');
      }}
    />
  );
}

function LoginRoute() {
  const nav = useNav();
  const back = useGoBack();
  const auth = useAuthActions();
  return (
    <AuthScreen
      mode="login"
      onBack={() => nav.navigate('Welcome')}
      onSwitchMode={() => nav.navigate('Signup')}
      onAuthed={auth.onLoginAuthed}
    />
  );
}

function OnboardingRoute() {
  const auth = useAuthActions();
  return <OnboardingScreen onComplete={auth.onOnboardingComplete} />;
}

// ── Detail screens ───────────────────────────────────────────────────────────

function LessonRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  const { lessonId } = useRoute<RouteProp<RootStackParamList, 'Lesson'>>().params;
  const lesson = findLesson(lessonId);

  // A deep link to a lesson id that no longer exists: bounce rather than
  // render a blank screen.
  React.useEffect(() => { if (!lesson) nav.goBack(); }, [lesson]);
  if (!lesson) return null;

  return (
    <LessonScreen
      lesson={lesson}
      onBack={() => { flow.cancelLesson(); back(); }}
      onLessonComplete={(id) => flow.handleLessonComplete(id, lesson.title)}
    />
  );
}

function LessonChallengeRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  const { lessonId, lessonTitle } = useRoute<RouteProp<RootStackParamList, 'LessonChallenge'>>().params;
  const challenge = getChallengeForLesson(lessonId);

  React.useEffect(() => { if (!challenge) nav.goBack(); }, [challenge]);
  if (!challenge) return null;

  return (
    <LessonChallengeScreen
      challenge={challenge}
      lessonTitle={lessonTitle}
      onAccept={() => replace('StockBrowser')}
      onSkip={back}
      onStockPress={flow.openStock}
    />
  );
}

function StockBrowserRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <StockBrowserScreen onStockPress={flow.openStock} onBack={back} />;
}

function StockDetailRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  // `fromBrowser` is no longer needed to decide where Back goes — the stack
  // remembers. It stays in the route params so existing links keep working.
  const { symbol } = useRoute<RouteProp<RootStackParamList, 'StockDetail'>>().params;
  return (
    <StockDetailScreen
      symbol={symbol}
      onBack={back}
      onTrade={flow.openTrade}
      onLessonPress={flow.openLesson}
      onExplainPress={flow.explain}
    />
  );
}

function TradeRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  const params = useRoute<RouteProp<RootStackParamList, 'Trade'>>().params;
  // The action arrives as a raw string when it comes from a URL.
  const action: TradeType = params.action === 'sell' ? 'sell' : 'buy';
  return (
    <TradeScreen
      symbol={params.symbol}
      action={action}
      onBack={back}
      buyReason={flow.pendingBuyReason}
      onTradeSuccess={flow.handleTradeSuccess}
    />
  );
}

function SubscriptionRoute() {
  const nav = useNav();
  const back = useGoBack();
  const { lockedFeature } = useRoute<RouteProp<RootStackParamList, 'Subscription'>>().params ?? {};
  return <SubscriptionScreen onBack={back} lockedFeature={lockedFeature} onSubscribed={back} />;
}

function LegalRoute() {
  const nav = useNav();
  const back = useGoBack();
  const { kind } = useRoute<RouteProp<RootStackParamList, 'Legal'>>().params;
  return <LegalScreen kind={kind === 'terms' ? 'terms' : 'privacy'} onBack={back} />;
}

function SkillTreeRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <SkillTreeScreen onBack={back} onLessonPress={flow.openLessonFromSkillTree} />;
}

function ClassroomRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return (
    <ClassroomScreen
      onBack={back}
      onLessonPress={flow.openLesson}
      onBehavioralAssessmentPress={() => navigate('BehavioralAssessment')}
    />
  );
}

function PlaybookDetailRoute() {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  const { playbookId } = useRoute<RouteProp<RootStackParamList, 'PlaybookDetail'>>().params;
  return <PlaybookDetailScreen playbookId={playbookId} onBack={back} onLessonPress={flow.openLesson} />;
}

/** Screens whose only prop is onBack. */
function backOnly<P extends { onBack: () => void }>(Screen: React.ComponentType<P>) {
  return function Route() {
    const nav = useNav();
  const back = useGoBack();
    return <Screen {...({ onBack: back } as P)} />;
  };
}

/** Premium screens: onBack + isPremium + onSubscribePress. */
function premiumScreen(
  Screen: React.ComponentType<{ onBack: () => void; isPremium: boolean; onSubscribePress: () => void }>,
  label: string,
) {
  return function Route() {
    const nav = useNav();
  const back = useGoBack();
    const flow = useAppFlow();
    const isPremium = useSubscriptionStore(s => s.isPremium());
    return <Screen onBack={back} isPremium={isPremium} onSubscribePress={() => flow.openSubscription(label)} />;
  };
}

const StockJournalRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <TradeJournalReviewScreen onBack={back} onStockPress={flow.openStock} />;
};

const MicroLessonRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <MicroLessonScreen onBack={back} onStockPress={flow.openStock} onComplete={back} />;
};

const AdminRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  return <AdminScreen onBack={back} onAnalyticsPress={() => navigate('Analytics')} />;
};

const BehavioralAssessmentRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <BehavioralAssessmentScreen onBack={back} onComplete={back} onLessonPress={flow.openLesson} />;
};

const PlaybooksRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return (
    <PlaybooksScreen
      onBack={back}
      onPlaybookPress={(playbookId) => navigate('PlaybookDetail', { playbookId })}
      onSubscribePress={() => flow.openSubscription('Advanced Playbooks')}
    />
  );
};

const MacroDashboardRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <MacroDashboardScreen onBack={back} onLessonPress={flow.openLesson} />;
};

const TutorChatRoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  return <AiTutorScreen onBack={back} onLessonPress={flow.openLesson} />;
};

const InvestorDNARoute = () => {
  const nav = useNav();
  const back = useGoBack();
  const flow = useAppFlow();
  const isPremium = useSubscriptionStore(s => s.isPremium());
  return (
    <InvestorDNAScreen
      onBack={back}
      onAssessmentPress={() => navigate('BehavioralAssessment')}
      isPremium={isPremium}
      onSubscribePress={() => flow.openSubscription('Investor DNA')}
    />
  );
};

// ── Root ─────────────────────────────────────────────────────────────────────

export function RootNavigator() {
  const isAuthenticated = useUserStore(s => s.isAuthenticated);
  const isOnboarded = useUserStore(s => s.isOnboarded);
  const inApp = isAuthenticated && isOnboarded;

  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!inApp ? (
        <Stack.Group>
          <Stack.Screen name="Welcome" component={WelcomeRoute} />
          <Stack.Screen name="Login" component={LoginRoute} />
          <Stack.Screen name="Signup" component={SignupRoute} />
          <Stack.Screen name="Onboarding" component={OnboardingRoute} options={{ gestureEnabled: false }} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Tabs" component={Tabs} />

          {/* Cross-tab overlays */}
          <Stack.Screen name="Lesson" component={LessonRoute} />
          <Stack.Screen name="LessonChallenge" component={LessonChallengeRoute} />
          <Stack.Screen name="StockBrowser" component={StockBrowserRoute} />
          <Stack.Screen name="StockDetail" component={StockDetailRoute} />
          <Stack.Screen name="Trade" component={TradeRoute} />
          <Stack.Screen name="Subscription" component={SubscriptionRoute} />
          <Stack.Screen name="Leaderboard" component={backOnly(LeaderboardScreen)} />

          {/* Tab-local screens (move into a tab stack in step 3) */}
          <Stack.Screen name="SkillTree" component={SkillTreeRoute} />
          <Stack.Screen name="MicroLesson" component={MicroLessonRoute} />
          <Stack.Screen name="TradeJournal" component={StockJournalRoute} />
          <Stack.Screen name="DecisionJournal" component={backOnly(DecisionJournalScreen)} />
          <Stack.Screen name="Classroom" component={ClassroomRoute} />
          <Stack.Screen name="Customize" component={backOnly(CustomizeScreen)} />
          <Stack.Screen name="Legal" component={LegalRoute} />
          <Stack.Screen name="Admin" component={AdminRoute} />
          <Stack.Screen name="Analytics" component={backOnly(AnalyticsDashboardScreen)} />

          {/* Step 4 puts these behind a feature flag */}
          <Stack.Screen name="BehavioralAssessment" component={BehavioralAssessmentRoute} />
          <Stack.Screen name="Playbooks" component={PlaybooksRoute} />
          <Stack.Screen name="PlaybookDetail" component={PlaybookDetailRoute} />
          <Stack.Screen name="MacroDashboard" component={MacroDashboardRoute} />
          <Stack.Screen name="TutorChat" component={TutorChatRoute} />
          <Stack.Screen name="InvestorDNA" component={InvestorDNARoute} />
          <Stack.Screen name="TimeMachine" component={premiumScreen(TimeMachineScreen, 'Time Machine')} />
          <Stack.Screen name="FutureSimulator" component={premiumScreen(FutureSimulatorScreen, 'Future Simulator')} />
          <Stack.Screen name="PortfolioHealth" component={premiumScreen(PortfolioHealthScreen, 'Portfolio Health Score')} />
          <Stack.Screen name="Community" component={backOnly(CommunityScreen)} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
