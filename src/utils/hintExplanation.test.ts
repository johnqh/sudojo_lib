/**
 * Tests for hint explanation utilities
 */

import type { SolverHintStep } from '@sudobility/sudojo_types';
import { describe, expect, it } from 'vitest';
import {
  generateDetailedExplanation,
  getHintActionSummary,
} from './hintExplanation';

// The solver's auto-pencilmark hint (technique 0) sends `null` for areas and
// cells (sudojo_solver SolveController, HintUsingResult() == 1).
const autopencilStep = {
  title: 'Pencilmarks',
  text: 'Turn on auto pencilmarks to continue.',
  areas: null,
  cells: null,
} as unknown as SolverHintStep;

describe('generateDetailedExplanation', () => {
  it('does not throw on a step with null cells and areas', () => {
    expect(() => generateDetailedExplanation(autopencilStep, 0)).not.toThrow();
  });
});

describe('getHintActionSummary', () => {
  it('returns an empty summary for a step with null cells', () => {
    expect(getHintActionSummary(autopencilStep)).toBe('');
  });
});
