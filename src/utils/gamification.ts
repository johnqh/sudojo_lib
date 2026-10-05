/**
 * Gamification helpers: badge progress for the profile / statistics screens.
 */

import type { BadgeDefinition } from '@sudobility/sudojo_types';

/** `badgeType` of the per-level mastery badges (`level_<n>`). */
export const LEVEL_MASTERY_BADGE_TYPE = 'level_mastery';

/** `badgeType` of the games-played milestone badges (`games_<n>`). */
export const GAMES_PLAYED_BADGE_TYPE = 'games_played';

/** Badge definitions split for display, with earned lookup. */
export interface BadgeProgress<
  B extends BadgeDefinitionLike = BadgeDefinition,
> {
  /** `level_mastery` badges, by requirementValue (the level) ascending */
  levelBadges: B[];
  /** `games_played` badges, by requirementValue (games) ascending */
  gameBadges: B[];
  /** Whether the user has earned the badge with this key */
  isEarned: (badgeKey: string) => boolean;
  /** Number of earned badges (distinct keys) */
  earnedCount: number;
  /** Number of badge definitions */
  totalCount: number;
}

/** The fields of a badge definition groupBadgeProgress reads. */
export type BadgeDefinitionLike = Pick<
  BadgeDefinition,
  'badgeKey' | 'badgeType' | 'requirementValue'
>;

const byRequirement = (a: BadgeDefinitionLike, b: BadgeDefinitionLike) =>
  (a.requirementValue ?? 0) - (b.requirementValue ?? 0);

/**
 * Split badge definitions into level-mastery and games-played lists, each
 * sorted by requirementValue, as the web ProfilePage and the RN settings /
 * statistics screens show them. Other badge types are left out of both lists
 * but still count in `totalCount`.
 *
 * @param definitions - All badge definitions (GET /gamification/badges)
 * @param earned - The user's earned badges (`stats.badges`)
 */
export function groupBadgeProgress<B extends BadgeDefinitionLike>(
  definitions: readonly B[] | null | undefined,
  earned: ReadonlyArray<{ badgeKey: string }> | null | undefined
): BadgeProgress<B> {
  const all = definitions ?? [];
  const earnedKeys = new Set((earned ?? []).map(b => b.badgeKey));
  return {
    levelBadges: all
      .filter(b => b.badgeType === LEVEL_MASTERY_BADGE_TYPE)
      .sort(byRequirement),
    gameBadges: all
      .filter(b => b.badgeType === GAMES_PLAYED_BADGE_TYPE)
      .sort(byRequirement),
    isEarned: badgeKey => earnedKeys.has(badgeKey),
    earnedCount: earnedKeys.size,
    totalCount: all.length,
  };
}
