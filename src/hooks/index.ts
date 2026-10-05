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

// Communities hooks
export { useCommunities } from './useCommunities';
export type {
  UseCommunitiesOptions,
  UseCommunitiesResult,
} from './useCommunities';

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
export type {
  UseHintOptions,
  UseHintResult,
  HintBoardData,
  HintReceivedData,
  HintAccessError,
} from './useHint';

// Game play hook (current game management)
export { useGamePlay } from './useGamePlay';
export type { UseGamePlayOptions, UseGamePlayResult } from './useGamePlay';

// Continue game hook (shared "Continue Last Sudoku" logic)
export { useContinueGame } from './useContinueGame';
export type {
  UseContinueGameOptions,
  UseContinueGameResult,
  ContinueTarget,
} from './useContinueGame';

// Board entry hook
export { useBoardEntry } from './useBoardEntry';
export type {
  UseBoardEntryOptions,
  UseBoardEntryReturn,
  ValidatedPuzzle,
  BoardEntryPlayState,
} from './useBoardEntry';

// Board scan (OCR) hook
export { useBoardScan } from './useBoardScan';
export type { UseBoardScanOptions, UseBoardScanReturn } from './useBoardScan';

// Game session hook
export { useGameSession } from './useGameSession';
export type {
  UseGameSessionOptions,
  GameSessionResult,
  GameFinishResult,
} from './useGameSession';

// Entitlement access hooks
export { useLevelEnabled, useTechniqueEnabled } from './useEntitlement';

// Display level hook
export { useDisplayLevel } from './useDisplayLevel';
export type { UseDisplayLevelResult } from './useDisplayLevel';

// Puzzle distribution hook
export { usePuzzleDistribution } from './usePuzzleDistribution';

// Hint step tracker (shared across web and RN game screens)
export { useHintStepTracker } from './useHintStepTracker';
export type { UseHintStepTrackerResult } from './useHintStepTracker';

// Auto-hint orchestration (shared across web and RN SudokuGame)
export { useAutoHint } from './useAutoHint';
export type { UseAutoHintOptions } from './useAutoHint';

// Hint action events (external control of hint UI via deep links)
export {
  emitHintAction,
  reportHintStatus,
  onHintStatus,
  useHintActionListener,
} from './useHintAction';
export type { HintActionStatus } from './useHintAction';

// Admin practice operations
export { useRegeneratePracticeHints } from './usePractices';
export type {
  UseRegeneratePracticeHintsOptions,
  UseRegeneratePracticeHintsResult,
} from './usePractices';

// Progress reporting (shared across web and RN SudokuGame)
export { useProgressReporter } from './useProgressReporter';
export type {
  UseProgressReporterOptions,
  ProgressUpdateCallback,
} from './useProgressReporter';

// Completion latch (shared across web, RN and extension game components)
export { useCompletionTrigger } from './useCompletionTrigger';

// Strategies
export { useStrategies } from './useStrategies';
export type {
  UseStrategiesOptions,
  UseStrategiesResult,
} from './useStrategies';

// Practice game (random practice with auth/subscription states)
export { usePracticeGame } from './usePracticeGame';
export type {
  UsePracticeGameOptions,
  UsePracticeGameResult,
} from './usePracticeGame';

// User status
export { useIsRealUser, useIsSiteAdmin } from './useIsSiteAdmin';
export type {
  UseIsSiteAdminOptions,
  UseIsSiteAdminResult,
} from './useIsSiteAdmin';

// Technique lookup and worked example
export { useTechniqueByPath } from './useTechniqueByPath';
export type {
  UseTechniqueByPathOptions,
  UseTechniqueByPathResult,
} from './useTechniqueByPath';
export {
  useTechniqueExample,
  useTechniqueWalkthrough,
} from './useTechniqueExample';
export type {
  TechniqueExampleSourceKind,
  UseTechniqueExampleOptions,
  UseTechniqueExampleResult,
} from './useTechniqueExample';

// Puzzle progress (completed puzzles, streak, stats)
export { usePuzzleProgress } from './usePuzzleProgress';
export type {
  UsePuzzleProgressOptions,
  UsePuzzleProgressResult,
} from './usePuzzleProgress';

// Account deletion
export { useDeleteAccount } from './useDeleteAccount';
export type {
  DeleteAccountOutcome,
  DeleteAccountProviderTokens,
  UseDeleteAccountOptions,
  UseDeleteAccountResult,
} from './useDeleteAccount';

// Play screen session orchestration (resume, save, server session, completion)
export { getResumeGame, useResumeGame } from './useResumeGame';
export type {
  PuzzleSessionSource,
  ResumeGameSource,
  UseResumeGameOptions,
  UseResumeGameResult,
} from './useResumeGame';
export { usePuzzleSession } from './usePuzzleSession';
export type {
  ActivePuzzle,
  PuzzleGameProps,
  SessionPuzzleInput,
  UsePuzzleSessionOptions,
  UsePuzzleSessionResult,
} from './usePuzzleSession';

// Entered puzzle save/resume (after useBoardEntry validates)
export { useEnteredGameSession } from './useEnteredGameSession';
export type {
  UseEnteredGameSessionOptions,
  UseEnteredGameSessionResult,
} from './useEnteredGameSession';
