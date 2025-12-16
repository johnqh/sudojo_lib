/**
 * Board scrambling utilities for creating visually different but equivalent puzzles
 *
 * Scrambling preserves the logical structure of a Sudoku puzzle while making it
 * appear different. This is useful for:
 * - Preventing players from recognizing puzzles they've seen before
 * - Creating variety from a limited puzzle database
 * - Making it harder to look up solutions online
 */

import type { ScrambleConfig, ScrambleResult } from '../types';
import { DEFAULT_SCRAMBLE_CONFIG } from '../types';
import {
  BLOCK_SIZE,
  BOARD_SIZE,
  parseBoardString,
  stringifyBoard,
} from './board';

/**
 * Fisher-Yates shuffle algorithm for arrays
 * @param array - Array to shuffle in place
 * @returns The shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j] as T;
    array[j] = temp as T;
  }
  return array;
}

/**
 * Creates a random digit mapping (1-9 -> 1-9)
 * @returns Map from original digit to scrambled digit
 */
function createDigitMapping(): Map<number, number> {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const shuffled = shuffleArray([...digits]);

  const mapping = new Map<number, number>();
  for (let i = 0; i < digits.length; i++) {
    mapping.set(digits[i] as number, shuffled[i] as number);
  }
  return mapping;
}

/**
 * Creates the reverse of a digit mapping
 * @param mapping - Original digit mapping
 * @returns Reverse mapping (scrambled -> original)
 */
function reverseDigitMapping(
  mapping: Map<number, number>
): Map<number, number> {
  const reverse = new Map<number, number>();
  for (const [original, scrambled] of mapping) {
    reverse.set(scrambled, original);
  }
  return reverse;
}

/**
 * Applies digit mapping to a board
 * @param board - 9x9 number array
 * @param mapping - Digit mapping
 * @returns New board with mapped digits
 */
function applyDigitMapping(
  board: number[][],
  mapping: Map<number, number>
): number[][] {
  return board.map(row =>
    row.map(value => {
      if (value === 0) return 0;
      return mapping.get(value) ?? value;
    })
  );
}

/**
 * Rotates the board 90 degrees clockwise
 * @param board - Board to rotate
 * @returns New rotated board
 */
function rotateBoard90(board: number[][]): number[][] {
  const rotated: number[][] = [];
  for (let col = 0; col < BOARD_SIZE; col++) {
    const newRow: number[] = [];
    for (let row = BOARD_SIZE - 1; row >= 0; row--) {
      newRow.push(board[row]?.[col] ?? 0);
    }
    rotated.push(newRow);
  }
  return rotated;
}

/**
 * Mirrors the board horizontally (left-right)
 * @param board - Board to mirror
 * @returns New mirrored board
 */
function mirrorHorizontally(board: number[][]): number[][] {
  return board.map(row => [...row].reverse());
}

/**
 * Mirrors the board vertically (top-bottom)
 * @param board - Board to mirror
 * @returns New mirrored board
 */
function mirrorVertically(board: number[][]): number[][] {
  return [...board].reverse().map(row => [...row]);
}

/**
 * Scrambles a Sudoku board while preserving its logical structure
 *
 * @param puzzle - 81-character puzzle string
 * @param solution - 81-character solution string
 * @param config - Scramble configuration (defaults to all transformations enabled)
 * @returns Scramble result with scrambled puzzle, solution, and digit mapping
 *
 * @example
 * ```typescript
 * const result = scrambleBoard(puzzle, solution);
 * console.log(result.puzzle);      // Scrambled puzzle
 * console.log(result.solution);    // Scrambled solution
 * console.log(result.digitMapping); // Map from original to scrambled digits
 * ```
 */
