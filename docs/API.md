# sudojo_lib API Reference

Everything public is exported from the package root (`import { … } from '@sudobility/sudojo_lib'`).
Source of truth: `src/index.ts` (each export has a JSDoc line). There are no subpath exports.

Conventions used below: **req** = required option; board strings are 81 chars row-major (`0`/`.` = empty);
pencilmark strings are 81 comma-separated digit groups; cell index = `row * 9 + col`.

## Providers a consumer must mount

| Provider | Needed by |
|---|---|
| TanStack `QueryClientProvider` | every hook built on `sudojo_client` query/mutation hooks: `useLevels`, `useLevel`, `useTechniques`, `useTechnique`, `useLearning`, `useLearningItem`, `useCommunities`, `useLevelGame`, `useDailyGame`, `useBoardEntry`, `useGameSession`, `useRegeneratePracticeHints` |
| `EntitlementProvider entitlements={string[]}` | `useLevelEnabled`, `useTechniqueEnabled`, `useEntitlementContext` (defaults to `[]`) |

`useHint` and `useGameTeaching` call `createSudojoClient(...).solverSolve` directly and need no provider.

## Hooks

### Server data

| Hook | Options (req in bold) | Returns |
|---|---|---|
| `useLevels` | **networkClient, baseUrl**, token, enabled | `levels, sortedLevels, freeLevels, premiumLevels, getLevel, isLoading, error, refetch` |
| `useLevel` | **networkClient, baseUrl, level**, token, enabled | `level, isLoading, error, refetch` |
| `useTechniques` | **networkClient, baseUrl**, token, level, enabled | `techniques, sortedTechniques, techniquesByLevel, getTechniqueByNumber, isLoading, error, refetch` |
| `useTechnique` | **networkClient, baseUrl, technique**, token, enabled | `technique, isLoading, error, refetch` |
| `useLearning` | **networkClient, baseUrl**, token, technique, languageCode, enabled | `learningMaterials, sortedLearning, learningByTechnique, learningByLanguage, getLearningByUuid, isLoading, error, refetch` |
| `useLearningItem` | **networkClient, baseUrl, learningUuid**, token, enabled | `learningItem, isLoading, error, refetch` |
| `useCommunities` | **networkClient, baseUrl**, token, language, enabled | `communities, communitiesByPlatform, isLoading, error, refetch` |
| `useRegeneratePracticeHints` | **networkClient, baseUrl** | TanStack `UseMutationResult` (admin: regenerate `hint_data` for stored practices) |

### Game fetching

| Hook | Options | Returns |
|---|---|---|
| `useLevelGame` | **networkClient, baseUrl, token, level**, symmetrical, subscriptionActive, userEntitlements, levelEntitlement, enabled | `board, status, isLoading, error, refetch, nextPuzzle, requiredEntitlement` |
| `useDailyGame` | **networkClient, baseUrl, token**, subscriptionActive, enabled *(ignored)* | `daily, dailyDate, status, isLoading, error, refetch` |

`GameFetchStatus` = `'loading' | 'success' | 'auth_required' | 'subscription_required' | 'entitlement_required' | 'error'`.
Both refetch automatically when the token or `subscriptionActive` changes.

### Game state

| Hook | Input | Returns |
|---|---|---|
| `useSudoku` | `{ appSettings? }` | state: `play, board, selectedCell, selectedIndex, isPencilMode, isCompleted, canUndo, appSettings, digitMapping, reverseDigitMapping`; computed: `errorCells, errorCount, progress, sameValueCells, relatedCells`; actions: `loadBoard(puzzle, solution, {scramble=true, symmetrical=false, source='LEVEL', levelUuid, boardUuid})`, `selectCell, selectCellAt, deselectCell, input, erase, togglePencilMode, setPencilMode, undo, autoPencilmarks, updateSettings, reset, applyHintData(user, pencilmarks, autoPencilmarks)`; strings: `getBoardString, getOriginalPuzzle, getScrambledPuzzle, getInputString, getPencilmarksString` |
| `useBoardEntry` | **networkClient, baseUrl, token** | `cells, selectedIndex, clueCount, isValidating, validationError, validatedPuzzle {puzzle, solution}, selectCell, setGiven, erase, getPuzzleString, validate, reset, setCellsFromPuzzle` |
| `useGame` *(deprecated)* | `{ maxMistakes?=3, initialSettings? }` | legacy 2D `GameState` API; no sibling repo uses it |

Use `getScrambledPuzzle()` (not `getOriginalPuzzle()`) when calling the solver; boards are scrambled by default.

### Hints

