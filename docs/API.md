# sudojo_lib API Reference

Everything public is exported from the package root (`import { … } from '@sudobility/sudojo_lib'`).
Source of truth: `src/index.ts` (each export has a JSDoc line). There are no subpath exports.

Conventions used below: **req** = required option; `api?` = optional `networkClient, baseUrl, token` that fall back
to `SudojoApiProvider` (explicit options win; `token` falls back only when `undefined`; the hook throws if neither
supplies `networkClient`/`baseUrl`); board strings are 81 chars row-major (`0`/`.` = empty);
pencilmark strings are 81 comma-separated digit groups; cell index = `row * 9 + col`.

## Providers a consumer must mount

| Provider | Needed by |
|---|---|
| TanStack `QueryClientProvider` | every hook that calls the API: all lib hooks go through `sudojo_client` query/mutation hooks (the lib never constructs a `SudojoClient`), incl. `useHint`/`useGameTeaching` (`useSolverSolveMutation`), the session/practice/account hooks and the admin hooks |
| `EntitlementProvider entitlements={string[]}` | `useLevelEnabled`, `useTechniqueEnabled`, `useEntitlementContext` (defaults to `[]`) |
| `SudojoApiProvider networkClient baseUrl token?` *(optional)* | lets hooks marked `api?` omit `networkClient`/`baseUrl`/`token`. Also: `useSudojoApi()` (throws without a provider), `useOptionalSudojoApi()`, `resolveSudojoApi(options, ctx, hookName?)` (pure), `useResolvedSudojoApi(options, hookName?)`, `SudojoApiContext`; types `SudojoApiValue`, `SudojoApiOptions`, `ResolvedSudojoApi` |

## Hooks

### Server data

| Hook | Options (req in bold) | Returns |
|---|---|---|
| `useLevels` | api?, enabled | `levels, sortedLevels, freeLevels, premiumLevels, getLevel, isLoading, error, refetch` |
| `useLevel` | **level**, api?, enabled | `level, isLoading, error, refetch` |
| `useTechniques` | api?, level, enabled | `techniques, sortedTechniques, techniquesByLevel, getTechniqueByNumber, isLoading, error, refetch` |
| `useTechnique` | **technique**, api?, enabled | `technique, isLoading, error, refetch` |
| `useLearning` | api?, technique, languageCode, enabled | `learningMaterials, sortedLearning, learningByTechnique, learningByLanguage, getLearningByUuid, isLoading, error, refetch` |
| `useLearningItem` | **learningUuid**, api?, enabled | `learningItem, isLoading, error, refetch` |
| `useCommunities` | api?, language, enabled | `communities, communitiesByPlatform, isLoading, error, refetch` |
| `useStrategies` | api?, enabled | `strategies` (`success ? data ?? [] : []`), `findStrategyByStub(stub)`, `isLoading, error, refetch` |
| `useTechniqueByPath` | **path** (API path or public slug), api?, enabled | `technique, techniques, canonicalPath, apiPath, isLoading, notFound, error`; looks in the `useTechniques` list first, then `GET /techniques/path/:apiPath` |
| `useTechniqueExample` | **techniqueId, tHints, tTechniques, tCommon**, api?, techniquePath, source (`'example'` default: first of `/examples`, deterministic; `'practice'`: random practice), enabled | `example, status ('loading'\|'ready'\|'empty'), isLoading, steps: WalkthroughStep[], stepHeadings: string[], refetch` |
| `useTechniqueWalkthrough(source, {tHints, tTechniques, tCommon}, techniquePath?)` | positional | `{ steps, stepHeadings }` (memoized `buildTechniqueWalkthrough`) |
| `useIsRealUser(user)` | positional | `!!user && !user.isAnonymous` |
| `useIsSiteAdmin` | **user**, api? | `isSiteAdmin, isResolved` (`GET /users/:uid` only for a real user with a token; `isResolved` stays false while disabled) |
| `useDeleteAccount` | **user, subscriptionActive**, api?, signOut | `canDelete: DeleteAccountCheck, deleteAccount(providerTokens?) → Promise<DeleteAccountOutcome>` (`{status:'deleted'} \| {status:'blocked', reason} \| {status:'failed', error}`; never throws; calls `signOut` after deleting), `isDeleting, error` |
| `useRegeneratePracticeHints` | **networkClient, baseUrl** | TanStack `UseMutationResult` (admin: regenerate `hint_data` for stored practices) |

