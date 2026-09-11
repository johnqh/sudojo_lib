# CLAUDE.md

> **Git policy — never auto-commit or auto-push.** Leave your work in the working tree.
> Run `git commit`, `git push`, `gh pr create`, or `scripts/push_all.sh` **only when the user
> explicitly asks in that turn**. Approval for an earlier change does not carry forward, and
> finishing a task is not permission to commit it.

This file provides context for AI assistants working on this codebase.

## Project Overview

`@sudobility/sudojo_lib` (v0.0.192) is the platform-neutral **business-logic layer** for the Sudojo
apps: React hooks, a Zustand store, pure utilities and types that sit between the API client
(`sudojo_client`) and the UIs (`sudojo_app` web, `sudojo_app_rn` mobile, `sudojo_ui`, `sudojo_extension`).
No UI components, no styling. Much of it is a port of the Kotlin Android app
("renderable" / `HintInteractor`), and comments reference the Kotlin originals.

Single package (no workspaces), TypeScript ESM, built with `tsc`, published to the **private** npm
scope (`publishConfig.access: restricted`), license BUSL-1.1.

## Commands

**Use Bun** (`bun.lock`). Do not use npm/yarn/pnpm.

| Command | What it does | Verified |
|---|---|---|
| `bun install` | Install deps (needs npm auth for private `@sudobility/*`) | — |
| `bun run build` | `tsc -p tsconfig.build.json` → `dist/` | ✅ (to scratch outDir) |
| `bun run typecheck` | `tsc --noEmit` (strict `tsconfig.json`, **excludes `*.test.ts`**) | ✅ clean |
| `bun run lint` / `lint:fix` | ESLint 9 flat config incl. `prettier/prettier` rule | ✅ clean |
| `bun run format` / `format:check` | Prettier on `src/**/*.ts` (not `.tsx`) | ✅ clean |
| `bun run test:run` | Vitest once (happy-dom) | ✅ 13 files / 275 tests |
| `bun run test` / `test:watch` | Vitest watch mode | — |
| `bun run test:coverage` | Vitest + v8 coverage → `coverage/` (gitignored) | ✅ runs; ~38% lines, exit 0 |
| `bun run check-all` | lint + typecheck + test:run | components ✅ |
| `bun run quick-check` | lint + typecheck | components ✅ |
| `bun run dev` = `build:watch` | `tsc --watch` (**uses `tsconfig.json`, not the build config**) | — |
| `bun run clean` | `rm -rf dist` | — |

Single test file / name filter: `bun run test:run src/utils/time.test.ts`, `bun run test:run -t "formatTime"`.

## Architecture

```
sudojo_types (types, TechniqueId, entitlement helpers)
      │
sudojo_client (NetworkClient API calls + TanStack Query hooks)
      │
sudojo_lib  ◄── this repo: hooks · gamePlayStore · presenter/scrambler · i18n/hint text
      │
      ├── sudojo_ui (presentational components; peer dep on lib)
      ├── sudojo_app (web, Vite)      ├── sudojo_app_rn (React Native, Metro)
      └── sudojo_extension
Hints/validation go lib → sudojo_client → sudojo_api → sudojo_solver (C++ engine)
```

Hook layers:

| Layer | Hooks |
|---|---|
| Data (TanStack Query via `sudojo_client`) | `useLevels`/`useLevel`, `useTechniques`/`useTechnique`, `useLearning`/`useLearningItem`, `useCommunities`, `useRegeneratePracticeHints` (admin) |
| Game fetching (auth/subscription status) | `useLevelGame`, `useDailyGame` |
| Game state | `useSudoku` ⭐ (flat 81 cells, reducer), `useBoardEntry` (manual entry + solver validate), `useGame` (legacy 2D, **deprecated**) |
| Features | `useHint` ⭐, `useGameTeaching` (legacy), `useGameTimer`, `useGamePersistence`/`useAutoSave`, `useLocalStorage`, `useHintStepTracker`, `useAutoHint`, `useProgressReporter`, `useHintActionListener` |
| Orchestration / app | `useGamePlay` (+ `useGamePlayStore`), `useContinueGame`, `useGameSession`, `useLevelEnabled`/`useTechniqueEnabled` (+ `EntitlementProvider`), `useDisplayLevel`, `usePuzzleDistribution` |

## Repo Map

