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

export type {
  ClientConfig as SolverConfig,
  HintStep,
  SolveOptions,
  SolveResponse,
} from '@sudobility/sudojo_solver_client';
