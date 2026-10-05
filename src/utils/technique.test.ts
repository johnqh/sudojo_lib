/**
 * Tests for technique and strategy utilities
 */

import { describe, expect, it } from 'vitest';
import type { TranslateFunction } from './localizedHint';
import {
  findStrategyByStub,
  findTechniqueByPath,
  getDependentTechniques,
  getStrategyDifficultyKey,
  getStrategyDifficultyTier,
  getStrategySections,
  getTechniqueDependencies,
  getTechniquesForStrategy,
  groupTechniquesByLevel,
  isSameTechniquePath,
  parseTechniqueContent,
  parseTechniqueDependencies,
  sortTechniquesByLevel,
  STRATEGY_SLUGS,
  TECHNIQUE_SLUGS,
  toApiTechniquePath,
  toCanonicalTechniquePath,
} from './technique';

interface T {
  technique: number;
  level: number | null;
  path: string | null;
  dependencies: string | null;
  strategy_id?: number | null;
}

const techniques: T[] = [
  {
    technique: 3,
    level: 2,
    path: 'naked-single',
    dependencies: '1',
    strategy_id: 1,
  },
  {
    technique: 1,
    level: 1,
    path: 'full-house',
    dependencies: null,
    strategy_id: 1,
  },
  {
    technique: 2,
    level: 2,
    path: 'hidden-single',
    dependencies: '1, 3',
    strategy_id: 2,
  },
  {
    technique: 37,
    level: 9,
    path: '3d-medusa',
    dependencies: 'x, 2',
    strategy_id: null,
  },
  {
    technique: 50,
    level: null,
    path: 'unassigned',
    dependencies: '',
    strategy_id: 2,
  },
];

/** Stand-in for i18next's `t`: returns the key itself when missing. */
function fakeT(strings: Record<string, string>): TranslateFunction {
  return key => strings[key] ?? key;
}

describe('technique path aliases', () => {
  it('maps API and canonical paths both ways', () => {
    expect(toCanonicalTechniquePath('3d-medusa')).toBe('medusa-coloring');
    expect(toCanonicalTechniquePath('x-wing')).toBe('x-wing');
    expect(toCanonicalTechniquePath(null)).toBeUndefined();
    expect(toApiTechniquePath('medusa-coloring')).toBe('3d-medusa');
    expect(toApiTechniquePath('x-wing')).toBe('x-wing');
    expect(toApiTechniquePath(undefined)).toBeUndefined();
  });

  it('compares paths alias-aware', () => {
    expect(isSameTechniquePath('3d-medusa', 'medusa-coloring')).toBe(true);
    expect(isSameTechniquePath('x-wing', 'x-wing')).toBe(true);
    expect(isSameTechniquePath('x-wing', 'swordfish')).toBe(false);
    expect(isSameTechniquePath(null, 'x-wing')).toBe(false);
  });

  it('finds techniques by either path', () => {
    expect(findTechniqueByPath(techniques, 'medusa-coloring')?.technique).toBe(
      37
    );
    expect(findTechniqueByPath(techniques, '3d-medusa')?.technique).toBe(37);
    expect(findTechniqueByPath(techniques, 'nope')).toBeUndefined();
    expect(findTechniqueByPath(techniques, '')).toBeUndefined();
  });
});

describe('dependencies', () => {
  it('parses the comma-separated field', () => {
    expect(parseTechniqueDependencies('1, 3')).toEqual([1, 3]);
    expect(parseTechniqueDependencies('x, 2')).toEqual([2]);
    expect(parseTechniqueDependencies('')).toEqual([]);
    expect(parseTechniqueDependencies(null)).toEqual([]);
  });

  it('resolves requires and learn-after lists', () => {
    expect(
      getTechniqueDependencies(techniques[2], techniques).map(t => t.technique)
    ).toEqual([3, 1]);
    expect(
      getDependentTechniques(techniques[1], techniques).map(t => t.technique)
    ).toEqual([3, 2]);
    expect(getTechniqueDependencies(null, techniques)).toEqual([]);
    expect(getDependentTechniques(undefined, techniques)).toEqual([]);
  });
});

