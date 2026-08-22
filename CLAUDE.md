# CLAUDE.md

> **Git policy — never auto-commit or auto-push.** Leave your work in the working tree.
> Run `git commit`, `git push`, `gh pr create`, or `scripts/push_all.sh` **only when the user
> explicitly asks in that turn**. Approval for an earlier change does not carry forward, and
> finishing a task is not permission to commit it.

This file provides context for AI assistants working on this codebase.

## Project Overview

`@sudobility/sudojo_lib` is the business logic library shared between Sudojo web and mobile apps. It provides the game engine layer between raw API data (`sudojo_client`) and UI rendering (`sudojo_app`, `sudojo_app_rn`):

- **Game state hooks** — `useSudoku` (modern flat 81-cell), `useGame` (legacy 2D, deprecated)
- **Game feature hooks** — hints, teaching mode, timer, persistence, auto-hint, board entry
- **Data fetching hooks** — levels, daily games, techniques, learning, practices
- **Orchestration hooks** — game play slots, game sessions (gamification)
- **Utility functions** — board scrambling (Kotlin port), display rendering, progress tracking, share URLs
- **Type definitions** — SudokuCell, SudokuBoard, SudokuPlay, display colors, game persistence
- **Zustand store** — game play slots with versioned localStorage persistence

Published to npm under `@sudobility` scope.

## Runtime & Package Manager

**This project uses Bun.** Do not use npm, yarn, or pnpm.

```bash
bun install            # Install dependencies
bun run build          # Build to dist/ (tsc)
bun run build:watch    # Build in watch mode
bun run dev            # Alias for build:watch
bun run clean          # Remove dist/
bun run test           # Run tests (vitest, watch mode)
bun run test:run       # Run tests once
bun run test:watch     # Run tests in watch mode
bun run test:coverage  # Run tests with coverage (70% threshold)
bun run typecheck      # Type-check without emitting
bun run typecheck:watch # Watch mode type checking
bun run lint           # Run ESLint
bun run lint:fix       # ESLint with auto-fix
bun run format         # Format with Prettier
bun run format:check   # Check formatting
bun run check-all      # Run lint + typecheck + tests
bun run quick-check    # Run lint + typecheck only
```

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (ESM, maximum strictness)
- **Testing**: Vitest + @testing-library/react + happy-dom
- **React**: React 18+ (peer dependency)
- **State**: Zustand 5+ (peer dependency) for game slots
- **Data Fetching**: @tanstack/react-query 5+ (peer dependency)
- **DI**: @sudobility/di for dependency injection

## Project Structure

