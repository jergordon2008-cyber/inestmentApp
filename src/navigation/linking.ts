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

      // Tabs
      Tabs: {
        screens: {
          Home:     'home',
          Learn:    'learn',
          Market:   'portfolio',
          Social:   'connect',
          Discover: 'explore',
          Me:       'me',
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

      // Tab-local screens (move into a tab stack in step 3; paths unchanged)
      SkillTree:       'learn/skills',
      MicroLesson:     'learn/quick',
      TradeJournal:    'portfolio/journal',
      DecisionJournal: 'portfolio/decisions',
      Classroom:       'me/classroom',
      Customize:       'me/appearance',
      Legal:           'me/legal/:kind',
      Admin:           'me/admin',
      Analytics:       'me/admin/analytics',

      // Flagged off in step 4 — routes are only registered when the matching
      // feature flag is on, in which case these paths become reachable again.
      Leagues:              'leagues',
      TutorChat:            'tutor',
      Playbooks:            'playbooks',
      PlaybookDetail:       'playbooks/:playbookId',
      MacroDashboard:       'market-cycle',
      BehavioralAssessment: 'mind-check',
      InvestorDNA:          'investor-dna',
      TimeMachine:          'time-machine',
      FutureSimulator:      'future',
      PortfolioHealth:      'health-score',
      Community:            'forum',
    },
  },
};
