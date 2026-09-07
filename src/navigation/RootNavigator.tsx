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
import { FEATURES } from '../config/features';
import { useAppFlow } from './AppFlow';
import { useAuthActions } from './AuthFlow';
import { navigate, replace, goTab } from './navigationRef';
import type {
  RootStackParamList, TabParamList,
  LearnStackParamList, PortfolioStackParamList, MeStackParamList,
} from './types';
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
const Tab = createBottomTabNavigator<TabParamList>();
const LearnStack = createNativeStackNavigator<LearnStackParamList>();
const PortfolioStack = createNativeStackNavigator<PortfolioStackParamList>();
const MeStack = createNativeStackNavigator<MeStackParamList>();

function useNav() { return useNavigation<Nav>(); }

/**
 * Back, safe for deep links. A screen reached by pasting a URL is the only
 * entry on the stack, so goBack() would be a no-op and strand the student on
 * it — in that case land them on the tabs instead.
 */
function useGoBack() {
  const nav = useNav();
  return React.useCallback(() => {
    if (nav.canGoBack()) nav.goBack();
    else goTab('Learn');
  }, [nav]);
}
const findLesson = (id: string) =>
  tier1Lessons.find(l => l.id === id) || tier2Lessons.find(l => l.id === id) || tier3Lessons.find(l => l.id === id) || null;

// ── Tabs ─────────────────────────────────────────────────────────────────────
// Three tabs, each owning a stack so it keeps its own back history:
//   Learn      — where you study        (Home landing, curriculum, skill tree, micro lessons)
//   Portfolio  — where you trade        (market + positions, and the two journals about them)
//   Me         — everything about you   (profile, classroom, settings)
// The existing Reanimated TabBar is reused; only its tab list got shorter.

const ROUTE_TO_TAB: Record<keyof TabParamList, TabName> = {
  Learn: 'learn', Portfolio: 'portfolio', Me: 'me',
};
const TAB_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTE_TO_TAB).map(([route, tab]) => [tab, route]),
) as Record<TabName, keyof TabParamList>;

function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const routeName = state.routeNames[state.index] as keyof TabParamList;
  return (
    <TabBar
      current={ROUTE_TO_TAB[routeName]}
      onTabPress={(tab) => navigation.navigate(TAB_TO_ROUTE[tab])}
    />
  );
}

// ── Learn tab ────────────────────────────────────────────────────────────────

function LearnHomeRoute() {
  const flow = useAppFlow();
  const nav = useNavigation<NativeStackNavigationProp<LearnStackParamList>>();
  return (
    <HomeScreen
      onLessonPress={flow.openLesson}
      onPortfolioPress={() => goTab('Portfolio')}
      onSignalPress={flow.openStock}
      onMicroLessonPress={() => nav.navigate('MicroLesson')}
      onAllLessonsPress={() => nav.navigate('LessonsList')}
      onJournalPress={() => goTab('Portfolio', 'TradeJournal')}
      onBrowseStocksPress={() => navigate('StockBrowser')}
    />
  );
}

function LessonsListRoute() {
  const flow = useAppFlow();
  const nav = useNavigation<NativeStackNavigationProp<LearnStackParamList>>();
  return (
    <LessonsListScreen
      onLessonPress={flow.openLesson}
      onSkillTreePress={() => nav.navigate('SkillTree')}
      onSubscribePress={() => flow.openSubscription('Tier 2 & 3 Lessons')}
    />
  );
}

function LearnTab() {
  return (
    <LearnStack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <LearnStack.Screen name="LearnHome" component={LearnHomeRoute} />
      <LearnStack.Screen name="LessonsList" component={LessonsListRoute} />
      <LearnStack.Screen name="SkillTree" component={SkillTreeRoute} />
      <LearnStack.Screen name="MicroLesson" component={MicroLessonRoute} />
    </LearnStack.Navigator>
  );
}

// ── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioHomeRoute() {
  const flow = useAppFlow();
  const nav = useNavigation<NativeStackNavigationProp<PortfolioStackParamList>>();
  return (
    <MarketScreen
      onStockPress={flow.openStock}
      onTradePress={flow.openTradeDirect}
      onBrowsePress={() => navigate('StockBrowser')}
      onTradeJournalPress={() => nav.navigate('TradeJournal')}
      onDecisionJournalPress={() => nav.navigate('DecisionJournal')}
    />
  );
}

function PortfolioTab() {
  return (
    <PortfolioStack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <PortfolioStack.Screen name="PortfolioHome" component={PortfolioHomeRoute} />
      <PortfolioStack.Screen name="TradeJournal" component={TradeJournalRoute} />
      <PortfolioStack.Screen name="DecisionJournal" component={backOnly(DecisionJournalScreen)} />
    </PortfolioStack.Navigator>
  );
}

