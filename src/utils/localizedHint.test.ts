/**
 * Tests for localized hint utilities (headings)
 */

import type { SolverHintStep } from '@sudobility/sudojo_types';
import { describe, expect, it } from 'vitest';
import {
  createLocalizedHintHelpers,
  getLocalizedHintHeading,
  getStepHeadingFromTree,
  getStepHeadingLocalization,
  interpolateHintValues,
  type TranslateFunction,
} from './localizedHint';

const step = (stringKey?: string, values: string[] = []): SolverHintStep =>
  ({
    title: 'Hidden Single',
    text: 'raw text',
    areas: [],
    cells: [],
    ...(stringKey ? { localization: { text: { stringKey, values } } } : {}),
  }) as SolverHintStep;

/** Stand-in for i18next's `t`: returns the key itself when missing. */
function fakeT(strings: Record<string, string>): TranslateFunction {
  return (key, values) => {
    const template = strings[key];
    if (template === undefined) return key;
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, name: string) => values?.[name] ?? ''
    );
  };
}

describe('getStepHeadingLocalization', () => {
  it('maps the step key into the headings tree', () => {
    expect(
      getStepHeadingLocalization(
        step('hints.hiddenSingle.row.scan', ['3', '1'])
      )
    ).toEqual({
      stringKey: 'headings.hiddenSingle.row.scan',
      values: ['3', '1'],
    });
  });

  it('gives injected conflict steps their own heading', () => {
    expect(
      getStepHeadingLocalization(
        step('hints.conflict.digit.boxOnly', ['3', 'r1c1', 'r2c3'])
      )
    ).toEqual({
      stringKey: 'headings.conflict.digit.boxOnly',
      values: ['3', 'r1c1', 'r2c3'],
    });
  });

  it('accepts the legacy flat localization shape', () => {
    const legacy = {
      title: 'Naked Single',
      text: 'x',
      areas: [],
      cells: [],
      localization: { stringKey: 'hints.nakedSingle.scan', values: ['R1C1'] },
    } as unknown as SolverHintStep;
    expect(getStepHeadingLocalization(legacy)).toEqual({
      stringKey: 'headings.nakedSingle.scan',
      values: ['R1C1'],
    });
  });

  it('defaults missing values to an empty array', () => {
    const s = {
      title: 't',
      text: 'x',
      areas: [],
      cells: [],
      localization: { text: { stringKey: 'hints.medusa.trap.scan' } },
    } as unknown as SolverHintStep;
    expect(getStepHeadingLocalization(s)?.values).toEqual([]);
  });

  it('returns undefined without a hints.* key', () => {
    expect(getStepHeadingLocalization(step())).toBeUndefined();
    expect(
      getStepHeadingLocalization(step('techniques.full-house.title'))
    ).toBeUndefined();
    expect(getStepHeadingLocalization(null)).toBeUndefined();
    expect(getStepHeadingLocalization(undefined)).toBeUndefined();
  });
});

describe('getLocalizedHintHeading', () => {
  const t = fakeT({ 'headings.hiddenSingle.row.scan': 'Row {{value2}}' });

  it('translates and interpolates the heading', () => {
    expect(
      getLocalizedHintHeading(
        t,
        step('hints.hiddenSingle.row.scan', ['3', '1'])
      )
    ).toBe('Row 1');
  });

  it("returns '' when missing", () => {
    expect(getLocalizedHintHeading(t, step('hints.other.scan'))).toBe('');
    expect(getLocalizedHintHeading(t, step())).toBe('');
    expect(getLocalizedHintHeading(t, null)).toBe('');
  });
});

describe('interpolateHintValues', () => {
  it('fills valueN placeholders, blanking missing ones', () => {
    expect(interpolateHintValues('{{value1}} in {{ value2 }}', ['3'])).toBe(
      '3 in '
    );
  });
});

describe('getStepHeadingFromTree', () => {
  const tree = {
    hiddenSingle: { row: { scan: 'Only {{value1}} fits in row {{value2}}' } },
    leaf: 'Leaf',
  };

  it('looks up and interpolates the heading', () => {
    expect(
      getStepHeadingFromTree(
        tree,
        step('hints.hiddenSingle.row.scan', ['5', '2'])
      )
    ).toBe('Only 5 fits in row 2');
  });

  it("returns '' for missing paths or non-leaf nodes", () => {
    expect(getStepHeadingFromTree(tree, step('hints.hiddenSingle.row'))).toBe(
      ''
    );
    expect(getStepHeadingFromTree(tree, step('hints.leaf.deeper'))).toBe('');
    expect(getStepHeadingFromTree(tree, step('hints.toString'))).toBe('');
    expect(getStepHeadingFromTree(tree, step())).toBe('');
  });
});

describe('createLocalizedHintHelpers', () => {
  it('resolves text, title and heading with the right translate functions', () => {
    const tHints = fakeT({
      'hints.x.scan': 'Text {{value1}}',
      'headings.x.scan': 'Heading',
    });
    const tTitle = fakeT({ 'techniques.x.title': 'X Title' });
    const helpers = createLocalizedHintHelpers(tHints, tTitle);
    const s = {
      title: 'Raw',
      text: 'raw',
      areas: [],
      cells: [],
      localization: {
        text: { stringKey: 'hints.x.scan', values: ['9'] },
        title: { stringKey: 'techniques.x.title', values: [] },
      },
    } as unknown as SolverHintStep;
    expect(helpers.getLocalizedText(s)).toBe('Text 9');
    expect(helpers.getLocalizedTitle(s)).toBe('X Title');
    expect(helpers.getLocalizedHeading(s)).toBe('Heading');
  });
});
