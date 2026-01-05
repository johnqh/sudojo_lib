/**
 * Hook exports for Sudojo library
 */

// Levels hooks
export { useLevel, useLevels } from './useLevels';
export type {
  UseLevelOptions,
  UseLevelResult,
  UseLevelsOptions,
  UseLevelsResult,
} from './useLevels';

// Techniques hooks
export { useTechnique, useTechniques } from './useTechniques';
export type {
  UseTechniqueOptions,
  UseTechniqueResult,
  UseTechniquesOptions,
  UseTechniquesResult,
} from './useTechniques';

// Learning hooks
export { useLearning, useLearningItem } from './useLearning';
export type {
  UseLearningItemOptions,
  UseLearningItemResult,
  UseLearningOptions,
  UseLearningResult,
} from './useLearning';

// Game hooks (legacy)
export { useGame } from './useGame';
export type { UseGameOptions, UseGameResult } from './useGame';

// Teaching hooks
export { useGameTeaching } from './useGameTeaching';
export type {
  UseGameTeachingOptions,
  UseGameTeachingResult,
} from './useGameTeaching';

// Sudoku hooks (ported from renderable)
export { useSudoku } from './useSudoku';
export type { UseSudokuOptions, UseSudokuResult } from './useSudoku';

// Game fetching hooks (with auth/subscription handling)
export { useLevelGame } from './useLevelGame';
export type {
  UseLevelGameOptions,
  UseLevelGameResult,
  GameFetchStatus,
} from './useLevelGame';

export { useDailyGame } from './useDailyGame';
export type { UseDailyGameOptions, UseDailyGameResult } from './useDailyGame';

// Game timer hook
export { useGameTimer } from './useGameTimer';
export type { UseGameTimerOptions, UseGameTimerResult } from './useGameTimer';

// Game persistence hooks
export { useGamePersistence, useAutoSave } from './useGamePersistence';
export type {
  UseGamePersistenceOptions,
  UseGamePersistenceResult,
} from './useGamePersistence';

// Local storage hook
export { useLocalStorage } from './useLocalStorage';

// Hint hook
export { useHint } from './useHint';
export type { UseHintOptions, UseHintResult, HintBoardData, HintReceivedData } from './useHint';