```
src/
├── index.ts          # THE public API: every export, with JSDoc (853 lines). Barrels below feed it.
├── hooks/            # 25 hook files (30 exported hooks) + index.ts barrel; tests: useGame, useSudoku
├── stores/gamePlayStore.ts   # Zustand persist store, 2 slots (daily/play), key 'sudojo-current-game', v2
├── types/            # sudoku.ts (flat 81-cell), game.ts (legacy 2D), display.ts (colors, hint display),
│                     # currentGame, gamePersistence, progress, settings, subscription
├── utils/            # sudokuScrambler, sudokuPresenter, techniqueWalkthrough, hintExplanation (~1.1k lines),
│                     # localizedHint, i18nKeys, shareUrl, progress, subscription (RevenueCat), theme, time,
│                     # digitDisplay, auth, technique (re-export), board + validation (legacy 2D)
├── context/          # EntitlementContext.ts, EntitlementProvider.tsx (only .tsx file)
├── config/           # authProviders.ts (DEFAULT_AUTH_PROVIDERS)
└── test/setup.ts     # Vitest setup: mocks localStorage, window listeners, matchMedia
docs/API.md           # Full export reference (hook options/results)
plans/IMPROVEMENTS.md # Improvement backlog (historical; items marked DONE/SKIPPED)
.github/workflows/ci-cd.yml  # Calls johnqh/workflows unified-cicd.yml (npm-access: restricted)
dist/                 # Build output (gitignored); package `files` = dist/**/*
```

## Public API (summary — full list in `docs/API.md`, source of truth `src/index.ts`)

| Area | Main exports |
|---|---|
| Game state | `useSudoku`, `SudokuCell`/`SudokuBoard`/`SudokuPlay`, `rowOf`/`columnOf`/`blockOf`/`cellIndex`, `getRelatedIndices`, `createEmptyBoard` |
| Hints | `useHint`, `useAutoHint`, `useHintStepTracker`, `emitHintAction`/`onHintStatus`/`reportHintStatus`/`useHintActionListener`, `generateDetailedExplanation`, `getHintActionSummary`, `getLocalizedHintText`/`Title` |
| Rendering | `presentBoard`, `calculateCellHints`, `themeColorToCSS`, `getColorPalette`, `convertSolverLink`/`CellGroup`, `sudokuColorToTheme`, `ThemeColor`, `SudokuColor`, `UIColorLight`/`Dark`, `displayDigit` |
| Puzzles & strings | `Scrambler`, `NonScrambler`, `scrambleSudokuBoard`, `parsePuzzleString`, `cellsTo{Puzzle,State,Input,Pencilmarks}String` |
| Walkthroughs | `buildWalkthroughSteps`, `parsePracticeBoard`, `parseHintData`, `applyHintStep`, `parsePencilmarksString` |
| Persistence | `useGamePlay`, `useGamePlayStore`, `useContinueGame`, `useGamePersistence`, `useAutoSave`, `useLocalStorage`, `*_STORAGE_KEY` constants |
| Server data | `useLevels`, `useTechniques`, `useLearning`, `useCommunities`, `useLevelGame`, `useDailyGame`, `useBoardEntry`, `useGameSession` |
| Entitlements | `EntitlementProvider`, `useEntitlementContext`, `useLevelEnabled`, `useTechniqueEnabled`, `usePuzzleDistribution`, re-exported `parseEntitlements`/`hasRequiredEntitlement` |
| Misc | progress stats/streaks, RevenueCat converters, theme, time, i18n keys, share URLs, `isAuthenticatedUser`, `DEFAULT_AUTH_PROVIDERS` |
| Legacy (deprecated) | `useGame`, `useGameTeaching`, 2D `GameBoard` utils (`createGameBoard`, `validateGameState`, …) |

## Key Behaviors

- **`useSudoku`** — reducer actions `LOAD_BOARD, SELECT_CELL, DESELECT_CELL, INPUT, TOGGLE_PENCIL_MODE,
  SET_PENCIL_MODE, UNDO, ERASE, AUTO_PENCILMARKS, UPDATE_APP_SETTINGS, RESET, APPLY_HINT_DATA`; undo
  stack of previous `SudokuPlay` states. `loadBoard(puzzle, solution, {scramble=true, symmetrical=false, source='LEVEL', levelUuid, boardUuid})`.
