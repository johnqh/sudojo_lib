/**
 * Tests for entity translation utilities
 */

import { describe, expect, it } from 'vitest';
import {
  createNamespacedTranslate,
  getBeltDisplayLabel,
  getBeltDisplayName,
  getLevelDisplayText,
  getLevelDisplayTitle,
  getTechniqueDisplayTitle,
} from './entityTranslate';
import type { TranslateFunction } from './localizedHint';

/** Stand-in for i18next's `t`: returns the key itself when the key is missing. */
function fakeNamespace(strings: Record<string, string>): TranslateFunction {
  return (key, values) => {
    const template = strings[key];
    if (template === undefined) return key;
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, name: string) => values?.[name] ?? ''
    );
  };
}

/** Like fakeNamespace, but honors i18next's defaultValue on a miss. */
function fakeI18next(strings: Record<string, string>): TranslateFunction {
  return (key, values) => strings[key] ?? values?.defaultValue ?? key;
}

const app = fakeNamespace({
  'badges.level_1.title': 'White Belt',
  'game.hint.apply': 'Apply',
});
const levels = fakeNamespace({
  '3.title': 'Yellow Belt',
  '3.text': 'Getting going',
});
const techniques = fakeNamespace({ 'full-house.title': 'Full House' });

const t = createNamespacedTranslate(app, { levels, techniques });

describe('createNamespacedTranslate', () => {
  it('routes a prefixed key to its namespace with the prefix stripped', () => {
    expect(t('levels.3.title')).toBe('Yellow Belt');
    expect(t('levels.3.text')).toBe('Getting going');
    expect(t('techniques.full-house.title')).toBe('Full House');
  });

  it('resolves unprefixed keys in the fallback namespace', () => {
    expect(t('badges.level_1.title')).toBe('White Belt');
    expect(t('game.hint.apply')).toBe('Apply');
  });

  it('returns the full key when the routed namespace is missing the key', () => {
    expect(t('levels.9.title')).toBe('levels.9.title');
    expect(t('techniques.x-wing.title')).toBe('techniques.x-wing.title');
  });

  it('returns the full key when nothing anywhere matches', () => {
    expect(t('unknown.key')).toBe('unknown.key');
  });

  it('passes interpolation values through to the routed namespace', () => {
    const greeting = createNamespacedTranslate(app, {
      levels: fakeNamespace({ '3.title': 'Level {{value1}}' }),
    });
    expect(greeting('levels.3.title', { value1: '3' })).toBe('Level 3');
  });
});

describe('getLevelDisplayTitle / getLevelDisplayText', () => {
  const loc = (stringKey: string) => ({ stringKey, values: [] });

  it('prefers the API localization key', () => {
    expect(
      getLevelDisplayTitle(
        {
          level: 3,
          title: 'Raw',
          localization: { title: loc('levels.3.title') },
        },
        t,
        levels
      )
    ).toBe('Yellow Belt');
  });

  it('falls back to the levels namespace, then the raw title', () => {
    expect(getLevelDisplayTitle({ level: 3, title: 'Raw' }, app, levels)).toBe(
      'Yellow Belt'
    );
    expect(getLevelDisplayTitle({ level: 9, title: 'Raw' }, app, levels)).toBe(
      'Raw'
    );
    expect(
      getLevelDisplayTitle({ level: 9, title: 'Raw' }, app, fakeI18next({}))
    ).toBe('Raw');
    expect(getLevelDisplayTitle({ level: 9, title: 'Raw' }, app)).toBe('Raw');
    expect(getLevelDisplayTitle({ level: 9 }, app, levels)).toBe('');
  });

  it('resolves level text the same way', () => {
    expect(getLevelDisplayText({ level: 3, text: null }, app, levels)).toBe(
      'Getting going'
    );
    expect(getLevelDisplayText({ level: 4, text: 'Raw' }, app, levels)).toBe(
      'Raw'
    );
  });
});

describe('getTechniqueDisplayTitle', () => {
  it('uses the localization key, then the canonical namespace key', () => {
    const tTech = fakeNamespace({ 'medusa-coloring.title': 'Medusa Coloring' });
    expect(
      getTechniqueDisplayTitle(
        {
          title: 'Full',
          path: 'full-house',
          localization: {
            title: { stringKey: 'techniques.full-house.title', values: [] },
          },
        },
        t,
        tTech
      )
    ).toBe('Full House');
    expect(
      getTechniqueDisplayTitle(
        { title: '3D Medusa', path: '3d-medusa' },
        app,
        tTech
      )
    ).toBe('Medusa Coloring');
    expect(
      getTechniqueDisplayTitle({ title: 'X-Wing', path: 'x-wing' }, app, tTech)
    ).toBe('X-Wing');
    expect(
      getTechniqueDisplayTitle({ title: 'X', path: null }, app, tTech)
    ).toBe('X');
  });
});

describe('getBeltDisplayName / getBeltDisplayLabel', () => {
  it('translates from the belts namespace with the English fallback', () => {
    const tBelts = fakeNamespace({
      '2.name': 'Gelb',
      '2.label': 'Gelber Gürtel',
    });
    expect(getBeltDisplayName(2, tBelts)).toBe('Gelb');
    expect(getBeltDisplayLabel(2, tBelts)).toBe('Gelber Gürtel');
    expect(getBeltDisplayName(1, tBelts)).toBe('White');
    expect(getBeltDisplayLabel(1)).toBe('White Belt');
    expect(getBeltDisplayName(99)).toBe('');
    expect(getBeltDisplayLabel(99)).toBe('');
  });
});
