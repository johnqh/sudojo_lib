/**
 * Sudoku game types - ported from renderable/sudokuschool
 *
 * Uses flat 81-cell array (indexed 0-80) matching Kotlin implementation
 */

// =============================================================================
// Cell Types
// =============================================================================

/**
 * A single cell in the Sudoku board (indexed 0-80)
 * Matches Kotlin: Cell(index, solution, given, input, pencilmarks)
 */
export interface SudokuCell {
  /** Cell index (0-80) */
  index: number;
  /** The correct solution value (1-9, or null if not provided) */
  solution: number | null;
  /** The given/clue value (1-9, or null if empty) */
  given: number | null;
  /** User-entered value (1-9, or null if empty) */
  input: number | null;
  /** Pencil marks (candidate digits 1-9, or null) - matches Kotlin Array<Int>? */
  pencilmarks: number[] | null;
}

/**
 * Get row index (0-8) from cell index (0-80)
 */
export function rowOf(index: number): number {
  return Math.floor(index / 9);
}

/**
 * Get column index (0-8) from cell index (0-80)
 */
export function columnOf(index: number): number {
  return index % 9;
}

/**
 * Get block index (0-8) from cell index (0-80)
 */
export function blockOf(index: number): number {
  const blockY = Math.floor(rowOf(index) / 3);
  const blockX = Math.floor(columnOf(index) / 3);
  return blockY * 3 + blockX;
}

/**
 * Get cell index from row and column
 */
export function cellIndex(row: number, column: number): number {
  return row * 9 + column;
}

// =============================================================================
// Board Types
// =============================================================================

/**
 * The Sudoku board containing all 81 cells
 */
export interface SudokuBoard {
  /** Array of 81 cells (indexed 0-80) */
  cells: SudokuCell[];
  /** Whether the game is completed (all inputs match solutions) */
  completed: boolean;
  /** Whether the board is in manual entry mode */
  entering: boolean;
  /** Error message for manual entry validation */
  enteringError: string | null;
}

// =============================================================================
// Play/Game State Types
// =============================================================================

/**
 * Display modes for Sudoku digits
 */
export type SudokuDisplay = 'NUMERIC' | 'KANJI' | 'COLORS' | 'EMOJIS';

/**
 * Session settings (can change during play)
 */
export interface SudokuPlaySettings {
  /** Whether pencil marking mode is active */
  pencilmarking: boolean;
  /** Whether auto-pencilmarks were generated */
  autoPencilmarks: boolean;
}

/**
 * App-level settings (persisted)
 */
export interface SudokuAppSettings {
  /** Show errors when input doesn't match solution */
  showErrors: boolean;
  /** Enable UI animations */
  enableAnimations: boolean;
  /** Generate symmetrical puzzles */
  symmetrical: boolean;
  /** Digit display mode */
  display: SudokuDisplay;
}

/**
 * Current play state
 */
export interface SudokuPlay {
  /** The game board */
  board: SudokuBoard;
  /** Session settings */
  settings: SudokuPlaySettings;
  /** Currently selected cell index (0-80, or null) */
  selectedIndex: number | null;
}

/**
 * Source of the puzzle
 */
export type PlayingSource = 'DAILY' | 'CHALLENGE' | 'LEVEL' | 'ENTERED';

/**
 * Full game state including source information
 */
export interface SudokuGameState {
  /** Current play state */
  play: SudokuPlay | null;
  /** Original puzzle string (before scrambling) */
  originalPuzzle: string;
  /** Original solution string (before scrambling) */
  originalSolution: string;
  /** Puzzle source */
  source: PlayingSource;
  /** Level UUID if from a level */
  levelUuid: string | null;
  /** Board UUID if applicable */
  boardUuid: string | null;
  /** Undo history stack */
  history: SudokuPlay[];
  /** App settings */
  appSettings: SudokuAppSettings;
  /** Digit mapping from scrambling (original -> scrambled) */
  digitMapping: Map<number, number>;
  /** Reverse digit mapping (scrambled -> original) */
  reverseDigitMapping: Map<number, number>;
}

// =============================================================================
// Defaults
// =============================================================================

export const DEFAULT_PLAY_SETTINGS: SudokuPlaySettings = {
  pencilmarking: false,
  autoPencilmarks: false,
};

export const DEFAULT_APP_SETTINGS: SudokuAppSettings = {
  showErrors: true,
  enableAnimations: true,
  symmetrical: false,
  display: 'NUMERIC',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an empty cell
 */
export function createEmptyCell(index: number): SudokuCell {
  return {
    index,
    solution: null,
    given: null,
    input: null,
    pencilmarks: null,
  };
}

/**
 * Create an empty board (81 empty cells)
 */
export function createEmptyBoard(): SudokuBoard {
  return {
    cells: Array.from({ length: 81 }, (_, i) => createEmptyCell(i)),
    completed: false,
    entering: false,
    enteringError: null,
  };
}

/**
 * Check if a cell has an error (input doesn't match solution)
 */
export function cellHasError(cell: SudokuCell): boolean {
  if (cell.given !== null) return false; // Clue cells can't have errors
  if (cell.input === null) return false; // Empty cells can't have errors
  if (cell.solution === null) return false; // No solution to compare
  return cell.input !== cell.solution;
}

/**
 * Get all cell indices in the same row
 */
export function getRowIndices(index: number): number[] {
  const row = rowOf(index);
  return Array.from({ length: 9 }, (_, col) => row * 9 + col);
}

/**
 * Get all cell indices in the same column
 */
export function getColumnIndices(index: number): number[] {
  const col = columnOf(index);
  return Array.from({ length: 9 }, (_, row) => row * 9 + col);
}

/**
 * Get all cell indices in the same block
 */
export function getBlockIndices(index: number): number[] {
  const blockIndex = blockOf(index);
  const blockX = blockIndex % 3;
  const blockY = Math.floor(blockIndex / 3);
  const indices: number[] = [];
  for (let i = 0; i < 9; i++) {
    const cellX = i % 3;
    const cellY = Math.floor(i / 3);
    const x = blockX * 3 + cellX;
    const y = blockY * 3 + cellY;
    indices.push(y * 9 + x);
  }
  return indices;
}

/**
 * Get all related cell indices (same row, column, or block)
 */
export function getRelatedIndices(index: number): number[] {
  const rowIndices = getRowIndices(index);
  const colIndices = getColumnIndices(index);
  const blockIndices = getBlockIndices(index);
  const allIndices = new Set([...rowIndices, ...colIndices, ...blockIndices]);
  allIndices.delete(index); // Remove the cell itself
  return Array.from(allIndices);
}
