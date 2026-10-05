/**
 * Admin batch jobs (board generation, technique extraction, example
 * creation) and admin stats. Network calls go only through sudojo_client
 * hooks; see `adminApi.ts`.
 */

// Types and constants
export type { AbortHandle, AdminJobOptions, AdminJobState } from './types';
export {
  ADMIN_JOB_LOG_LIMIT,
  ADMIN_TOKEN_REFRESH_INTERVAL,
  createAbortHandle,
} from './types';

// Pure board-string and bitmask helpers
export {
  adjustPracticeSolution,
  describeTechniqueMask,
  formatTechniqueMaskHex,
  hasInvalidPencilmarksStep,
  isPuzzleFilled,
  isPuzzleSolved,
  levelToSave,
  mergeBoardWithUserInput,
} from './boardStrings';

// Single-board extraction
export type {
  BoardExtractionError,
  BoardExtractionOutcome,
  BoardExtractionResult,
  ExtractionState,
  ExtractionStepOutcome,
  SolveFn,
  TechniqueExampleFound,
} from './extraction';
export {
  buildExtractionSolveOptions,
  computeNextExtractionState,
  createInitialExtractionState,
  extractBoardTechniques,
  extractionStateToResult,
  interpretSolveError,
  interpretSolveResponse,
  isExtractionError,
  isTechniqueFound,
  MAX_EXTRACTION_ITERATIONS,
} from './extraction';

// Board rules
export type {
  ExtractionMismatch,
  GeneratedPuzzle,
  ParseGeneratedBoardResult,
  ValidatedBoard,
} from './boardRules';
export {
  boardsAtLevelQuery,
  boardsWithoutTechniquesQuery,
  boardsWithTechniqueQuery,
  buildBoardTechniquesUpdate,
  buildValidatedBoard,
  compareExtractionWithSolver,
  parseGeneratedBoard,
} from './boardRules';

// Example rules
export type { ExampleSaveRequests, TechniqueCounts } from './examples';
export {
  ADMIN_EXAMPLE_TARGET_PER_TECHNIQUE,
  ADMIN_TECHNIQUE_ORDER,
  BOARDS_PER_LEVEL_LIMIT,
  BOARDS_WITH_TECHNIQUE_LIMIT,
  buildExampleSaveRequests,
  buildTechniqueLevelMap,
  countForTechnique,
  hasReachedTarget,
  levelsToSearchForTechnique,
  normalizeTechniqueCounts,
  techniquesNeedingExamples,
  totalTechniqueCount,
} from './examples';

// Network surface
export type { AdminApi } from './adminApi';
export { useAdminApi } from './adminApi';

// Framework-agnostic jobs
export type {
  AdminJobContext,
  AdminTokenManager,
  BoardGenerationOptions,
  ExampleCreationCallbacks,
  ExampleCreationRequest,
  TechniqueExtractionOptions,
} from './jobs';
export {
  createAdminTokenManager,
  fetchBoardsWithTechnique,
  fetchBoardWithoutTechniques,
  runBoardGeneration,
  runExampleCreation,
  runTechniqueExtraction,
  shouldRefreshToken,
  updateBoardTechniques,
} from './jobs';

// Hooks
export type {
  GeneratedBoardInfo,
  UseBoardGeneratorOptions,
  UseBoardGeneratorResult,
} from './useBoardGenerator';
export { useBoardGenerator } from './useBoardGenerator';
export type {
  UseTechniqueExtractorOptions,
  UseTechniqueExtractorResult,
} from './useTechniqueExtractor';
export { useTechniqueExtractor } from './useTechniqueExtractor';
export type {
  UseExampleCreatorOptions,
  UseExampleCreatorResult,
} from './useExampleCreator';
export { useExampleCreator } from './useExampleCreator';
export type {
  UseSingleBoardExtractorOptions,
  UseSingleBoardExtractorResult,
} from './useSingleBoardExtractor';
export { useSingleBoardExtractor } from './useSingleBoardExtractor';
export type {
  UseBoardTechniquesUpdaterOptions,
  UseBoardTechniquesUpdaterResult,
} from './useBoardTechniquesUpdater';
export { useBoardTechniquesUpdater } from './useBoardTechniquesUpdater';
export type {
  UseAdminStatsOptions,
  UseAdminStatsResult,
} from './useAdminStats';
export { describeUpdateStatsResult, useAdminStats } from './useAdminStats';

// Regenerate-hints status line
export {
  describeRegenerateHintsResponse,
  describeRegenerateHintsResult,
} from './regenerateHints';
