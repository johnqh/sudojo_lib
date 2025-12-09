/**
 * Game validation utilities for checking mistakes, completion, and game state
 */

import type { CellState, GameBoard, GameState } from '../types';
import { BOARD_SIZE, parseBoardString } from './board';

/**
 * Checks if a cell value matches the solution
 * @param board - GameBoard
 * @param solution - 81-character solution string
 * @param row - Row index
 * @param col - Column index
 * @returns true if the cell value matches the solution (or is empty)
 */
export function isCellCorrect(
  board: GameBoard,
  solution: string,
  row: number,
  col: number
): boolean {
  const cell = board[row]?.[col];
  if (!cell || cell.value === null) {
    return true; // Empty cells are not incorrect
  }

  const solutionArray = parseBoardString(solution);
  const correctValue = solutionArray[row]?.[col];
  return cell.value === correctValue;
}

/**
 * Checks if a specific value would be correct for a cell
 * @param solution - 81-character solution string
 * @param row - Row index
 * @param col - Column index
 * @param value - Value to check (1-9)
 * @returns true if the value matches the solution
 */
export function isValueCorrect(
  solution: string,
  row: number,
  col: number,
  value: number
): boolean {
  const solutionArray = parseBoardString(solution);
  return solutionArray[row]?.[col] === value;
}

/**
 * Gets all cells with incorrect values
 * @param board - GameBoard
 * @param solution - 81-character solution string
 * @returns Array of {row, column} positions with incorrect values
 */
export function getIncorrectCells(
  board: GameBoard,
  solution: string
): Array<{ row: number; column: number }> {
  const solutionArray = parseBoardString(solution);
  const incorrectCells: Array<{ row: number; column: number }> = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row]?.[col];
      if (cell && cell.value !== null && !cell.isClue) {
        const correctValue = solutionArray[row]?.[col];
        if (cell.value !== correctValue) {
          incorrectCells.push({ row, column: col });
        }
      }
    }
  }

  return incorrectCells;
}

/**
 * Updates the error state of all cells based on the solution
 * @param board - GameBoard to update
 * @param solution - 81-character solution string
 * @param showErrors - Whether to show errors
 * @returns Updated GameBoard
 */
export function updateCellErrors(
  board: GameBoard,
  solution: string,
  showErrors: boolean
): GameBoard {
  if (!showErrors) {
    // Clear all errors
    return board.map(row => row.map(cell => ({ ...cell, isError: false })));
  }

  const solutionArray = parseBoardString(solution);

  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (cell.value === null || cell.isClue) {
        return { ...cell, isError: false };
      }
      const correctValue = solutionArray[rowIndex]?.[colIndex];
      return {
        ...cell,
        isError: cell.value !== correctValue,
      };
    })
  );
}

/**
 * Checks if the game is complete (all cells filled correctly)
 * @param board - GameBoard
 * @param solution - 81-character solution string
 * @returns true if all cells are filled with correct values
 */
export function isGameComplete(board: GameBoard, solution: string): boolean {
  const solutionArray = parseBoardString(solution);

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row]?.[col];
      const correctValue = solutionArray[row]?.[col];

      if (!cell || cell.value === null || cell.value !== correctValue) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Checks if the board is fully filled (regardless of correctness)
 * @param board - GameBoard
 * @returns true if all cells have values
 */
export function isBoardFilled(board: GameBoard): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row]?.[col]?.value === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Counts the number of mistakes in the current board
 * @param board - GameBoard
 * @param solution - 81-character solution string
 * @returns Number of incorrect cells
 */
export function countMistakes(board: GameBoard, solution: string): number {
  return getIncorrectCells(board, solution).length;
}

/**
 * Updates highlight state for all cells based on selected cell
 * @param board - GameBoard
 * @param selectedRow - Selected row (or null if nothing selected)
 * @param selectedCol - Selected column (or null if nothing selected)
 * @param highlightRelated - Whether to highlight related cells
 * @param highlightSameValue - Whether to highlight cells with same value
 * @returns Updated GameBoard
 */