// ── Me tab ───────────────────────────────────────────────────────────────────

// ProfileScreen renders each Activity row only when it is handed a handler,
// so an off flag removes the row rather than showing a disabled one.
function MeHomeRoute() {
  const flow = useAppFlow();
  const auth = useAuthActions();
  const nav = useNavigation<NativeStackNavigationProp<MeStackParamList>>();
  return (
    <ProfileScreen
      onSignOut={auth.onSignOut}
      onRestartOnboarding={auth.onRestartOnboarding}
      onJournalPress={() => goTab('Portfolio', 'TradeJournal')}
      onClassroomPress={() => nav.navigate('Classroom')}
      onPrivacyPress={() => nav.navigate('Legal', { kind: 'privacy' })}
      onTermsPress={() => nav.navigate('Legal', { kind: 'terms' })}
      onBehavioralAssessmentPress={FEATURES.behavioralQuiz ? () => navigate('BehavioralAssessment') : undefined}
      onPlaybooksPress={FEATURES.playbooks ? () => navigate('Playbooks') : undefined}
      onMacroDashboardPress={FEATURES.marketCycle ? () => navigate('MacroDashboard') : undefined}
      onTutorChatPress={FEATURES.aiTutor ? flow.openTutorChat : undefined}
      onCustomizePress={() => nav.navigate('Customize')}
      onAdminPress={() => nav.navigate('Admin')}
      isAdmin={auth.isAdmin}
    />
  );
}

function MeTab() {
  return (
    <MeStack.Navigator id={undefined} screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <MeStack.Screen name="MeHome" component={MeHomeRoute} />
      <MeStack.Screen name="Classroom" component={ClassroomRoute} />
      <MeStack.Screen name="Customize" component={backOnly(CustomizeScreen)} />
      <MeStack.Screen name="Legal" component={LegalRoute} />
      <MeStack.Screen name="Admin" component={AdminRoute} />
      <MeStack.Screen name="Analytics" component={backOnly(AnalyticsDashboardScreen)} />
    </MeStack.Navigator>
  );
}

// The Explore and Connect screens no longer have tabs. They stay registered as
// routes (reachable at /explore and /connect) until step 4 flags them off.

function DiscoverRoute() {
  const flow = useAppFlow();
  return (
    <DiscoverScreen
      onBehavioralAssessmentPress={() => navigate('BehavioralAssessment')}
      onPlaybooksPress={() => navigate('Playbooks')}
      onMacroDashboardPress={() => navigate('MacroDashboard')}
      onTutorChatPress={flow.openTutorChat}
      onCustomizePress={() => goTab('Me', 'Customize')}
      onClassroomPress={() => goTab('Me', 'Classroom')}
      onTimeMachinePress={() => flow.openGated('TimeMachine', 'timeMachine', 'Time Machine')}
      onInvestorDNAPress={() => flow.openGated('InvestorDNA', 'investorDNA', 'Investor DNA')}
      onFutureSimPress={() => flow.openGated('FutureSimulator', 'futureSim', 'Future Simulator')}
      onHealthScorePress={() => flow.openGated('PortfolioHealth', 'healthScore', 'Portfolio Health Score')}
      onSkillTreePress={() => goTab('Learn', 'SkillTree')}
      onDecisionJournalPress={() => goTab('Portfolio', 'DecisionJournal')}
      onSubscribePress={() => flow.openSubscription()}
    />
  );
}

function SocialRoute() {
  return <SocialScreen onClassroomPress={() => goTab('Me', 'Classroom')} />;
}

function Tabs() {
  return (
    <Tab.Navigator id={undefined} screenOptions={{ headerShown: false }} tabBar={props => <AppTabBar {...props} />}>
      <Tab.Screen name="Learn" component={LearnTab} />
      <Tab.Screen name="Portfolio" component={PortfolioTab} />
      <Tab.Screen name="Me" component={MeTab} />
    </Tab.Navigator>
  );
}

// ── Auth screens ─────────────────────────────────────────────────────────────

function WelcomeRoute() {
  const nav = useNav();
  return <WelcomeScreen onGetStarted={() => nav.navigate('Signup')} onSignIn={() => nav.navigate('Login')} />;
}

function SignupRoute() {
  const nav = useNav();
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
  React.useEffect(() => { if (!lesson) back(); }, [lesson]);
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

  React.useEffect(() => { if (!challenge) back(); }, [challenge]);
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
  const back = useGoBack();
  const flow = useAppFlow();
  return <StockBrowserScreen onStockPress={flow.openStock} onBack={back} />;
}

function StockDetailRoute() {
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
  const back = useGoBack();
  const { lockedFeature } = useRoute<RouteProp<RootStackParamList, 'Subscription'>>().params ?? {};
  return <SubscriptionScreen onBack={back} lockedFeature={lockedFeature} onSubscribed={back} />;
}

