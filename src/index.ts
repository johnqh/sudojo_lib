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
 *
 * ## Hook Architecture
 *
 * The hooks form a layered composition pattern:
 *
 * **Data hooks** (fetch and cache server data):
 * - `useLevels` / `useLevel` - Difficulty level data
 * - `useTechniques` / `useTechnique` - Solving technique data
 * - `useLearning` / `useLearningItem` - Learning material data
 *
 * **Game fetching hooks** (handle auth, subscription, and puzzle loading):
 * - `useLevelGame` - Fetch a random board for a specific level
 * - `useDailyGame` - Fetch today's daily puzzle
 *
 * **Game state hooks** (manage board state and user interaction):
 * - `useSudoku` - Primary game state (flat 81-cell array, modern API)
 * - `useGame` - Legacy game state (2D array, deprecated)
 * - `useBoardEntry` - Manual puzzle entry mode
 *
 * **Feature hooks** (provide specific game features):
 * - `useHint` - Solver integration for hints (matches Kotlin HintInteractor)
 * - `useGameTeaching` - Step-by-step teaching with solver
 * - `useGameTimer` - Elapsed time tracking via ref (no re-renders)
 * - `useGamePersistence` / `useAutoSave` - localStorage game save/restore
 * - `useLocalStorage` - Generic typed localStorage hook
 *
 * **Orchestration hooks** (combine multiple hooks for app-level features):
 * - `useGamePlay` - Current game management with Zustand store (daily/play slots)
 * - `useGameSession` - Server-side gamification (start/finish, points, badges)
 *
 * ## Migration Guide
 *
 * Legacy exports (prefixed with "Legacy" comments) use the 2D `GameBoard` type
 * from `useGame`. New code should use `useSudoku` with its flat 81-cell
 * `SudokuBoard` type. See `@deprecated` tags on legacy exports.
 */

// ============================================================================
// Legacy Types (useGame hook)
// ============================================================================

/**
 * @deprecated Use `SudokuCell` instead. Part of the legacy `useGame` 2D board API.
 */
export type {
  CellPosition,
  CellState,
  GameBoard,
  GameHint,
  GameMove,
  GameSettings,
  GameState,
  GameStatus,
  TeachingState,
} from './types';

/** @deprecated Use `DEFAULT_APP_SETTINGS` / `DEFAULT_PLAY_SETTINGS` instead. */
export { DEFAULT_GAME_SETTINGS } from './types';

// ============================================================================
// Sudoku Types (useSudoku hook - ported from renderable)
// ============================================================================

/** Core Sudoku cell and board types using flat 81-cell array representation. */
export type {
  /** A single cell in the Sudoku board (indexed 0-80). */
  SudokuCell,
  /** The Sudoku board containing all 81 cells. */
  SudokuBoard,
  /** Current play state including board, settings, and selection. */
  SudokuPlay,
  /** Session settings that can change during play (pencilmarking, auto-pencilmarks). */
  SudokuPlaySettings,
  /** App-level settings persisted across sessions (showErrors, display format). */
  SudokuAppSettings,
  /** Full game state including source, history, and digit mapping. */
  SudokuGameState,
  /** Display modes for Sudoku digits ('NUMERIC' | 'KANJI' | 'COLORS' | 'EMOJIS'). */
  SudokuDisplay,
  /** Source of the puzzle ('DAILY' | 'CHALLENGE' | 'LEVEL' | 'ENTERED'). */
  PlayingSource,
} from './types';

/** Default settings and cell/board helper functions for the modern Sudoku API. */
export {
  /** Default session play settings (pencilmarking off, auto-pencilmarks off). */
  DEFAULT_PLAY_SETTINGS,
  /** Default app settings (showErrors on, animations on, numeric display). */
  DEFAULT_APP_SETTINGS,
  /** Create an empty SudokuCell at the given index. */
  createEmptyCell,
  /** Create an empty 81-cell SudokuBoard. */
  createEmptyBoard,
  /** Check if a cell has an error (input does not match solution). */
  cellHasError,
  /** Get row index (0-8) from cell index (0-80). */
  rowOf,
  /** Get column index (0-8) from cell index (0-80). */
  columnOf,
  /** Get block index (0-8) from cell index (0-80). */
  blockOf,
  /** Get cell index (0-80) from row and column. */
  cellIndex,
  /** Get all cell indices in the same row as the given index. */
  getRowIndices,
  /** Get all cell indices in the same column as the given index. */
  getColumnIndices,
  /** Get all cell indices in the same block as the given index. */
  getBlockIndices,
  /** Get all related cell indices (same row, column, or block) excluding the cell itself. */
  getRelatedIndices,
} from './types';

