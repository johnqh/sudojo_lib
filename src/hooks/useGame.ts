/**
 * Main game state management hook for Sudoku gameplay
 */

import { useCallback, useMemo, useReducer } from 'react';
import type {
  GameBoard,
  GameMove,
  GameSettings,
  GameState,
  ScrambleConfig,
} from '../types';
import { DEFAULT_GAME_SETTINGS, DEFAULT_SCRAMBLE_CONFIG } from '../types';
import {
  cloneBoard,
  createGameBoard,
  getBoardStateString,
  getPencilmarksString,
} from '../utils/board';
import { noScramble, scrambleBoard } from '../utils/scramble';
import {
  autoRemovePencilmarks,
  clearHighlights,
  isGameComplete,
  isValueCorrect,
  updateCellErrors,
  updateCellHighlights,
} from '../utils/validation';

// ============================================================================
// Action Types
// ============================================================================

type GameAction =
  | {
      type: 'LOAD_BOARD';
      puzzle: string;
      solution: string;
      scramble: boolean;
      scrambleConfig?: ScrambleConfig;
      boardUuid?: string;
      levelUuid?: string;
    }
  | { type: 'SELECT_CELL'; row: number; column: number }
  | { type: 'DESELECT_CELL' }
  | { type: 'SET_VALUE'; value: number }
  | { type: 'CLEAR_VALUE' }
  | { type: 'TOGGLE_PENCILMARK'; value: number }
  | { type: 'SET_PENCILMARKS'; values: number[] }
  | { type: 'CLEAR_PENCILMARKS' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TICK'; seconds: number }
  | { type: 'SET_HINT_MODE'; enabled: boolean };

// ============================================================================
// Initial State
// ============================================================================

const createEmptyBoard = (): GameBoard => {
  const board: GameBoard = [];
  for (let row = 0; row < 9; row++) {
    const rowCells = [];
    for (let col = 0; col < 9; col++) {
      rowCells.push({
        row,
        column: col,
        value: null,
        isClue: false,
        isError: false,
        pencilmarks: new Set<number>(),
        isSelected: false,
        isHighlighted: false,
        isSameValue: false,
      });
    }
    board.push(rowCells);
  }
  return board;
};

const createInitialState = (): GameState => ({
  board: createEmptyBoard(),
  originalPuzzle: '',
  solution: '',
  scrambledPuzzle: '',
  scrambledSolution: '',
  digitMapping: new Map(),
  undoStack: [],
  redoStack: [],
  selectedCell: null,
  settings: { ...DEFAULT_GAME_SETTINGS },
  status: 'idle',
  mistakeCount: 0,
  maxMistakes: 3,
  elapsedTime: 0,
  hintMode: false,
  boardUuid: null,
  levelUuid: null,
});

// ============================================================================
// Reducer
// ============================================================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_BOARD': {
      const {
        puzzle,
        solution,
        scramble,
        scrambleConfig,
        boardUuid,
        levelUuid,
      } = action;

      // Apply scrambling if requested
      const scrambleResult = scramble
        ? scrambleBoard(
            puzzle,
            solution,
            scrambleConfig ?? DEFAULT_SCRAMBLE_CONFIG
          )
        : noScramble(puzzle, solution);

      // Create the game board from scrambled puzzle
      const board = createGameBoard(
        scrambleResult.puzzle,
        scrambleResult.solution
      );

      return {
        ...createInitialState(),
        // Preserve settings and maxMistakes from current state
        settings: state.settings,
        maxMistakes: state.maxMistakes,
        board,
        originalPuzzle: puzzle,
        solution,
        scrambledPuzzle: scrambleResult.puzzle,
        scrambledSolution: scrambleResult.solution,
        digitMapping: scrambleResult.digitMapping,
        status: 'playing',
        boardUuid: boardUuid ?? null,
        levelUuid: levelUuid ?? null,
      };
    }

    case 'SELECT_CELL': {
      const { row, column } = action;
      let newBoard = cloneBoard(state.board);

      newBoard = updateCellHighlights(
        newBoard,
        row,
        column,
        state.settings.highlightRelatedCells,
        state.settings.highlightSameNumbers
      );

      return {
        ...state,
        board: newBoard,
        selectedCell: { row, column },
      };
    }

    case 'DESELECT_CELL': {
      return {
        ...state,
        board: clearHighlights(state.board),
        selectedCell: null,
      };
    }

    case 'SET_VALUE': {
      if (!state.selectedCell || state.status !== 'playing') return state;

      const { row, column } = state.selectedCell;
      const cell = state.board[row]?.[column];
      if (!cell || cell.isClue) return state;

      const { value } = action;
      if (value < 1 || value > 9) return state;

      // Check if this is a mistake
      const isCorrect = isValueCorrect(
        state.scrambledSolution,
        row,
        column,
        value
      );
      const isMistake = !isCorrect && state.settings.showErrors;

      // Create move for undo
      const move: GameMove = {
        row,
        column,
        previousValue: cell.value,
        newValue: value,
        previousPencilmarks: new Set(cell.pencilmarks),
        newPencilmarks: new Set(), // Clear pencilmarks when setting value
        type: 'value',
      };

      // Clone and update board
      let newBoard = cloneBoard(state.board);
      const newCell = newBoard[row]?.[column];
      if (newCell) {
        newCell.value = value;
        newCell.pencilmarks = new Set();
        newCell.isError = isMistake;
      }

      // Auto-remove pencilmarks from related cells
      if (state.settings.autoRemovePencilmarks) {
        newBoard = autoRemovePencilmarks(newBoard, row, column, value);
      }

      // Update highlights
      newBoard = updateCellHighlights(
        newBoard,
        row,
        column,
        state.settings.highlightRelatedCells,
        state.settings.highlightSameNumbers
      );

      // Check for completion
      const complete = isGameComplete(newBoard, state.scrambledSolution);
      const newMistakeCount = state.mistakeCount + (isMistake ? 1 : 0);
      const gameOver =
        state.maxMistakes > 0 && newMistakeCount >= state.maxMistakes;

      return {
        ...state,
        board: newBoard,
        undoStack: [...state.undoStack, move],
        redoStack: [], // Clear redo stack on new move
        mistakeCount: newMistakeCount,
        status: complete ? 'completed' : gameOver ? 'failed' : state.status,
      };
    }

    case 'CLEAR_VALUE': {
      if (!state.selectedCell || state.status !== 'playing') return state;

      const { row, column } = state.selectedCell;
      const cell = state.board[row]?.[column];
      if (!cell || cell.isClue || cell.value === null) return state;

      // Create move for undo
      const move: GameMove = {
        row,
        column,
        previousValue: cell.value,
        newValue: null,
        previousPencilmarks: new Set(cell.pencilmarks),
        newPencilmarks: new Set(cell.pencilmarks),
        type: 'value',
      };

      // Clone and update board
      let newBoard = cloneBoard(state.board);
      const newCell = newBoard[row]?.[column];
      if (newCell) {
        newCell.value = null;
        newCell.isError = false;
      }

      // Update highlights
      newBoard = updateCellHighlights(
        newBoard,
        row,
        column,
        state.settings.highlightRelatedCells,
        state.settings.highlightSameNumbers
      );

      return {
        ...state,
        board: newBoard,
        undoStack: [...state.undoStack, move],
        redoStack: [],
      };
    }

    case 'TOGGLE_PENCILMARK': {
      if (!state.selectedCell || state.status !== 'playing') return state;

      const { row, column } = state.selectedCell;
      const cell = state.board[row]?.[column];
      if (!cell || cell.isClue || cell.value !== null) return state;

      const { value } = action;
      if (value < 1 || value > 9) return state;

      const newPencilmarks = new Set(cell.pencilmarks);
      if (newPencilmarks.has(value)) {
        newPencilmarks.delete(value);
      } else {
        newPencilmarks.add(value);
      }

      // Create move for undo
      const move: GameMove = {
        row,
        column,
        previousValue: null,
        newValue: null,
        previousPencilmarks: new Set(cell.pencilmarks),
        newPencilmarks: new Set(newPencilmarks),
        type: 'pencilmark',
      };

      // Clone and update board
      const newBoard = cloneBoard(state.board);
      const newCell = newBoard[row]?.[column];
      if (newCell) {
        newCell.pencilmarks = newPencilmarks;
      }

      return {
        ...state,
        board: newBoard,
        undoStack: [...state.undoStack, move],
        redoStack: [],
      };
    }

    case 'SET_PENCILMARKS': {
      if (!state.selectedCell || state.status !== 'playing') return state;

      const { row, column } = state.selectedCell;
      const cell = state.board[row]?.[column];
      if (!cell || cell.isClue || cell.value !== null) return state;

      const newPencilmarks = new Set(
        action.values.filter(v => v >= 1 && v <= 9)
      );

      // Create move for undo
      const move: GameMove = {
        row,
        column,
        previousValue: null,
        newValue: null,
        previousPencilmarks: new Set(cell.pencilmarks),
        newPencilmarks: new Set(newPencilmarks),
        type: 'pencilmark',
      };

      // Clone and update board
      const newBoard = cloneBoard(state.board);
      const newCell = newBoard[row]?.[column];
      if (newCell) {
        newCell.pencilmarks = newPencilmarks;
      }

      return {
        ...state,
        board: newBoard,
        undoStack: [...state.undoStack, move],
        redoStack: [],
      };
    }

    case 'CLEAR_PENCILMARKS': {
      if (!state.selectedCell || state.status !== 'playing') return state;

      const { row, column } = state.selectedCell;
      const cell = state.board[row]?.[column];
      if (!cell || cell.isClue || cell.pencilmarks.size === 0) return state;

      // Create move for undo
      const move: GameMove = {
        row,
        column,
        previousValue: cell.value,
        newValue: cell.value,
        previousPencilmarks: new Set(cell.pencilmarks),
        newPencilmarks: new Set(),
        type: 'pencilmark',
      };

      // Clone and update board
      const newBoard = cloneBoard(state.board);
      const newCell = newBoard[row]?.[column];
      if (newCell) {
        newCell.pencilmarks = new Set();
      }

      return {
        ...state,
        board: newBoard,
        undoStack: [...state.undoStack, move],
        redoStack: [],
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0 || state.status !== 'playing')
        return state;

      const move = state.undoStack[state.undoStack.length - 1];
      if (!move) return state;

      // Clone and restore previous state
      let newBoard = cloneBoard(state.board);
      const cell = newBoard[move.row]?.[move.column];
      if (cell) {
        cell.value = move.previousValue;
        cell.pencilmarks = new Set(move.previousPencilmarks);
        cell.isError = false; // Clear error on undo
      }

      // Update errors based on settings
      newBoard = updateCellErrors(
        newBoard,
        state.scrambledSolution,
        state.settings.showErrors
      );

      // Update highlights if there's a selected cell
      if (state.selectedCell) {
        newBoard = updateCellHighlights(
          newBoard,
          state.selectedCell.row,
          state.selectedCell.column,
          state.settings.highlightRelatedCells,
          state.settings.highlightSameNumbers
        );
      }

      return {
        ...state,
        board: newBoard,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, move],
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0 || state.status !== 'playing')
        return state;

      const move = state.redoStack[state.redoStack.length - 1];
      if (!move) return state;

      // Clone and restore next state
      let newBoard = cloneBoard(state.board);
      const cell = newBoard[move.row]?.[move.column];
      if (cell) {
        cell.value = move.newValue;
        cell.pencilmarks = new Set(move.newPencilmarks);
      }

      // Update errors based on settings
      newBoard = updateCellErrors(
        newBoard,
        state.scrambledSolution,
        state.settings.showErrors
      );

      // Update highlights if there's a selected cell
      if (state.selectedCell) {
        newBoard = updateCellHighlights(
          newBoard,
          state.selectedCell.row,
          state.selectedCell.column,
          state.settings.highlightRelatedCells,
          state.settings.highlightSameNumbers
        );
      }

      return {
        ...state,
        board: newBoard,
        undoStack: [...state.undoStack, move],
        redoStack: state.redoStack.slice(0, -1),
      };
    }

    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.settings };

      // If showErrors changed, update error states
      let newBoard = state.board;
      if (action.settings.showErrors !== undefined) {
        newBoard = updateCellErrors(
          cloneBoard(state.board),
          state.scrambledSolution,
          newSettings.showErrors
        );
      }

      // If highlight settings changed and there's a selected cell, update highlights
      if (
        (action.settings.highlightRelatedCells !== undefined ||
          action.settings.highlightSameNumbers !== undefined) &&
        state.selectedCell
      ) {
        newBoard = updateCellHighlights(
          newBoard === state.board ? cloneBoard(state.board) : newBoard,
          state.selectedCell.row,
          state.selectedCell.column,
          newSettings.highlightRelatedCells,
          newSettings.highlightSameNumbers
        );
      }

      return {
        ...state,
        board: newBoard,
        settings: newSettings,
      };
    }

    case 'PAUSE': {
      if (state.status !== 'playing') return state;
      return { ...state, status: 'paused' };
    }

    case 'RESUME': {
      if (state.status !== 'paused') return state;
      return { ...state, status: 'playing' };
    }

    case 'RESET': {
      if (!state.scrambledPuzzle) return state;

      const newBoard = createGameBoard(
        state.scrambledPuzzle,
        state.scrambledSolution
      );

      return {
        ...state,
        board: newBoard,
        undoStack: [],
        redoStack: [],
        selectedCell: null,
        status: 'playing',
        mistakeCount: 0,
        elapsedTime: 0,
        hintMode: false,
      };
    }

    case 'TICK': {
      if (state.status !== 'playing') return state;
      return { ...state, elapsedTime: action.seconds };
    }

    case 'SET_HINT_MODE': {
      return { ...state, hintMode: action.enabled };
    }

    default:
      return state;
  }
}

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseGameOptions {
  /** Maximum mistakes allowed (0 = unlimited) */
  maxMistakes?: number;
  /** Initial settings */
  initialSettings?: Partial<GameSettings>;
}