- **Scrambling** — `scrambleSudokuBoard(scrambler, cells, symmetrical) → {cells, digitMapping, reverseDigitMapping}`;
  deterministic (seed = hash of cells), permutes rows/columns/digits.
- **`useHint`** — first `getHint()` calls `solverSolve`; later calls advance steps until the puzzle
  state (`puzzle|userInput|pencilmarks`) changes. `techniqueFilter` → filtered request first, then an
  unfiltered fallback (`isTargetTechnique` tells which). Without the level's entitlement only
  `FREE_HINT_STEP_LIMIT = 2` steps are visible, `canApply` is false, and `accessError` is set; a server
  402 (`HintAccessDeniedError`) also lands in `accessError`. `applyHint()` returns `{user, pencilmarks, autoPencilmarks}` and clears.
- **`gamePlayStore`** — slots `dailyGame`/`playGame`; persist migrations v0 (single `currentGame`) → v1 (two slots) → v2 (adds `autoPencilmarks`).

## Conventions

- Every public symbol is exported from `src/index.ts` with a JSDoc comment; hooks also go through `src/hooks/index.ts`, utils through `src/utils/index.ts`, types through `src/types/index.ts`. Unexported = private.
- Hooks: `use*`; types `Use*Options` / `Use*Result` (`useBoardEntry` uses `UseBoardEntryReturn`).
- API-calling hooks take `networkClient` + `baseUrl` (+ `token` where auth applies) as options; nothing is resolved from a DI container.
- Board strings: 81 chars row-major, `0`/`.` empty; pencilmarks = 81 comma-separated digit groups; `index = row*9 + col`.
- Pure/immutable utils; reducers for complex state; `useRef` for non-rendering state (`useGameTimer`).
- Strict TS in `tsconfig.json` (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, …).
- Prettier: single quotes, semicolons, trailing commas es5, width 80, 2 spaces, `arrowParens: avoid`. ESLint enforces `sort-imports` (members only), `prefer-template`, `object-shorthand`; unused vars allowed with `_` prefix.
- Mark superseded APIs `@deprecated` instead of removing them (consumers pin exact versions, see below).

## Gotchas

- **`loadBoard` scrambles by default.** Send `getScrambledPuzzle()` (what the user sees) to the solver, not `getOriginalPuzzle()`; input/pencilmark strings are in scrambled space.
- **Two digit-display types:** `SudokuDisplay` (`'NUMERIC'|'KANJI'|'COLORS'|'EMOJIS'`, useSudoku settings) vs `DigitDisplay` (`'numeric'|'kanji'|'emojis'`, used by `displayDigit`, hint text, consumers). `displayDigit` has no colors mode.
- **`0.0.x` caret ranges pin exactly:** `^0.0.150` accepts only `0.0.150`. Every `sudojo_client` release forces a lib bump (hence the `git log`), and consumers' `^0.0.192` accepts only this version.
- **Module-level singletons:** `useGamePlayStore` and the hint-action event bus (`useHintAction.ts`) break silently if a consumer bundles two copies of the lib; keep it deduped.
- Providers needed by consumers: `QueryClientProvider` (data/fetching hooks, `useLevelGame` calls `useQueryClient`); `EntitlementProvider` (else `useLevelEnabled` sees `[]` and paid levels are disabled).
- `dist/` is **bundler-only**: emitted ESM has extensionless/directory imports, so `node -e "import('./dist/index.js')"` fails (`ERR_UNSUPPORTED_DIR_IMPORT`). Vite/Metro are fine.
- `typecheck` skips test files (excluded in `tsconfig.json`); only ESLint parses them (`tsconfig.eslint.json`).
- `tsconfig.build.json` relaxes `exactOptionalPropertyTypes`/`noUncheckedIndexedAccess` and sets `removeComments: false`; keep the latter or JSDoc disappears from `.d.ts`.
- `src/test/setup.ts` replaces `localStorage` with `vi.fn()` stubs (nothing persists; `getItem` → `undefined`), so tests needing storage must stub their own.
- `UIColorLight`/`UIColorDark` hex values are intentional (iOS system palette for `<canvas>` rendering); do not replace with design-system className tokens (see comment in `types/display.ts`).
- `@sudobility/di` is a peer/dev dependency that `src/` never imports; it is required by `sudojo_client`.

## Known Issues (not fixed)

