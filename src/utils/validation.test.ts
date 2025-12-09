/**
 * Tests for validation utilities
 */

import { describe, expect, it } from 'vitest';
import { createGameBoard, cloneBoard } from './board';
import {
  autoRemovePencilmarks,
  clearHighlights,
  countMistakes,
  getIncorrectCells,
  getProgressPercentage,
  isBoardFilled,
  isCellCorrect,
  isGameComplete,
  isValueCorrect,
  updateCellErrors,
  updateCellHighlights,
} from './validation';

// Sample puzzles for testing - valid Sudoku puzzle and solution pair
const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('isCellCorrect', () => {
  it('returns true for empty cells', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Cell (0,2) is empty in the puzzle
    expect(isCellCorrect(board, SAMPLE_SOLUTION, 0, 2)).toBe(true);
  });

  it('returns true for correct values', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Cell (0,2) is empty, correct value is 4
    const cell = board[0]?.[2];
    if (cell) {
      cell.value = 4; // Correct value from solution
    }
    expect(isCellCorrect(board, SAMPLE_SOLUTION, 0, 2)).toBe(true);
  });

  it('returns false for incorrect values', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Cell (0,2) is empty, correct value is 4
    const cell = board[0]?.[2];
    if (cell) {
      cell.value = 9; // Wrong value
    }
    expect(isCellCorrect(board, SAMPLE_SOLUTION, 0, 2)).toBe(false);
  });
});

describe('isValueCorrect', () => {
  it('returns true for correct value', () => {
    // Solution starts with 534678912... so position 0 is 5
    expect(isValueCorrect(SAMPLE_SOLUTION, 0, 0, 5)).toBe(true);
  });

  it('returns false for incorrect value', () => {
    expect(isValueCorrect(SAMPLE_SOLUTION, 0, 0, 9)).toBe(false);
  });
});

describe('getIncorrectCells', () => {
  it('returns empty array for fresh board', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const incorrect = getIncorrectCells(board, SAMPLE_SOLUTION);
    expect(incorrect).toHaveLength(0);
  });

  it('returns cells with wrong values', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Set some wrong values on empty cells (positions 2 and 3 in row 0)
    const cell1 = board[0]?.[2];
    const cell2 = board[0]?.[3];
    if (cell1) cell1.value = 9; // Wrong (correct is 4)
    if (cell2) cell2.value = 1; // Wrong (correct is 6)

    const incorrect = getIncorrectCells(board, SAMPLE_SOLUTION);
    expect(incorrect).toHaveLength(2);
    expect(incorrect).toContainEqual({ row: 0, column: 2 });
    expect(incorrect).toContainEqual({ row: 0, column: 3 });
  });

  it('does not include clue cells', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Clue cells are already correct, so they shouldn't appear
    const incorrect = getIncorrectCells(board, SAMPLE_SOLUTION);
    expect(incorrect).toHaveLength(0);
  });
});

describe('updateCellErrors', () => {
  it('marks incorrect cells as errors when showErrors is true', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Use empty cell at position (0,2)
    const cell = board[0]?.[2];
    if (cell) cell.value = 9; // Wrong (correct is 4)

    const updated = updateCellErrors(board, SAMPLE_SOLUTION, true);
    expect(updated[0]?.[2]?.isError).toBe(true);
  });

  it('clears all errors when showErrors is false', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Use empty cell at position (0,2)
    const cell = board[0]?.[2];
    if (cell) {
      cell.value = 9;
      cell.isError = true;
    }

    const updated = updateCellErrors(board, SAMPLE_SOLUTION, false);
    expect(updated[0]?.[2]?.isError).toBe(false);
  });
});

describe('isGameComplete', () => {
  it('returns false for incomplete board', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    expect(isGameComplete(board, SAMPLE_SOLUTION)).toBe(false);
  });

  it('returns true when all cells are correctly filled', () => {
    const board = createGameBoard(SAMPLE_SOLUTION, SAMPLE_SOLUTION);
    expect(isGameComplete(board, SAMPLE_SOLUTION)).toBe(true);
  });

  it('returns false when board is filled but incorrect', () => {
    const board = createGameBoard(SAMPLE_SOLUTION, SAMPLE_SOLUTION);
    // Swap two values
    const cell1 = board[0]?.[0];
    const cell2 = board[0]?.[1];
    if (cell1 && cell2) {
      const temp = cell1.value;
      cell1.value = cell2.value;
      cell2.value = temp;
    }
    expect(isGameComplete(board, SAMPLE_SOLUTION)).toBe(false);
  });
});

describe('isBoardFilled', () => {
  it('returns false for board with empty cells', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    expect(isBoardFilled(board)).toBe(false);
  });

  it('returns true when all cells have values', () => {
    const board = createGameBoard(SAMPLE_SOLUTION, SAMPLE_SOLUTION);
    expect(isBoardFilled(board)).toBe(true);
  });
});

describe('countMistakes', () => {
  it('returns 0 for fresh board', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    expect(countMistakes(board, SAMPLE_SOLUTION)).toBe(0);
  });

  it('counts incorrect cells', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Use empty cells at positions (0,2) and (0,3)
    const cell1 = board[0]?.[2];
    const cell2 = board[0]?.[3];
    if (cell1) cell1.value = 9;
    if (cell2) cell2.value = 1;

    expect(countMistakes(board, SAMPLE_SOLUTION)).toBe(2);
  });
});

