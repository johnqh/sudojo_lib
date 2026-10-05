/**
 * Utility exports for Sudojo library
 */

// Board utilities (legacy - for useGame hook)
export {
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
} from './board';

// Validation utilities (legacy - for useGame hook)
export {
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
} from './validation';

// Sudoku scrambler utilities (for useSudoku hook - ported from renderable)
export type {
  ScramblerProtocol,
  ScrambleResult as SudokuScrambleResult,
} from './sudokuScrambler';
export {
  Scrambler,
  NonScrambler,
  scrambleBoard as scrambleSudokuBoard,
  parsePuzzleString,
  cellsToPuzzleString,
  cellsToStateString,
  cellsToInputString,
  cellsToPencilmarksString,
  cellsToSolutionString,
  countClues,
} from './sudokuScrambler';

// Sudoku presenter (for rendering - matches Kotlin renderable)
export type { PresentBoardOptions } from './sudokuPresenter';
export {
  presentBoard,
  calculateCellHints,
  themeColorToCSS,
  getColorPalette,
  getCellsWithDigit,
  getSelectedDigit,
  computeSelectedDigitCells,
  convertSolverLink,
  convertSolverCellGroup,
  sudokuColorToTheme,
  solverColorToSudokuColor,
  parseHintDigits,
  convertSolverHintStep,
  isConflictHintStep,
} from './sudokuPresenter';

// Time utilities
export { formatTime, parseTime } from './time';

// Progress utilities
export {
  calculateStats,
  calculateStreak,
  isPuzzleCompleted,
  getCompletedLevelIds,
  getCompletedDailyDates,
  applyPuzzleCompletion,
} from './progress';
export type { PuzzleCompletion } from './progress';

// Theme utilities
export type { ThemePreference, ResolvedTheme } from './theme';
export {
  THEME_STORAGE_KEY,
  FONT_SIZE_STORAGE_KEY,
  getSystemTheme,
  resolveTheme,
  isValidThemePreference,
} from './theme';

// Subscription utilities
export {
  convertPackageToProduct,
  parseCustomerInfo,
  getPeriodDisplayName,
  isBestValuePlan,
  getRevenueCatErrorMessage,
  getPeriodLabelKey,
  getPeriodLabel,
  isBestValueProduct,
  subscriptionPeriodToMonths,
  calculateSavingsPercent,
  isCrossPlatformSubscription,
  canDeleteAccount,
  getPuzzleDistribution,
  selectSavingsBasePlan,
  getPlanSavingsPercent,
} from './subscription';
export type {
  PricedPeriod,
  PaywallPlan,
  DeleteAccountBlocker,
  DeleteAccountCheck,
} from './subscription';

// Technique and strategy utilities
export type {
  TechniqueSlug,
  StrategySlug,
  StrategyDifficultyTier,
  StrategySection,
  TechniqueContent,
} from './technique';
export {
  getTechniqueIconUrl,
  toCanonicalTechniquePath,
  toApiTechniquePath,
  isSameTechniquePath,
  findTechniqueByPath,
  parseTechniqueDependencies,
  getTechniqueDependencies,
  getDependentTechniques,
  sortTechniquesByLevel,
  groupTechniquesByLevel,
  getTechniquesForStrategy,
  findStrategyByStub,
  TECHNIQUE_SLUGS,
  STRATEGY_SLUGS,
  getStrategyDifficultyTier,
  getStrategyDifficultyKey,
  getStrategySections,
  parseTechniqueContent,
} from './technique';

// Technique bitmask utilities
export {
  exactTechniqueBitmask,
  techniqueBitmaskString,
  techniqueFieldsOf,
} from './techniqueBitmask';

// Technique walkthrough utilities
export type { WalkthroughStep } from './techniqueWalkthrough';
export {
  parsePencilmarksString,
  pencilmarksToString,
  parsePracticeBoard,
  cloneSudokuBoard,
  applyHintStep,
  parseHintData,
  localizeHintStep,
  buildWalkthroughSteps,
} from './techniqueWalkthrough';

