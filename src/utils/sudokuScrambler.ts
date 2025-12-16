/**
 * Sudoku board scrambler - ported from renderable/utils/Scrambler.kt
 *
 * Generates permutations for rows, columns, and digits to create unique puzzles
 * while preserving Sudoku validity.
 */

import { columnOf, rowOf, type SudokuCell } from '../types/sudoku';

// =============================================================================
// Scrambler Protocol
// =============================================================================

export interface ScramblerProtocol {
  scramble9(symmetrical: boolean): number[];
}

// =============================================================================
// Random Utilities
// =============================================================================

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  nextInt(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed;
  }
}

// =============================================================================
// Main Scrambler
// =============================================================================

/**
 * Scrambler implementation that matches the Kotlin version
 */
export const Scrambler: ScramblerProtocol = {
  scramble9(symmetrical: boolean): number[] {
    const random = new SeededRandom(Math.floor(Date.now() / 1000));

    const block0 = scramble3(symmetrical, random);
    const block1 = scramble3(symmetrical, random);
    const block2 = symmetrical ? block0 : scramble3(symmetrical, random);
    const blocks: number[][] = [block0, block1, block2];

    const board = scramble3(symmetrical, random);
    const result: number[] = [];

    for (let i = 0; i < 3; i++) {
      const target = board[i] ?? 0;
      const block = blocks[i] ?? [0, 1, 2];
      for (let j = 0; j < 3; j++) {
        result.push(target * 3 + (block[j] ?? 0));
      }
    }

    return result;
  },
};

/**
 * Non-scrambler that returns identity permutation
 */
export const NonScrambler: ScramblerProtocol = {
  scramble9(_symmetrical: boolean): number[] {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8];
  },
};

/**
 * Generates a permutation of [0, 1, 2]
 */
function scramble3(symmetrical: boolean, random: SeededRandom): number[] {
  if (symmetrical) {
    const seed = random.nextInt();
    // 50% chance for identity or reverse
    return seed % 2 === 0 ? [0, 1, 2] : [2, 1, 0];
  } else {
    // Generate 3 random values and sort to get permutation
    const values = [random.nextInt(), random.nextInt(), random.nextInt()];
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.map(v => values.indexOf(v));
  }
}

// =============================================================================
// Board Scrambling
// =============================================================================

export interface ScrambleResult {
  /** Scrambled cells array */
  cells: SudokuCell[];
  /** Digit mapping from original (1-9) to scrambled (1-9) */
  digitMapping: Map<number, number>;
  /** Reverse digit mapping from scrambled to original */
  reverseDigitMapping: Map<number, number>;
}

/**
 * Scramble a board using the given scrambler
 *
 * @param scrambler - Scrambler protocol implementation
 * @param cells - Original 81 cells
 * @param symmetrical - Whether to use symmetrical scrambling
 * @returns Scrambled cells and digit mapping
 */
export function scrambleBoard(
  scrambler: ScramblerProtocol,
  cells: SudokuCell[],
  symmetrical: boolean = false
): ScrambleResult {
  const rows = scrambler.scramble9(symmetrical);
  const columns = scrambler.scramble9(symmetrical);
  const numbers = scrambler.scramble9(symmetrical);

  // Create digit mapping (1-based to 1-based)
  const digitMapping = new Map<number, number>();
  const reverseDigitMapping = new Map<number, number>();
  for (let i = 0; i < 9; i++) {
    const original = i + 1;
    const scrambled = (numbers[i] ?? i) + 1;
    digitMapping.set(original, scrambled);
    reverseDigitMapping.set(scrambled, original);
  }

  const scrambledCells = Array.from({ length: 81 }, (_, index) => {
    const x = columnOf(index);
    const y = rowOf(index);
    const scrambledY = rows[y] ?? y;
    const scrambledX = columns[x] ?? x;
    const existing = cells[scrambledY * 9 + scrambledX];
    if (!existing) {
      throw new Error(`Missing cell at index ${scrambledY * 9 + scrambledX}`);
    }

    return {
      index,
      solution: mapDigit(existing.solution, numbers),
      given: mapDigit(existing.given, numbers),
      input: mapDigit(existing.input, numbers),
      pencilmarks: mapPencilmarks(existing.pencilmarks, numbers),
    };
  });

  return {
    cells: scrambledCells,
    digitMapping,
    reverseDigitMapping,
  };
}

/**
 * Map a digit using the lookup array
 * @param digit - Original digit (1-9) or null
 * @param lookup - Permutation array (0-indexed, returns 0-indexed)
 * @returns Mapped digit (1-9) or null
 */
function mapDigit(digit: number | null, lookup: number[]): number | null {
  if (digit === null || digit === 0) return null;
  // digit is 1-based, lookup is 0-indexed
  const mapped = lookup[digit - 1];
  return mapped !== undefined ? mapped + 1 : digit;
}

/**
 * Map pencilmarks array using the lookup array
 * Matches Kotlin: map(digits: Array<Int>?, lookup: Array<Int>?): Array<Int>?
 */
function mapPencilmarks(
  pencilmarks: number[] | null,
  lookup: number[]
): number[] | null {
  if (pencilmarks === null) return null;
  return pencilmarks
    .map(digit => mapDigit(digit, lookup))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
}

// =============================================================================
// Board Parsing
// =============================================================================

/**
 * Parse a puzzle string (81 chars of 0-9 or .) into cells
 *
 * @param puzzle - 81 character string
 * @param solution - 81 character solution string (optional)
 * @returns Array of 81 cells
 */
export function parsePuzzleString(
  puzzle: string,
  solution?: string
): SudokuCell[] {
  if (puzzle.length !== 81) {
    throw new Error(`Invalid puzzle string length: ${puzzle.length}`);
  }

  if (solution && solution.length !== 81) {
    throw new Error(`Invalid solution string length: ${solution.length}`);
  }

  return Array.from({ length: 81 }, (_, index) => {
    const givenChar = puzzle[index];
    if (givenChar === undefined) {
      throw new Error(`Missing puzzle character at index ${index}`);
    }
    const givenDigit = parseDigit(givenChar);

    const solutionChar = solution?.[index];
    const solutionDigit = solutionChar ? parseDigit(solutionChar) : null;

    return {
      index,
      solution: solutionDigit,
      given: givenDigit,
      input: null,
      pencilmarks: null,
    };
  });
}

/**
 * Parse a character to a digit (1-9) or null
 */
function parseDigit(char: string): number | null {
  if (char === '0' || char === '.') return null;
  const digit = parseInt(char, 10);
  if (digit >= 1 && digit <= 9) return digit;
  return null;
}

/**
 * Convert cells to puzzle string
 */
export function cellsToPuzzleString(cells: SudokuCell[]): string {
  return cells.map(cell => cell.given?.toString() ?? '0').join('');
}

/**
 * Convert cells to current state string (given + input)
 */
export function cellsToStateString(cells: SudokuCell[]): string {
  return cells
    .map(cell => (cell.given ?? cell.input)?.toString() ?? '0')
    .join('');
}

/**
 * Convert cells to input-only string
 */
export function cellsToInputString(cells: SudokuCell[]): string {
  return cells.map(cell => cell.input?.toString() ?? '0').join('');
}

/**
 * Convert cells to pencilmarks string (comma-separated)
 * Matches Kotlin: pencilmarksParam - returns empty string for null pencilmarks
 */
export function cellsToPencilmarksString(cells: SudokuCell[]): string {
  return cells
    .map(cell => {
      if (cell.pencilmarks !== null) {
        return cell.pencilmarks.join('');
      } else {
        return '';
      }
    })
    .join(',');
}
