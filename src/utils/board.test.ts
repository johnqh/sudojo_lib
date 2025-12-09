/**
 * Tests for board utilities
 */

import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  cloneBoard,
  countFilledCells,
  createGameBoard,
  getBlockCells,
  getBlockIndex,
  getBoardStateString,
  getColumnCells,
  getEmptyCells,
  getPencilmarksString,
  getRelatedCells,
  getRowCells,
  isValidPlacement,
  parseBoardString,
  stringifyBoard,
  TOTAL_CELLS,
} from './board';

// Sample puzzles for testing - valid Sudoku puzzle and solution pair
const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('parseBoardString', () => {
  it('parses a valid 81-character puzzle string', () => {
    const board = parseBoardString(SAMPLE_PUZZLE);

    expect(board).toHaveLength(BOARD_SIZE);
    expect(board[0]).toHaveLength(BOARD_SIZE);

    // Check first row: 5 3 0 0 7 0 0 0 0
    expect(board[0]?.[0]).toBe(5);
    expect(board[0]?.[1]).toBe(3);
    expect(board[0]?.[2]).toBe(0);
    expect(board[0]?.[4]).toBe(7);
  });

  it('throws error for invalid length', () => {
    expect(() => parseBoardString('123')).toThrow('Invalid board string length');
    expect(() => parseBoardString('')).toThrow('Invalid board string length');
  });

  it('throws error for invalid characters', () => {
    const invalidPuzzle = 'X' + SAMPLE_PUZZLE.substring(1);
    expect(() => parseBoardString(invalidPuzzle)).toThrow('Invalid character');
  });

  it('handles dots as empty cells', () => {
    const puzzleWithDots = SAMPLE_PUZZLE.replace(/0/g, '.');
    const board = parseBoardString(puzzleWithDots);
    // Cell (0,2) is empty in the puzzle (was 0, now .)
    expect(board[0]?.[2]).toBe(0);
  });
});

describe('stringifyBoard', () => {
  it('converts a 2D array back to string', () => {
    const board = parseBoardString(SAMPLE_PUZZLE);
    const result = stringifyBoard(board);
    expect(result).toBe(SAMPLE_PUZZLE);
  });

  it('throws error for invalid board size', () => {
    expect(() => stringifyBoard([])).toThrow('Invalid board rows');
    expect(() => stringifyBoard([[1, 2, 3]])).toThrow('Invalid board rows');
  });
});

describe('createGameBoard', () => {
  it('creates a GameBoard from puzzle and solution strings', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    expect(board).toHaveLength(BOARD_SIZE);
    expect(board[0]).toHaveLength(BOARD_SIZE);

    // Check a clue cell (first row: 530070000 - position 0 has value 5)
    const clueCell = board[0]?.[0];
    expect(clueCell?.value).toBe(5);
    expect(clueCell?.isClue).toBe(true);
    expect(clueCell?.isError).toBe(false);
    expect(clueCell?.pencilmarks.size).toBe(0);

    // Check an empty cell (position 2 is empty)
    const emptyCell = board[0]?.[2];
    expect(emptyCell?.value).toBe(null);
    expect(emptyCell?.isClue).toBe(false);
  });

  it('sets correct row and column for each cell', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row]?.[col];
        expect(cell?.row).toBe(row);
        expect(cell?.column).toBe(col);
      }
    }
  });
});

describe('getBoardStateString', () => {
  it('returns the current board state as a string', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const stateString = getBoardStateString(board);

    // Should be the puzzle string since no values have been set
    expect(stateString).toBe(SAMPLE_PUZZLE);
  });

  it('reflects user-entered values', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const cell = board[0]?.[0];
    if (cell) {
      cell.value = 3;
    }

    const stateString = getBoardStateString(board);
    expect(stateString[0]).toBe('3');
  });
});

describe('getPencilmarksString', () => {
  it('returns empty pencilmarks for fresh board', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const pencilmarks = getPencilmarksString(board);

    // Should be 81 commas (empty values)
    expect(pencilmarks.split(',')).toHaveLength(TOTAL_CELLS);
  });

  it('includes pencilmarks when set', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const cell = board[0]?.[0];
    if (cell) {
      cell.pencilmarks = new Set([1, 2, 3]);
    }

    const pencilmarks = getPencilmarksString(board);
    const parts = pencilmarks.split(',');
    expect(parts[0]).toBe('123');
  });
});