describe('grouping and sorting', () => {
  it('sorts by level then technique', () => {
    expect(sortTechniquesByLevel(techniques).map(t => t.technique)).toEqual([
      50, 1, 2, 3, 37,
    ]);
  });

  it('groups by level, optionally dropping unassigned', () => {
    const grouped = groupTechniquesByLevel(techniques);
    expect([...grouped.keys()]).toEqual([0, 1, 2, 9]);
    expect(grouped.get(2)?.map(t => t.technique)).toEqual([2, 3]);
    const assigned = groupTechniquesByLevel(techniques, {
      includeUnassigned: false,
    });
    expect([...assigned.keys()]).toEqual([1, 2, 9]);
  });

  it('lists a strategy’s techniques by number', () => {
    expect(
      getTechniquesForStrategy(techniques, 1).map(t => t.technique)
    ).toEqual([1, 3]);
    expect(getTechniquesForStrategy(techniques, null)).toEqual([]);
  });

  it('finds a strategy by stub', () => {
    const strategies = [{ stub: 'wings' }, { stub: 'forcing' }];
    expect(findStrategyByStub(strategies, 'forcing')).toBe(strategies[1]);
    expect(findStrategyByStub(strategies, undefined)).toBeUndefined();
  });
});

describe('slug lists', () => {
  it('has 60 unique technique slugs and 17 strategy stubs', () => {
    expect(TECHNIQUE_SLUGS).toHaveLength(60);
    expect(new Set(TECHNIQUE_SLUGS).size).toBe(60);
    expect(TECHNIQUE_SLUGS).toContain('medusa-coloring');
    expect(TECHNIQUE_SLUGS).not.toContain('3d-medusa');
    expect(STRATEGY_SLUGS).toHaveLength(17);
    expect(new Set(STRATEGY_SLUGS).size).toBe(17);
  });
});

describe('strategy difficulty', () => {
  it('bands difficulty into tiers', () => {
    expect(
      [1, 3, 4, 5, 6, 9, 10, 12, 13, 17].map(getStrategyDifficultyTier)
    ).toEqual([
      'beginner',
      'beginner',
      'intermediate',
      'intermediate',
      'advanced',
      'advanced',
      'expert',
      'expert',
      'master',
      'master',
    ]);
    expect(getStrategyDifficultyKey(7)).toBe('strategy.advanced');
  });
});

describe('getStrategySections', () => {
  it('collects sections until the first missing title', () => {
    const t = fakeT({
      'wings.1.title': 'Intro',
      'wings.1.text': 'Line one\n\nLine two',
      'wings.2.title': 'More',
      'wings.4.title': 'Unreached',
    });
    expect(getStrategySections(t, 'wings')).toEqual([
      {
        title: 'Intro',
        text: 'Line one\n\nLine two',
        paragraphs: ['Line one', 'Line two'],
      },
      { title: 'More', text: '', paragraphs: [] },
    ]);
    expect(getStrategySections(t, null)).toEqual([]);
  });

  it('honors i18next defaultValue on a miss', () => {
    const t: TranslateFunction = (key, values) =>
      key === 'x.1.title' ? 'One' : (values?.defaultValue ?? key);
    expect(getStrategySections(t, 'x')).toEqual([
      { title: 'One', text: '', paragraphs: [] },
    ]);
  });
});

describe('parseTechniqueContent', () => {
  it('reads overview, numbered steps and tips under the canonical path', () => {
    const t = fakeT({
      'medusa-coloring.overview': 'Overview.',
      'medusa-coloring.how-it-works': '1. First\n2. Second\n',
      'medusa-coloring.tips': 'Tip one. Tip two.  Tip three.',
    });
    expect(parseTechniqueContent(t, '3d-medusa')).toEqual({
      overview: 'Overview.',
      howItWorks: ['First', 'Second'],
      tips: ['Tip one.', 'Tip two.', 'Tip three.'],
    });
  });

  it('returns empty content for a missing path or keys', () => {
    expect(parseTechniqueContent(fakeT({}), 'x-wing')).toEqual({
      overview: '',
      howItWorks: [],
      tips: [],
    });
    expect(parseTechniqueContent(fakeT({}), null)).toEqual({
      overview: '',
      howItWorks: [],
      tips: [],
    });
  });
});
