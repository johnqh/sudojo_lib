/**
 * useSudoku hook - Main game state management
 *
 * Ported from renderable/sudokuschool/interactors/sudoku/SudokuInteractor.kt
 *
 * Handles:
 * - Board initialization with scrambling
 * - Cell selection
 * - Value input (normal and pencil modes)
 * - Error detection
 * - Game completion detection
 * - Undo functionality
 * - Auto pencilmarks generation
 */

import { useCallback, useMemo, useReducer } from 'react';
import {
  SudokuCell,
  SudokuBoard,
  SudokuPlay,
  SudokuPlaySettings,
  SudokuAppSettings,
  PlayingSource,
  DEFAULT_PLAY_SETTINGS,
  DEFAULT_APP_SETTINGS,
  createEmptyBoard,
  rowOf,
  columnOf,
  blockOf,
  getRowIndices,
  getColumnIndices,
  getBlockIndices,
  cellHasError,
} from '../types/sudoku';
import {
  Scrambler,
  NonScrambler,
  ScramblerProtocol,
  scrambleBoard,
  parsePuzzleString,
  cellsToStateString,
  cellsToInputString,
  cellsToPuzzleString,
  cellsToPencilmarksString,
} from '../utils/sudokuScrambler';

// =============================================================================
// State Types
// =============================================================================

interface SudokuState {
  /** Current play state */
  play: SudokuPlay | null;
  /** Original puzzle string (before scrambling) */
  originalPuzzle: string;
  /** Original solution string (before scrambling) */
  originalSolution: string;
  /** Puzzle source */
  source: PlayingSource;
  /** Level UUID if from a level */
  levelUuid: string | null;
  /** Board UUID if applicable */
  boardUuid: string | null;
  /** Undo history stack */
  history: SudokuPlay[];
  /** App settings */
  appSettings: SudokuAppSettings;
  /** Digit mapping from original (1-9) to scrambled (1-9) */
  digitMapping: Map<number, number>;
  /** Reverse digit mapping (scrambled -> original) */
  reverseDigitMapping: Map<number, number>;
}

// =============================================================================
// Actions
// =============================================================================

type SudokuAction =
  | {
      type: 'LOAD_BOARD';
      puzzle: string;
      solution: string;
      scramble: boolean;
      symmetrical: boolean;
      source: PlayingSource;
      levelUuid?: string;
      boardUuid?: string;
    }
  | { type: 'SELECT_CELL'; index: number }
  | { type: 'DESELECT_CELL' }
  | { type: 'INPUT'; value: number | null }
  | { type: 'TOGGLE_PENCIL_MODE' }
  | { type: 'SET_PENCIL_MODE'; enabled: boolean }
  | { type: 'UNDO' }
  | { type: 'ERASE' }
  | { type: 'AUTO_PENCILMARKS' }
  | { type: 'UPDATE_APP_SETTINGS'; settings: Partial<SudokuAppSettings> }
  | { type: 'RESET' };

// =============================================================================
// Initial State
// =============================================================================

function createInitialState(appSettings?: Partial<SudokuAppSettings>): SudokuState {
  return {
    play: null,
    originalPuzzle: '',
    originalSolution: '',
    source: 'LEVEL',
    levelUuid: null,
    boardUuid: null,
    history: [],
    appSettings: { ...DEFAULT_APP_SETTINGS, ...appSettings },
    digitMapping: new Map(),
    reverseDigitMapping: new Map(),
  };
}

// =============================================================================
// Reducer
// =============================================================================