export function updateCellHighlights(
  board: GameBoard,
  selectedRow: number | null,
  selectedCol: number | null,
  highlightRelated: boolean,
  highlightSameValue: boolean
): GameBoard {
  const selectedValue =
    selectedRow !== null && selectedCol !== null
      ? board[selectedRow]?.[selectedCol]?.value
      : null;

  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const isSelected = rowIndex === selectedRow && colIndex === selectedCol;

      let isHighlighted = false;
      if (highlightRelated && selectedRow !== null && selectedCol !== null) {
        // Same row
        if (rowIndex === selectedRow) isHighlighted = true;
        // Same column
        if (colIndex === selectedCol) isHighlighted = true;
        // Same block
        const selectedBlockRow = Math.floor(selectedRow / 3);
        const selectedBlockCol = Math.floor(selectedCol / 3);
        const cellBlockRow = Math.floor(rowIndex / 3);
        const cellBlockCol = Math.floor(colIndex / 3);
        if (cellBlockRow === selectedBlockRow && cellBlockCol === selectedBlockCol) {
          isHighlighted = true;
        }
      }

      const isSameValue =
        highlightSameValue &&
        selectedValue !== null &&
        cell.value === selectedValue &&
        !isSelected;

      return {
        ...cell,
        isSelected,
        isHighlighted: isHighlighted && !isSelected,
        isSameValue,
      };
    })
  );
}

/**
 * Clears all highlights from the board
 * @param board - GameBoard
 * @returns Board with no highlights
 */
export function clearHighlights(board: GameBoard): GameBoard {
  return board.map(row =>
    row.map(cell => ({
      ...cell,
      isSelected: false,
      isHighlighted: false,
      isSameValue: false,
    }))
  );
}

/**
 * Auto-removes pencilmarks from related cells when a value is placed
 * @param board - GameBoard
 * @param row - Row where value was placed
 * @param col - Column where value was placed
 * @param value - Value that was placed
 * @returns Updated GameBoard with pencilmarks removed
 */
export function autoRemovePencilmarks(
  board: GameBoard,
  row: number,
  col: number,
  value: number
): GameBoard {
  const blockStartRow = Math.floor(row / 3) * 3;
  const blockStartCol = Math.floor(col / 3) * 3;

  return board.map((r, rowIndex) =>
    r.map((cell, colIndex) => {
      // Check if this cell is in the same row, column, or block
      const inSameRow = rowIndex === row;
      const inSameCol = colIndex === col;
      const inSameBlock =
        rowIndex >= blockStartRow &&
        rowIndex < blockStartRow + 3 &&
        colIndex >= blockStartCol &&
        colIndex < blockStartCol + 3;

      if (inSameRow || inSameCol || inSameBlock) {
        const newPencilmarks = new Set(cell.pencilmarks);
        newPencilmarks.delete(value);
        return { ...cell, pencilmarks: newPencilmarks };
      }

      return cell;
    })
  );
}

/**
 * Gets the progress percentage (filled cells / total empty cells in original puzzle)
 * @param board - GameBoard
 * @returns Progress percentage (0-100)
 */
export function getProgressPercentage(board: GameBoard): number {
  let clueCount = 0;
  let filledCount = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row]?.[col];
      if (cell) {
        if (cell.isClue) {
          clueCount++;
        } else if (cell.value !== null) {
          filledCount++;
        }
      }
    }
  }

  const totalEmptyCells = BOARD_SIZE * BOARD_SIZE - clueCount;
  if (totalEmptyCells === 0) return 100;

  return Math.round((filledCount / totalEmptyCells) * 100);
}

/**
 * Validates the entire game state
 * @param state - GameState
 * @returns Object with validation results
 */
export function validateGameState(state: GameState): {
  isComplete: boolean;
  isFilled: boolean;
  mistakeCount: number;
  progressPercentage: number;
  incorrectCells: Array<{ row: number; column: number }>;
} {
  return {
    isComplete: isGameComplete(state.board, state.scrambledSolution),
    isFilled: isBoardFilled(state.board),
    mistakeCount: countMistakes(state.board, state.scrambledSolution),
    progressPercentage: getProgressPercentage(state.board),
    incorrectCells: getIncorrectCells(state.board, state.scrambledSolution),
  };
}