describe('getBlockIndex', () => {
  it('returns correct block index for each cell', () => {
    // Top-left block (0)
    expect(getBlockIndex(0, 0)).toBe(0);
    expect(getBlockIndex(2, 2)).toBe(0);

    // Top-middle block (1)
    expect(getBlockIndex(0, 3)).toBe(1);
    expect(getBlockIndex(2, 5)).toBe(1);

    // Center block (4)
    expect(getBlockIndex(4, 4)).toBe(4);

    // Bottom-right block (8)
    expect(getBlockIndex(8, 8)).toBe(8);
  });
});

describe('getRowCells', () => {
  it('returns all cells in a row', () => {
    const cells = getRowCells(3);

    expect(cells).toHaveLength(BOARD_SIZE);
    expect(cells.every(c => c.row === 3)).toBe(true);
    expect(cells.map(c => c.column)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('getColumnCells', () => {
  it('returns all cells in a column', () => {
    const cells = getColumnCells(5);

    expect(cells).toHaveLength(BOARD_SIZE);
    expect(cells.every(c => c.column === 5)).toBe(true);
    expect(cells.map(c => c.row)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('getBlockCells', () => {
  it('returns all cells in a block', () => {
    const cells = getBlockCells(4); // Center block

    expect(cells).toHaveLength(9);
    expect(cells).toContainEqual({ row: 3, column: 3 });
    expect(cells).toContainEqual({ row: 4, column: 4 });
    expect(cells).toContainEqual({ row: 5, column: 5 });
  });
});

describe('getRelatedCells', () => {
  it('returns all related cells (excluding the cell itself)', () => {
    const related = getRelatedCells(4, 4);

    // Should include row, column, and block cells (minus duplicates and self)
    // Row: 8 cells, Column: 8 cells, Block: 8 cells, minus overlaps
    expect(related.length).toBeGreaterThan(0);
    expect(related.find(c => c.row === 4 && c.column === 4)).toBeUndefined();

    // Should include cells from same row
    expect(related.find(c => c.row === 4 && c.column === 0)).toBeDefined();

    // Should include cells from same column
    expect(related.find(c => c.row === 0 && c.column === 4)).toBeDefined();

    // Should include cells from same block
    expect(related.find(c => c.row === 3 && c.column === 3)).toBeDefined();
  });
});

describe('isValidPlacement', () => {
  it('returns true for valid placement', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Row 0: 530070000 - position 2 is empty, correct value is 4
    expect(isValidPlacement(board, 0, 2, 4)).toBe(true);
  });

  it('returns false for conflict in same row', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Row 0: 530070000 - 5 is already in row 0 at position 0
    expect(isValidPlacement(board, 0, 2, 5)).toBe(false);
  });

  it('returns false for conflict in same column', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Column 2: has 8 at row 2 (098000060)
    expect(isValidPlacement(board, 0, 2, 8)).toBe(false);
  });

  it('returns false for conflict in same block', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    // Block 0 contains: 530, 600, 098 - so 5, 3, 6, 9, 8 are used
    // Position (0,2) is in block 0, so 6 would conflict
    expect(isValidPlacement(board, 0, 2, 6)).toBe(false);
  });

  it('returns false for invalid value', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    expect(isValidPlacement(board, 0, 2, 0)).toBe(false);
    expect(isValidPlacement(board, 0, 2, 10)).toBe(false);
  });
});

describe('cloneBoard', () => {
  it('creates a deep copy of the board', () => {
    const original = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const cloned = cloneBoard(original);

    // Modify original - use an empty cell (position 0,2)
    const cell = original[0]?.[2];
    if (cell) {
      cell.value = 9;
      cell.pencilmarks.add(5);
    }

    // Cloned should not be affected
    expect(cloned[0]?.[2]?.value).toBe(null);
    expect(cloned[0]?.[2]?.pencilmarks.has(5)).toBe(false);
  });
});

describe('getEmptyCells', () => {
  it('returns all empty cells', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const emptyCells = getEmptyCells(board);

    // Count zeros in puzzle
    const expectedEmpty = SAMPLE_PUZZLE.split('').filter(c => c === '0').length;
    expect(emptyCells).toHaveLength(expectedEmpty);
  });
});

describe('countFilledCells', () => {
  it('counts filled cells correctly', () => {
    const board = createGameBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
    const filled = countFilledCells(board);

    // Count non-zeros in puzzle
    const expectedFilled = SAMPLE_PUZZLE.split('').filter(c => c !== '0').length;
    expect(filled).toBe(expectedFilled);
  });
});
