/**
 * Board utilities for parsing, stringifying, and manipulating Sudoku boards
 */

import type { CellState, GameBoard } from '../types';

/**
 * Board size constants
 */
export const BOARD_SIZE = 9;
export const BLOCK_SIZE = 3;
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

/**
 * Parses an 81-character board string into a 2D array of numbers
 * @param boardString - 81-character string where '0' or '.' represents empty cells
 * @returns 9x9 array of numbers (0 = empty, 1-9 = filled)
 */
export function parseBoardString(boardString: string): number[][] {
  if (boardString.length !== TOTAL_CELLS) {
    throw new Error(
      `Invalid board string length: expected ${TOTAL_CELLS}, got ${boardString.length}`
    );
  }

  const board: number[][] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowArray: number[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const index = row * BOARD_SIZE + col;
      const char = boardString[index];
      const value = char === '.' ? 0 : parseInt(char, 10);
      if (isNaN(value) || value < 0 || value > 9) {
        throw new Error(`Invalid character at position ${index}: '${char}'`);
      }
      rowArray.push(value);
    }
    board.push(rowArray);
  }
  return board;
}

/**
 * Converts a 2D number array back to an 81-character string
 * @param board - 9x9 array of numbers
 * @returns 81-character string
 */
export function stringifyBoard(board: number[][]): string {
  if (board.length !== BOARD_SIZE) {
    throw new Error(`Invalid board rows: expected ${BOARD_SIZE}, got ${board.length}`);
  }

  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (board[row]?.length !== BOARD_SIZE) {
      throw new Error(
        `Invalid row ${row} length: expected ${BOARD_SIZE}, got ${board[row]?.length}`
      );
    }
    for (let col = 0; col < BOARD_SIZE; col++) {
      const value = board[row]?.[col];
      if (value === undefined || value < 0 || value > 9) {
        throw new Error(`Invalid value at (${row}, ${col}): ${value}`);
      }
      result += value.toString();
    }
  }
  return result;
}

/**
 * Creates an initial GameBoard from puzzle and solution strings
 * @param puzzle - 81-character puzzle string
 * @param solution - 81-character solution string
 * @returns GameBoard with initialized cell states
 */
export function createGameBoard(puzzle: string, solution: string): GameBoard {
  const puzzleArray = parseBoardString(puzzle);
  const solutionArray = parseBoardString(solution);

  const board: GameBoard = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowArray: CellState[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const puzzleValue = puzzleArray[row]?.[col] ?? 0;
      const isClue = puzzleValue !== 0;
      rowArray.push({
        row,
        column: col,
        value: isClue ? puzzleValue : null,
        isClue,
        isError: false,
        pencilmarks: new Set<number>(),
        isSelected: false,
        isHighlighted: false,
        isSameValue: false,
      });
    }
    board.push(rowArray);
  }
  return board;
}

/**
 * Gets the current board state as a string (user's current progress)
 * @param board - GameBoard
 * @returns 81-character string representing current state
 */
export function getBoardStateString(board: GameBoard): string {
  let result = '';
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row]?.[col];
      result += cell?.value?.toString() ?? '0';
    }
  }
  return result;
}

/**
 * Gets the pencilmarks as a comma-separated string for the solver API
 * @param board - GameBoard
 * @returns Comma-separated string of pencilmarks for each cell
 */
export function getPencilmarksString(board: GameBoard): string {
  const pencilmarks: string[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = board[row]?.[col];
      if (cell && cell.pencilmarks.size > 0) {
        const sorted = Array.from(cell.pencilmarks).sort((a, b) => a - b);
        pencilmarks.push(sorted.join(''));
      } else {
        pencilmarks.push('');
      }
    }
  }
  return pencilmarks.join(',');
}

/**
 * Gets the block index (0-8) for a cell position
 * @param row - Row index (0-8)
 * @param col - Column index (0-8)
 * @returns Block index (0-8)
 */
export function getBlockIndex(row: number, col: number): number {
  const blockRow = Math.floor(row / BLOCK_SIZE);
  const blockCol = Math.floor(col / BLOCK_SIZE);
  return blockRow * BLOCK_SIZE + blockCol;
}

/**
 * Gets all cells in the same row
 * @param row - Row index (0-8)
 * @returns Array of {row, column} positions
 */
