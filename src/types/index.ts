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

// Display types (for rendering - matches Kotlin renderable)
export type {
  HintArea,
  HintCell,
  HintCellActions,
  HintStep as DisplayHintStep,
  CellDisplayState,
  PencilmarkDisplayState,
  UIColorPalette,
} from './display';

export { ThemeColor, SudokuColor, UIColorLight, UIColorDark } from './display';

// Progress types (for user progress tracking)
export type { CompletedPuzzle, GameStats, UserProgress } from './progress';
export { DEFAULT_PROGRESS, PROGRESS_STORAGE_KEY } from './progress';

// Settings types (for app settings)
export type { DigitDisplay, AppSettings } from './settings';
export { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './settings';

// Subscription types (for subscription management)
export type { Product, Subscription } from './subscription';
export { DEFAULT_SUBSCRIPTION } from './subscription';

// Game persistence types (for saving/loading game state)
export type { SavedGameState, GamePersistenceKey } from './gamePersistence';
export { GAME_STORAGE_PREFIX, getGameStorageKey } from './gamePersistence';