export interface UseGameResult {
  /** Current game state */
  state: GameState;
  /** Whether the game is active (playing or paused) */
  isActive: boolean;
  /** Whether the game is complete */
  isComplete: boolean;
  /** Whether the game failed (too many mistakes) */
  isFailed: boolean;
  /** Can undo */
  canUndo: boolean;
  /** Can redo */
  canRedo: boolean;

  // Actions
  /** Load a new board */
  loadBoard: (
    puzzle: string,
    solution: string,
    options?: {
      scramble?: boolean;
      scrambleConfig?: ScrambleConfig;
      boardUuid?: string;
      levelUuid?: string;
    }
  ) => void;
  /** Select a cell */
  selectCell: (row: number, column: number) => void;
  /** Deselect the current cell */
  deselectCell: () => void;
  /** Set a value in the selected cell */
  setValue: (value: number) => void;
  /** Clear the value in the selected cell */
  clearValue: () => void;
  /** Toggle a pencilmark in the selected cell */
  togglePencilmark: (value: number) => void;
  /** Set pencilmarks in the selected cell */
  setPencilmarks: (values: number[]) => void;
  /** Clear pencilmarks in the selected cell */
  clearPencilmarks: () => void;
  /** Undo the last move */
  undo: () => void;
  /** Redo the last undone move */
  redo: () => void;
  /** Update game settings */
  updateSettings: (settings: Partial<GameSettings>) => void;
  /** Pause the game */
  pause: () => void;
  /** Resume the game */
  resume: () => void;
  /** Reset the game to initial state */
  reset: () => void;
  /** Update elapsed time */
  tick: (seconds: number) => void;
  /** Set hint mode */
  setHintMode: (enabled: boolean) => void;

