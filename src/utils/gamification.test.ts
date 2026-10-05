/**
 * Tests for gamification utilities
 */

import { describe, expect, it } from 'vitest';
import { groupBadgeProgress } from './gamification';

const badge = (
  badgeKey: string,
  badgeType: string,
  requirementValue: number | null
) => ({
  badgeKey,
  badgeType,
  requirementValue,
});

describe('groupBadgeProgress', () => {
  const definitions = [
    badge('level_3', 'level_mastery', 3),
    badge('games_10', 'games_played', 10),
    badge('level_1', 'level_mastery', 1),
    badge('games_5', 'games_played', 5),
    badge('special', 'other', null),
  ];

  it('splits and sorts by requirementValue', () => {
    const progress = groupBadgeProgress(definitions, [{ badgeKey: 'level_1' }]);
    expect(progress.levelBadges.map(b => b.badgeKey)).toEqual([
      'level_1',
      'level_3',
    ]);
    expect(progress.gameBadges.map(b => b.badgeKey)).toEqual([
      'games_5',
      'games_10',
    ]);
    expect(progress.totalCount).toBe(5);
    expect(progress.earnedCount).toBe(1);
    expect(progress.isEarned('level_1')).toBe(true);
    expect(progress.isEarned('level_3')).toBe(false);
  });

  it('handles missing data', () => {
    const progress = groupBadgeProgress(undefined, null);
    expect(progress.levelBadges).toEqual([]);
    expect(progress.gameBadges).toEqual([]);
    expect(progress.totalCount).toBe(0);
    expect(progress.isEarned('x')).toBe(false);
  });

  it('does not mutate the input', () => {
    const copy = [...definitions];
    groupBadgeProgress(definitions, []);
    expect(definitions).toEqual(copy);
  });
});
