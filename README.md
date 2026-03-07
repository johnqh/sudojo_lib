# @sudobility/sudojo_lib

Business logic library for Sudojo with React hooks for game state, hints, and Sudoku operations.

## Installation

```bash
bun add @sudobility/sudojo_lib
```

## Usage

```typescript
import { useBoard, useHint, useGameSession } from '@sudobility/sudojo_lib';

function GameComponent() {
  const { board, setCell, clearCell } = useBoard(initialPuzzle);
  const { getHint, isLoading } = useHint();
  const { startGame, endGame, timer } = useGameSession();
}
```

```typescript
import { validateBoard, isBoardComplete, getCandidates } from '@sudobility/sudojo_lib';

const isValid = validateBoard(board);
const candidates = getCandidates(board, row, col);
```

## API

- **Hooks**: `useBoard`, `useHint`, `useGameSession`, `useSudoku` (replaces deprecated `useGame`)
- **Utilities**: `validateBoard`, `isBoardComplete`, `getCandidates`, and more
- Shared between web (`sudojo_app`) and mobile (`sudojo_app_rn`) apps

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
- `@sudobility/sudojo_types` -- Type definitions
- `sudojo_app` / `sudojo_app_rn` -- Consumer apps

## License

BUSL-1.1