```
src/
├── index.ts                    # Main exports (~600 lines with JSDoc)
├── hooks/                      # 26 React hooks (5-tier architecture)
│   ├── useSudoku.ts           # ⭐ Primary game state (flat 81-cell, reducer pattern)
│   ├── useGame.ts             # Legacy 2D array board (DEPRECATED)
│   ├── useHint.ts             # Solver hint integration with step navigation
│   ├── useGameTeaching.ts      # Step-by-step teaching mode
│   ├── useLevels.ts           # Fetch difficulty levels
│   ├── useLevelGame.ts        # Fetch board for level (with entitlement gating)
│   ├── useDailyGame.ts        # Fetch daily puzzle
│   ├── useGamePlay.ts         # Zustand-backed game slot management
│   ├── useGameSession.ts      # Server gamification (start/finish/badges)
│   ├── useGameTimer.ts        # Non-rendering elapsed time (useRef-based)
│   ├── useGamePersistence.ts  # localStorage save/restore
│   ├── useBoardEntry.ts       # Manual puzzle entry mode
│   ├── useLocalStorage.ts     # Generic typed localStorage hook
│   ├── useTechniques.ts       # Fetch solving techniques
│   ├── useLearning.ts         # Fetch learning materials
│   ├── useEntitlement.ts      # Subscription entitlements
│   ├── useDisplayLevel.ts     # Display level conversion
│   ├── usePuzzleDistribution.ts # Puzzle data aggregation
│   ├── useAutoHint.ts         # Auto-hint orchestration
│   ├── useHintAction.ts       # Hint action events
│   ├── useHintStepTracker.ts  # Shared hint step tracking
│   ├── useProgressReporter.ts # Progress reporting
│   ├── usePractices.ts        # Practice puzzles
│   └── [test files]
├── stores/
│   └── gamePlayStore.ts        # Zustand store with 2 game slots + localStorage
├── types/
│   ├── sudoku.ts              # SudokuCell, SudokuBoard, SudokuPlay (flat 81-cell)
│   ├── game.ts                # Legacy GameBoard, GameState (2D array)
│   ├── display.ts             # ThemeColor, SudokuColor, HintStep
│   ├── progress.ts            # Completion tracking
│   ├── settings.ts            # App settings
│   ├── currentGame.ts         # Current game state
│   ├── gamePersistence.ts     # Persistence types
│   ├── subscription.ts        # Subscription types
│   └── index.ts
├── utils/
│   ├── sudokuScrambler.ts     # Board scrambling (Kotlin port, seeded RNG)
│   ├── sudokuPresenter.ts     # Display/rendering logic (Kotlin renderable port)
│   ├── board.ts               # Board manipulation (legacy 2D)
│   ├── validation.ts          # Game state validation (legacy 2D)
│   ├── progress.ts            # Progress calculation, stats, streaks
│   ├── technique.ts           # Technique utilities
│   ├── techniqueWalkthrough.ts # Teaching walkthrough
│   ├── hintExplanation.ts     # Hint explanations
│   ├── localizedHint.ts       # i18n for hints
│   ├── digitDisplay.ts        # Display modes (NUMERIC, KANJI, COLORS, EMOJIS)
│   ├── subscription.ts        # Subscription/entitlement logic
│   ├── shareUrl.ts            # Share link generation
│   ├── time.ts                # Time formatting
│   ├── theme.ts               # Theme utilities
│   ├── auth.ts                # Auth utilities
│   ├── i18nKeys.ts            # i18n key constants
│   └── index.ts
├── context/
│   └── EntitlementContext.ts  # Entitlement provider/consumer
├── config/
│   └── authProviders.ts       # Auth provider configuration
├── test/
│   └── setup.ts               # Vitest + happy-dom mocks
dist/                           # Built output (git-ignored)
```

## Hook Architecture (5 Tiers)

```
Tier 1: Data Hooks (fetch from API via sudojo_client)
├── useLevels / useLevel, useTechniques, useLearning

Tier 2: Game Fetching Hooks (auth-aware puzzle loading)
├── useLevelGame (with entitlement gating), useDailyGame, useBoardEntry

Tier 3: Game State Hooks (manage board/input state)
├── useSudoku ⭐ (modern: flat 81-cell, reducer pattern)
├── useGame (legacy: 2D array, DEPRECATED)

Tier 4: Feature Hooks (specific functionality)
├── useHint, useGameTeaching, useGameTimer, useGamePersistence,
│   useAutoHint, useHintAction, useLocalStorage

Tier 5: Orchestration Hooks (combine multiple hooks)
├── useGamePlay (Zustand game slots), useGameSession (server gamification)
```

## Key Patterns

### useSudoku (Primary Game State)

Flat 81-cell board with reducer pattern:

```typescript
interface SudokuCell {
  index: number;              // 0-80
  solution: number | null;    // 1-9
  given: number | null;       // 1-9 (clues)
  input: number | null;       // 1-9 (user entries)
  pencilmarks: number[] | null;
}

interface SudokuBoard {
  cells: SudokuCell[];        // Array of 81
  completed: boolean;
  entering: boolean;          // Manual entry mode?
}

interface SudokuPlay {
  board: SudokuBoard;
  settings: SudokuPlaySettings;
  selectedIndex: number | null; // 0-80
}
```

**Reducer actions**: LOAD_BOARD, SELECT_CELL, DESELECT_CELL, INPUT, TOGGLE_PENCIL_MODE, UNDO, ERASE, AUTO_PENCILMARKS, APPLY_HINT_DATA, RESET.

Supports undo stack (stores previous SudokuPlay states).

