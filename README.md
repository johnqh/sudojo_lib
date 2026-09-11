# @sudobility/sudojo_lib

Business logic library for Sudojo with React hooks for game state, hints, and Sudoku operations.

## Installation

```bash
bun add @sudobility/sudojo_lib
```

Published with restricted access: installing requires npm credentials for the `@sudobility` scope.

## Usage

```typescript
import { useSudoku, useHint, presentBoard } from '@sudobility/sudojo_lib';

function Game({ puzzle, solution, networkClient, baseUrl, token }) {
  const sudoku = useSudoku();
  useEffect(() => sudoku.loadBoard(puzzle, solution), [puzzle, solution]);

  const { hint, getHint, applyHint, isLoading } = useHint({
    networkClient,
    baseUrl,
    token,
    puzzle: sudoku.getScrambledPuzzle(), // boards are scrambled by default
    userInput: sudoku.getInputString(),
    pencilmarks: sudoku.getPencilmarksString(),
  });

  const cells = presentBoard({
    cells: sudoku.board?.cells ?? [],
    selectedIndex: sudoku.selectedIndex,
    showErrors: true,
  });
}
```

Server-data hooks (`useLevels`, `useDailyGame`, `useLevelGame`, `useBoardEntry`, `useGameSession`, ...)
need a TanStack `QueryClientProvider`; `useLevelEnabled` / `useTechniqueEnabled` read from `EntitlementProvider`.

## API

- **Game state**: `useSudoku` (flat 81-cell board; replaces deprecated `useGame`), `useBoardEntry`
- **Hints**: `useHint`, `useAutoHint`, hint text and technique walkthrough builders
- **Persistence**: `useGamePlay` / `useGamePlayStore` (Zustand, daily + play slots), `useGameTimer`
- **Server data**: `useLevels`, `useTechniques`, `useLearning`, `useCommunities`, `useDailyGame`, `useLevelGame`, `useGameSession`
- **Utilities**: `presentBoard`, scrambler and puzzle-string helpers, progress, time, theme, i18n keys, share URLs

Full reference: [docs/API.md](docs/API.md). Shared by `sudojo_app` (web), `sudojo_app_rn` (mobile),
`sudojo_ui`, and `sudojo_extension`.

## Development

```bash
bun run build        # Build to dist/
bun run test         # Run Vitest
bun run test:run     # Run tests once
bun run typecheck    # TypeScript check
bun run lint         # ESLint
bun run check-all    # Lint + typecheck + tests
```

## Related Packages

- `@sudobility/sudojo_client` -- API client hooks (peer dependency)
- `@sudobility/sudojo_types` -- Type definitions (peer dependency)
- `@sudobility/types`, `@sudobility/di`, `@tanstack/react-query`, `react`, `zustand` -- other peer dependencies
- `sudojo_app` / `sudojo_app_rn` / `sudojo_ui` / `sudojo_extension` -- Consumers

## License

BUSL-1.1