// ============================================================================
// Display types (for rendering - matches Kotlin renderable)
// ============================================================================

/** Display and hint visualization types matching the Kotlin renderable layer. */
export type {
  /** Highlighted area in a hint (row, column, or block). */
  HintArea,
  /** Cell display information in a hint step. */
  HintCell,
  /** Actions to perform on a cell during hint visualization. */
  HintCellActions,
  /** A single hint step with title, text, areas, cells, links, and groups. */
  DisplayHintStep,
  /** Complete display state for a single cell (colors, digit, pencilmarks). */
  CellDisplayState,
  /** Display state for a single pencilmark (digit and color). */
  PencilmarkDisplayState,
  /** UI color palette with system colors for light or dark mode. */
  UIColorPalette,
  /** Link type for chain visualization ('strong' | 'weak'). */
  LinkType,
  /** A link between two cells in a chain (display format). */
  DisplayLink,
  /** A group of cells for pattern visualization (display format). */
  DisplayCellGroup,
} from './types';

/** Theme and color enums plus predefined light/dark palettes. */
export { ThemeColor, SudokuColor, UIColorLight, UIColorDark } from './types';

// ============================================================================
// Progress Types (for user progress tracking)
// ============================================================================

/** Types for tracking user puzzle completion and statistics. */
export type {
  /** Record of a completed puzzle (id, type, time). */
  CompletedPuzzle,
  /** Computed game statistics (best times, averages). */
  GameStats,
  /** Full user progress data (completed puzzles, streak, stats). */
  UserProgress,
} from './types';

export {
  /** Default empty user progress state. */
  DEFAULT_PROGRESS,
  /** localStorage key for progress data ('sudojo-progress'). */
  PROGRESS_STORAGE_KEY,
} from './types';

// ============================================================================
// Settings Types (for app settings)
// ============================================================================

/** Types for application settings. */
export type {
  /** Digit display format ('numeric' | 'kanji' | 'emojis'). */
  DigitDisplay,
  /** Application settings (showErrors, symmetrical, display). */
  AppSettings,
} from './types';

export {
  /** Default application settings. */
  DEFAULT_SETTINGS,
  /** localStorage key for settings ('sudojo-settings'). */
  SETTINGS_STORAGE_KEY,
} from './types';

// ============================================================================
// Subscription Types (for subscription management)
// ============================================================================

/** Types for RevenueCat subscription management. */
export type {
  /** Subscription product information (price, period, trial). */
  Product,
  /** User subscription status (active, expiration, renewal). */
  Subscription,
} from './types';

/** Default inactive subscription state. */
export { DEFAULT_SUBSCRIPTION } from './types';

// ============================================================================
// Game Persistence Types (for saving/loading game state)
// ============================================================================

/** Types for saving and restoring game progress to localStorage. */
export type {
  /** Saved game state (input, pencilmarks, mode, timestamp). */
  SavedGameState,
  /** Key identifying a game to persist (type + id). */
  GamePersistenceKey,
} from './types';

export {
  /** localStorage key prefix for game saves ('sudojo_game_'). */
  GAME_STORAGE_PREFIX,
  /** Generate a localStorage key from a GamePersistenceKey. */
  getGameStorageKey,
} from './types';

// ============================================================================
// Current Game Types (for current game feature)
// ============================================================================

/** Types for the Zustand-backed current game store. */
export type {
  /** Source of the current game ('daily' | 'level' | 'entered'). */
  GameSource,
  /** Navigation metadata for resuming a game (date, level, board info). */
  CurrentGameMeta,
  /** Full current game state stored in Zustand (puzzle, progress, timing). */
  CurrentGame,
  /** Which store slot a game lives in ('daily' | 'play'). */
  GameSlot,
} from './types';

