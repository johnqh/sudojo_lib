# CLAUDE.md

This file provides context for AI assistants working on this codebase.

## Project Overview

`@sudobility/sudojo_lib` is the business logic library for Sudojo apps. It provides:
- React hooks for game state management
- Utility functions for Sudoku operations
- Type definitions and helpers
- Shared business logic between web and mobile apps

Published to npm under `@sudobility` scope for use across Sudojo applications.

## Runtime & Package Manager

**This project uses Bun.** Do not use npm, yarn, or pnpm.

```bash
bun install            # Install dependencies
bun run build          # Build to dist/
bun run build:watch    # Build in watch mode
bun run dev            # Alias for build:watch
bun run clean          # Remove dist/
bun run test           # Run tests (vitest)
bun run test:run       # Run tests once
bun run test:watch     # Run tests in watch mode
bun run test:coverage  # Run tests with coverage
bun run typecheck      # Type-check without emitting
bun run lint           # Run ESLint
bun run lint:fix       # ESLint with auto-fix
bun run format         # Format with Prettier
bun run check-all      # Run lint + typecheck + tests
bun run quick-check    # Run lint + typecheck only
```

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (ESM)
- **Testing**: Vitest + @testing-library/react + happy-dom
- **React**: React 18+ (peer dependency)
- **Data Fetching**: @tanstack/react-query (peer dependency)
- **DI**: @sudobility/di for dependency injection

## Project Structure

```
src/
├── index.ts           # Main exports
├── hooks/             # React hooks
│   ├── useBoard.ts    # Board state management
│   ├── useHint.ts     # Hint system hooks
│   ├── useGame.ts     # Game session hooks
│   └── ...
├── utils/             # Utility functions
│   ├── board.ts       # Board manipulation
│   ├── validation.ts  # Sudoku validation
│   └── ...
├── types/             # Internal type definitions
└── test/              # Test utilities and setup
dist/                  # Built output (git-ignored)
```

## Usage Patterns

### React Hooks
```typescript
import { useBoard, useHint, useGameSession } from '@sudobility/sudojo_lib';

function GameComponent() {
  const { board, setCell, clearCell } = useBoard(initialPuzzle);
  const { getHint, isLoading } = useHint();
  const { startGame, endGame, timer } = useGameSession();
  // ...
}
```

### Utility Functions
```typescript
import { validateBoard, isBoardComplete, getCandidates } from '@sudobility/sudojo_lib';

const isValid = validateBoard(board);
const candidates = getCandidates(board, row, col);
```

## Peer Dependencies

This library requires these peer dependencies in the consuming app:
- `@sudobility/di` - Dependency injection
- `@sudobility/sudojo_client` - API client
- `@sudobility/sudojo_types` - Type definitions
- `@sudobility/types` - Common types
- `@tanstack/react-query` - Data fetching
- `react` - React 18+

## Code Conventions

- Export all public APIs from `src/index.ts`
- Hooks follow `use*` naming convention
- Utility functions are pure when possible
- Use types from `@sudobility/sudojo_types`
- Keep hooks focused on single responsibility

## Testing

Tests use Vitest with happy-dom and @testing-library/react:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoard } from '../hooks/useBoard';

describe('useBoard', () => {
  it('should initialize with puzzle', () => {
    const { result } = renderHook(() => useBoard(puzzle));
    expect(result.current.board).toBeDefined();
  });

  it('should update cell value', () => {
    const { result } = renderHook(() => useBoard(puzzle));
    act(() => {
      result.current.setCell(0, 0, 5);
    });
    expect(result.current.board[0][0]).toBe(5);
  });
});
```

Coverage thresholds are enforced - aim for high coverage on business logic.

## Publishing

Package is published to npm with restricted access:

```bash
# Bump version in package.json
bun run prepublishOnly  # Runs clean + build
npm publish             # Publish to npm
```

## Common Tasks

### Add New Hook
1. Create hook file in `src/hooks/`
2. Implement the hook logic
3. Export from `src/index.ts`
4. Add comprehensive tests
5. Run `bun run check-all`

### Add New Utility Function
1. Add function to appropriate file in `src/utils/`
2. Keep functions pure when possible
3. Export from `src/index.ts`
4. Add unit tests

### Debug Tests
```bash
bun run test:watch     # Interactive test mode
bun run test:coverage  # See coverage gaps
```
