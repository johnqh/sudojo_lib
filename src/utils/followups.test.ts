/**
 * Tests for selectSavingsBasePlan / getPlanSavingsPercent,
 * getStrategyDisplayTitle and describeRegenerateHintsResult.
 */

import { describe, expect, it } from 'vitest';
import { getPlanSavingsPercent, selectSavingsBasePlan } from './subscription';
import { getStrategyDisplayTitle } from './entityTranslate';
import type { TranslateFunction } from './localizedHint';
import {
  describeRegenerateHintsResponse,
  describeRegenerateHintsResult,
} from '../admin/regenerateHints';

describe('selectSavingsBasePlan', () => {
  it('picks the shortest known period, first on ties', () => {
    const yearly = { id: 'y', price: '39.99', period: 'P1Y' };
    const monthly = { id: 'm', price: '4.99', period: 'P1M' };
    const monthly2 = { id: 'm2', price: '5.99', period: 'monthly' };
    const unknown = { id: 'u', price: '1', period: null };
    expect(selectSavingsBasePlan([yearly, unknown, monthly, monthly2])).toBe(
      monthly
    );
    expect(selectSavingsBasePlan([unknown])).toBeNull();
    expect(selectSavingsBasePlan([])).toBeNull();
  });

  it('getPlanSavingsPercent compares against the base plan', () => {
    const monthly = { price: '10', period: 'P1M' };
    const yearly = { price: 60, period: 'P1Y' };
    expect(getPlanSavingsPercent([monthly, yearly], yearly)).toBe(50);
    expect(getPlanSavingsPercent([monthly, yearly], monthly)).toBeNull();
    expect(getPlanSavingsPercent([yearly], yearly)).toBeNull();
  });
});

describe('getStrategyDisplayTitle', () => {
  const tStrat: TranslateFunction = (key, values) =>
    key === 'singles.title' ? 'Singles' : (values?.defaultValue ?? key);
  const tEntity: TranslateFunction = key => key;

  it('uses the strategies namespace, falling back to title then stub', () => {
    expect(getStrategyDisplayTitle({ stub: 'singles' }, tEntity, tStrat)).toBe(
      'Singles'
    );
    expect(getStrategyDisplayTitle({ stub: 'forcing' }, tEntity, tStrat)).toBe(
      'forcing'
    );
    expect(
      getStrategyDisplayTitle(
        { stub: 'forcing', title: 'Forcing Chains' },
        tEntity,
        tStrat
      )
    ).toBe('Forcing Chains');
    expect(getStrategyDisplayTitle({ stub: 'forcing' }, tEntity)).toBe(
      'forcing'
    );
  });

  it('prefers the localization field', () => {
    const t: TranslateFunction = key =>
      key === 'strategies.x.title' ? 'Localized' : key;
    expect(
      getStrategyDisplayTitle(
        {
          stub: 'singles',
          localization: {
            title: { stringKey: 'strategies.x.title', values: [] },
          },
        },
        t,
        tStrat
      )
    ).toBe('Localized');
  });
});

describe('describeRegenerateHintsResult', () => {
  it('formats per-table counts and grouped failures like AdminPage', () => {
    expect(
      describeRegenerateHintsResult({
        examples: { updated: 10, failed: 2, total: 12 },
        practices: { updated: 5, failed: 0, total: 5 },
        updated: 15,
        failed: 2,
        total: 17,
        failures: [
          { uuid: 'a', table: 'examples', technique: 4, reason: 'x' },
          { uuid: 'b', table: 'examples', technique: 4, reason: 'y' },
        ],
      })
    ).toBe(
      'Done: Examples: 10/12, Practices: 5/5 (15/17 total), 2 failed (examples/technique 4: 2).'
    );
  });

  it('formats a total-only result and failed responses', () => {
    expect(
      describeRegenerateHintsResult({
        updated: 3,
        failed: 1,
        total: 4,
        failures: [{ uuid: 'a', technique: null, reason: 'x' }],
      })
    ).toBe('Done: 3/4 updated, 1 failed (unknown/technique 0: 1).');
    expect(describeRegenerateHintsResponse({ success: false })).toBe(
      'Error: Failed to regenerate hints'
    );
  });
});