// Hint explanation utilities
export {
  generateDetailedExplanation,
  getHintActionSummary,
} from './hintExplanation';

// Localized hint utilities
export type {
  TranslateFunction,
  HintHeadingTree,
  LocalizedHintHelpers,
} from './localizedHint';
export {
  getLocalizedHintText,
  getLocalizedHintTitle,
  localizedField,
  HINT_HEADING_KEY_PREFIX,
  getStepHeadingLocalization,
  getLocalizedHintHeading,
  interpolateHintValues,
  getStepHeadingFromTree,
  createLocalizedHintHelpers,
} from './localizedHint';

// Entity translation utilities
export type {
  LevelDisplaySource,
  TechniqueDisplaySource,
  StrategyDisplaySource,
} from './entityTranslate';
export {
  createNamespacedTranslate,
  getLevelDisplayTitle,
  getLevelDisplayText,
  getTechniqueDisplayTitle,
  getBeltDisplayName,
  getBeltDisplayLabel,
  getStrategyDisplayTitle,
} from './entityTranslate';

// i18n key utilities
export {
  getBeltKey,
  getLocalizedBeltName,
  getBeltLabelKey,
  getLocalizedBeltLabel,
  getLevelKey,
  getLocalizedLevelTitle,
  getTechniqueKey,
  getLocalizedTechniqueName,
} from './i18nKeys';

// Digit display utilities
export { displayDigit } from './digitDisplay';

// Scanned board (OCR) utilities
export type { ScannedBoard, ScanBoardErrorCode } from './scannedBoard';
export {
  MIN_SCAN_CLUES,
  ScanBoardError,
  toScannedBoard,
  hasScannedInput,
  scannedBoardFromResponse,
} from './scannedBoard';

// Share URL utilities
export type {
  ShareUrlParams,
  ParsedShareParams,
  ShareUrlType,
  ShareParamsSource,
} from './shareUrl';
export { buildShareUrl, parseShareParams, getWebUrl } from './shareUrl';

// Auth utilities
export type { AuthUser } from './auth';
export { isAuthenticatedUser, isRealUser } from './auth';

// Language utilities
export type { SupportedLanguageInfo, SupportedLanguageCode } from './language';
export {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  NATIVE_LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  normalizeLanguageCode,
  resolveLanguage,
  toLanguageTag,
  getLanguageNativeName,
} from './language';

// Community utilities
export type { CommunityPlatformInfo } from './community';
export {
  COMMUNITY_PLATFORMS,
  getCommunityPlatform,
  sortCommunityPlatforms,
} from './community';

// Gamification utilities
export type { BadgeProgress, BadgeDefinitionLike } from './gamification';
export {
  LEVEL_MASTERY_BADGE_TYPE,
  GAMES_PLAYED_BADGE_TYPE,
  groupBadgeProgress,
} from './gamification';

// Hint access utilities
export type {
  HintAccessAction,
  HintAccessVariant,
  HintAccessPresentation,
} from './hintAccess';
export {
  FREE_HINT_STEP_LIMIT,
  getHintAccessAction,
  HINT_ACCESS_KEY_SUFFIXES,
} from './hintAccess';

// Daily date utilities
export {
  getUtcDateString,
  normalizeDailyDate,
  formatDailyDate,
  isStaleDaily,
} from './date';

// Game fetch status utilities
export type { GameFetchResponse, PracticeFetchStatus } from './gameFetchStatus';
export {
  isAuthRequiredResponse,
  isSubscriptionRequiredResponse,
  getGameFetchStatus,
  getErrorHttpStatus,
  getPracticeFetchStatus,
} from './gameFetchStatus';

// Technique example walkthrough
export type {
  TechniqueExampleSource,
  TechniqueWalkthroughTranslations,
  TechniqueWalkthrough,
} from './techniqueExample';
export { buildTechniqueWalkthrough } from './techniqueExample';