// ============================================================================
// Legacy Utilities (useGame hook)
// ============================================================================

/**
 * @deprecated These utilities work with the legacy 2D `GameBoard` type.
 * For new code, use `useSudoku` with its flat 81-cell board and the
 * scrambler/presenter utilities below.
 */
export {
  /** @deprecated Clone a 2D GameBoard. Use useSudoku's immutable state instead. */
  cloneBoard,
  /** @deprecated Count filled cells in a 2D GameBoard. */
  countFilledCells,
  /** @deprecated Create a 2D GameBoard from puzzle/solution strings. */
  createGameBoard,
  /** @deprecated Get cells in a block by block index (2D API). */
  getBlockCells,
  /** @deprecated Get block index from row/col (2D API). Use blockOf() instead. */
  getBlockIndex,
  /** @deprecated Get 2D board state as string. Use cellsToStateString() instead. */
  getBoardStateString,
  /** @deprecated Get cells in a column (2D API). Use getColumnIndices() instead. */
  getColumnCells,
  /** @deprecated Get empty cells from a 2D GameBoard. */
  getEmptyCells,
  /** @deprecated Get pencilmarks string from 2D GameBoard. Use cellsToPencilmarksString() instead. */
  getPencilmarksString,
  /** @deprecated Get related cells (2D API). Use getRelatedIndices() instead. */
  getRelatedCells,
  /** @deprecated Get cells in a row (2D API). Use getRowIndices() instead. */
  getRowCells,
  /** @deprecated Check if placement is valid (2D API). */
  isValidPlacement,
  /** @deprecated Auto-remove pencilmarks (2D API). useSudoku handles this internally. */
  autoRemovePencilmarks,
  /** @deprecated Clear highlights (2D API). useSudoku handles this via presentBoard(). */
  clearHighlights,
  /** @deprecated Count mistakes (2D API). Use useSudoku's errorCount instead. */
  countMistakes,
  /** @deprecated Get incorrect cells (2D API). Use useSudoku's errorCells instead. */
  getIncorrectCells,
  /** @deprecated Get progress percentage (2D API). Use useSudoku's progress instead. */
  getProgressPercentage,
  /** @deprecated Check if board is filled (2D API). */
  isBoardFilled,
  /** @deprecated Check if cell is correct (2D API). Use cellHasError() instead. */
  isCellCorrect,
  /** @deprecated Check if game is complete (2D API). Use useSudoku's isCompleted instead. */
  isGameComplete,
  /** @deprecated Check if value is correct (2D API). */
  isValueCorrect,
  /** @deprecated Update cell errors (2D API). useSudoku handles this automatically. */
  updateCellErrors,
  /** @deprecated Update cell highlights (2D API). Use presentBoard() instead. */
  updateCellHighlights,
  /** @deprecated Validate entire game state (2D API). */
  validateGameState,
} from './utils';

// ============================================================================
// Sudoku Utilities (useSudoku hook - ported from renderable)
// ============================================================================

/** Types for board scrambling. */
export type {
  /** Protocol for board scramblers (Scrambler and NonScrambler implement this). */
  ScramblerProtocol,
  /** Result of scrambling a board (cells + digit mappings). */
  SudokuScrambleResult,
} from './utils';

/** Board scrambling and puzzle string conversion utilities. */
export {
  /** Scrambler that permutes rows, columns, and digits to create unique puzzles. */
  Scrambler,
  /** Identity scrambler that returns the board unchanged. */
  NonScrambler,
  /** Scramble a board using a ScramblerProtocol implementation. */
  scrambleSudokuBoard,
  /** Parse an 81-character puzzle string into SudokuCell array. */
  parsePuzzleString,
  /** Convert SudokuCell array to puzzle string (given values only). */
  cellsToPuzzleString,
  /** Convert SudokuCell array to state string (given + input values). */
  cellsToStateString,
  /** Convert SudokuCell array to input-only string. */
  cellsToInputString,
  /** Convert SudokuCell array to comma-separated pencilmarks string. */
  cellsToPencilmarksString,
} from './utils';

// ============================================================================
// Presenter utilities (for rendering - matches Kotlin renderable)
// ============================================================================

