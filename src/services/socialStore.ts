/**
 * Social Store
 * 
 * Manages all viral/competitive features:
 * - Leaderboards (global, friends, region)
 * - Friend list and follow relationships
 * - Group challenges (private competitions)
 * - Portfolio sharing (privacy-controlled)
 * - Activity feed (friend trades, milestones)
 * 
 * This is the viral engine. Portfolio sharing creates word-of-mouth growth.
 * Group challenges drive friend invites. Leaderboards drive daily engagement.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface Friend {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  
  // Public stats (only shown if user opts in)
  currentTier: 1 | 2 | 3;
  portfolioReturnPercent?: number;     // Hidden if privacy-set
  streak: number;
  badgesEarned: number;
  
  // Relationship
  status: 'pending' | 'accepted' | 'blocked';
  followedAt: string;
  isMutual: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  portfolioReturnPercent: number;
  currentTier: 1 | 2 | 3;
  isCurrentUser?: boolean;
}

export type LeaderboardScope = 'global' | 'friends' | 'weekly' | 'monthly';

export interface GroupChallenge {
  id: string;
  name: string;
  description: string;
  
  // Rules
  startDate: string;
  endDate: string;
  initialCapital: number;              // Starting paper money for the challenge
  allowedAssets: string[];             // List of approved tickers
  
  // Participants
  ownerId: string;                     // Creator
  participants: ChallengeParticipant[];
  inviteCode: string;                  // Shareable code
  isPublic: boolean;
  
  // Status
  status: 'upcoming' | 'active' | 'ended';
  prize?: string;                      // "Bragging rights" or actual prize
  
  createdAt: string;
}

export interface ChallengeParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
  currentValue: number;
  returnPercent: number;
  rank: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'friend_trade' | 'friend_badge' | 'friend_milestone' | 'challenge_invite' | 'leaderboard_climb';
  actorUserId: string;
  actorDisplayName: string;
  message: string;
  metadata?: {
    symbol?: string;
    badgeId?: string;
    challengeId?: string;
    rank?: number;
  };
  createdAt: string;
}

export interface PrivacySettings {
  portfolioVisibility: 'public' | 'friends' | 'private';
  showOnLeaderboards: boolean;
  showTrades: boolean;
  showHoldings: boolean;
  allowChallengeInvites: boolean;
}

// ============================================================================
// STORE
// ============================================================================

interface SocialState {
  friends: Friend[];
  pendingRequests: Friend[];
  activityFeed: ActivityFeedItem[];
  activeChallenges: GroupChallenge[];
  privacySettings: PrivacySettings;
  
  // Actions
  addFriend: (friend: Friend) => void;
  removeFriend: (userId: string) => void;
  acceptFriendRequest: (userId: string) => void;
  declineFriendRequest: (userId: string) => void;
  createChallenge: (challenge: Omit<GroupChallenge, 'id' | 'createdAt' | 'inviteCode'>) => GroupChallenge;
  joinChallenge: (inviteCode: string, participant: Omit<ChallengeParticipant, 'rank'>) => void;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  pushActivity: (activity: Omit<ActivityFeedItem, 'id' | 'createdAt'>) => void;
}

const defaultPrivacy: PrivacySettings = {
  portfolioVisibility: 'friends',
  showOnLeaderboards: true,
  showTrades: true,
  showHoldings: false,
  allowChallengeInvites: true,
};

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      friends: [],
      pendingRequests: [],
      activityFeed: [],
      activeChallenges: [],
      privacySettings: defaultPrivacy,
      
      addFriend: (friend) => {
        set((state) => {
          if (state.friends.some((f) => f.userId === friend.userId)) return state;
          return { friends: [...state.friends, friend] };
        });
      },
      
      removeFriend: (userId) => {
        set((state) => ({
          friends: state.friends.filter((f) => f.userId !== userId),
        }));
      },
      
      acceptFriendRequest: (userId) => {
        set((state) => {
          const request = state.pendingRequests.find((r) => r.userId === userId);
          if (!request) return state;
          return {
            pendingRequests: state.pendingRequests.filter((r) => r.userId !== userId),
            friends: [...state.friends, { ...request, status: 'accepted', isMutual: true }],
          };
        });
      },
      
      declineFriendRequest: (userId) => {
        set((state) => ({
          pendingRequests: state.pendingRequests.filter((r) => r.userId !== userId),
        }));
      },
      
      createChallenge: (challenge) => {
        const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        const newChallenge: GroupChallenge = {
          ...challenge,
          id: `challenge_${Date.now()}`,
          inviteCode,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          activeChallenges: [...state.activeChallenges, newChallenge],
        }));
        return newChallenge;
      },
      
      joinChallenge: (inviteCode, participant) => {
        set((state) => ({
          activeChallenges: state.activeChallenges.map((c) => {
            if (c.inviteCode !== inviteCode) return c;
            return {
              ...c,
              participants: [
                ...c.participants,
                {
                  ...participant,
                  rank: c.participants.length + 1,
                },
              ],
            };
          }),
        }));
      },
      
      updatePrivacySettings: (settings) => {
        set((state) => ({
          privacySettings: { ...state.privacySettings, ...settings },
        }));
      },
      
      pushActivity: (activity) => {
        const newActivity: ActivityFeedItem = {
          ...activity,
          id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          // Keep last 100 activities
          activityFeed: [newActivity, ...state.activityFeed].slice(0, 100),
        }));
      },
    }),
    {
      name: 'investapp-social-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Previously this file also exported mockLeaderboard/mockChallenges — fake
// named users (e.g. "Sarah K.") with fabricated returns. They were unused
// (nothing imported them) but deleted outright rather than left as an
// unused landmine, per the no-fabricated-data rule.
