/**
 * Tests for i18n key generation utilities
 */

import { describe, expect, it, vi } from 'vitest';
import {
  getBeltKey,
  getBeltLabelKey,
  getLevelKey,
  getLocalizedBeltLabel,
  getLocalizedBeltName,
  getLocalizedLevelTitle,
  getLocalizedTechniqueName,
  getTechniqueKey,
} from './i18nKeys';
import type { TranslateFunction } from './localizedHint';

// Mock translate function that returns keys or defaultValues
const mockT: TranslateFunction = vi.fn(
  (key: string, values?: Record<string, string>) => {
    if (values?.defaultValue) return values.defaultValue;
    return key;
  }
);

describe('getBeltKey', () => {
  it('generates correct i18n keys for belt names', () => {
    expect(getBeltKey(0)).toBe('belts.0.name');
    expect(getBeltKey(1)).toBe('belts.1.name');
    expect(getBeltKey(5)).toBe('belts.5.name');
  });
});

describe('getLocalizedBeltName', () => {
  it('calls translate function with correct key', () => {
    getLocalizedBeltName(mockT, 3);
    expect(mockT).toHaveBeenCalledWith('belts.3.name', { defaultValue: '' });
  });

  it('uses fallback when provided', () => {
    const result = getLocalizedBeltName(mockT, 1, 'White Belt');
    expect(mockT).toHaveBeenCalledWith('belts.1.name', {
      defaultValue: 'White Belt',
    });
    expect(result).toBe('White Belt');
  });

  it('uses empty string as default fallback', () => {
    getLocalizedBeltName(mockT, 0);
    expect(mockT).toHaveBeenCalledWith('belts.0.name', { defaultValue: '' });
  });
});

describe('getBeltLabelKey', () => {
  it('generates correct i18n keys for belt labels', () => {
    expect(getBeltLabelKey(0)).toBe('belts.0.label');
    expect(getBeltLabelKey(1)).toBe('belts.1.label');
  });
});

describe('getLocalizedBeltLabel', () => {
  it('calls translate function with correct key', () => {
    getLocalizedBeltLabel(mockT, 2, 'Green Belt');
    expect(mockT).toHaveBeenCalledWith('belts.2.label', {
      defaultValue: 'Green Belt',
    });
  });
});

describe('getLevelKey', () => {
  it('generates correct i18n keys for levels', () => {
    expect(getLevelKey(1)).toBe('levels.1');
    expect(getLevelKey(10)).toBe('levels.10');
  });
});

describe('getLocalizedLevelTitle', () => {
  it('calls translate function with correct key', () => {
    getLocalizedLevelTitle(mockT, 5, 'Level 5');
    expect(mockT).toHaveBeenCalledWith('levels.5', {
      defaultValue: 'Level 5',
    });
  });
});

describe('getTechniqueKey', () => {
  it('generates correct i18n keys for techniques', () => {
    expect(getTechniqueKey('full-house')).toBe('techniques.full-house.title');
    expect(getTechniqueKey('naked-pair')).toBe('techniques.naked-pair.title');
    expect(getTechniqueKey('x-wing')).toBe('techniques.x-wing.title');
  });
});

describe('getLocalizedTechniqueName', () => {
  it('calls translate function with correct key', () => {
    getLocalizedTechniqueName(mockT, 'full-house', 'Full House');
    expect(mockT).toHaveBeenCalledWith('techniques.full-house.title', {
      defaultValue: 'Full House',
    });
  });

  it('uses empty string as default fallback', () => {
    getLocalizedTechniqueName(mockT, 'x-wing');
    expect(mockT).toHaveBeenCalledWith('techniques.x-wing.title', {
      defaultValue: '',
    });
  });
});
