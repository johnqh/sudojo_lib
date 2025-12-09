/**
 * Tests for useGame hook
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGame } from './useGame';

// Sample puzzles for testing - valid Sudoku puzzle and solution pair
const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('useGame', () => {
  describe('initialization', () => {
    it('initializes with idle status', () => {
      const { result } = renderHook(() => useGame());

      expect(result.current.state.status).toBe('idle');
      expect(result.current.isActive).toBe(false);
      expect(result.current.isComplete).toBe(false);
    });

    it('initializes with default settings', () => {
      const { result } = renderHook(() => useGame());

      expect(result.current.state.settings.showErrors).toBe(true);
      expect(result.current.state.settings.highlightSameNumbers).toBe(true);
      expect(result.current.state.settings.highlightRelatedCells).toBe(true);
      expect(result.current.state.settings.autoRemovePencilmarks).toBe(true);
    });

    it('accepts custom initial settings', () => {
      const { result } = renderHook(() =>
        useGame({
          maxMistakes: 5,
          initialSettings: { showErrors: false },
        })
      );

      expect(result.current.state.maxMistakes).toBe(5);
      expect(result.current.state.settings.showErrors).toBe(false);
    });
  });

  describe('loadBoard', () => {
    it('loads a board without scrambling', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
      });

      expect(result.current.state.status).toBe('playing');
      expect(result.current.state.scrambledPuzzle).toBe(SAMPLE_PUZZLE);
      expect(result.current.state.scrambledSolution).toBe(SAMPLE_SOLUTION);
      expect(result.current.isActive).toBe(true);
    });

    it('loads a board with scrambling', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: true });
      });

      expect(result.current.state.status).toBe('playing');
      expect(result.current.state.originalPuzzle).toBe(SAMPLE_PUZZLE);
      // Scrambled puzzle may be different
      expect(result.current.state.scrambledPuzzle.length).toBe(81);
    });

    it('resets game state when loading new board', () => {
      const { result } = renderHook(() => useGame());

      // Load first board and make some moves
      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        // Cell (0,2) is empty in puzzle 530070000...
        result.current.selectCell(0, 2);
        result.current.setValue(4);
      });

      expect(result.current.state.undoStack.length).toBe(1);

      // Load new board
      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
      });

      expect(result.current.state.undoStack.length).toBe(0);
      expect(result.current.state.selectedCell).toBe(null);
      expect(result.current.state.mistakeCount).toBe(0);
    });
  });

  describe('cell selection', () => {
    it('selects a cell', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(4, 4);
      });

      expect(result.current.state.selectedCell).toEqual({ row: 4, column: 4 });
      expect(result.current.state.board[4]?.[4]?.isSelected).toBe(true);
    });

    it('highlights related cells', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(4, 4);
      });

      // Same row
      expect(result.current.state.board[4]?.[0]?.isHighlighted).toBe(true);
      // Same column
      expect(result.current.state.board[0]?.[4]?.isHighlighted).toBe(true);
      // Same block
      expect(result.current.state.board[3]?.[3]?.isHighlighted).toBe(true);
    });

    it('deselects cell', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(4, 4);
        result.current.deselectCell();
      });

      expect(result.current.state.selectedCell).toBe(null);
      expect(result.current.state.board[4]?.[4]?.isSelected).toBe(false);
    });
  });

  describe('setValue', () => {
    it('sets value in selected cell', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        // Cell (0,2) is empty in puzzle 530070000...
        result.current.selectCell(0, 2);
        result.current.setValue(4);
      });

      expect(result.current.state.board[0]?.[2]?.value).toBe(4);
    });

    it('does not modify clue cells', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        // Cell (0, 1) is a clue with value 3 (puzzle: 530070000...)
        result.current.selectCell(0, 1);
        result.current.setValue(9);
      });

      expect(result.current.state.board[0]?.[1]?.value).toBe(3);
    });

    it('adds move to undo stack', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
      });

      expect(result.current.state.undoStack.length).toBe(1);
      expect(result.current.canUndo).toBe(true);
    });

    it('clears redo stack on new move', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.setValue(1);
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('marks incorrect values as errors', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(9); // Wrong value (correct is 4)
      });

      expect(result.current.state.board[0]?.[2]?.isError).toBe(true);
      expect(result.current.state.mistakeCount).toBe(1);
    });

    it('clears pencilmarks when setting value', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.togglePencilmark(1);
        result.current.togglePencilmark(2);
        result.current.setValue(4);
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.size).toBe(0);
    });

    it('completes game when all cells correctly filled', () => {
      const { result } = renderHook(() => useGame());

      // Create a puzzle with only one empty cell
      const almostComplete = SAMPLE_SOLUTION.substring(0, 2) + '0' + SAMPLE_SOLUTION.substring(3);
      const correctValue = parseInt(SAMPLE_SOLUTION[2] ?? '0', 10);

      act(() => {
        result.current.loadBoard(almostComplete, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(correctValue);
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.state.status).toBe('completed');
    });
  });

  describe('clearValue', () => {
    it('clears the selected cell value', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.clearValue();
      });

      expect(result.current.state.board[0]?.[2]?.value).toBe(null);
    });

    it('adds move to undo stack', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.clearValue();
      });

      expect(result.current.state.undoStack.length).toBe(2);
    });
  });

  describe('pencilmarks', () => {
    it('toggles pencilmark on', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.togglePencilmark(1);
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.has(1)).toBe(true);
    });

    it('toggles pencilmark off', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.togglePencilmark(1);
        result.current.togglePencilmark(1);
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.has(1)).toBe(false);
    });

    it('does not add pencilmarks to cells with values', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.togglePencilmark(1);
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.size).toBe(0);
    });

    it('sets multiple pencilmarks at once', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setPencilmarks([1, 2, 3]);
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.has(1)).toBe(true);
      expect(result.current.state.board[0]?.[2]?.pencilmarks.has(2)).toBe(true);
      expect(result.current.state.board[0]?.[2]?.pencilmarks.has(3)).toBe(true);
    });

    it('clears pencilmarks', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setPencilmarks([1, 2, 3]);
        result.current.clearPencilmarks();
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.size).toBe(0);
    });
  });

  describe('undo/redo', () => {
    it('undoes the last move', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.undo();
      });

      expect(result.current.state.board[0]?.[2]?.value).toBe(null);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('redoes the last undone move', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.undo();
        result.current.redo();
      });

      expect(result.current.state.board[0]?.[2]?.value).toBe(4);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('undoes pencilmark changes', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.togglePencilmark(1);
        result.current.undo();
      });

      expect(result.current.state.board[0]?.[2]?.pencilmarks.has(1)).toBe(false);
    });
  });

  describe('game controls', () => {
    it('pauses the game', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.pause();
      });

      expect(result.current.state.status).toBe('paused');
      expect(result.current.isActive).toBe(true);
    });

    it('resumes the game', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.state.status).toBe('playing');
    });

    it('resets the game', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(4);
        result.current.reset();
      });

      expect(result.current.state.board[0]?.[2]?.value).toBe(null);
      expect(result.current.state.undoStack.length).toBe(0);
      expect(result.current.state.mistakeCount).toBe(0);
      expect(result.current.state.status).toBe('playing');
    });

    it('tracks elapsed time', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.tick(10);
      });

      expect(result.current.state.elapsedTime).toBe(10);
    });
  });

  describe('settings', () => {
    it('updates settings', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.updateSettings({ showErrors: false });
      });

      expect(result.current.state.settings.showErrors).toBe(false);
    });

    it('clears errors when showErrors disabled', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
        result.current.selectCell(0, 2);
        result.current.setValue(9); // Wrong
      });

      expect(result.current.state.board[0]?.[2]?.isError).toBe(true);

      act(() => {
        result.current.updateSettings({ showErrors: false });
      });

      expect(result.current.state.board[0]?.[2]?.isError).toBe(false);
    });
  });

  describe('game failure', () => {
    it('fails game when max mistakes reached', () => {
      const { result } = renderHook(() => useGame({ maxMistakes: 2 }));

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
      });

      // Find two empty cells and set wrong values
      // Row 0: 530070000 - positions 2, 3, 5, 6, 7, 8 are empty (position 4 is 7, a clue)
      act(() => {
        result.current.selectCell(0, 2);
        result.current.setValue(1); // Wrong (correct is 4)
      });

      expect(result.current.state.mistakeCount).toBe(1);
      expect(result.current.isFailed).toBe(false);

      act(() => {
        result.current.selectCell(0, 3);
        result.current.setValue(1); // Wrong (correct is 6)
      });

      expect(result.current.state.mistakeCount).toBe(2);
      expect(result.current.isFailed).toBe(true);
      expect(result.current.state.status).toBe('failed');
    });
  });

  describe('solver integration helpers', () => {
    it('returns board string', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
      });

      expect(result.current.getBoardString()).toBe(SAMPLE_PUZZLE);
    });

    it('returns original puzzle', () => {
      const { result } = renderHook(() => useGame());

      act(() => {
        result.current.loadBoard(SAMPLE_PUZZLE, SAMPLE_SOLUTION, { scramble: false });
      });

      expect(result.current.getOriginalPuzzle()).toBe(SAMPLE_PUZZLE);
    });
  });
});
