/**
 * MainTabs
 *
 * Bottom tab navigation, the home base after onboarding.
 * 5 tabs: Home, Learn, Trade (browse + portfolio), News, Profile.
 *
 * Uses a state machine pattern instead of react-navigation for MVP simplicity.
 * Switch to expo-router for deep links + screen transitions in production.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useUserStore } from '../services/userStore';
import { HomeScreen } from '../screens/HomeScreen';
import { NewsFeedScreen } from '../screens/NewsFeedScreen';

type Tab = 'home' | 'learn' | 'trade' | 'news' | 'profile';

interface MainTabsProps {
  onLessonPress: (lessonId: string) => void;
  onTradeFlow: (symbol: string) => void;
  onSettingsPress: () => void;
}

export function MainTabs({ onLessonPress, onTradeFlow, onSettingsPress }: MainTabsProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const handleTabPress = (tab: Tab) => {
    if (tab === activeTab) return;
    Haptics.selectionAsync();
    setActiveTab(tab);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Active screen */}
      <View style={styles.screenContainer}>
        {activeTab === 'home' && (
          <HomeScreen
            onLessonPress={onLessonPress}
            onPortfolioPress={() => setActiveTab('trade')}
            onSignalPress={() => {}}
          />
        )}
        {activeTab === 'learn' && (
          <LearnTabPlaceholder onLessonPress={onLessonPress} theme={theme} />
        )}
        {activeTab === 'trade' && (
          <TradeTabPlaceholder onTradeFlow={onTradeFlow} theme={theme} />
        )}
        {activeTab === 'news' && (
          <NewsFeedScreen onSymbolPress={onTradeFlow} />
        )}
        {activeTab === 'profile' && (
          <ProfileTabPlaceholder onSettingsPress={onSettingsPress} theme={theme} />
        )}
      </View>

      {/* Tab bar */}
      <SafeAreaView style={{ backgroundColor: theme.colors.surfaceElevated }}>
        <View style={[styles.tabBar, { borderTopColor: theme.colors.border }]}>
          <TabButton
            label="Home"
            icon="🏠"
            active={activeTab === 'home'}
            onPress={() => handleTabPress('home')}
            theme={theme}
          />
          <TabButton
            label="Learn"
            icon="📚"
            active={activeTab === 'learn'}
            onPress={() => handleTabPress('learn')}
            theme={theme}
          />
          <TabButton
            label="Trade"
            icon="📊"
            active={activeTab === 'trade'}
            onPress={() => handleTabPress('trade')}
            theme={theme}
          />
          <TabButton
            label="News"
            icon="📰"
            active={activeTab === 'news'}
            onPress={() => handleTabPress('news')}
            theme={theme}
          />
          <TabButton
            label="Profile"
            icon="👤"
            active={activeTab === 'profile'}
            onPress={() => handleTabPress('profile')}
            theme={theme}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function TabButton({
  label, icon, active, onPress, theme,
}: { label: string; icon: string; active: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.tabIcon,
        active && styles.tabIconActive,
      ]}>
        {icon}
      </Text>
      <Text style={[
        styles.tabLabel,
        { color: active ? theme.colors.primary : theme.colors.textSecondary },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// PLACEHOLDER TABS (until full screens are connected)
// ============================================================================

function LearnTabPlaceholder({ onLessonPress, theme }: any) {
  // Show a simple list of Tier 1 lessons for now
  const user = useUserStore((s) => s.user);
  const { tier1Lessons } = require('../data/curriculum');

  return (
    <SafeAreaView style={[styles.placeholderContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.placeholderHeader}>
        <Text style={[styles.placeholderTitle, { color: theme.colors.textPrimary }]}>
          Learn
        </Text>
        <Text style={[styles.placeholderSubtitle, { color: theme.colors.textSecondary }]}>
          Tier 1: Foundation • {user?.lessonsCompleted.length ?? 0}/{tier1Lessons.length} complete
        </Text>
      </View>

      <View style={styles.lessonsList}>
        {tier1Lessons.slice(0, 6).map((lesson: any) => {
          const completed = user?.lessonsCompleted.includes(lesson.id);
          return (
            <TouchableOpacity
              key={lesson.id}
              onPress={() => onLessonPress(lesson.id)}
              style={[styles.lessonItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[
                styles.lessonBadge,
                { backgroundColor: completed ? theme.colors.success : theme.colors.primaryGlow },
              ]}>
                <Text style={[
                  styles.lessonBadgeText,
                  { color: completed ? '#FFF' : theme.colors.primary },
                ]}>
                  {completed ? '✓' : lesson.order}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lessonItemTitle, { color: theme.colors.textPrimary }]}>
                  {lesson.title}
                </Text>
                <Text style={[styles.lessonItemTime, { color: theme.colors.textTertiary }]}>
                  {lesson.estimatedMinutes} min
                </Text>
              </View>
              <Text style={[styles.lessonItemArrow, { color: theme.colors.textTertiary }]}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function TradeTabPlaceholder({ onTradeFlow, theme }: any) {
  const portfolio = require('../services/portfolioStore').usePortfolioStore.getState().portfolio;
  const popularSymbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN'];

  return (
    <SafeAreaView style={[styles.placeholderContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.placeholderHeader}>
        <Text style={[styles.placeholderTitle, { color: theme.colors.textPrimary }]}>
          Trade
        </Text>
        <Text style={[styles.placeholderSubtitle, { color: theme.colors.textSecondary }]}>
          Tap any stock to view details and trade
        </Text>
      </View>

      {/* Portfolio summary */}
      {portfolio && (
        <View style={[styles.portfolioStrip, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <View>
            <Text style={[styles.portfolioStripLabel, { color: theme.colors.textSecondary }]}>
              YOUR PORTFOLIO
            </Text>
            <Text style={[styles.portfolioStripValue, { color: theme.colors.textPrimary }]}>
              ${portfolio.totalValue.toFixed(2)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.portfolioStripLabel, { color: theme.colors.textSecondary }]}>
              CASH
            </Text>
            <Text style={[styles.portfolioStripValue, { color: theme.colors.textPrimary }]}>
              ${portfolio.currentCash.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      <Text style={[styles.placeholderSection, { color: theme.colors.textSecondary }]}>
        POPULAR STOCKS
      </Text>

      <View style={styles.symbolGrid}>
        {popularSymbols.map((symbol) => (
          <TouchableOpacity
            key={symbol}
            onPress={() => onTradeFlow(symbol)}
            style={[styles.symbolCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.symbolCardText, { color: theme.colors.textPrimary }]}>
              ${symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function ProfileTabPlaceholder({ onSettingsPress, theme }: any) {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const resetPortfolio = require('../services/portfolioStore').usePortfolioStore.getState().resetPortfolio;

  return (
    <SafeAreaView style={[styles.placeholderContainer, { backgroundColor: theme.colors.background }]}>
      <View style={styles.placeholderHeader}>
        <Text style={[styles.placeholderTitle, { color: theme.colors.textPrimary }]}>
          {user?.displayName ?? 'You'}
        </Text>
        <Text style={[styles.placeholderSubtitle, { color: theme.colors.textSecondary }]}>
          Tier {user?.currentTier ?? 1} • {user?.lessonsCompleted.length ?? 0} lessons completed
        </Text>
      </View>

      <View style={styles.profileStats}>
        <ProfileStat label="Streak" value={`🔥 ${user?.streak ?? 0}`} theme={theme} />
        <ProfileStat label="Lessons" value={`${user?.totalLessonsWatched ?? 0}`} theme={theme} />
        <ProfileStat label="Trades" value={`${user?.totalTradesExecuted ?? 0}`} theme={theme} />
      </View>

      <View style={styles.profileActions}>
        <TouchableOpacity
          onPress={() => {
            resetPortfolio();
            logout();
          }}
          style={[styles.profileAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Text style={[styles.profileActionText, { color: theme.colors.danger }]}>
            Sign out & reset (demo)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProfileStat({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.profileStat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.profileStatValue, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={[styles.profileStatLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenContainer: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Placeholders
  placeholderContainer: { flex: 1 },
  placeholderHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  placeholderSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  placeholderSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },

  // Learn tab
  lessonsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  lessonBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lessonItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  lessonItemTime: {
    fontSize: 12,
  },
  lessonItemArrow: {
    fontSize: 24,
    marginLeft: 8,
  },

  // Trade tab
  portfolioStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  portfolioStripLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 4,
  },
  portfolioStripValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  symbolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  symbolCard: {
    width: '30%',
    aspectRatio: 1.4,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolCardText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Profile
  profileStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  profileStat: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  profileActions: {
    paddingHorizontal: 16,
  },
  profileAction: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  profileActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
