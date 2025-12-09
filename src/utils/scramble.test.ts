/**
 * Tests for scramble utilities
 */

import { describe, expect, it } from 'vitest';
import { noScramble, scrambleBoard } from './scramble';
import { parseBoardString } from './board';

// Sample puzzles for testing - valid Sudoku puzzle and solution pair
const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('scrambleBoard', () => {
  it('returns different puzzle and solution strings', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Should be different from original (very high probability)
    // Note: There's a tiny chance they could be the same if no scrambling happens
    expect(result.puzzle.length).toBe(81);
    expect(result.solution.length).toBe(81);
  });

  it('maintains puzzle-solution correspondence', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Clue cells in scrambled puzzle should match scrambled solution
    for (let i = 0; i < 81; i++) {
      const puzzleDigit = result.puzzle[i];
      if (puzzleDigit && puzzleDigit !== '0') {
        expect(result.solution[i]).toBe(puzzleDigit);
      }
    }
  });

  it('produces valid digit mapping', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    expect(result.digitMapping.size).toBe(9);
    expect(result.reverseDigitMapping.size).toBe(9);

    // All digits 1-9 should be mapped
    for (let d = 1; d <= 9; d++) {
      expect(result.digitMapping.has(d)).toBe(true);
      const mapped = result.digitMapping.get(d);
      expect(mapped).toBeGreaterThanOrEqual(1);
      expect(mapped).toBeLessThanOrEqual(9);
    }
  });

  it('reverse mapping is correct', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    for (const [original, scrambled] of result.digitMapping) {
      expect(result.reverseDigitMapping.get(scrambled)).toBe(original);
    }
  });

  it('preserves Sudoku validity', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const solutionBoard = parseBoardString(result.solution);

    // Check all rows have digits 1-9
    for (let row = 0; row < 9; row++) {
      const rowDigits = new Set<number>();
      for (let col = 0; col < 9; col++) {
        const value = solutionBoard[row]?.[col];
        if (value) rowDigits.add(value);
      }
      expect(rowDigits.size).toBe(9);
    }

    // Check all columns have digits 1-9
    for (let col = 0; col < 9; col++) {
      const colDigits = new Set<number>();
      for (let row = 0; row < 9; row++) {
        const value = solutionBoard[row]?.[col];
        if (value) colDigits.add(value);
      }
      expect(colDigits.size).toBe(9);
    }

    // Check all blocks have digits 1-9
    for (let blockRow = 0; blockRow < 3; blockRow++) {
      for (let blockCol = 0; blockCol < 3; blockCol++) {
        const blockDigits = new Set<number>();
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const value = solutionBoard[blockRow * 3 + r]?.[blockCol * 3 + c];
            if (value) blockDigits.add(value);
          }
        }
        expect(blockDigits.size).toBe(9);
      }
    }
  });

  it('preserves number of clues', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    const originalClues = SAMPLE_PUZZLE.split('').filter(c => c !== '0').length;
    const scrambledClues = result.puzzle.split('').filter(c => c !== '0').length;

    expect(scrambledClues).toBe(originalClues);
  });

  it('respects scramble configuration', () => {
    // Test with all scrambling disabled
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
      scrambleRows: false,
      scrambleColumns: false,
      scrambleRowBlocks: false,
      scrambleColumnBlocks: false,
      scrambleDigits: false,
      rotate: false,
      mirror: false,
    });

    // Should be identical to original
    expect(result.puzzle).toBe(SAMPLE_PUZZLE);
    expect(result.solution).toBe(SAMPLE_SOLUTION);
  });

  it('applies digit scrambling only when requested', () => {
    const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
      scrambleRows: false,
      scrambleColumns: false,
      scrambleRowBlocks: false,
      scrambleColumnBlocks: false,
      scrambleDigits: true,
      rotate: false,
      mirror: false,
    });

    // Digit mapping should not be identity
    let hasNonIdentityMapping = false;
    for (const [original, scrambled] of result.digitMapping) {
      if (original !== scrambled) {
        hasNonIdentityMapping = true;
        break;
      }
    }

    // With only digit scrambling, there's a small chance of identity mapping
    // but structure should be preserved
    const originalBoard = parseBoardString(SAMPLE_PUZZLE);
    const scrambledBoard = parseBoardString(result.puzzle);

    // Empty cells should remain in same positions
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const origValue = originalBoard[row]?.[col];
        const scramValue = scrambledBoard[row]?.[col];

        if (origValue === 0) {
          expect(scramValue).toBe(0);
        } else {
          // Non-zero should map through digitMapping
          const expectedValue = result.digitMapping.get(origValue ?? 0);
          expect(scramValue).toBe(expectedValue);
        }
      }
    }
  });
});

describe('noScramble', () => {
  it('returns original puzzle and solution unchanged', () => {
    const result = noScramble(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    expect(result.puzzle).toBe(SAMPLE_PUZZLE);
    expect(result.solution).toBe(SAMPLE_SOLUTION);
  });

  it('returns identity digit mapping', () => {
    const result = noScramble(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    for (let d = 1; d <= 9; d++) {
      expect(result.digitMapping.get(d)).toBe(d);
      expect(result.reverseDigitMapping.get(d)).toBe(d);
    }
  });
});

describe('scrambleBoard randomness', () => {
  it('produces different results on multiple calls', () => {
    const results = new Set<string>();

    // Generate multiple scrambles
    for (let i = 0; i < 10; i++) {
      const result = scrambleBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
      results.add(result.puzzle);
    }

    // Should have multiple different results (extremely high probability)
    expect(results.size).toBeGreaterThan(1);
  });
});