  // Computed values for solver integration
  /** Get current board state as string (for solver API) */
  getBoardString: () => string;
  /** Get pencilmarks as string (for solver API) */
  getPencilmarksString: () => string;
  /** Get the original (unscrambled) puzzle string */
  getOriginalPuzzle: () => string;
}

/**
 * Main hook for managing Sudoku game state
 *
 * @param options - Hook options
 * @returns Game state and actions
 *
 * @example
 * ```tsx
 * function GameScreen() {
 *   const {
 *     state,
 *     loadBoard,
 *     selectCell,
 *     setValue,
 *     isComplete,
 *   } = useGame({ maxMistakes: 3 });
 *
 *   useEffect(() => {
 *     // Load a puzzle from the API
 *     loadBoard(puzzle, solution, { scramble: true });
 *   }, []);
 *
 *   if (isComplete) {
 *     return <Congratulations />;
 *   }
 *
 *   return (
 *     <Board
 *       cells={state.board}
 *       onCellPress={(row, col) => selectCell(row, col)}
 *     />
 *   );
 * }
 * ```
 */
export function useGame(options: UseGameOptions = {}): UseGameResult {
  const { maxMistakes = 3, initialSettings } = options;

  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const initial = createInitialState();
    initial.maxMistakes = maxMistakes;
    if (initialSettings) {
      initial.settings = { ...initial.settings, ...initialSettings };
    }
    return initial;
  });

  // Memoized computed values
  const isActive = useMemo(
    () => state.status === 'playing' || state.status === 'paused',
    [state.status]
  );

  const isComplete = useMemo(
    () => state.status === 'completed',
    [state.status]
  );

  const isFailed = useMemo(() => state.status === 'failed', [state.status]);

  const canUndo = useMemo(
    () => state.undoStack.length > 0 && state.status === 'playing',
    [state.undoStack.length, state.status]
  );

  const canRedo = useMemo(
    () => state.redoStack.length > 0 && state.status === 'playing',
    [state.redoStack.length, state.status]
  );

  // Actions
  const loadBoard = useCallback(
    (
      puzzle: string,
      solution: string,
      opts?: {
        scramble?: boolean;
        scrambleConfig?: ScrambleConfig;
        boardUuid?: string;
        levelUuid?: string;
      }
    ) => {
      const action: GameAction = {
        type: 'LOAD_BOARD',
        puzzle,
        solution,
        scramble: opts?.scramble ?? true,
      };
      if (opts?.scrambleConfig !== undefined) {
        (action as { scrambleConfig?: ScrambleConfig }).scrambleConfig =
          opts.scrambleConfig;
      }
      if (opts?.boardUuid !== undefined) {
        (action as { boardUuid?: string }).boardUuid = opts.boardUuid;
      }
      if (opts?.levelUuid !== undefined) {
        (action as { levelUuid?: string }).levelUuid = opts.levelUuid;
      }
      dispatch(action);
    },
    []
  );

  const selectCell = useCallback((row: number, column: number) => {
    dispatch({ type: 'SELECT_CELL', row, column });
  }, []);

  const deselectCell = useCallback(() => {
    dispatch({ type: 'DESELECT_CELL' });
  }, []);

  const setValue = useCallback((value: number) => {
    dispatch({ type: 'SET_VALUE', value });
  }, []);

  const clearValue = useCallback(() => {
    dispatch({ type: 'CLEAR_VALUE' });
  }, []);

  const togglePencilmark = useCallback((value: number) => {
    dispatch({ type: 'TOGGLE_PENCILMARK', value });
  }, []);

  const setPencilmarks = useCallback((values: number[]) => {
    dispatch({ type: 'SET_PENCILMARKS', values });
  }, []);

  const clearPencilmarks = useCallback(() => {
    dispatch({ type: 'CLEAR_PENCILMARKS' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const tick = useCallback((seconds: number) => {
    dispatch({ type: 'TICK', seconds });
  }, []);

  const setHintMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_HINT_MODE', enabled });
  }, []);

  // Computed values for solver integration
  const getBoardString = useCallback(() => {
    return getBoardStateString(state.board);
  }, [state.board]);

  const getPencilmarksStringValue = useCallback(() => {
    return getPencilmarksString(state.board);
  }, [state.board]);

  const getOriginalPuzzle = useCallback(() => {
    return state.scrambledPuzzle;
  }, [state.scrambledPuzzle]);

  return {
    state,
    isActive,
    isComplete,
    isFailed,
    canUndo,
    canRedo,
    loadBoard,
    selectCell,
    deselectCell,
    setValue,
    clearValue,
    togglePencilmark,
    setPencilmarks,
    clearPencilmarks,
    undo,
    redo,
    updateSettings,
    pause,
    resume,
    reset,
    tick,
    setHintMode,
    getBoardString,
    getPencilmarksString: getPencilmarksStringValue,
    getOriginalPuzzle,
  };
}