function LegalRoute() {
  const back = useGoBack();
  const { kind } = useRoute<RouteProp<MeStackParamList, 'Legal'>>().params;
  return <LegalScreen kind={kind === 'terms' ? 'terms' : 'privacy'} onBack={back} />;
}

function SkillTreeRoute() {
  const back = useGoBack();
  const flow = useAppFlow();
  return <SkillTreeScreen onBack={back} onLessonPress={flow.openLessonFromSkillTree} />;
}

function ClassroomRoute() {
  const back = useGoBack();
  const flow = useAppFlow();
  return (
    <ClassroomScreen
      onBack={back}
      onLessonPress={flow.openLesson}
      onBehavioralAssessmentPress={FEATURES.behavioralQuiz ? () => navigate('BehavioralAssessment') : undefined}
    />
  );
}

function PlaybookDetailRoute() {
  const back = useGoBack();
  const flow = useAppFlow();
  const { playbookId } = useRoute<RouteProp<RootStackParamList, 'PlaybookDetail'>>().params;
  return <PlaybookDetailScreen playbookId={playbookId} onBack={back} onLessonPress={flow.openLesson} />;
}

/** Screens whose only prop is onBack. */
function backOnly<P extends { onBack: () => void }>(Screen: React.ComponentType<P>) {
  return function Route() {
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
  const back = useGoBack();
    const flow = useAppFlow();
    const isPremium = useSubscriptionStore(s => s.isPremium());
    return <Screen onBack={back} isPremium={isPremium} onSubscribePress={() => flow.openSubscription(label)} />;
  };
}

const TradeJournalRoute = () => {
  const back = useGoBack();
  const flow = useAppFlow();
  return <TradeJournalReviewScreen onBack={back} onStockPress={flow.openStock} />;
};

const MicroLessonRoute = () => {
  const back = useGoBack();
  const flow = useAppFlow();
  return <MicroLessonScreen onBack={back} onStockPress={flow.openStock} onComplete={back} />;
};

const AdminRoute = () => {
  const back = useGoBack();
  const nav = useNavigation<NativeStackNavigationProp<MeStackParamList>>();
  return <AdminScreen onBack={back} onAnalyticsPress={() => nav.navigate('Analytics')} />;
};

const BehavioralAssessmentRoute = () => {
  const back = useGoBack();
  const flow = useAppFlow();
  return <BehavioralAssessmentScreen onBack={back} onComplete={back} onLessonPress={flow.openLesson} />;
};

const PlaybooksRoute = () => {
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
  const back = useGoBack();
  const flow = useAppFlow();
  return <MacroDashboardScreen onBack={back} onLessonPress={flow.openLesson} />;
};

const TutorChatRoute = () => {
  const back = useGoBack();
  const flow = useAppFlow();
  return <AiTutorScreen onBack={back} onLessonPress={flow.openLesson} />;
};

const InvestorDNARoute = () => {
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

          {/* Behind feature flags (src/config/features.ts). An off flag leaves
              the screen, its store and its Firestore data untouched — the
              route simply isn't registered, so nothing links to it and no URL
              resolves to it. Flip LEGACY_FEATURES to bring them all back. */}
          {FEATURES.behavioralQuiz && <Stack.Screen name="BehavioralAssessment" component={BehavioralAssessmentRoute} />}
          {FEATURES.playbooks && <Stack.Screen name="Playbooks" component={PlaybooksRoute} />}
          {FEATURES.playbooks && <Stack.Screen name="PlaybookDetail" component={PlaybookDetailRoute} />}
          {FEATURES.marketCycle && <Stack.Screen name="MacroDashboard" component={MacroDashboardRoute} />}
          {FEATURES.aiTutor && <Stack.Screen name="TutorChat" component={TutorChatRoute} />}
          {FEATURES.investorDNA && <Stack.Screen name="InvestorDNA" component={InvestorDNARoute} />}
          {FEATURES.timeMachine && <Stack.Screen name="TimeMachine" component={premiumScreen(TimeMachineScreen, 'Time Machine')} />}
          {FEATURES.futureSimulator && <Stack.Screen name="FutureSimulator" component={premiumScreen(FutureSimulatorScreen, 'Future Simulator')} />}
          {FEATURES.healthScore && <Stack.Screen name="PortfolioHealth" component={premiumScreen(PortfolioHealthScreen, 'Portfolio Health Score')} />}
          {FEATURES.forum && <Stack.Screen name="Community" component={backOnly(CommunityScreen)} />}
          {FEATURES.exploreTab && <Stack.Screen name="Discover" component={DiscoverRoute} />}
          {FEATURES.connectTab && <Stack.Screen name="Social" component={SocialRoute} />}
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
