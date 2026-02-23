# Improvement Plans for @sudobility/sudojo_lib

## Priority 1 - High Impact

### 1. Add JSDoc to All Exported Hooks and Their Options/Result Types
- The library exports 15+ hooks (`useSudoku`, `useGameTeaching`, `useLevelGame`, `useDailyGame`, `useGameTimer`, `useGamePersistence`, `useHint`, `useGamePlay`, `useBoardEntry`, `useGameSession`, etc.) but `src/index.ts` exports lack JSDoc.
- Each hook's options type (e.g., `UseSudokuOptions`, `UseHintOptions`, `UseGamePlayOptions`) and result type should document expected inputs, return values, and lifecycle behavior.
- The `useGame` hook is documented as deprecated in CLAUDE.md but this deprecation is not reflected in JSDoc annotations on the export itself. Adding `@deprecated` JSDoc tags would surface warnings in IDEs.
- The distinction between `useGame` (legacy 2D array) and `useSudoku` (flat 81-cell array) is critical but only documented in CLAUDE.md, not in code.
- The exported utility functions from `src/utils/` (30+ exports including `presentBoard`, `calculateCellHints`, `themeColorToCSS`, `scrambleSudokuBoard`, etc.) lack JSDoc documentation.

### 2. Expand Test Coverage for Hooks
- Only 2 hook test files exist: `useGame.test.ts` and `useSudoku.test.ts`. The remaining 13+ hooks have no test files: `useGameTeaching`, `useLevelGame`, `useDailyGame`, `useGameTimer`, `useGamePersistence`, `useHint`, `useGamePlay`, `useBoardEntry`, `useGameSession`, `useLevels`, `useTechniques`, `useLearning`, `useLocalStorage`.
- The `useHint` hook integrates with the solver service and has complex error handling (including `HintAccessError` and `HintAccessDeniedError`). This critical path needs test coverage.
- `useGameSession` manages the gamification flow (start -> play -> finish) and interacts with multiple API endpoints. Testing this end-to-end hook is important.
- `useGamePersistence` and `useAutoSave` handle local storage persistence of game state, which is critical for user experience.

### 3. Improve Test Coverage for Utility Functions
- Only `board.test.ts` and `validation.test.ts` exist in `src/utils/`. The following utility modules have no test files: `sudokuPresenter.ts`, `sudokuScrambler.ts`, `hintExplanation.ts`, `localizedHint.ts`, `progress.ts`, `subscription.ts`, `theme.ts`, `time.ts`, `digitDisplay.ts`, `i18nKeys.ts`, `technique.ts`.
- The `presentBoard` function in `sudokuPresenter.ts` converts game state to display state and is used by both web and mobile apps. Bugs here affect rendering on all platforms.
- The `calculateCellHints` function processes solver hint data into display-ready state and has complex logic for areas, cells, links, and groups.
- Progress utilities (`calculateStats`, `calculateStreak`, `isPuzzleCompleted`) handle user data persistence and should be thoroughly tested.

## Priority 2 - Medium Impact

### 4. Clean Up Legacy Code and Reduce Export Surface
- The `index.ts` exports both legacy utilities (`cloneBoard`, `createGameBoard`, `getBlockCells`, etc. from `useGame` era) and modern utilities (`parsePuzzleString`, `cellsToPuzzleString`, etc. from `useSudoku` era). The legacy exports should be marked as deprecated.
- Types are split across multiple categories in `index.ts` (Legacy Types, Sudoku Types, Display types, Progress Types, Settings Types, Subscription Types, Game Persistence Types, Current Game Types) with no clear migration path documented.
- The `GamePlayState` store type and `useGamePlayStore` zustand store are exported but their relationship to the hooks is not documented.

### 5. Add Error Boundaries and Graceful Degradation
- The `useHint` hook interacts with an external solver service. Error handling for network failures, timeouts, and invalid responses should be robust and well-documented.
- The `useGamePersistence` hook relies on localStorage which can throw (full storage, private browsing). Error handling for storage failures should be verified.
- The `useLevelGame` and `useDailyGame` hooks handle auth and subscription state. The `GameFetchStatus` type suggests multiple failure modes, but the error handling paths need documentation.

### 6. Document the Hook Composition Architecture
- The hooks form a layered architecture: data hooks (`useLevels`, `useTechniques`) -> game hooks (`useSudoku`, `useGameTeaching`) -> orchestration hooks (`useGamePlay`, `useGameSession`). This composition pattern is not documented.
- The relationship between `useSudoku` (game state), `useHint` (solver integration), `useGameTeaching` (hint UI state), and `useGamePlay` (overall game flow) should be documented with a dependency diagram or narrative explanation.
- The `useGamePlay` hook appears to be the primary integration point for app consumers but its relationship to individual hooks is unclear from the exports alone.

## Priority 3 - Nice to Have

### 7. Extract Theme and Color Utilities into Shared Package
- Theme utilities (`ThemeColor`, `SudokuColor`, `UIColorLight`, `UIColorDark`, `themeColorToCSS`, `getColorPalette`) are defined here but used by both web and mobile apps. They could potentially be shared via `@sudobility/components` or a dedicated theme package to avoid the lib depending on presentation concerns.
- The `ThemePreference` and `ResolvedTheme` types plus `resolveTheme` and `getSystemTheme` utilities are app-level concerns that sit oddly in a business logic library.

### 8. Add Performance Optimization for Board Operations
- The `presentBoard` function in `sudokuPresenter.ts` is called on every render cycle and processes 81 cells with their hint states, pencilmarks, and display properties. Memoization strategies or incremental updates could improve rendering performance for complex hint visualizations.
- The `scrambleSudokuBoard` function performs multiple array transformations. For performance-critical paths, consider pre-computing or caching scramble results.

### 9. Improve Configuration and Feature Flag Support
- The `AuthProviderType` and `AuthProvidersConfig` types with `DEFAULT_AUTH_PROVIDERS` suggest a configuration system, but it is not clear how this interacts with the DI system (`@sudobility/di`).
- Consider adding a configuration hook that validates all required dependencies (API client, solver URL, auth provider) are properly configured at app startup, providing clear error messages for missing configuration.