### Game fetching

| Hook | Options | Returns |
|---|---|---|
| `useLevelGame` | **level**, api?, symmetrical, subscriptionActive, userEntitlements, levelEntitlement, enabled | `board, status, isLoading, error, refetch, nextPuzzle, requiredEntitlement` |
| `useDailyGame` | api?, subscriptionActive, enabled *(ignored)* | `daily, dailyDate, status, isLoading, error, refetch` |
| `usePracticeGame` | **techniqueId**, api?, enabled | `practice, status: PracticeFetchStatus, isLoading, error, refetch, nextPractice` (invalidate + refetch); refetches when the token changes while `auth_required` |

`GameFetchStatus` = `'loading' | 'success' | 'auth_required' | 'subscription_required' | 'entitlement_required' | 'error'`.
Both refetch automatically when the token or `subscriptionActive` changes.
`PracticeFetchStatus` = `'loading' | 'ready' | 'auth_required' | 'subscription_required' | 'no_practices' | 'error'`
(HTTP 401 → auth, 402 → subscription, 403/other → error; see `getPracticeFetchStatus`).

### Game state

| Hook | Input | Returns |
|---|---|---|
| `useSudoku` | `{ appSettings? }` | state: `play, board, selectedCell, selectedIndex, isPencilMode, isCompleted, canUndo, appSettings, digitMapping, reverseDigitMapping`; computed: `errorCells, errorCount, progress, sameValueCells, relatedCells`; actions: `loadBoard(puzzle, solution, {scramble=true, symmetrical=false, source='LEVEL', levelUuid, boardUuid})`, `selectCell, selectCellAt, deselectCell, input, erase, togglePencilMode, setPencilMode, undo, autoPencilmarks, updateSettings, reset, applyHintData(user, pencilmarks, autoPencilmarks)`; strings: `getBoardString, getOriginalPuzzle, getScrambledPuzzle, getScrambledSolution, getInputString, getPencilmarksString` |
| `useBoardEntry` | api? (may be called with no argument) | `cells, selectedIndex, clueCount, isValidating, validationError, validatedPuzzle {puzzle, solution, level?, difficultyScore?}, selectCell, setGiven` (also clears the cell's pencilmarks), `erase, getPuzzleString, validate, reset, setCellsFromPuzzle`; entry pencilmarks: `pencilmarks: number[][], autopencil, hasPencilmarks, pencilmarksString, togglePencilmark(d)` (sorted, not on givens), `displayCells, isPencilMode, togglePencilMode, setPencilMode, enterDigit(v)`; `toggleGiven(v)` (same digit erases), `canValidate`; scans: `applyScan(ScannedBoard), scannedInput, initialPlayState: BoardEntryPlayState \| undefined` (`{input?, pencilmarks?, autopencil?}` to apply once validated) |
| `useBoardScan` | api? (`networkClient, baseUrl`) | `scan(token, image, source='library') → Promise<ScannedBoard>` (throws `ScanBoardError`), `isScanning` |
| `useCompletionTrigger(isCompleted, onComplete)` | positional | void; fires once per false→true transition, re-arms when `isCompleted` goes false |
| `useGame` *(deprecated)* | `{ maxMistakes?=3, initialSettings? }` | legacy 2D `GameState` API; no sibling repo uses it |

Use `getScrambledPuzzle()` (not `getOriginalPuzzle()`) when calling the solver; boards are scrambled by default.

### Hints

| Export | Input | Output / notes |
|---|---|---|
| `useHint` | **puzzle, userInput**, api?, pencilmarks, autoPencilmarks, techniqueFilter, onHintReceived, userEntitlements, levelEntitlement | `hint, hints, stepIndex, totalSteps, isLoading, error, accessError, getHint, nextStep, previousStep, clearHint, applyHint → {user, pencilmarks, autoPencilmarks} \| null, hasNextStep, hasPreviousStep, canApply, isTargetTechnique, isHintGated`. Only 2 steps are visible without the level's entitlement |
| `useAutoHint` | initial hint step/input/pencilmarks (from a share link), current board strings, `isBoardReady`, and `useHint` state/actions | void; once the shared input is on the board, calls `getHint()` and advances to `initialHintStep` |
| `useHintStepTracker` | none | `hintStep, hintStepRef, handleHintStepChange` |
| `emitHintAction()` / `onHintStatus(fn) → unsubscribe` / `reportHintStatus(status)` | none | module-level event bus that lets outside UI (deep links, extension) drive the hint panel |
| `useHintActionListener` | `useHint` state + `getHint, nextStep, applyHint, deselectCell` | void; mount inside the game screen to answer `emitHintAction()` |
| `useGameTeaching` *(legacy)* | **networkClient, baseUrl, token** | `teachingState, getHint, applyHint, nextStep, previousStep, clearHint, hasHint, hasMoreSteps, hasPreviousStep` |

### Persistence, timing, session

| Export | Input | Output / notes |
|---|---|---|
| `useGamePlay` | `{ slot?='play', autoSaveDelay?=2000 }` | `currentGame, hasCurrentGame, startGame(source, board, solution, meta?), updateProgress(input, pencilmarks, isPencilMode, autoPencilmarks, elapsed)` (throttled, flushed on unmount/`beforeunload`), `clearGame` |
| `useGamePlayStore` | Zustand store | `dailyGame, playGame, startGame(slot, …), updateProgress(slot, …), clearGame(slot)`; persisted as `sudojo-current-game` v2 |
| `useContinueGame` | **levels, t, tLevels**, slot | `currentGame, hasCurrentGame, description, target: {type:'level', levelId} \| {type:'entered'} \| null` |
| `useGamePersistence` | **puzzleKey** `{type, id} \| null` (`autoSave`, `debounceMs` ignored) | `loadGame, saveGame, clearGame, hasSavedGame` (keys `sudojo_game_<type>_<id>`) |
| `useAutoSave(puzzleKey, getState, deps, debounceMs=1000)` | positional | void; debounced `saveGame` |
| `useLocalStorage(key, initial)` | positional | `[value, setValue, remove]` |
| `useGameTimer` | `{ autoStart?=false, initialTime?=0 }` | `elapsedRef, getElapsedSeconds, isRunning, start, pause, resume, reset, stop` (ref-based, no per-second re-render) |
| `useProgressReporter` | hasBoard, isCompleted, paused, onProgressUpdate, getInputString, getPencilmarksString, isPencilMode, autoPencilmarks, getElapsedSeconds | void; calls `onProgressUpdate` on board change, every 1 s, and when `paused` turns on |
| `useGameSession` | **userId**, api? | `startSession(GameStartRequest) → {sessionStarted, sessionId?}`, `finishSession(elapsed) → {leveledUp, newBadges, totalPointsEarned, response?}`, `isStarting, isFinishing, isAuthenticated, sessionId`; no-op when unauthenticated |

### Play screen session

| Export | Input | Output / notes |
|---|---|---|
| `useResumeGame` | **source** (`'daily'\|'level'\|'entered'`; entered: slot `play`, no extra checks), levelNumber, slot, clearStaleDaily (=true), isStoreHydrated (RN: from `onStoreReady`) | `resumeGame: CurrentGame \| null` (snapshot per screen; stale dailies cleared from the store), `isReady, discard()`. Call before the fetch hook and pass `enabled: isReady && !resumeGame` |
| `getResumeGame(game, {source, levelNumber?, allowStaleDaily?, now?})` | pure | the game to resume or null (source, 81-char puzzle/solution, daily date / `meta.levelId === String(levelNumber)`) |
| `usePuzzleSession` | **source, puzzle** (fetched Daily/Board or null), api?, levelNumber, levelTitle, dailyDate, fetchStatus, user, resume, isStoreHydrated, clearStaleDaily, isPuzzleCompleted, onPuzzleCompleted, startSessionOnResume (=false), showEmptyAchievement (=false) | `status, isReady, isResuming, resumeGame, activePuzzle: ActivePuzzle \| null, gameProps {puzzle, solution, scramble, initialInput?, initialPencilmarks?, initialElapsedTime?, initialAutoPencilmarks?} \| null, gameKey, puzzleId, alreadyCompleted, isAuthenticated, onScrambledReady({puzzle, solution}), onBoardReady(p, s), onProgress(…), onComplete(timeSeconds) → Promise<GameFinishResult \| null>, newGame(), achievementResult, showAchievement, closeAchievement` |
| `useEnteredGameSession` | **validatedPuzzle** (useBoardEntry), initialPlayState (useBoardEntry), resume, isStoreHydrated, onReset (pass `entry.reset`) | `isReady, isResuming, activePuzzle: ValidatedPuzzle \| null` (resumed with saved level/difficultyScore, else validated), `isPlaying, gameProps` (always `scramble:false`; initial state from the saved game or `initialPlayState`), `gameKey, onScrambledReady, onBoardReady, onProgress, onComplete()` (clears the save), `newGame()` (clear save, stop resuming, `onReset`). Saves `startGame('entered', …)` once per puzzle with `{level, difficultyScore}` meta and entry pencilmarks; no server session, no progress |
| `usePuzzleProgress` | `{ storageKey?=PROGRESS_STORAGE_KEY }` | `progress, markCompleted(PuzzleCompletion), isCompleted(type, id), getCompletedLevelIds, getCompletedDailyDates, resetProgress` (localStorage) |

`usePuzzleSession` pins the fetched puzzle, saves the game once per uuid from the scrambled snapshot (meta: `boardUuid`,
`dailyDate` or `levelId`/`levelTitle`, `level`, `difficultyScore`, `techniques`, `techniques_bitmask`), starts the server
session once per uuid for a real user (dailies need a level), and on completion clears the save, finishes the session,
opens the achievement modal when something was earned, and calls `onPuzzleCompleted`. Render with
`<SudokuGame key={gameKey} {...gameProps} …/>`. The session is started with the scrambled board
as played, because sudojo_api credits a hint (points, `hintUsed`) only when the hint's `original` equals the session board.

### Admin (`src/admin/**`)

| Hook | Options | Returns |
|---|---|---|
| `useBoardGenerator` | `AdminJobOptions` (**networkClient, baseUrl, getToken**) | `AdminJobState` (`isRunning, progress, log, error`) + `generatedCount, lastBoard, start({symmetrical}) → Promise<number>, cancel` |
| `useTechniqueExtractor` | `AdminJobOptions` | `AdminJobState` + `extractedCount, start({testWithFrontend}) → Promise<number>, cancel` |
| `useExampleCreator` | `AdminJobOptions` | `AdminJobState` + `counts, creatingTechniqueId, resetBoardCount, start(ExampleCreationRequest), cancel` |
| `useSingleBoardExtractor` | `AdminJobOptions` | `extract(original, desiredTechnique?) → Promise<BoardExtractionOutcome>` |
| `useBoardTechniquesUpdater` | `AdminJobOptions` | `updateBoardTechniques(boardUuid, techniques: bigint, level), fetchBoardsWithTechnique(techniqueId, limit)` |
| `useAdminStats` | **networkClient, baseUrl, token**, loadBoardCounts, loadTechniqueCounts | `totalBoards, boardsWithoutTechniques, isBoardCountsLoading, exampleCounts, boardCountsByTechnique, isTechniqueCountsLoading, refetchCounts` |
| `useAdminApi(networkClient, baseUrl)` | positional | `AdminApi`: the client mutation hooks the jobs use |

Framework-agnostic pieces (all re-exported from the root): jobs `runBoardGeneration, runTechniqueExtraction,
runExampleCreation, createAdminTokenManager, shouldRefreshToken, fetchBoardsWithTechnique, fetchBoardWithoutTechniques,
updateBoardTechniques`; extraction `extractBoardTechniques, buildExtractionSolveOptions, interpretSolveResponse,
interpretSolveError, computeNextExtractionState, …`; board rules `parseGeneratedBoard, buildValidatedBoard,
buildBoardTechniquesUpdate, compareExtractionWithSolver, boards*Query`; examples `buildExampleSaveRequests,
techniquesNeedingExamples, ADMIN_TECHNIQUE_ORDER, ADMIN_EXAMPLE_TARGET_PER_TECHNIQUE, …`; board strings
`mergeBoardWithUserInput, adjustPracticeSolution, describeTechniqueMask, levelToSave, …`; `describeUpdateStatsResult`, `describeRegenerateHintsResult(data)` / `describeRegenerateHintsResponse(response)` (AdminPage's regenerate-hints status line),
`createAbortHandle`, `ADMIN_JOB_LOG_LIMIT`, `ADMIN_TOKEN_REFRESH_INTERVAL`. Full list: `src/admin/index.ts`.

### Entitlements and levels

| Export | Signature |
|---|---|
| `useLevelEnabled` | `(level) → boolean` |
| `useTechniqueEnabled` | `(technique, levels) → boolean` (unassigned technique = free) |
| `useDisplayLevel` | `(internalLevel /*0-based*/) → { displayLevel /*1-based*/, belt }` |
| `usePuzzleDistribution` | `(levels, offerId?) → number`: fraction (0–1) of puzzles unlocked; no offer = free levels, `'1_blue_belt'` = free + blue belt, any other offer = 1 |
| `EntitlementProvider`, `EntitlementContext`, `useEntitlementContext` | React context carrying `string[]` entitlement IDs |
| `parseEntitlements`, `hasRequiredEntitlement` | re-exported from `@sudobility/sudojo_types` |

## Utilities

| Group | Exports |
|---|---|
| Cell/board helpers (`types/sudoku.ts`) | `createEmptyCell, createEmptyBoard, cellHasError, rowOf, columnOf, blockOf, cellIndex, getRowIndices, getColumnIndices, getBlockIndices, getRelatedIndices, DEFAULT_PLAY_SETTINGS, DEFAULT_APP_SETTINGS` |
| Scrambler | `Scrambler, NonScrambler, scrambleSudokuBoard(scrambler, cells, symmetrical=false) → {cells, digitMapping, reverseDigitMapping}, parsePuzzleString(puzzle, solution?), cellsToPuzzleString, cellsToStateString, cellsToInputString, cellsToPencilmarksString, cellsToSolutionString, countClues`; re-exported `MIN_CLUES, MIN_LEVEL, MAX_LEVEL, isValidLevel, ALL_LEVELS` |
| Presenter | `presentBoard({cells, selectedIndex, showErrors, hintStep?, selectedDigitCells?}) → CellDisplayState[81], calculateCellHints, themeColorToCSS, getColorPalette(isDark), getCellsWithDigit, getSelectedDigit, computeSelectedDigitCells, convertSolverLink, convertSolverCellGroup, sudokuColorToTheme, solverColorToSudokuColor, parseHintDigits, convertSolverHintStep, isConflictHintStep` |
| Scanned board (OCR) | `toScannedBoard, scannedBoardFromResponse, hasScannedInput, ScanBoardError` (`code`: `REQUEST_FAILED \| INVALID_BOARD \| TOO_FEW_CLUES`), `MIN_SCAN_CLUES` |
| Walkthroughs | `parsePencilmarksString, pencilmarksToString, parsePracticeBoard(board, pencilmarks, solution), cloneSudokuBoard, applyHintStep(board, step) → {board, pencilmarks}, parseHintData(json) → SolverHints \| null, localizeHintStep, buildWalkthroughSteps → WalkthroughStep[]`, `buildTechniqueWalkthrough(source, {tHints, tTechniques, tCommon}, techniquePath?) → {steps, stepHeadings}` |
| Hint text | `generateDetailedExplanation(step, techniqueId?, digitDisplay?)`, `getHintActionSummary`, `getLocalizedHintText`, `getLocalizedHintTitle`, `localizedField`, headings: `HINT_HEADING_KEY_PREFIX, getStepHeadingLocalization, getLocalizedHintHeading, getStepHeadingFromTree, interpolateHintValues, createLocalizedHintHelpers` |
| Hint access | `FREE_HINT_STEP_LIMIT` (2), `getHintAccessAction`, `HINT_ACCESS_KEY_SUFFIXES` |
| Entity translation | `createNamespacedTranslate, getLevelDisplayTitle, getLevelDisplayText, getTechniqueDisplayTitle, getBeltDisplayName, getBeltDisplayLabel, getStrategyDisplayTitle(strategy, tEntity, tStrategies?)` (localization → `${stub}.title` → title → stub) |
| Techniques & strategies | `getTechniqueIconUrl, toCanonicalTechniquePath, toApiTechniquePath, isSameTechniquePath, findTechniqueByPath, parseTechniqueDependencies, getTechniqueDependencies, getDependentTechniques, sortTechniquesByLevel, groupTechniquesByLevel, getTechniquesForStrategy, findStrategyByStub, TECHNIQUE_SLUGS, STRATEGY_SLUGS, getStrategyDifficultyTier, getStrategyDifficultyKey, getStrategySections, parseTechniqueContent`; exact bitmasks: `exactTechniqueBitmask, techniqueBitmaskString, techniqueFieldsOf` |
| Language / community / gamification | `SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, NATIVE_LANGUAGE_STORAGE_KEY, isSupportedLanguage, normalizeLanguageCode, resolveLanguage, toLanguageTag, getLanguageNativeName`; `COMMUNITY_PLATFORMS, getCommunityPlatform, sortCommunityPlatforms`; `LEVEL_MASTERY_BADGE_TYPE, GAMES_PLAYED_BADGE_TYPE, groupBadgeProgress` |
| Dates / fetch status | `getUtcDateString, normalizeDailyDate, formatDailyDate, isStaleDaily`; `getGameFetchStatus, isAuthRequiredResponse, isSubscriptionRequiredResponse, getPracticeFetchStatus, getErrorHttpStatus` |
| i18n keys | `getBeltKey` (`belts.N.name`), `getBeltLabelKey` (`belts.N.label`), `getLevelKey` (`levels.N`), `getTechniqueKey` (`techniques.<path>.title`) and `getLocalized*` variants taking an i18next-style `t` |
| Display | `displayDigit(digit, 'numeric'\|'kanji'\|'emojis')`, `formatTime`, `parseTime`, `THEME_STORAGE_KEY, getSystemTheme, resolveTheme, isValidThemePreference` |
| Progress | `calculateStats, calculateStreak, isPuzzleCompleted, getCompletedLevelIds, getCompletedDailyDates, applyPuzzleCompletion(progress, completion, now?)` (pure markCompleted reducer), `DEFAULT_PROGRESS, PROGRESS_STORAGE_KEY` |
| Subscriptions (RevenueCat) | `convertPackageToProduct, parseCustomerInfo, getPeriodDisplayName, isBestValuePlan, getRevenueCatErrorMessage, getPeriodLabelKey, getPeriodLabel, isBestValueProduct, subscriptionPeriodToMonths, calculateSavingsPercent, isCrossPlatformSubscription, canDeleteAccount, getPuzzleDistribution, selectSavingsBasePlan(products)` (shortest known period), `getPlanSavingsPercent(products, plan), DEFAULT_SUBSCRIPTION` |
| Sharing / auth / config | `buildShareUrl, parseShareParams, getWebUrl, isAuthenticatedUser, isRealUser, DEFAULT_AUTH_PROVIDERS` |
| Settings / storage keys | `DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY` (`sudojo-settings`), `GAME_STORAGE_PREFIX` (`sudojo_game_`), `getGameStorageKey` |
| Legacy 2D *(deprecated)* | `board.ts`: `cloneBoard, countFilledCells, createGameBoard, getBlockCells, getBlockIndex, getBoardStateString, getColumnCells, getEmptyCells, getPencilmarksString, getRelatedCells, getRowCells, isValidPlacement`; `validation.ts`: `autoRemovePencilmarks, clearHighlights, countMistakes, getIncorrectCells, getProgressPercentage, isBoardFilled, isCellCorrect, isGameComplete, isValueCorrect, updateCellErrors, updateCellHighlights, validateGameState`; `DEFAULT_GAME_SETTINGS` |

## Types and enums

- Modern: `SudokuCell {index, solution, given, input, pencilmarks}`, `SudokuBoard {cells, completed, entering, enteringError}`, `SudokuPlay`, `SudokuPlaySettings`, `SudokuAppSettings`, `SudokuGameState`, `SudokuDisplay`, `PlayingSource` (`'DAILY'|'CHALLENGE'|'LEVEL'|'ENTERED'`).
- Display: `ThemeColor`, `SudokuColor` (string enum matching solver color names), `UIColorLight`, `UIColorDark`, `UIColorPalette`, `CellDisplayState`, `PencilmarkDisplayState`, `HintArea`, `HintCell`, `HintCellActions`, `DisplayHintStep`, `LinkType`, `DisplayLink`, `DisplayCellGroup`.
- App state: `CurrentGame`, `CurrentGameMeta`, `GameSource` (`'daily'|'level'|'entered'`), `GameSlot` (`'daily'|'play'`), `GamePlayState`, `SavedGameState`, `GamePersistenceKey`, `UserProgress`, `CompletedPuzzle`, `GameStats`, `AppSettings`, `DigitDisplay`, `Product`, `Subscription`, `AuthProviderType`, `AuthProvidersConfig`, `ThemePreference`, `ResolvedTheme`, `ShareUrlParams`, `ParsedShareParams`, `ShareUrlType`, `ShareParamsSource`, `AuthUser`, `TranslateFunction`, `WalkthroughStep`, `ScannedBoard`, `ScanBoardErrorCode`, `PuzzleCompletion`, `DeleteAccountBlocker`, `DeleteAccountCheck`, `PricedPeriod`, technique/strategy/language/community/badge/hint-access types, `TechniqueExampleSource`, `TechniqueWalkthroughTranslations`, `TechniqueWalkthrough`.
- Hook option/result types: `Use<Hook>Options` / `Use<Hook>Result` for each hook above, plus `GameFetchStatus`, `PracticeFetchStatus`, `GameFetchResponse`, `BoardEntryPlayState`, `TechniqueExampleSourceKind`, `DeleteAccountOutcome`, `DeleteAccountProviderTokens`, `PuzzleSessionSource`, `ActivePuzzle`, `PuzzleGameProps`, `SessionPuzzleInput`, admin `AdminJobOptions`/`AdminJobState`/…, `HintBoardData`, `HintReceivedData`, `HintAccessError`, `HintActionStatus`, `ContinueTarget`, `ValidatedPuzzle`, `GameSessionResult`, `GameFinishResult`, `ProgressUpdateCallback`.
- Legacy: `CellPosition`, `CellState`, `GameBoard`, `GameHint`, `GameMove`, `GameSettings`, `GameState`, `GameStatus`, `TeachingState`.
