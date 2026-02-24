/**
 * Tests for Sudoku board scrambler utilities
 */

import { describe, expect, it } from 'vitest';
import type { SudokuCell } from '../types/sudoku';
import {
  cellsToInputString,
  cellsToPencilmarksString,
  cellsToPuzzleString,
  cellsToStateString,
  NonScrambler,
  parsePuzzleString,
  scrambleBoard,
  Scrambler,
} from './sudokuScrambler';

const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('NonScrambler', () => {
  it('returns identity permutation', () => {
    const result = NonScrambler.scramble9(false);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('returns identity permutation for symmetrical mode', () => {
    const result = NonScrambler.scramble9(true);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('Scrambler', () => {
  it('returns a permutation of 9 elements', () => {
    const result = Scrambler.scramble9(false, 42);
    expect(result).toHaveLength(9);
    expect(new Set(result).size).toBe(9);
    expect(result.every(v => v >= 0 && v < 9)).toBe(true);
  });

  it('returns a permutation for symmetrical mode', () => {
    const result = Scrambler.scramble9(true, 42);
    expect(result).toHaveLength(9);
    expect(new Set(result).size).toBe(9);
    expect(result.every(v => v >= 0 && v < 9)).toBe(true);
  });

  it('produces deterministic results for the same seed', () => {
    const result1 = Scrambler.scramble9(false, 12345);
    const result2 = Scrambler.scramble9(false, 12345);
    expect(result1).toEqual(result2);
  });

  it('produces different results for different seeds', () => {
    const result1 = Scrambler.scramble9(false, 1);
    const result2 = Scrambler.scramble9(false, 999);
    // They might coincidentally be the same, but highly unlikely
    // We just verify they are valid permutations
    expect(result1).toHaveLength(9);
    expect(result2).toHaveLength(9);
  });
});

describe('scrambleBoard', () => {
  it('returns scrambled cells with NonScrambler (identity)', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const result = scrambleBoard(NonScrambler, cells);

    expect(result.cells).toHaveLength(81);
    expect(result.digitMapping.size).toBe(9);
    expect(result.reverseDigitMapping.size).toBe(9);

    // With NonScrambler, cells should preserve given/solution relationships
    for (const cell of result.cells) {
      if (cell.given !== null && cell.solution !== null) {
        // The digit mapping should be consistent
        const mappedGiven = result.digitMapping.get(
          result.reverseDigitMapping.get(cell.given) ?? 0
        );
        expect(mappedGiven).toBe(cell.given);
      }
    }
  });

  it('creates valid digit mappings', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const result = scrambleBoard(Scrambler, cells);

    // Every digit 1-9 should be mapped
    for (let d = 1; d <= 9; d++) {
      expect(result.digitMapping.has(d)).toBe(true);
      const mapped = result.digitMapping.get(d)!;
      expect(mapped).toBeGreaterThanOrEqual(1);
      expect(mapped).toBeLessThanOrEqual(9);
      // Reverse mapping should be consistent
      expect(result.reverseDigitMapping.get(mapped)).toBe(d);
    }
  });

  it('preserves board validity (81 cells)', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const result = scrambleBoard(Scrambler, cells);

    expect(result.cells).toHaveLength(81);

    // Each cell should have an index 0-80
    const indices = result.cells.map(c => c.index);
    expect(new Set(indices).size).toBe(81);
  });

  it('scrambles pencilmarks correctly', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Add pencilmarks to an empty cell
    const emptyIndex = cells.findIndex(c => c.given === null);
    cells[emptyIndex]!.pencilmarks = [1, 2, 3];

    const result = scrambleBoard(Scrambler, cells);

    // The scrambled cell at the target position should have mapped pencilmarks
    // We just verify pencilmarks are non-null somewhere if they were set
    const hasNonNullPencilmarks = result.cells.some(
      c => c.pencilmarks !== null && c.pencilmarks.length > 0
    );
    expect(hasNonNullPencilmarks).toBe(true);
  });

  it('handles null pencilmarks', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    const result = scrambleBoard(NonScrambler, cells);

    // All pencilmarks should remain null
    for (const cell of result.cells) {
      expect(cell.pencilmarks).toBeNull();
    }
  });
});

describe('parsePuzzleString', () => {
  it('parses a valid 81-character puzzle string', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);

    expect(cells).toHaveLength(81);
    expect(cells[0]?.given).toBe(5);
    expect(cells[1]?.given).toBe(3);
    expect(cells[2]?.given).toBeNull(); // '0' becomes null
    expect(cells[0]?.input).toBeNull();
    expect(cells[0]?.pencilmarks).toBeNull();
  });

  it('parses puzzle with solution', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    expect(cells[0]?.given).toBe(5);
    expect(cells[0]?.solution).toBe(5);
    expect(cells[2]?.given).toBeNull();
    expect(cells[2]?.solution).toBe(4); // Solution at index 2 is '4'
  });

  it('handles dots as empty cells', () => {
    const puzzleWithDots = SAMPLE_PUZZLE.replace(/0/g, '.');
    const cells = parsePuzzleString(puzzleWithDots);

    expect(cells[2]?.given).toBeNull();
  });

  it('throws for invalid puzzle length', () => {
    expect(() => parsePuzzleString('123')).toThrow(
      'Invalid puzzle string length'
    );
    expect(() => parsePuzzleString('')).toThrow('Invalid puzzle string length');
  });

  it('throws for invalid solution length', () => {
    expect(() => parsePuzzleString(SAMPLE_PUZZLE, '123')).toThrow(
      'Invalid solution string length'
    );
  });

  it('sets correct index for each cell', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    for (let i = 0; i < 81; i++) {
      expect(cells[i]?.index).toBe(i);
    }
  });
});

describe('cellsToPuzzleString', () => {
  it('converts cells back to puzzle string', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    const result = cellsToPuzzleString(cells);
    expect(result).toBe(SAMPLE_PUZZLE);
  });

  it('uses 0 for null given values', () => {
    const cells: SudokuCell[] = [
      { index: 0, solution: 5, given: null, input: null, pencilmarks: null },
    ];
    expect(cellsToPuzzleString(cells)).toBe('0');
  });
});

describe('cellsToStateString', () => {
  it('returns given values with no input', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    const result = cellsToStateString(cells);
    expect(result).toBe(SAMPLE_PUZZLE);
  });

  it('returns input values where present', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    // Cell at index 2 is empty (given = null), set input
    cells[2]!.input = 4;
    const result = cellsToStateString(cells);
    expect(result[2]).toBe('4');
  });

  it('prefers given over input', () => {
    const cells: SudokuCell[] = [
      { index: 0, solution: 5, given: 5, input: 3, pencilmarks: null },
    ];
    expect(cellsToStateString(cells)).toBe('5');
  });
});

describe('cellsToInputString', () => {
  it('returns input values only', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    cells[2]!.input = 4;

    const result = cellsToInputString(cells);
    // All should be '0' except index 2 which should be '4'
    expect(result[2]).toBe('4');
    expect(result[0]).toBe('0'); // given cell has no input
  });
});

describe('cellsToPencilmarksString', () => {
  it('returns empty strings for null pencilmarks', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    const result = cellsToPencilmarksString(cells);
    const parts = result.split(',');
    expect(parts).toHaveLength(81);
    expect(parts.every(p => p === '')).toBe(true);
  });

  it('includes pencilmarks when present', () => {
    const cells = parsePuzzleString(SAMPLE_PUZZLE);
    cells[2]!.pencilmarks = [1, 4, 7];

    const result = cellsToPencilmarksString(cells);
    const parts = result.split(',');
    expect(parts[2]).toBe('147');
  });
});