### useHint (Solver Integration)

Multi-step hint system with subscription gating:

- First `getHint()` fetches from solver API
- Subsequent calls advance to next step (or fetch new batch)
- Manual navigation: `nextStep()`, `previousStep()`
- `applyHint()` applies last step and clears state
- FREE_HINT_STEP_LIMIT = 2 (free steps before paywall)
- Checks userEntitlements vs levelEntitlement

### Game Persistence (Zustand Store)

`gamePlayStore` with two independent slots:

```typescript
interface GamePlayState {
  dailyGame: CurrentGame | null;  // Daily puzzle slot
  playGame: CurrentGame | null;   // Level/entered puzzle slot
  startGame(slot, source, board, solution)
  updateProgress(slot, inputString, pencilmarks, ...)
  clearGame(slot)
}
```

Versioned localStorage (v0 → v1 → v2 migrations). Tracks puzzle, solution, inputString, pencilmarks, isPencilMode, autoPencilmarks, elapsedTime, timestamps.

### Board Scrambling (Kotlin Port)

Deterministic scrambling using seeded RNG (hash of original cells):

```typescript
scrambleBoard(scrambler, cells, symmetrical) → {
  scrambledCells, digitMapping, reverseDigitMapping
}
```

Row, column, digit permutations with optional symmetrical mode.

### Display Rendering (sudokuPresenter.ts)

Color system ported from Kotlin:
- `SudokuColor` enum: BLUE, GREEN, YELLOW, ORANGE, RED, etc.
- Maps to `ThemeColor`: SELECTED, SUCCESS, WARNING, ERROR, etc.
- Light/dark mode variants (UIColorLight, UIColorDark)
- Hint processing: areas → cell highlights, links → chain visualization

### Digit Display Modes

Four display modes: NUMERIC (1-9), KANJI (一-九), COLORS, EMOJIS. Configured per user.

## Deprecation Notice

**`useGame` is deprecated.** Use `useSudoku` instead. `useGame` uses a legacy 2D array board representation, while `useSudoku` uses a flat 81-cell array consistent with the rest of the codebase.

## Peer Dependencies

Required in the consuming app:
- `@sudobility/di` ^1.5.56 — Dependency injection
- `@sudobility/sudojo_client` ^0.0.110 — API client hooks
- `@sudobility/sudojo_types` ^1.2.55 — Type definitions
- `@sudobility/types` ^1.9.62 — Common types
- `@tanstack/react-query` >=5.0.0 — Data fetching
- `react` >=18.0.0
- `zustand` >=5.0.0 — State management

## Code Conventions

- Export all public APIs from `src/index.ts` with JSDoc comments
- Hooks follow `use*` naming; types follow `Use*Options` / `Use*Result`
- Utility functions are pure/immutable when possible
- Reducer pattern for complex state (useSudoku, useGame)
- `useRef` for non-rendering state (useGameTimer)
- `useMemo`/`useCallback` for optimization
- TypeScript maximum strictness (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `useUnknownInCatchVariables`)
- Prettier: single quotes, semicolons, trailing commas (es5), 80 chars, 2 spaces, avoid arrow parens
- Coverage thresholds: 70% (branches, functions, lines, statements)

## Publishing

```bash
# Bump version in package.json
bun run prepublishOnly  # Runs clean + build
npm publish             # Publish to npm
```

## Common Tasks

### Add New Hook
1. Create hook file in `src/hooks/`
2. Identify which tier it belongs to (data, fetching, state, feature, orchestration)
3. Compose with existing hooks where appropriate
4. Export from `src/index.ts` with JSDoc
5. Add comprehensive tests
6. Run `bun run check-all`

### Add New Utility Function
1. Add function to appropriate file in `src/utils/`
2. Keep functions pure when possible
3. Export from `src/utils/index.ts` and `src/index.ts`
4. Add unit tests

### Debug Tests
```bash
bun run test:watch     # Interactive test mode
bun run test:coverage  # See coverage gaps
```

## Git Workflow

- Do not use feature branches for code changes. Always stay on the current branch.
