/**
 * Pure helpers on 81-char board strings and technique bitmasks used by the
 * admin jobs.
 *
 * Ported from `sudojo_app/src/utils/admin/utils.ts` and the private helpers
 * of `ExampleCreator.ts` / `TechniqueExtractor.ts`.
 */

import { formatTechniqueBitmask, TOTAL_CELLS } from '@sudobility/sudojo_types';

/** Digit at `index`, or '0' when the string is short. */
const cellAt = (board: string, index: number): string => board[index] || '0';

/**
 * True when every cell has a digit, taking the user's digit over the given.
 *
 * @param original - 81-char original puzzle (0 = empty)
 * @param user - 81-char user input (0 = no input)
 */
export function isPuzzleFilled(original: string, user: string): boolean {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const userChar = cellAt(user, i);
    const actual = userChar !== '0' ? userChar : cellAt(original, i);
    if (actual === '0') return false;
  }
  return true;
}

/**
 * True when every cell has a digit AND matches the solution.
 *
 * @param original - 81-char original puzzle (0 = empty)
 * @param user - 81-char user input (0 = no input)
 * @param solution - 81-char full solution
 */
export function isPuzzleSolved(
  original: string,
  user: string,
  solution: string
): boolean {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const userChar = cellAt(user, i);
    const actual = userChar !== '0' ? userChar : cellAt(original, i);
    if (actual === '0' || actual !== cellAt(solution, i)) return false;
  }
  return true;
}

/** True when any solver hint step is the "Invalid Pencilmarks" correction. */
export function hasInvalidPencilmarksStep(
  steps: ReadonlyArray<{ title?: string }> | undefined | null
): boolean {
  if (!steps) return false;
  return steps.some(step => step.title === 'Invalid Pencilmarks');
}

/**
 * Overlay user input on the original board: each cell takes the user's digit
 * when it is not '0', else the original's. Always returns 81 chars.
 *
 * The solver's `user` string never contains the givens, so a technique example
 * must be stored as `mergeBoardWithUserInput(board.board, found.userInput)` or
 * it comes out near-empty.
 */
export function mergeBoardWithUserInput(
  original: string,
  userInput: string
): string {
  let result = '';
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const userChar = cellAt(userInput, i);
    result += userChar !== '0' ? userChar : cellAt(original, i);
  }
  return result;
}

/**
 * Solution for a practice built from `mergedBoard`: '0' wherever the merged
 * board already has a digit, else the solution's digit. Always 81 chars.
 */
export function adjustPracticeSolution(
  mergedBoard: string,
  solution: string
): string {
  let result = '';
  for (let i = 0; i < TOTAL_CELLS; i++) {
    result += cellAt(mergedBoard, i) !== '0' ? '0' : cellAt(solution, i);
  }
  return result;
}

/** `0x…` form of an exact technique bitmask, for progress lines. */
export function formatTechniqueMaskHex(mask: bigint): string {
  return `0x${mask.toString(16)}`;
}

/** Log-friendly forms of an exact bitmask (decimal, binary, hex). */
export function describeTechniqueMask(mask: bigint): {
  techniques: string;
  techniquesBinary: string;
  techniquesHex: string;
} {
  return {
    techniques: formatTechniqueBitmask(mask),
    techniquesBinary: `0b${mask.toString(2)}`,
    techniquesHex: formatTechniqueMaskHex(mask),
  };
}

/** Level to store for a board: positive levels as-is, 0 or less as null. */
export function levelToSave(level: number): number | null {
  return level > 0 ? level : null;
}

/** First 8 chars of a UUID, as used in every admin progress line. */
export function shortUuid(uuid: string): string {
  return uuid.slice(0, 8);
}

/** Message of an unknown thrown value. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