/** Options type for the presentBoard function. */
export type {
  /** Options for generating cell display states (cells, selection, errors, hints). */
  PresentBoardOptions,
} from './utils';

/** Board presentation and color utilities matching the Kotlin renderable layer. */
export {
  /** Generate display states for all 81 cells (colors, digits, pencilmarks, hints). */
  presentBoard,
  /** Process hint step areas and cells into a map of cell hints by index. */
  calculateCellHints,
  /** Convert a ThemeColor to an actual CSS color string using a palette. */
  themeColorToCSS,
  /** Get the UIColorPalette for light or dark mode. */
  getColorPalette,
  /** Get indices of cells containing a specific digit (given or input). */
  getCellsWithDigit,
  /** Get the digit to highlight based on the selected cell (given or correct input). */
  getSelectedDigit,
  /** Compute the set of cell indices with the same digit as the selected cell. */
  computeSelectedDigitCells,
  /** Convert a solver link (row/col pairs) to display format (flat indices). */
  convertSolverLink,
  /** Convert a solver cell group to display format with ThemeColor. */
  convertSolverCellGroup,
  /** Convert SudokuColor enum to ThemeColor enum. */
  sudokuColorToTheme,
} from './utils';

// ============================================================================
// Time Utilities
// ============================================================================

/** Time formatting and parsing utilities. */
export {
  /** Format seconds into MM:SS or HH:MM:SS string. */
  formatTime,
  /** Parse a MM:SS or HH:MM:SS string back to total seconds. */
  parseTime,
} from './utils';

// ============================================================================
// Progress Utilities
// ============================================================================

/** User progress calculation utilities. */
export {
  /** Calculate game statistics (best times, averages) from completed puzzles. */
  calculateStats,
  /** Calculate current daily streak from completion history. */
  calculateStreak,
  /** Check if a specific puzzle (by type and id) has been completed. */
  isPuzzleCompleted,
  /** Get all completed level IDs from completion history. */
  getCompletedLevelIds,
  /** Get all completed daily dates (YYYY-MM-DD) from completion history. */
  getCompletedDailyDates,
} from './utils';

// ============================================================================
// Theme Utilities
// ============================================================================

/** Types for theme preference management. */
export type {
  /** Theme preference: 'light' | 'dark' | 'system'. */
  ThemePreference,
  /** Resolved theme without system option: 'light' | 'dark'. */
  ResolvedTheme,
} from './utils';

/** Theme detection and resolution utilities. */
export {
  /** localStorage key for theme preference ('sudojo-theme'). */
  THEME_STORAGE_KEY,
  /** Detect the system color scheme preference (light/dark). */
  getSystemTheme,
  /** Resolve a ThemePreference to an actual theme using the system theme. */
  resolveTheme,
  /** Type guard: check if a value is a valid ThemePreference. */
  isValidThemePreference,
} from './utils';

// ============================================================================
// Subscription Utilities
// ============================================================================

/** RevenueCat subscription conversion and display utilities. */
export {
  /** Convert a RevenueCat package to a Product domain model. */
  convertPackageToProduct,
  /** Parse RevenueCat CustomerInfo into a Subscription domain model. */
  parseCustomerInfo,
  /** Get human-readable name for an ISO 8601 subscription period (e.g., 'P1M' -> 'Monthly'). */
  getPeriodDisplayName,
  /** Check if a subscription period is the "best value" option (annual plans). */
  isBestValuePlan,
  /** Get a user-friendly error message for a RevenueCat error code. */
  getRevenueCatErrorMessage,
} from './utils';

// ============================================================================
// Technique Utilities
// ============================================================================

/** Technique display utilities. */
export {
  /** Get the icon URL for a solving technique by its path slug. */
  getTechniqueIconUrl,
} from './utils';

// ============================================================================
// Hint Explanation Utilities
// ============================================================================

/** Hint explanation generation utilities for teaching users solving techniques. */
export {
  /** Generate a detailed explanation for a hint step based on the technique. */
  generateDetailedExplanation,
  /** Get a short action summary for a hint step (e.g., 'Place 5 in R1C3'). */
  getHintActionSummary,
} from './utils';

// ============================================================================
// Localized Hint Utilities
// ============================================================================

/** Types for hint text localization. */
export type {
  /** Translation function compatible with i18next's `t` function. */
  TranslateFunction,
} from './utils';

