/**
 * Tests for useSudoku hook
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSudoku } from './useSudoku';
import { blockOf, columnOf, rowOf } from '../types/sudoku';

// Valid Sudoku puzzle and solution for testing
const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('useSudoku', () => {
  describe('initialization', () => {
    it('initializes with null play state', () => {
      const { result } = renderHook(() => useSudoku());

      expect(result.current.play).toBe(null);
      expect(result.current.board).toBe(null);
      expect(result.current.isCompleted).toBe(false);
    });

    it('initializes with default app settings', () => {
      const { result } = renderHook(() => useSudoku());

      expect(result.current.appSettings.showErrors).toBe(true);
      expect(result.current.appSettings.enableAnimations).toBe(true);
      expect(result.current.appSettings.symmetrical).toBe(false);
      expect(result.current.appSettings.display).toBe('NUMERIC');
    });

    it('accepts custom initial settings', () => {
      const { result } = renderHook(() =>
        useSudoku({ appSettings: { showErrors: false, display: 'KANJI' } })
      );

      expect(result.current.appSettings.showErrors).toBe(false);
      expect(result.current.appSettings.display).toBe('KANJI');
    });
  });

  describe('loadBoard', () => {
    it('loads a board without scrambling', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.play).not.toBe(null);
      expect(result.current.board).not.toBe(null);
      expect(result.current.board!.cells.length).toBe(81);
      expect(result.current.isCompleted).toBe(false);
    });

    it('preserves clue values correctly', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      // First cell (index 0) has given=5
      expect(result.current.board!.cells[0].given).toBe(5);
      expect(result.current.board!.cells[0].solution).toBe(5);

      // Third cell (index 2) is empty
      expect(result.current.board!.cells[2].given).toBe(null);
      expect(result.current.board!.cells[2].solution).toBe(4);
    });

    it('loads a board with scrambling', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: true,
        });
      });

      expect(result.current.board).not.toBe(null);
      expect(result.current.board!.cells.length).toBe(81);
      expect(result.current.digitMapping.size).toBe(9);
    });

    it('resets state when loading new board', () => {
      const { result } = renderHook(() => useSudoku());

      // Load first board and make a move
      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.canUndo).toBe(true);

      // Load new board
      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.selectedIndex).toBe(null);
    });
  });

  describe('cell selection', () => {
    it('selects a cell by index', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(40); // Center cell
      });

      expect(result.current.selectedIndex).toBe(40);
      expect(result.current.selectedCell).not.toBe(null);
      expect(result.current.selectedCell!.index).toBe(40);
    });

    it('selects a cell by row and column', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCellAt(4, 4); // Row 4, Column 4 = index 40
      });

      expect(result.current.selectedIndex).toBe(40);
    });

    it('deselects cell', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(40);
        result.current.deselectCell();
      });

      expect(result.current.selectedIndex).toBe(null);
      expect(result.current.selectedCell).toBe(null);
    });

    it('computes related cells correctly', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(40); // Center cell (4, 4)
      });

      // Should have related cells in same row, column, and block
      expect(result.current.relatedCells.length).toBeGreaterThan(0);

      // All related cells should be in same row, column, or block
      const selectedRow = rowOf(40);
      const selectedCol = columnOf(40);
      const selectedBlock = blockOf(40);

      result.current.relatedCells.forEach(cell => {
        const isRelated =
          rowOf(cell.index) === selectedRow ||
          columnOf(cell.index) === selectedCol ||
          blockOf(cell.index) === selectedBlock;
        expect(isRelated).toBe(true);
      });
    });
  });

  describe('value input', () => {
    it('sets value in selected empty cell', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        // Cell 2 is empty in puzzle (given=null, solution=4)
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.board!.cells[2].input).toBe(4);
    });

    it('does not modify clue cells', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        // Cell 0 is a clue with given=5
        result.current.selectCell(0);
        result.current.input(9);
      });

      expect(result.current.board!.cells[0].given).toBe(5);
      expect(result.current.board!.cells[0].input).toBe(null);
    });

    it('deselects cell after input', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.selectedIndex).toBe(null);
    });

    it('adds to undo history', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.canUndo).toBe(false);

      act(() => {
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('removes pencilmarks from related cells', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        // First add some pencilmarks to related cells
        result.current.togglePencilMode();
        result.current.selectCell(3); // Same row as cell 2
        result.current.input(4);
        result.current.togglePencilMode();
      });

      // Now cell 3 has pencilmark 4
      expect(result.current.board!.cells[3].pencilmarks).toContain(4);

      act(() => {
        // Input 4 into cell 2 (same row)
        result.current.selectCell(2);
        result.current.input(4);
      });

      // Pencilmark 4 should be removed from cell 3
      expect(result.current.board!.cells[3].pencilmarks).not.toContain(4);
    });
  });

  describe('pencil mode', () => {
    it('toggles pencil mode', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.isPencilMode).toBe(false);

      act(() => {
        result.current.togglePencilMode();
      });

      expect(result.current.isPencilMode).toBe(true);

      act(() => {
        result.current.togglePencilMode();
      });

      expect(result.current.isPencilMode).toBe(false);
    });

    it('sets pencil mode explicitly', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.setPencilMode(true);
      });

      expect(result.current.isPencilMode).toBe(true);
    });

    it('adds pencilmark in pencil mode', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.togglePencilMode();
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.board!.cells[2].pencilmarks).toContain(4);
      expect(result.current.board!.cells[2].input).toBe(null);
    });

    it('toggles pencilmark off when already present', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.togglePencilMode();
        result.current.selectCell(2);
        result.current.input(4); // Add 4
      });

      expect(result.current.board!.cells[2].pencilmarks).toContain(4);

      act(() => {
        result.current.selectCell(2);
        result.current.input(4); // Remove 4
      });

      expect(result.current.board!.cells[2].pencilmarks).not.toContain(4);
    });

    it('supports multiple pencilmarks', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.togglePencilMode();
        result.current.selectCell(2);
        result.current.input(1);
      });

      act(() => {
        result.current.selectCell(2);
        result.current.input(4);
      });

      act(() => {
        result.current.selectCell(2);
        result.current.input(7);
      });

      expect(result.current.board!.cells[2].pencilmarks).toEqual([1, 4, 7]);
    });
  });

  describe('erase', () => {
    it('clears input value', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.board!.cells[2].input).toBe(4);

      act(() => {
        result.current.selectCell(2);
        result.current.erase();
      });

      expect(result.current.board!.cells[2].input).toBe(null);
    });

    it('clears pencilmarks in pencil mode', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.togglePencilMode();
        result.current.selectCell(2);
        result.current.input(1);
      });

      act(() => {
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.board!.cells[2].pencilmarks.length).toBe(2);

      act(() => {
        result.current.selectCell(2);
        result.current.erase();
      });

      expect(result.current.board!.cells[2].pencilmarks.length).toBe(0);
    });
  });

  describe('undo', () => {
    it('undoes the last action', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.board!.cells[2].input).toBe(4);

      act(() => {
        result.current.undo();
      });

      expect(result.current.board!.cells[2].input).toBe(null);
    });

    it('supports multiple undos', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      act(() => {
        result.current.selectCell(3);
        result.current.input(6);
      });

      expect(result.current.board!.cells[2].input).toBe(4);
      expect(result.current.board!.cells[3].input).toBe(6);

      act(() => {
        result.current.undo();
      });

      expect(result.current.board!.cells[2].input).toBe(4);
      expect(result.current.board!.cells[3].input).toBe(null);

      act(() => {
        result.current.undo();
      });

      expect(result.current.board!.cells[2].input).toBe(null);
    });
  });

  describe('error detection', () => {
    it('detects errors when showErrors is enabled', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2); // Solution is 4
        result.current.input(9); // Wrong value
      });

      expect(result.current.errorCount).toBe(1);
      expect(result.current.errorCells.length).toBe(1);
      expect(result.current.errorCells[0].index).toBe(2);
    });

    it('does not detect errors when showErrors is disabled', () => {
      const { result } = renderHook(() =>
        useSudoku({ appSettings: { showErrors: false } })
      );

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(9); // Wrong value
      });

      expect(result.current.errorCount).toBe(0);
      expect(result.current.errorCells.length).toBe(0);
    });
  });

  describe('game completion', () => {
    it('detects completion when all cells are correct', () => {
      const { result } = renderHook(() => useSudoku());

      // Use solution as puzzle so all cells are pre-filled
      act(() => {
        result.current.loadBoard(SAMPLE_SOLUTION, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      // All cells are clues, so game is already complete
      expect(result.current.isCompleted).toBe(true);
    });

    it('is not complete with incorrect values', () => {
      const { result } = renderHook(() => useSudoku());

      // Create a puzzle with one empty cell
      const puzzleWithOneEmpty = `${SAMPLE_SOLUTION.substring(0, 80)}0`;

      act(() => {
        result.current.loadBoard(puzzleWithOneEmpty, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(80);
        result.current.input(1); // Wrong value (solution is 9)
      });

      expect(result.current.isCompleted).toBe(false);
    });
  });

  describe('autoPencilmarks', () => {
    it('generates pencilmarks for empty cells', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.autoPencilmarks();
      });

      // Cell 2 is empty, should have pencilmarks
      expect(
        result.current.board!.cells[2].pencilmarks?.length
      ).toBeGreaterThan(0);

      // Clue cells should not have pencilmarks (null for cells with values)
      expect(result.current.board!.cells[0].pencilmarks).toBeNull();
    });

    it('pencilmarks respect Sudoku constraints', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.autoPencilmarks();
      });

      // Cell 2 (row 0, col 2, block 0) should not contain values
      // that are already in its row, column, or block
      const cell2 = result.current.board!.cells[2];
      const row0Values = [5, 3, 7]; // From puzzle row 0: 530070000

      // Pencilmarks should not contain any of these values
      row0Values.forEach(v => {
        expect(cell2.pencilmarks).not.toContain(v);
      });
    });
  });

  describe('progress', () => {
    it('starts at 0 for new puzzle', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.progress).toBe(0);
    });

    it('increases as cells are filled', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.progress).toBeGreaterThan(0);
    });

    it('is 100 for completed puzzle', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_SOLUTION, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.progress).toBe(100);
    });
  });

  describe('utility functions', () => {
    it('getBoardString returns current state', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.getBoardString()).toBe(SAMPLE_PUZZLE);
    });

    it('getOriginalPuzzle returns original puzzle', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
      });

      expect(result.current.getOriginalPuzzle()).toBe(SAMPLE_PUZZLE);
    });

    it('getInputString returns only user inputs', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      const inputString = result.current.getInputString();
      expect(inputString[2]).toBe('4');
      // Non-input cells should be 0
      expect(inputString[0]).toBe('0');
    });
  });

  describe('settings update', () => {
    it('updates app settings', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.updateSettings({ showErrors: false });
      });

      expect(result.current.appSettings.showErrors).toBe(false);
    });

    it('preserves other settings when updating', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.updateSettings({ showErrors: false });
      });

      expect(result.current.appSettings.enableAnimations).toBe(true);
      expect(result.current.appSettings.display).toBe('NUMERIC');
    });
  });

  describe('reset', () => {
    it('resets game to initial state', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2);
        result.current.input(4);
      });

      expect(result.current.board!.cells[2].input).toBe(4);

      act(() => {
        result.current.reset();
      });

      expect(result.current.board!.cells[2].input).toBe(null);
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe('sameValueCells', () => {
    it('finds cells with same value as selected', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(0); // Cell with given=5
      });

      // Should find other cells with value 5
      expect(result.current.sameValueCells.length).toBeGreaterThan(0);
      result.current.sameValueCells.forEach(cell => {
        expect(cell.given ?? cell.input).toBe(5);
      });
    });

    it('returns empty for empty selected cell', () => {
      const { result } = renderHook(() => useSudoku());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, {
          scramble: false,
        });
        result.current.selectCell(2); // Empty cell
      });

      expect(result.current.sameValueCells.length).toBe(0);
    });
  });
});