export function scrambleBoard(
  puzzle: string,
  solution: string,
  config: ScrambleConfig = DEFAULT_SCRAMBLE_CONFIG
): ScrambleResult {
  // Parse the boards
  let puzzleBoard = parseBoardString(puzzle);
  let solutionBoard = parseBoardString(solution);

  // Create digit mapping (applied to both puzzle and solution)
  let digitMapping = new Map<number, number>();
  for (let i = 1; i <= 9; i++) {
    digitMapping.set(i, i); // Identity mapping by default
  }

  if (config.scrambleDigits) {
    digitMapping = createDigitMapping();
    puzzleBoard = applyDigitMapping(puzzleBoard, digitMapping);
    solutionBoard = applyDigitMapping(solutionBoard, digitMapping);
  }

  // Scramble rows within blocks
  if (config.scrambleRows) {
    // We need to apply the same transformation to both boards
    // Generate the permutation first, then apply to both
    const rowPermutations: number[][] = [];
    for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
      rowPermutations.push(shuffleArray([0, 1, 2]));
    }

    const applyRowPermutation = (board: number[][]): void => {
      for (let blockRow = 0; blockRow < BLOCK_SIZE; blockRow++) {
        const startRow = blockRow * BLOCK_SIZE;
        const perm = rowPermutations[blockRow] as number[];
        const rowsCopy = [
          [...(board[startRow] ?? [])],
          [...(board[startRow + 1] ?? [])],
          [...(board[startRow + 2] ?? [])],
        ];
        for (let i = 0; i < BLOCK_SIZE; i++) {
          board[startRow + i] = rowsCopy[perm[i] as number] as number[];
        }
      }
    };

    applyRowPermutation(puzzleBoard);
    applyRowPermutation(solutionBoard);
  }

  // Scramble columns within blocks
  if (config.scrambleColumns) {
    const colPermutations: number[][] = [];
    for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
      colPermutations.push(shuffleArray([0, 1, 2]));
    }

    const applyColPermutation = (board: number[][]): void => {
      for (let blockCol = 0; blockCol < BLOCK_SIZE; blockCol++) {
        const startCol = blockCol * BLOCK_SIZE;
        const perm = colPermutations[blockCol] as number[];
        for (let row = 0; row < BOARD_SIZE; row++) {
          const boardRow = board[row];
          if (boardRow) {
            const colsCopy = [
              boardRow[startCol],
              boardRow[startCol + 1],
              boardRow[startCol + 2],
            ];
            for (let i = 0; i < BLOCK_SIZE; i++) {
              boardRow[startCol + i] = colsCopy[perm[i] as number] as number;
            }
          }
        }
      }
    };

    applyColPermutation(puzzleBoard);
    applyColPermutation(solutionBoard);
  }

  // Scramble row blocks
  if (config.scrambleRowBlocks) {
    const blockOrder = shuffleArray([0, 1, 2]);

    const applyRowBlockPermutation = (board: number[][]): number[][] => {
      const allRows = board.map(row => [...row]);
      const result: number[][] = [];
      for (let newBlockIndex = 0; newBlockIndex < BLOCK_SIZE; newBlockIndex++) {
        const oldBlockIndex = blockOrder[newBlockIndex] as number;
        for (let i = 0; i < BLOCK_SIZE; i++) {
          result.push(allRows[oldBlockIndex * BLOCK_SIZE + i] as number[]);
        }
      }
      return result;
    };

    puzzleBoard = applyRowBlockPermutation(puzzleBoard);
    solutionBoard = applyRowBlockPermutation(solutionBoard);
  }

  // Scramble column blocks
  if (config.scrambleColumnBlocks) {
    const blockOrder = shuffleArray([0, 1, 2]);

    const applyColBlockPermutation = (board: number[][]): number[][] => {
      const result: number[][] = board.map(() => new Array(BOARD_SIZE).fill(0));
      for (let newBlockIndex = 0; newBlockIndex < BLOCK_SIZE; newBlockIndex++) {
        const oldBlockIndex = blockOrder[newBlockIndex] as number;
        for (let i = 0; i < BLOCK_SIZE; i++) {
          const oldCol = oldBlockIndex * BLOCK_SIZE + i;
          const newCol = newBlockIndex * BLOCK_SIZE + i;
          for (let row = 0; row < BOARD_SIZE; row++) {
            const resultRow = result[row];
            if (resultRow) {
              resultRow[newCol] = board[row]?.[oldCol] ?? 0;
            }
          }
        }
      }
      return result;
    };

    puzzleBoard = applyColBlockPermutation(puzzleBoard);
    solutionBoard = applyColBlockPermutation(solutionBoard);
  }

  // Rotate
  if (config.rotate) {
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) {
      puzzleBoard = rotateBoard90(puzzleBoard);
      solutionBoard = rotateBoard90(solutionBoard);
    }
  }

  // Mirror
  if (config.mirror) {
    const mirrorType = Math.floor(Math.random() * 4);
    const applyMirror = (board: number[][]): number[][] => {
      switch (mirrorType) {
        case 1:
          return mirrorHorizontally(board);
        case 2:
          return mirrorVertically(board);
        case 3:
          return mirrorVertically(mirrorHorizontally(board));
        default:
          return board;
      }
    };
    puzzleBoard = applyMirror(puzzleBoard);
    solutionBoard = applyMirror(solutionBoard);
  }

  return {
    puzzle: stringifyBoard(puzzleBoard),
    solution: stringifyBoard(solutionBoard),
    digitMapping,
    reverseDigitMapping: reverseDigitMapping(digitMapping),
  };
}

/**
 * Creates an identity scramble result (no scrambling)
 * @param puzzle - 81-character puzzle string
 * @param solution - 81-character solution string
 * @returns ScrambleResult with identity mapping
 */
export function noScramble(puzzle: string, solution: string): ScrambleResult {
  const identityMapping = new Map<number, number>();
  for (let i = 1; i <= 9; i++) {
    identityMapping.set(i, i);
  }

  return {
    puzzle,
    solution,
    digitMapping: identityMapping,
    reverseDigitMapping: identityMapping,
  };
}