/** Hint localization utilities. */
export {
  /** Get localized text for a hint step using a translation function. */
  getLocalizedHintText,
} from './utils';

// ============================================================================
// i18n Key Utilities
// ============================================================================

/** Internationalization key generation and localization utilities. */
export {
  /** Get i18n key for a belt name (e.g., 'belts.1.name'). */
  getBeltKey,
  /** Get localized belt name using a translation function. */
  getLocalizedBeltName,
  /** Get i18n key for a belt label (e.g., 'belts.1.label'). */
  getBeltLabelKey,
  /** Get localized belt label (e.g., 'White Belt'). */
  getLocalizedBeltLabel,
  /** Get i18n key for a level title (e.g., 'levels.3'). */
  getLevelKey,
  /** Get localized level title using a translation function. */
  getLocalizedLevelTitle,
  /** Get i18n key for a technique name (e.g., 'techniques.full-house.title'). */
  getTechniqueKey,
  /** Get localized technique name using a translation function. */
  getLocalizedTechniqueName,
} from './utils';

// ============================================================================
// Digit Display Utilities
// ============================================================================

/** Digit display format conversion. */
export {
  /** Convert a digit (1-9) to its display string based on the format (numeric, kanji, emojis). */
  displayDigit,
} from './utils';

// ============================================================================
// Hooks
// ============================================================================

export {
  // Data hooks
  /** Fetch a single difficulty level by number. */
  useLevel,
  /** Fetch all difficulty levels with sorting and filtering utilities. */
  useLevels,
  /** Fetch a single solving technique by number. */
  useTechnique,
  /** Fetch all solving techniques with grouping utilities. */
  useTechniques,
  /** Fetch learning materials with filtering by technique and language. */
  useLearning,
  /** Fetch a single learning item by UUID. */
  useLearningItem,

  /**
   * @deprecated Use `useSudoku` instead. `useGame` uses a legacy 2D array board
   * representation, while `useSudoku` uses a flat 81-cell array consistent with
   * the Kotlin renderable layer and the rest of the codebase.
   */
  useGame,

  /** Primary game state hook with flat 81-cell board, pencil mode, and scrambling. */
  useSudoku,

  /** Teaching/hint integration with the solver API (legacy GameHint format). */
  useGameTeaching,

  /** Fetch a random board for a specific level with auth/subscription handling. */
  useLevelGame,
  /** Fetch today's daily puzzle with auth/subscription handling. */
  useDailyGame,

  /** Game timer using refs to avoid re-renders every second. */
  useGameTimer,

  /** Persist individual game progress to localStorage. */
  useGamePersistence,
  /** Auto-save game state with debouncing. */
  useAutoSave,

  /** Generic typed localStorage hook with SSR safety. */
  useLocalStorage,

  /** Solver hint integration matching Kotlin HintInteractor behavior. */
  useHint,

  /** Current game management with Zustand store (daily/play slots). */
  useGamePlay,

  /** Manual puzzle entry mode with solver validation. */
  useBoardEntry,

  /** Server-side game session management for gamification (points, badges). */
  useGameSession,

  /** Check whether a level is enabled for the current user's entitlements. */
  useLevelEnabled,
  /** Check whether a technique is enabled for the current user's entitlements. */
  useTechniqueEnabled,
} from './hooks';

