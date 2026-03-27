/**
 * Hook for managing game sessions with gamification
 *
 * Handles:
 * - Starting game sessions on the server
 * - Finishing game sessions and receiving rewards
 * - Tracking achievement results for display
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useSudojoPlayFinish,
  useSudojoPlayStart,
} from '@sudobility/sudojo_client';
import type {
  GameFinishResponse,
  GameStartRequest,
} from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';

export interface UseGameSessionOptions {
  networkClient: NetworkClient;
  baseUrl: string;
  token: string | null;
  userId: string | null;
}

export interface GameSessionResult {
  /** Whether a server session was started */
  sessionStarted: boolean;
  /** Session ID from server (if started) */
  sessionId?: string;
}

export interface GameFinishResult {
  /** The full response from the server */
  response?: GameFinishResponse;
  /** Whether the user leveled up */
  leveledUp: boolean;
  /** New badges earned */
  newBadges: Array<{
    badgeKey: string;
    title: string;
    description: string | null;
  }>;
  /** Total points earned */
  totalPointsEarned: number;
}

export function useGameSession({
  networkClient,
  baseUrl,
  token,
  userId,
}: UseGameSessionOptions) {
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const playStartMutation = useSudojoPlayStart(networkClient, baseUrl);
  const playFinishMutation = useSudojoPlayFinish(networkClient, baseUrl);

  // Use refs for mutations so callbacks have stable identity
  const playStartRef = useRef(playStartMutation);
  const playFinishRef = useRef(playFinishMutation);
  const tokenRef = useRef(token);
  const userIdRef = useRef(userId);
  useEffect(() => {
    playStartRef.current = playStartMutation;
    playFinishRef.current = playFinishMutation;
    tokenRef.current = token;
    userIdRef.current = userId;
  });

  /**
   * Start a game session on the server
   * Only works if user is authenticated
   */
  const startSession = useCallback(
    async (data: GameStartRequest): Promise<GameSessionResult> => {
      // Skip if not authenticated
      if (!userIdRef.current || !tokenRef.current) {
        return { sessionStarted: false };
      }

      setIsStarting(true);
      try {
        const response = await playStartRef.current.mutateAsync({
          token: tokenRef.current,
          data,
        });

        if (response.success && response.data) {
          sessionIdRef.current = response.data.sessionId;
          return {
            sessionStarted: true,
            sessionId: response.data.sessionId,
          };
        }

        return { sessionStarted: false };
      } catch (error) {
        // Non-critical: gamification tracking only
        console.log('[game-session] Failed to start session:', error);
        return { sessionStarted: false };
      } finally {
        setIsStarting(false);
      }
    },
    []
  );

  /**
   * Finish the game session and get rewards
   * Only works if user is authenticated and session was started
   */
  const finishSession = useCallback(
    async (elapsedTime: number): Promise<GameFinishResult> => {
      // Skip if not authenticated
      if (!userIdRef.current || !tokenRef.current) {
        return {
          leveledUp: false,
          newBadges: [],
          totalPointsEarned: 0,
        };
      }

      setIsFinishing(true);
      try {
        const response = await playFinishRef.current.mutateAsync({
          token: tokenRef.current,
          data: { elapsedTime },
        });

        sessionIdRef.current = null;

        if (response.success && response.data) {
          return {
            response: response.data,
            leveledUp: !!response.data.level,
            newBadges: response.data.badges ?? [],
            totalPointsEarned: response.data.points.totalPoints,
          };
        }

        return {
          leveledUp: false,
          newBadges: [],
          totalPointsEarned: 0,
        };
      } catch (error) {
        console.error('Failed to finish game session:', error);
        return {
          leveledUp: false,
          newBadges: [],
          totalPointsEarned: 0,
        };
      } finally {
        setIsFinishing(false);
      }
    },
    []
  );

  /**
   * Check if user is authenticated (can use gamification)
   */
  const isAuthenticated = !!userId && !!token;

  return {
    startSession,
    finishSession,
    isStarting,
    isFinishing,
    isAuthenticated,
    sessionId: sessionIdRef.current,
  };
}