function sudokuReducer(state: SudokuState, action: SudokuAction): SudokuState {
  switch (action.type) {
    case 'LOAD_BOARD': {
      const { puzzle, solution, scramble, symmetrical, source, levelUuid, boardUuid } = action;

      // Parse puzzle and solution into cells
      const cells = parsePuzzleString(puzzle, solution);

      // Apply scrambling if requested
      const scrambler: ScramblerProtocol = scramble ? Scrambler : NonScrambler;
      const scrambleResult = scrambleBoard(scrambler, cells, symmetrical);

      // Check if puzzle is already complete (all cells are clues, or all inputs match solution)
      const isComplete = scrambleResult.cells.every((cell) => {
        if (cell.given !== null) return true; // Clue cells are always correct
        // Non-clue cells need input to match solution
        return cell.input !== null && cell.input === cell.solution;
      });

      // Create initial board
      const board: SudokuBoard = {
        cells: scrambleResult.cells,
        completed: isComplete,
        entering: false,
        enteringError: null,
      };

      // Create initial play state
      const play: SudokuPlay = {
        board,
        settings: { ...DEFAULT_PLAY_SETTINGS },
        selectedIndex: null,
      };

      return {
        ...createInitialState(state.appSettings),
        play,
        originalPuzzle: puzzle,
        originalSolution: solution,
        source,
        levelUuid: levelUuid ?? null,
        boardUuid: boardUuid ?? null,
        digitMapping: scrambleResult.digitMapping,
        reverseDigitMapping: scrambleResult.reverseDigitMapping,
        appSettings: state.appSettings,
      };
    }

    case 'SELECT_CELL': {
      if (!state.play) return state;
      if (state.play.board.completed) return state; // Can't select when completed

      return {
        ...state,
        play: {
          ...state.play,
          selectedIndex: action.index,
        },
      };
    }

    case 'DESELECT_CELL': {
      if (!state.play) return state;

      return {
        ...state,
        play: {
          ...state.play,
          selectedIndex: null,
        },
      };
    }

    case 'INPUT': {
      if (!state.play) return state;
      const { selectedIndex, board, settings } = state.play;
      if (selectedIndex === null) return state;
      if (board.completed) return state;

      const cell = board.cells[selectedIndex];
      if (!cell) return state;

      // Can't modify given (clue) cells
      if (cell.given !== null) return state;

      const { value } = action;

      // Handle pencil marking mode
      if (settings.pencilmarking) {
        if (value === null) return state; // Can't erase in pencil mode with null

        // Toggle pencilmark
        const newPencilmarks = cell.pencilmarks.includes(value)
          ? cell.pencilmarks.filter((p) => p !== value)
          : [...cell.pencilmarks, value].sort((a, b) => a - b);

        const newCell: SudokuCell = {
          ...cell,
          input: null, // Clear input when setting pencilmarks
          pencilmarks: newPencilmarks,
        };

        const newCells = board.cells.map((c, i) =>
          i === selectedIndex ? newCell : c
        );

        const newPlay: SudokuPlay = {
          ...state.play,
          board: { ...board, cells: newCells },
        };

        return {
          ...state,
          history: [...state.history, state.play],
          play: newPlay,
        };
      }

      // Normal input mode
      const row = rowOf(selectedIndex);
      const column = columnOf(selectedIndex);
      const block = blockOf(selectedIndex);

      let completed = true;
      const newCells = board.cells.map((c, i) => {
        if (c.given !== null) return c; // Skip clue cells

        if (i === selectedIndex) {
          // Update the selected cell
          const modified: SudokuCell = {
            ...c,
            input: value,
            pencilmarks: value !== null ? [] : c.pencilmarks, // Clear pencilmarks when setting value
          };

          // Check completion
          if (modified.input !== modified.solution) {
            completed = false;
          }
          return modified;
        }

        // Remove pencilmark from related cells
        if (value !== null) {
          const cellRow = rowOf(i);
          const cellColumn = columnOf(i);
          const cellBlock = blockOf(i);

          if (cellRow === row || cellColumn === column || cellBlock === block) {
            const modified: SudokuCell = {
              ...c,
              pencilmarks: c.pencilmarks.filter((p) => p !== value),
            };
            // Check completion
            if (modified.input !== modified.solution) {
              completed = false;
            }
            return modified;
          }
        }

        // Check completion for unmodified cells
        if (c.input !== c.solution) {
          completed = false;
        }
        return c;
      });

      const newPlay: SudokuPlay = {
        ...state.play,
        board: {
          ...board,
          cells: newCells,
          completed,
        },
        selectedIndex: null, // Deselect after input
      };

      return {
        ...state,
        history: [...state.history, state.play],
        play: newPlay,
      };
    }

    case 'TOGGLE_PENCIL_MODE': {
      if (!state.play) return state;

      return {
        ...state,
        play: {
          ...state.play,
          settings: {
            ...state.play.settings,
            pencilmarking: !state.play.settings.pencilmarking,
          },
        },
      };
    }

    case 'SET_PENCIL_MODE': {
      if (!state.play) return state;

      return {
        ...state,
        play: {
          ...state.play,
          settings: {
            ...state.play.settings,
            pencilmarking: action.enabled,
          },
        },
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;

      const newHistory = [...state.history];
      const previousPlay = newHistory.pop()!;

      return {
        ...state,
        history: newHistory,
        play: previousPlay,
      };
    }

    case 'ERASE': {
      // Erase is equivalent to input(null) in normal mode
      if (!state.play) return state;
      const { selectedIndex, board, settings } = state.play;
      if (selectedIndex === null) return state;
      if (board.completed) return state;

      const cell = board.cells[selectedIndex];
      if (!cell || cell.given !== null) return state;

      // In pencil mode, clear pencilmarks
      if (settings.pencilmarking) {
        if (cell.pencilmarks.length === 0) return state;

        const newCell: SudokuCell = {
          ...cell,
          pencilmarks: [],
        };

        const newCells = board.cells.map((c, i) =>
          i === selectedIndex ? newCell : c
        );

        const newPlay: SudokuPlay = {
          ...state.play,
          board: { ...board, cells: newCells },
        };

        return {
          ...state,
          history: [...state.history, state.play],
          play: newPlay,
        };
      }

      // In normal mode, clear input
      if (cell.input === null) return state;

      const newCell: SudokuCell = {
        ...cell,
        input: null,
      };

      const newCells = board.cells.map((c, i) =>
        i === selectedIndex ? newCell : c
      );

      const newPlay: SudokuPlay = {
        ...state.play,
        board: { ...board, cells: newCells },
      };

      return {
        ...state,
        history: [...state.history, state.play],
        play: newPlay,
      };
    }

    case 'AUTO_PENCILMARKS': {
      if (!state.play) return state;
      const { board } = state.play;
      if (board.completed) return state;

      // Calculate potentials for each row, column, and block
      const rowPotentials = Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      const colPotentials = Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      const blockPotentials = Array.from({ length: 9 }, () => new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));

      // Remove values that are already placed
      board.cells.forEach((cell, index) => {
        const value = cell.given ?? cell.input;
        if (value !== null) {
          rowPotentials[rowOf(index)].delete(value);
          colPotentials[columnOf(index)].delete(value);
          blockPotentials[blockOf(index)].delete(value);
        }
      });

      // Calculate pencilmarks for each empty cell
      const newCells = board.cells.map((cell, index) => {
        const value = cell.given ?? cell.input;
        if (value !== null) {
          // Cell has a value, clear pencilmarks
          return { ...cell, pencilmarks: [] };
        }

        // Intersect row, column, and block potentials
        const row = rowPotentials[rowOf(index)];
        const col = colPotentials[columnOf(index)];
        const block = blockPotentials[blockOf(index)];

        const pencilmarks = Array.from(row)
          .filter((v) => col.has(v) && block.has(v))
          .sort((a, b) => a - b);

        return { ...cell, pencilmarks };
      });

      const newPlay: SudokuPlay = {
        ...state.play,
        board: { ...board, cells: newCells },
        settings: { ...state.play.settings, autoPencilmarks: true },
      };

      return {
        ...state,
        history: [...state.history, state.play],
        play: newPlay,
      };
    }

    case 'UPDATE_APP_SETTINGS': {
      return {
        ...state,
        appSettings: { ...state.appSettings, ...action.settings },
      };
    }

    case 'RESET': {
      if (!state.play) return state;

      // Reset to initial board state (keep original puzzle but clear all inputs)
      const cells = parsePuzzleString(state.originalPuzzle, state.originalSolution);
      const scrambler: ScramblerProtocol = NonScrambler; // Don't re-scramble on reset

      // Re-apply the same scrambling
      let newCells = cells;
      if (state.digitMapping.size > 0) {
        // Use the stored digit mapping to recreate scrambled cells
        const scrambleResult = scrambleBoard(scrambler, cells, false);
        newCells = scrambleResult.cells;
      }

      const board: SudokuBoard = {
        cells: newCells,
        completed: false,
        entering: false,
        enteringError: null,
      };

      const play: SudokuPlay = {
        board,
        settings: { ...DEFAULT_PLAY_SETTINGS },
        selectedIndex: null,
      };

      return {
        ...state,
        play,
        history: [],
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// Hook Options and Result Types
// =============================================================================

export interface UseSudokuOptions {
  /** Initial app settings */
  appSettings?: Partial<SudokuAppSettings>;
}

export interface UseSudokuResult {
  // State
  /** Current play state (null if no board loaded) */
  play: SudokuPlay | null;
  /** Current board (shortcut to play.board) */
  board: SudokuBoard | null;
  /** Currently selected cell */
  selectedCell: SudokuCell | null;
  /** Selected cell index */
  selectedIndex: number | null;
  /** Whether pencil mode is active */
  isPencilMode: boolean;
  /** Whether game is completed */
  isCompleted: boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** App settings */
  appSettings: SudokuAppSettings;
  /** Digit mapping (original -> scrambled) */
  digitMapping: Map<number, number>;
  /** Reverse digit mapping (scrambled -> original) */
  reverseDigitMapping: Map<number, number>;

  // Computed values
  /** Cells with errors (when showErrors is enabled) */
  errorCells: SudokuCell[];
  /** Count of errors */
  errorCount: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Cells with the same value as selected cell */
  sameValueCells: SudokuCell[];
  /** Related cells (same row, column, block) */
  relatedCells: SudokuCell[];

  // Actions
  /** Load a new board */
  loadBoard: (
    puzzle: string,
    solution: string,
    options?: {
      scramble?: boolean;
      symmetrical?: boolean;
      source?: PlayingSource;
      levelUuid?: string;
      boardUuid?: string;
    }
  ) => void;
  /** Select a cell by index */
  selectCell: (index: number) => void;
  /** Select a cell by row and column */
  selectCellAt: (row: number, column: number) => void;
  /** Deselect the current cell */
  deselectCell: () => void;
  /** Input a value (1-9) into the selected cell */
  input: (value: number) => void;
  /** Erase the selected cell */
  erase: () => void;
  /** Toggle pencil mode */
  togglePencilMode: () => void;
  /** Set pencil mode */
  setPencilMode: (enabled: boolean) => void;
  /** Undo the last action */
  undo: () => void;
  /** Generate auto pencilmarks */
  autoPencilmarks: () => void;
  /** Update app settings */
  updateSettings: (settings: Partial<SudokuAppSettings>) => void;
  /** Reset the game to initial state */
  reset: () => void;

  // Utility functions
  /** Get board state as string */
  getBoardString: () => string;
  /** Get original puzzle string */
  getOriginalPuzzle: () => string;
  /** Get input string (user entries only) */
  getInputString: () => string;
  /** Get pencilmarks string */
  getPencilmarksString: () => string;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Main Sudoku game hook
 *
 * @example
 * ```tsx
 * const {
 *   play,
 *   board,
 *   selectedCell,
 *   isPencilMode,
 *   isCompleted,
 *   loadBoard,
 *   selectCell,
 *   input,
 *   togglePencilMode,
 *   undo,
 * } = useSudoku();
 *
 * // Load a puzzle
 * loadBoard(puzzleString, solutionString, { scramble: true });
 *
 * // Select a cell and enter a value
 * selectCell(0);
 * input(5);
 *
 * // Toggle pencil mode
 * togglePencilMode();
 * input(1); // Adds 1 as pencilmark
 * input(2); // Adds 2 as pencilmark
 * input(1); // Removes 1 from pencilmarks
 * ```
 */
export function useSudoku(options: UseSudokuOptions = {}): UseSudokuResult {
  const [state, dispatch] = useReducer(
    sudokuReducer,
    options.appSettings,
    createInitialState
  );

  // Computed values
  const board = state.play?.board ?? null;
  const selectedIndex = state.play?.selectedIndex ?? null;
  const selectedCell = selectedIndex !== null && board ? board.cells[selectedIndex] : null;
  const isPencilMode = state.play?.settings.pencilmarking ?? false;
  const isCompleted = board?.completed ?? false;
  const canUndo = state.history.length > 0;

  const errorCells = useMemo(() => {
    if (!board || !state.appSettings.showErrors) return [];
    return board.cells.filter(cellHasError);
  }, [board, state.appSettings.showErrors]);

  const errorCount = errorCells.length;

  const progress = useMemo(() => {
    if (!board) return 0;
    const totalEmpty = board.cells.filter((c) => c.given === null).length;
    if (totalEmpty === 0) return 100;
    const filled = board.cells.filter(
      (c) => c.given === null && c.input !== null
    ).length;
    return Math.round((filled / totalEmpty) * 100);
  }, [board]);

  const sameValueCells = useMemo(() => {
    if (!board || selectedIndex === null) return [];
    const selectedCell = board.cells[selectedIndex];
    const value = selectedCell.given ?? selectedCell.input;
    if (value === null) return [];
    return board.cells.filter((c, i) => {
      if (i === selectedIndex) return false;
      return (c.given ?? c.input) === value;
    });
  }, [board, selectedIndex]);

  const relatedCells = useMemo(() => {
    if (!board || selectedIndex === null) return [];
    const row = rowOf(selectedIndex);
    const col = columnOf(selectedIndex);
    const block = blockOf(selectedIndex);
    return board.cells.filter((c, i) => {
      if (i === selectedIndex) return false;
      return rowOf(i) === row || columnOf(i) === col || blockOf(i) === block;
    });
  }, [board, selectedIndex]);

  // Actions
  const loadBoard = useCallback(
    (
      puzzle: string,
      solution: string,
      options?: {
        scramble?: boolean;
        symmetrical?: boolean;
        source?: PlayingSource;
        levelUuid?: string;
        boardUuid?: string;
      }
    ) => {
      dispatch({
        type: 'LOAD_BOARD',
        puzzle,
        solution,
        scramble: options?.scramble ?? true,
        symmetrical: options?.symmetrical ?? false,
        source: options?.source ?? 'LEVEL',
        levelUuid: options?.levelUuid,
        boardUuid: options?.boardUuid,
      });
    },
    []
  );

  const selectCell = useCallback((index: number) => {
    dispatch({ type: 'SELECT_CELL', index });
  }, []);

  const selectCellAt = useCallback((row: number, column: number) => {
    dispatch({ type: 'SELECT_CELL', index: row * 9 + column });
  }, []);

  const deselectCell = useCallback(() => {
    dispatch({ type: 'DESELECT_CELL' });
  }, []);

  const input = useCallback((value: number) => {
    dispatch({ type: 'INPUT', value });
  }, []);

  const erase = useCallback(() => {
    dispatch({ type: 'ERASE' });
  }, []);

  const togglePencilMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_PENCIL_MODE' });
  }, []);

  const setPencilMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_PENCIL_MODE', enabled });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const autoPencilmarks = useCallback(() => {
    dispatch({ type: 'AUTO_PENCILMARKS' });
  }, []);

  const updateSettings = useCallback((settings: Partial<SudokuAppSettings>) => {
    dispatch({ type: 'UPDATE_APP_SETTINGS', settings });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Utility functions
  const getBoardString = useCallback(() => {
    if (!board) return '';
    return cellsToStateString(board.cells);
  }, [board]);

  const getOriginalPuzzle = useCallback(() => {
    return state.originalPuzzle;
  }, [state.originalPuzzle]);

  const getInputString = useCallback(() => {
    if (!board) return '';
    return cellsToInputString(board.cells);
  }, [board]);

  const getPencilmarksString = useCallback(() => {
    if (!board) return '';
    return cellsToPencilmarksString(board.cells);
  }, [board]);

  return {
    // State
    play: state.play,
    board,
    selectedCell,
    selectedIndex,
    isPencilMode,
    isCompleted,
    canUndo,
    appSettings: state.appSettings,
    digitMapping: state.digitMapping,
    reverseDigitMapping: state.reverseDigitMapping,

    // Computed
    errorCells,
    errorCount,
    progress,
    sameValueCells,
    relatedCells,

    // Actions
    loadBoard,
    selectCell,
    selectCellAt,
    deselectCell,
    input,
    erase,
    togglePencilMode,
    setPencilMode,
    undo,
    autoPencilmarks,
    updateSettings,
    reset,

    // Utilities
    getBoardString,
    getOriginalPuzzle,
    getInputString,
    getPencilmarksString,
  };
}