export type {
  // Data hook types
  /** Options for useLevel hook. */
  UseLevelOptions,
  /** Result type for useLevel hook. */
  UseLevelResult,
  /** Options for useLevels hook. */
  UseLevelsOptions,
  /** Result type for useLevels hook. */
  UseLevelsResult,
  /** Options for useTechnique hook. */
  UseTechniqueOptions,
  /** Result type for useTechnique hook. */
  UseTechniqueResult,
  /** Options for useTechniques hook. */
  UseTechniquesOptions,
  /** Result type for useTechniques hook. */
  UseTechniquesResult,
  /** Options for useLearningItem hook. */
  UseLearningItemOptions,
  /** Result type for useLearningItem hook. */
  UseLearningItemResult,
  /** Options for useLearning hook. */
  UseLearningOptions,
  /** Result type for useLearning hook. */
  UseLearningResult,

  // Game hook types (legacy)
  /** @deprecated Options for legacy useGame hook. Use UseSudokuOptions instead. */
  UseGameOptions,
  /** @deprecated Result type for legacy useGame hook. Use UseSudokuResult instead. */
  UseGameResult,

  // Sudoku hook types
  /** Options for useSudoku hook (initial app settings). */
  UseSudokuOptions,
  /** Result type for useSudoku hook (state, computed values, actions, utilities). */
  UseSudokuResult,

  // Teaching hook types
  /** Options for useGameTeaching hook (network client, URL, token). */
  UseGameTeachingOptions,
  /** Result type for useGameTeaching hook (teaching state, hint actions). */
  UseGameTeachingResult,

  // Game fetching hook types
  /** Options for useLevelGame hook (network, auth, level number). */
  UseLevelGameOptions,
  /** Result type for useLevelGame hook (board data, fetch status). */
  UseLevelGameResult,
  /** Options for useDailyGame hook (network, auth). */
  UseDailyGameOptions,
  /** Result type for useDailyGame hook (daily data, fetch status). */
  UseDailyGameResult,
  /** Status of a game fetch: 'loading' | 'success' | 'auth_required' | 'subscription_required' | 'entitlement_required' | 'error'. */
  GameFetchStatus,

  // Timer hook types
  /** Options for useGameTimer hook (autoStart, initialTime). */
  UseGameTimerOptions,
  /** Result type for useGameTimer hook (elapsedRef, controls). */
  UseGameTimerResult,

  // Persistence hook types
  /** Options for useGamePersistence hook (puzzleKey, autoSave). */
  UseGamePersistenceOptions,
  /** Result type for useGamePersistence hook (load, save, clear, hasSaved). */
  UseGamePersistenceResult,

  // Hint hook types
  /** Options for useHint hook (network, puzzle state, technique filter). */
  UseHintOptions,
  /** Result type for useHint hook (hint steps, navigation, apply). */
  UseHintResult,
  /** Board data returned when applying a hint (user input, pencilmarks). */
  HintBoardData,
  /** Data passed to onHintReceived callback (hint, board data, technique info). */
  HintReceivedData,
  /** Access denied error info when hint level exceeds subscription tier. */
  HintAccessError,

  // Game play hook types
  /** Options for useGamePlay hook (slot selection, auto-save delay). */
  UseGamePlayOptions,
  /** Result type for useGamePlay hook (current game, start, update, clear). */
  UseGamePlayResult,

  // Board entry hook types
  /** Options for useBoardEntry hook (network client, URL, token). */
  UseBoardEntryOptions,
  /** Result type for useBoardEntry hook (cells, validation, actions). */
  UseBoardEntryReturn,
  /** Validated puzzle data from solver (puzzle + solution strings). */
  ValidatedPuzzle,

  // Game session hook types
  /** Options for useGameSession hook (network, auth, userId). */
  UseGameSessionOptions,
  /** Result of starting a game session (sessionStarted, sessionId). */
  GameSessionResult,
  /** Result of finishing a game session (leveledUp, badges, points). */
  GameFinishResult,
} from './hooks';

// ============================================================================
// Stores
// ============================================================================

/** Zustand store for current game state with daily/play slots and localStorage persistence. */
export { useGamePlayStore } from './stores/gamePlayStore';
/** State shape for the game play Zustand store. */
export type { GamePlayState } from './stores/gamePlayStore';

// ============================================================================
// Config
// ============================================================================

/** Authentication provider configuration types. */
export type {
  /** Available auth provider types: 'google' | 'apple' | 'email'. */
  AuthProviderType,
  /** Configuration for which auth providers are enabled. */
  AuthProvidersConfig,
} from './config';

/** Default auth providers configuration (Google + Email, anonymous fallback). */
export { DEFAULT_AUTH_PROVIDERS } from './config';

// ============================================================================
// Entitlement Utilities (re-exported from sudojo_types)
// ============================================================================

/** Parse a comma-delimited entitlement string into an array. */
export { parseEntitlements } from '@sudobility/sudojo_types';

/** Check if a user has the required entitlement for a level. */
export { hasRequiredEntitlement } from '@sudobility/sudojo_types';