export function getRowCells(row: number): Array<{ row: number; column: number }> {
  const cells: Array<{ row: number; column: number }> = [];
  for (let col = 0; col < BOARD_SIZE; col++) {
    cells.push({ row, column: col });
  }
  return cells;
}

/**
 * Gets all cells in the same column
 * @param col - Column index (0-8)
 * @returns Array of {row, column} positions
 */
export function getColumnCells(col: number): Array<{ row: number; column: number }> {
  const cells: Array<{ row: number; column: number }> = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    cells.push({ row, column: col });
  }
  return cells;
}

/**
 * Gets all cells in the same block
 * @param blockIndex - Block index (0-8)
 * @returns Array of {row, column} positions
 */
export function getBlockCells(
  blockIndex: number
): Array<{ row: number; column: number }> {
  const cells: Array<{ row: number; column: number }> = [];
  const blockRow = Math.floor(blockIndex / BLOCK_SIZE);
  const blockCol = blockIndex % BLOCK_SIZE;
  const startRow = blockRow * BLOCK_SIZE;
  const startCol = blockCol * BLOCK_SIZE;

  for (let r = 0; r < BLOCK_SIZE; r++) {
    for (let c = 0; c < BLOCK_SIZE; c++) {
      cells.push({ row: startRow + r, column: startCol + c });
    }
  }
  return cells;
}

/**
 * Gets all related cells (same row, column, or block)
 * @param row - Row index
 * @param col - Column index
 * @returns Array of {row, column} positions (excluding the cell itself)
 */
export function getRelatedCells(
  row: number,
  col: number
): Array<{ row: number; column: number }> {
  const related = new Map<string, { row: number; column: number }>();

  // Add row cells
  for (const cell of getRowCells(row)) {
    if (cell.row !== row || cell.column !== col) {
      related.set(`${cell.row},${cell.column}`, cell);
    }
  }

  // Add column cells
  for (const cell of getColumnCells(col)) {
    if (cell.row !== row || cell.column !== col) {
      related.set(`${cell.row},${cell.column}`, cell);
    }
  }

  // Add block cells
  const blockIndex = getBlockIndex(row, col);
  for (const cell of getBlockCells(blockIndex)) {
    if (cell.row !== row || cell.column !== col) {
      related.set(`${cell.row},${cell.column}`, cell);
    }
  }

  return Array.from(related.values());
}

/**
 * Checks if a value is valid for a cell position (not checking solution, just Sudoku rules)
 * @param board - GameBoard
 * @param row - Row index
 * @param col - Column index
 * @param value - Value to check (1-9)
 * @returns true if the value doesn't conflict with existing values
 */
export function isValidPlacement(
  board: GameBoard,
  row: number,
  col: number,
  value: number
): boolean {
  if (value < 1 || value > 9) {
    return false;
  }

  // Check row
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (c !== col && board[row]?.[c]?.value === value) {
      return false;
    }
  }

  // Check column
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (r !== row && board[r]?.[col]?.value === value) {
      return false;
    }
  }

  // Check block
  const blockStartRow = Math.floor(row / BLOCK_SIZE) * BLOCK_SIZE;
  const blockStartCol = Math.floor(col / BLOCK_SIZE) * BLOCK_SIZE;
  for (let r = blockStartRow; r < blockStartRow + BLOCK_SIZE; r++) {
    for (let c = blockStartCol; c < blockStartCol + BLOCK_SIZE; c++) {
      if ((r !== row || c !== col) && board[r]?.[c]?.value === value) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Clones a GameBoard (deep copy)
 * @param board - GameBoard to clone
 * @returns New GameBoard with copied values
 */
export function cloneBoard(board: GameBoard): GameBoard {
  return board.map(row =>
    row.map(cell => ({
      ...cell,
      pencilmarks: new Set(cell.pencilmarks),
    }))
  );
}

/**
 * Gets all empty cells in the board
 * @param board - GameBoard
 * @returns Array of {row, column} positions
 */
export function getEmptyCells(board: GameBoard): Array<{ row: number; column: number }> {
  const emptyCells: Array<{ row: number; column: number }> = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row]?.[col]?.value === null) {
        emptyCells.push({ row, column: col });
      }
    }
  }
  return emptyCells;
}

/**
 * Counts the number of filled cells
 * @param board - GameBoard
 * @returns Number of filled cells
 */
export function countFilledCells(board: GameBoard): number {
  let count = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row]?.[col]?.value !== null) {
        count++;
      }
    }
  }
  return count;
}
