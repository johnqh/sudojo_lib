/**
 * Technique walkthrough utilities.
 *
 * Shared logic for building step-by-step technique examples from
 * practice puzzle data. Used by both the web app and React Native app
 * TechniqueExample components.
 */

import type { SolverHints, SolverHintStep } from '@sudobility/sudojo_types';
import type { SudokuCell } from '../types/sudoku';
import type { TranslateFunction } from './localizedHint';
import { getLocalizedHintText, getLocalizedHintTitle } from './localizedHint';

// ── Types ───────────────────────────────────────────────────────────────────

/** A single step in a technique walkthrough */
export interface WalkthroughStep {
  board: SudokuCell[];
  hint: SolverHintStep | null;
  title: string;
  text: string;
}

// ── Board parsing ───────────────────────────────────────────────────────────

/** Parse a comma-delimited pencilmarks string into per-cell arrays */
export function parsePencilmarksString(
  pencilmarksStr: string | null
): (number[] | null)[] {
  if (!pencilmarksStr) return [];
  return pencilmarksStr.split(',').map(pm => {
    if (!pm || pm.trim() === '') return null;
    return pm
      .split('')
      .map(d => parseInt(d, 10))
      .filter(n => n >= 1 && n <= 9);
  });
}

/** Convert per-cell pencilmarks arrays back to a comma-delimited string */
export function pencilmarksToString(
  pencilmarksArray: (number[] | null)[]
): string {
  return pencilmarksArray
    .map(pm => (pm && pm.length > 0 ? pm.sort((a, b) => a - b).join('') : ''))
    .join(',');
}

/**
 * Parse board, pencilmarks and solution strings into a SudokuCell array.
 * This is the format returned by the practice API.
 */
export function parsePracticeBoard(
  boardStr: string,
  pencilmarksStr: string | null,
  solutionStr: string
): SudokuCell[] {
  const pencilmarksArray = parsePencilmarksString(pencilmarksStr);

  return Array.from({ length: 81 }, (_, index) => {
    const boardChar = boardStr[index] || '0';
    const solutionChar = solutionStr[index] || '0';
    const boardValue = parseInt(boardChar, 10);
    const solutionValue = parseInt(solutionChar, 10);
    const hasValue = boardValue >= 1 && boardValue <= 9;

    return {
      index,
      solution: solutionValue >= 1 && solutionValue <= 9 ? solutionValue : null,
      given: hasValue ? boardValue : null,
      input: null,
      pencilmarks:
        !hasValue && pencilmarksArray[index] ? pencilmarksArray[index] : null,
    };
  });
}

// ── Board manipulation ──────────────────────────────────────────────────────

/** Deep clone a SudokuCell array (preserves pencilmarks by value) */
export function cloneSudokuBoard(board: SudokuCell[]): SudokuCell[] {
  return board.map(cell => ({
    ...cell,
    pencilmarks: cell.pencilmarks ? [...cell.pencilmarks] : null,
  }));
}

/**
 * Apply a hint step's actions (select / remove / add) to a board,
 * returning the new board state and serialised pencilmarks.
 */
export function applyHintStep(
  board: SudokuCell[],
  step: SolverHintStep
): { board: SudokuCell[]; pencilmarks: string } {
  const newBoard = cloneSudokuBoard(board);

  for (const hintCell of step.cells || []) {
    const index = hintCell.row * 9 + hintCell.column;
    const cell = newBoard[index];
    if (!cell || cell.given !== null) continue;

    const actions = hintCell.actions;
    if (!actions) continue;

    // Place digit
    if (actions.select && actions.select !== '') {
      const digit = parseInt(actions.select, 10);
      if (digit >= 1 && digit <= 9) {
        cell.input = digit;
        cell.pencilmarks = null;
      }
    }

    // Eliminate pencilmarks
    if (actions.remove && actions.remove !== '' && cell.pencilmarks) {
      const toRemove = new Set(
        actions.remove
          .split('')
          .map(d => parseInt(d, 10))
          .filter(n => n >= 1 && n <= 9)
      );
      cell.pencilmarks = cell.pencilmarks.filter(pm => !toRemove.has(pm));
      if (cell.pencilmarks.length === 0) {
        cell.pencilmarks = null;
      }
    }

    // Add pencilmarks
    if (actions.add && actions.add !== '') {
      const toAdd = actions.add
        .split('')
        .map(d => parseInt(d, 10))
        .filter(n => n >= 1 && n <= 9);
      if (toAdd.length > 0) {
        const existing = new Set(cell.pencilmarks || []);
        toAdd.forEach(d => existing.add(d));
        cell.pencilmarks = Array.from(existing).sort((a, b) => a - b);
      }
    }
  }

  const pencilmarksStr = pencilmarksToString(
    newBoard.map(cell => cell.pencilmarks)
  );

  return { board: newBoard, pencilmarks: pencilmarksStr };
}

