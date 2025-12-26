/**
 * @sudobility/sudojo_lib - Business logic library for Sudojo app
 *
 * This library provides:
 * - Game state management with useSudoku hook (ported from renderable)
 * - Board scrambling utilities
 * - Game validation (mistakes, completion)
 * - Level, technique, and learning data hooks
 * - Teaching/hint integration with solver
 * - Legacy useGame hook for backward compatibility
 */

// Legacy Types (useGame hook)
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
} from './types';

export { DEFAULT_GAME_SETTINGS, DEFAULT_SCRAMBLE_CONFIG } from './types';

// Sudoku Types (useSudoku hook - ported from renderable)
export type {
  SudokuCell,
  SudokuBoard,
  SudokuPlay,
  SudokuPlaySettings,
  SudokuAppSettings,
  SudokuGameState,
  SudokuDisplay,
  PlayingSource,
} from './types';

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
} from './types';

// Display types (for rendering - matches Kotlin renderable)
export type {
  HintArea,
  HintCell,
  HintCellActions,
  DisplayHintStep,
  CellDisplayState,
  PencilmarkDisplayState,
  UIColorPalette,
} from './types';

export { ThemeColor, SudokuColor, UIColorLight, UIColorDark } from './types';

// Progress Types (for user progress tracking)
export type { CompletedPuzzle, GameStats, UserProgress } from './types';
export { DEFAULT_PROGRESS, PROGRESS_STORAGE_KEY } from './types';

// Settings Types (for app settings)
export type { DigitDisplay, AppSettings } from './types';
export { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './types';

// Subscription Types (for subscription management)
export type { Product, Subscription } from './types';
export { DEFAULT_SUBSCRIPTION } from './types';

// Game Persistence Types (for saving/loading game state)
export type { SavedGameState, GamePersistenceKey } from './types';
export { GAME_STORAGE_PREFIX, getGameStorageKey } from './types';

// Legacy Utilities (useGame hook)
export {
  // Board utilities
  BLOCK_SIZE,
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
  // Scramble utilities
  noScramble,
  scrambleBoard,
  // Validation utilities
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
  validateGameState,
} from './utils';

// Sudoku Utilities (useSudoku hook - ported from renderable)
export type { ScramblerProtocol, SudokuScrambleResult } from './utils';
export {
  Scrambler,
  NonScrambler,
  scrambleSudokuBoard,
  parsePuzzleString,
  cellsToPuzzleString,
  cellsToStateString,
  cellsToInputString,
  cellsToPencilmarksString,
} from './utils';

// Presenter utilities (for rendering - matches Kotlin renderable)
export type { PresentBoardOptions } from './utils';
export {
  presentBoard,
  calculateCellHints,
  themeColorToCSS,
  getColorPalette,
  getCellsWithDigit,
  getSelectedDigit,
  computeSelectedDigitCells,
} from './utils';

// Time Utilities
export { formatTime, parseTime } from './utils';

// Progress Utilities
export {
  calculateStats,
  calculateStreak,
  isPuzzleCompleted,
  getCompletedLevelIds,
  getCompletedDailyDates,
} from './utils';

// Auth Utilities
export {
  getFirebaseErrorMessage,
  getFirebaseErrorCode,
  formatFirebaseError,
} from './utils';

// Theme Utilities
export type { ThemePreference, ResolvedTheme } from './utils';
export {
  THEME_STORAGE_KEY,
  getSystemTheme,
  resolveTheme,
  isValidThemePreference,
} from './utils';

// Subscription Utilities
export {
  convertPackageToProduct,
  parseCustomerInfo,
  getPeriodDisplayName,
  isBestValuePlan,
  getRevenueCatErrorMessage,
} from './utils';

// Technique Utilities
export {
  getTechniqueIconUrl,
  TECHNIQUE_TO_HELP_FILE,
  HELP_FILE_TO_TECHNIQUE,
  getHelpFileUrl,
  getTechniqueFromHelpFile,
  extractBodyContent,
} from './utils';

// Hooks
export {
  // Levels
  useLevel,
  useLevels,
  // Techniques
  useTechnique,
  useTechniques,
  // Learning
  useLearning,
  useLearningItem,
  // Game (legacy)
  useGame,
  // Sudoku (ported from renderable)
  useSudoku,
  // Teaching
  useGameTeaching,
  // Game fetching (with auth/subscription handling)
  useLevelGame,
  useDailyGame,
  // Game timer
  useGameTimer,
  // Game persistence
  useGamePersistence,
  useAutoSave,
  // Local storage
  useLocalStorage,
  // Hint
  useHint,
} from './hooks';

export type {
  // Levels
  UseLevelOptions,
  UseLevelResult,
  UseLevelsOptions,
  UseLevelsResult,
  // Techniques
  UseTechniqueOptions,
  UseTechniqueResult,
  UseTechniquesOptions,
  UseTechniquesResult,
  // Learning
  UseLearningItemOptions,
  UseLearningItemResult,
  UseLearningOptions,
  UseLearningResult,
  // Game (legacy)
  UseGameOptions,
  UseGameResult,
  // Sudoku (ported from renderable)
  UseSudokuOptions,
  UseSudokuResult,
  // Teaching
  UseGameTeachingOptions,
  UseGameTeachingResult,
  // Game fetching (with auth/subscription handling)
  UseLevelGameOptions,
  UseLevelGameResult,
  UseDailyGameOptions,
  UseDailyGameResult,
  GameFetchStatus,
  // Game timer
  UseGameTimerOptions,
  UseGameTimerResult,
  // Game persistence
  UseGamePersistenceOptions,
  UseGamePersistenceResult,
  // Hint
  UseHintOptions,
  UseHintResult,
  HintBoardData,
} from './hooks';

// Re-export types from dependencies for convenience
export type {
  Board,
  Challenge,
  Daily,
  Learning,
  Level,
  Technique,
} from '@sudobility/sudojo_types';

export type { SudojoConfig, SudojoAuth } from '@sudobility/sudojo_client';
