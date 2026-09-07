/**
 * Deep linking / URL map
 *
 * Every screen has a URL. On web these are real browser URLs, so the back
 * button, refresh, and a pasted link to a specific lesson all work. On native
 * the same paths resolve under the investapp:// scheme.
 *
 * The Vercel build serves a single-page bundle, so vercel.json rewrites any
 * non-asset path to index.html — without that, refreshing on /lesson/T1-03
 * would 404 before this config ever ran.
 */

import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import { FEATURES } from '../config/features';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      // Auth
      Welcome:    '',
      Login:      'login',
      Signup:     'signup',
      Onboarding: 'onboarding',

      // Tabs — each owns a stack, so a tab's screens nest under its path.
      Tabs: {
        screens: {
          Learn: {
            path: 'learn',
            // initialRouteName puts the tab's home under a deep-linked screen,
            // so Back from a pasted /learn/skills link lands on /learn rather
            // than falling out of the tab entirely. The `as never` casts work
            // around React Navigation's linking types not threading the nested
            // param list through to this field; the route names are still
            // checked by the `screens` map directly below.
            initialRouteName: 'LearnHome' as never,
            screens: {
              LearnHome:   '',
              LessonsList: 'lessons',
              SkillTree:   'skills',
              MicroLesson: 'quick',
            },
          },
          Portfolio: {
            path: 'portfolio',
            initialRouteName: 'PortfolioHome' as never,
            screens: {
              PortfolioHome:   '',
              TradeJournal:    'journal',
              DecisionJournal: 'decisions',
            },
          },
          Me: {
            path: 'me',
            initialRouteName: 'MeHome' as never,
            screens: {
              MeHome:    '',
              Classroom: 'classroom',
              Customize: 'appearance',
              Legal:     'legal/:kind',
              Admin:     'admin',
              Analytics: 'admin/analytics',
            },
          },
        },
      },

      // Cross-tab overlays
      Lesson:          'lesson/:lessonId',
      LessonChallenge: 'lesson/:lessonId/challenge',
      StockBrowser:    'stocks',
      StockDetail:     'stocks/:symbol',
      Trade:           'stocks/:symbol/:action',
      Subscription:    'premium',
      Leaderboard:     'leaderboard',

      // Feature-flagged screens. These entries are included only when the
      // route is actually registered — a linking config that names a screen
      // the navigator doesn't have makes React Navigation warn at startup.
      ...(FEATURES.behavioralQuiz  ? { BehavioralAssessment: 'mind-check' } : {}),
      ...(FEATURES.playbooks       ? { Playbooks: 'playbooks', PlaybookDetail: 'playbooks/:playbookId' } : {}),
      ...(FEATURES.marketCycle     ? { MacroDashboard: 'market-cycle' } : {}),
      ...(FEATURES.aiTutor         ? { TutorChat: 'tutor' } : {}),
      ...(FEATURES.investorDNA     ? { InvestorDNA: 'investor-dna' } : {}),
      ...(FEATURES.timeMachine     ? { TimeMachine: 'time-machine' } : {}),
      ...(FEATURES.futureSimulator ? { FutureSimulator: 'future' } : {}),
      ...(FEATURES.healthScore     ? { PortfolioHealth: 'health-score' } : {}),
      ...(FEATURES.forum           ? { Community: 'forum' } : {}),
      ...(FEATURES.exploreTab      ? { Discover: 'explore' } : {}),
      ...(FEATURES.connectTab      ? { Social: 'connect' } : {}),
      // Leagues has a screen file but has never been wired into navigation.
    },
  },
};