// ── Hint data parsing ───────────────────────────────────────────────────────

/** Parse a hint_data JSON string into SolverHints */
export function parseHintData(hintDataStr: string | null): SolverHints | null {
  if (!hintDataStr) return null;
  try {
    return JSON.parse(hintDataStr) as SolverHints;
  } catch {
    return null;
  }
}

// ── Walkthrough builder ─────────────────────────────────────────────────────

/**
 * Resolve localised title and text for a single hint step.
 *
 * @param step        - The solver hint step
 * @param tHints      - Translation function scoped to the `hints` namespace
 * @param tCommon     - Translation function scoped to the default namespace
 * @param techniquePath - Optional technique path slug for title fallback
 */
export function localizeHintStep(
  step: SolverHintStep,
  tHints: TranslateFunction,
  tCommon: TranslateFunction,
  techniquePath?: string
): { title: string; text: string } {
  let title = getLocalizedHintTitle(tCommon, step);
  if (title === step.title && techniquePath) {
    const translated = tCommon(`techniques.${techniquePath}.title`);
    if (translated !== `techniques.${techniquePath}.title`) {
      title = translated;
    }
  }
  return {
    title,
    text: getLocalizedHintText(tHints, step),
  };
}

/**
 * Build the full walkthrough step array from an initial board and hint data.
 *
 * - Step 0: Original board with "Look for {technique}" text
 * - Steps 1-N: Each hint step with overlay; board progresses after each step
 * - Final step: Result board after all steps applied, no overlay
 *
 * @param initialBoard  - Parsed SudokuCell[] from practice data
 * @param hintData      - Parsed SolverHints (or null)
 * @param lookForText   - Already-translated "Look for …" string
 * @param resultText    - Already-translated result text
 * @param tHints        - Translation function scoped to the `hints` namespace
 * @param tCommon       - Translation function scoped to the default namespace
 * @param techniquePath - Optional technique path slug for title fallback
 */
export function buildWalkthroughSteps(
  initialBoard: SudokuCell[],
  hintData: SolverHints | null,
  lookForText: string,
  resultText: string,
  tHints: TranslateFunction,
  tCommon: TranslateFunction,
  techniquePath?: string
): WalkthroughStep[] {
  const steps: WalkthroughStep[] = [];

  if (!hintData?.steps?.length) {
    steps.push({
      board: initialBoard,
      hint: null,
      title: '',
      text: lookForText,
    });
    return steps;
  }

  // Step 0: Original board
  steps.push({ board: initialBoard, hint: null, title: '', text: lookForText });

  // Steps 1-N: Each hint step with overlay, then apply changes
  let currentBoard = cloneSudokuBoard(initialBoard);
  for (const hintStep of hintData.steps) {
    const localized = localizeHintStep(
      hintStep,
      tHints,
      tCommon,
      techniquePath
    );
    steps.push({
      board: cloneSudokuBoard(currentBoard),
      hint: hintStep,
      title: localized.title,
      text: localized.text,
    });
    const result = applyHintStep(currentBoard, hintStep);
    currentBoard = result.board;
  }

  // Final step: Result after all steps applied
  steps.push({ board: currentBoard, hint: null, title: '', text: resultText });

  return steps;
}