| Export | Input | Output / notes |
|---|---|---|
| `useHint` | **networkClient, baseUrl, token, puzzle, userInput**, pencilmarks, autoPencilmarks, techniqueFilter, onHintReceived, userEntitlements, levelEntitlement | `hint, hints, stepIndex, totalSteps, isLoading, error, accessError, getHint, nextStep, previousStep, clearHint, applyHint → {user, pencilmarks, autoPencilmarks} \| null, hasNextStep, hasPreviousStep, canApply, isTargetTechnique, isHintGated`. Only 2 steps are visible without the level's entitlement |
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
| `useGameSession` | **networkClient, baseUrl, token, userId** | `startSession(GameStartRequest) → {sessionStarted, sessionId?}`, `finishSession(elapsed) → {leveledUp, newBadges, totalPointsEarned, response?}`, `isStarting, isFinishing, isAuthenticated, sessionId`; no-op when unauthenticated |

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
| Scrambler | `Scrambler, NonScrambler, scrambleSudokuBoard(scrambler, cells, symmetrical=false) → {cells, digitMapping, reverseDigitMapping}, parsePuzzleString(puzzle, solution?), cellsToPuzzleString, cellsToStateString, cellsToInputString, cellsToPencilmarksString` |
| Presenter | `presentBoard({cells, selectedIndex, showErrors, hintStep?, selectedDigitCells?}) → CellDisplayState[81], calculateCellHints, themeColorToCSS, getColorPalette(isDark), getCellsWithDigit, getSelectedDigit, computeSelectedDigitCells, convertSolverLink, convertSolverCellGroup, sudokuColorToTheme` |
| Walkthroughs | `parsePencilmarksString, pencilmarksToString, parsePracticeBoard(board, pencilmarks, solution), cloneSudokuBoard, applyHintStep(board, step) → {board, pencilmarks}, parseHintData(json) → SolverHints \| null, localizeHintStep, buildWalkthroughSteps → WalkthroughStep[]` |
| Hint text | `generateDetailedExplanation(step, techniqueId?, digitDisplay?)`, `getHintActionSummary`, `getLocalizedHintText`, `getLocalizedHintTitle`, `localizedField` |
| i18n keys | `getBeltKey` (`belts.N.name`), `getBeltLabelKey` (`belts.N.label`), `getLevelKey` (`levels.N`), `getTechniqueKey` (`techniques.<path>.title`) and `getLocalized*` variants taking an i18next-style `t` |
| Display | `displayDigit(digit, 'numeric'\|'kanji'\|'emojis')`, `formatTime`, `parseTime`, `THEME_STORAGE_KEY, getSystemTheme, resolveTheme, isValidThemePreference` |
| Progress | `calculateStats, calculateStreak, isPuzzleCompleted, getCompletedLevelIds, getCompletedDailyDates, DEFAULT_PROGRESS, PROGRESS_STORAGE_KEY` |
| Subscriptions (RevenueCat) | `convertPackageToProduct, parseCustomerInfo, getPeriodDisplayName, isBestValuePlan, getRevenueCatErrorMessage, DEFAULT_SUBSCRIPTION` |
| Sharing / auth / config | `buildShareUrl, parseShareParams, getWebUrl, isAuthenticatedUser, DEFAULT_AUTH_PROVIDERS, getTechniqueIconUrl` (re-export) |
| Settings / storage keys | `DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY` (`sudojo-settings`), `GAME_STORAGE_PREFIX` (`sudojo_game_`), `getGameStorageKey` |
| Legacy 2D *(deprecated)* | `board.ts`: `cloneBoard, countFilledCells, createGameBoard, getBlockCells, getBlockIndex, getBoardStateString, getColumnCells, getEmptyCells, getPencilmarksString, getRelatedCells, getRowCells, isValidPlacement`; `validation.ts`: `autoRemovePencilmarks, clearHighlights, countMistakes, getIncorrectCells, getProgressPercentage, isBoardFilled, isCellCorrect, isGameComplete, isValueCorrect, updateCellErrors, updateCellHighlights, validateGameState`; `DEFAULT_GAME_SETTINGS` |

## Types and enums

- Modern: `SudokuCell {index, solution, given, input, pencilmarks}`, `SudokuBoard {cells, completed, entering, enteringError}`, `SudokuPlay`, `SudokuPlaySettings`, `SudokuAppSettings`, `SudokuGameState`, `SudokuDisplay`, `PlayingSource` (`'DAILY'|'CHALLENGE'|'LEVEL'|'ENTERED'`).
- Display: `ThemeColor`, `SudokuColor` (string enum matching solver color names), `UIColorLight`, `UIColorDark`, `UIColorPalette`, `CellDisplayState`, `PencilmarkDisplayState`, `HintArea`, `HintCell`, `HintCellActions`, `DisplayHintStep`, `LinkType`, `DisplayLink`, `DisplayCellGroup`.
- App state: `CurrentGame`, `CurrentGameMeta`, `GameSource` (`'daily'|'level'|'entered'`), `GameSlot` (`'daily'|'play'`), `GamePlayState`, `SavedGameState`, `GamePersistenceKey`, `UserProgress`, `CompletedPuzzle`, `GameStats`, `AppSettings`, `DigitDisplay`, `Product`, `Subscription`, `AuthProviderType`, `AuthProvidersConfig`, `ThemePreference`, `ResolvedTheme`, `ShareUrlParams`, `ParsedShareParams`, `AuthUser`, `TranslateFunction`, `WalkthroughStep`.
- Hook option/result types: `Use<Hook>Options` / `Use<Hook>Result` for each hook above, plus `GameFetchStatus`, `HintBoardData`, `HintReceivedData`, `HintAccessError`, `HintActionStatus`, `ContinueTarget`, `ValidatedPuzzle`, `GameSessionResult`, `GameFinishResult`, `ProgressUpdateCallback`.
- Legacy: `CellPosition`, `CellState`, `GameBoard`, `GameHint`, `GameMove`, `GameSettings`, `GameState`, `GameStatus`, `TeachingState`.
