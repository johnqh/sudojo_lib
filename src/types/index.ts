/**
 * Type exports for Sudojo library
 */

// Legacy game types (useGame hook)
export type {
  CellPosition,
  CellState,
  GameBoard,
  GameHint,
  GameMove,
  GameSettings,
  GameState,
  GameStatus,
  ScrambleConfig,
  ScrambleResult,
  TeachingState,
} from './game';

export { DEFAULT_GAME_SETTINGS, DEFAULT_SCRAMBLE_CONFIG } from './game';

// Sudoku types (useSudoku hook - ported from renderable)
export type {
  SudokuCell,
  SudokuBoard,
  SudokuPlay,
  SudokuPlaySettings,
  SudokuAppSettings,
  SudokuGameState,
  SudokuDisplay,
  PlayingSource,
} from './sudoku';

export {
  DEFAULT_PLAY_SETTINGS,
  DEFAULT_APP_SETTINGS,
  createEmptyCell,
  createEmptyBoard,
  cellHasError,
  rowOf,
  columnOf,
  blockOf,
  cellIndex,
  getRowIndices,
  getColumnIndices,
  getBlockIndices,
  getRelatedIndices,
} from './sudoku';