describe('updateCellHighlights', () => {
  it('highlights selected cell', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const updated = updateCellHighlights(board, 4, 4, true, true);

    expect(updated[4]?.[4]?.isSelected).toBe(true);
    expect(updated[4]?.[4]?.isHighlighted).toBe(false); // Selected, not highlighted
  });

  it('highlights related cells when enabled', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const updated = updateCellHighlights(board, 4, 4, true, false);

    // Same row
    expect(updated[4]?.[0]?.isHighlighted).toBe(true);
    expect(updated[4]?.[8]?.isHighlighted).toBe(true);

    // Same column
    expect(updated[0]?.[4]?.isHighlighted).toBe(true);
    expect(updated[8]?.[4]?.isHighlighted).toBe(true);

    // Same block
    expect(updated[3]?.[3]?.isHighlighted).toBe(true);
    expect(updated[5]?.[5]?.isHighlighted).toBe(true);
  });

  it('does not highlight related cells when disabled', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const updated = updateCellHighlights(board, 4, 4, false, false);

    expect(updated[4]?.[0]?.isHighlighted).toBe(false);
    expect(updated[0]?.[4]?.isHighlighted).toBe(false);
  });

  it('highlights cells with same value when enabled', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Cell (0,0) has value 5, find another cell with same value
    // Or set an empty cell to have 5 as well
    const cell2 = board[0]?.[2]; // Empty cell
    if (cell2) cell2.value = 5;

    const updated = updateCellHighlights(board, 0, 0, false, true);

    expect(updated[0]?.[2]?.isSameValue).toBe(true);
    expect(updated[0]?.[0]?.isSameValue).toBe(false); // Selected cell not marked as same
  });

  it('clears highlights when no cell selected', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const updated = updateCellHighlights(board, null, null, true, true);

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        expect(updated[row]?.[col]?.isSelected).toBe(false);
        expect(updated[row]?.[col]?.isHighlighted).toBe(false);
        expect(updated[row]?.[col]?.isSameValue).toBe(false);
      }
    }
  });
});

describe('clearHighlights', () => {
  it('removes all highlights', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Set some highlights on an empty cell
    const cell = board[0]?.[2];
    if (cell) {
      cell.isSelected = true;
      cell.isHighlighted = true;
      cell.isSameValue = true;
    }

    const cleared = clearHighlights(board);

    expect(cleared[0]?.[2]?.isSelected).toBe(false);
    expect(cleared[0]?.[2]?.isHighlighted).toBe(false);
    expect(cleared[0]?.[2]?.isSameValue).toBe(false);
  });
});

describe('autoRemovePencilmarks', () => {
  it('removes pencilmark from cells in same row', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Add pencilmarks to cells in same row
    const cell = board[4]?.[0];
    if (cell) {
      cell.pencilmarks = new Set([5, 6, 7]);
    }

    const updated = autoRemovePencilmarks(board, 4, 4, 5);

    expect(updated[4]?.[0]?.pencilmarks.has(5)).toBe(false);
    expect(updated[4]?.[0]?.pencilmarks.has(6)).toBe(true);
    expect(updated[4]?.[0]?.pencilmarks.has(7)).toBe(true);
  });

  it('removes pencilmark from cells in same column', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    const cell = board[0]?.[4];
    if (cell) {
      cell.pencilmarks = new Set([5, 6, 7]);
    }

    const updated = autoRemovePencilmarks(board, 4, 4, 5);

    expect(updated[0]?.[4]?.pencilmarks.has(5)).toBe(false);
  });

  it('removes pencilmark from cells in same block', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    const cell = board[3]?.[3];
    if (cell) {
      cell.pencilmarks = new Set([5, 6, 7]);
    }

    const updated = autoRemovePencilmarks(board, 4, 4, 5);

    expect(updated[3]?.[3]?.pencilmarks.has(5)).toBe(false);
  });

  it('does not affect unrelated cells', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    const cell = board[0]?.[0];
    if (cell) {
      cell.pencilmarks = new Set([5, 6, 7]);
    }

    const updated = autoRemovePencilmarks(board, 4, 4, 5);

    // (0, 0) is not in same row, column, or block as (4, 4)
    expect(updated[0]?.[0]?.pencilmarks.has(5)).toBe(true);
  });
});

describe('getProgressPercentage', () => {
  it('returns 0 for empty board (no user-entered values)', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    expect(getProgressPercentage(board)).toBe(0);
  });

  it('returns 100 for fully filled board', () => {
    const board = createGameBoard(SAMPLE_SOLUTION, SAMPLE_SOLUTION);
    expect(getProgressPercentage(board)).toBe(100);
  });

  it('returns correct percentage for partially filled board', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    // Count empty cells
    let emptyCount = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row]?.[col]?.value === null) {
          emptyCount++;
        }
      }
    }

    // Fill half the empty cells
    let filledCount = 0;
    const targetFill = Math.floor(emptyCount / 2);
    for (let row = 0; row < 9 && filledCount < targetFill; row++) {
      for (let col = 0; col < 9 && filledCount < targetFill; col++) {
        const cell = board[row]?.[col];
        if (cell && cell.value === null) {
          cell.value = 1;
          filledCount++;
        }
      }
    }

    const progress = getProgressPercentage(board);
    expect(progress).toBeGreaterThan(40);
    expect(progress).toBeLessThan(60);
  });
});