- **No coverage threshold.** `test:coverage` (and the misleadingly named `test:coverage:threshold`) only report (~38% lines). The old 70% threshold was mis-nested under `global:` and never enforced, so it was removed (owner decision, 2026-09-10). `coverage.all` is a removed Vitest option and is ignored.
- `useGamePersistence` ignores its `autoSave` and `debounceMs` options (only `puzzleKey` is read); use `useAutoSave`.
- `useDailyGame` ignores `enabled` (destructured as `_enabled`), and computes today's date once per mount.
- `src/test/setup.ts` is compiled into `dist/test/` and shipped (unreachable via `exports`, imports `vitest`).
- No tests for most hooks (`useHint`, `useGamePlay`, `useGameSession`, …) or for `hintExplanation`, `localizedHint`, `shareUrl`, `techniqueWalkthrough`.

## Cross-Repo Contracts

| Sibling | Relationship | Keep in sync |
|---|---|---|
| `@sudobility/sudojo_types` ^1.2.67 | peer + dev dep | `SolverHintStep`/`SolverBoard`/`SolverColor` shapes; `TechniqueId` (used by `hintExplanation`, 24 techniques explained, rest fall to default); `hasRequiredEntitlement`, `getBeltForLevel`, `getSubscriptionOfferId` |
| `@sudobility/sudojo_client` ^0.0.150 | peer + dev dep | `solverSolve` options (`original,user,autoPencilmarks,pencilmarks,techniques`), `HintAccessDeniedError`, `useSudojo*` hooks, `useSolverValidate` |
| `@sudobility/types` ^1.9.67, `@sudobility/di` ^1.5.65 | peer + dev deps | `NetworkClient`, `BaseResponse` |
| `sudojo_solver` (via api) | indirect | `SudokuColor` string values must cover the solver's color names; hint areas/cells/links/groups consumed by `calculateCellHints`/`presentBoard` |
| `sudojo_app` | dep `^0.0.192` (~32 files) | share URLs `/daily` and `/play/puzzle?level&original&user&autopencilmarks&pencilmarks&hint`; `getWebUrl` strips `api.` from the API host |
| `sudojo_app_rn` | dep `^0.0.192` (~30 files) | shims `localStorage`, then swaps `useGamePlayStore.persist` storage to AsyncStorage, so the store must stay a default Zustand `persist` store named `sudojo-current-game` |
| `sudojo_ui` | peer + dev `^0.0.192` | presenter/color exports, `displayDigit`, `formatTime`, `DigitDisplay` |
| `sudojo_extension` | dep `^0.0.192` | `useSudoku`, `useHint`, `useBoardEntry`, `getHintActionSummary` |
| app i18n files | runtime | keys `belts.N.name`, `belts.N.label`, `levels.N`, `techniques.<path>.title`, and hint `stringKey`s |

No sibling consumer imports `useGame`, `useGameTeaching`, or the legacy 2D board/validation utilities.

## Release Flow (document only; never run unprompted)

1. Family release is driven from `sudojo_app/scripts/push_all.sh` (order: types → ocr → api → client → **lib** → ui → app → app_rn → extension → bot; 60 s wait after lib). Per repo it updates `@sudobility` deps, runs typecheck/lint/test/build, bumps the patch version, commits and pushes.
2. Push to `main` runs `.github/workflows/ci-cd.yml` → `johnqh/workflows` `unified-cicd.yml`: typecheck, lint, test, build, then `npm publish --access restricted` if that `package.json` version is not yet on npm. `develop` and unmerged PRs never publish.
3. `prepublishOnly` = `clean && build`. There is no manual publish step in normal use.

## Common Tasks

- **Add a hook:** create `src/hooks/useX.ts` with `UseXOptions`/`UseXResult`, export from `src/hooks/index.ts`, then from `src/index.ts` with JSDoc; add a `renderHook` test (`@testing-library/react`); run `bun run check-all`; update `docs/API.md`.
- **Add a util:** add to `src/utils/<area>.ts`, export via `src/utils/index.ts` and `src/index.ts`, add `*.test.ts` beside it.
- **Change a public signature:** grep consumers first (`grep -rn "@sudobility/sudojo_lib" ../sudojo_{app,app_rn,ui,extension}/src`), prefer additive changes + `@deprecated`.
- **Test against a local consumer:** `bun link` here, `bun link @sudobility/sudojo_lib` in the consumer (push_all strips these symlinks).

## Git Workflow

- Do not use feature branches for code changes. Always stay on the current branch.
