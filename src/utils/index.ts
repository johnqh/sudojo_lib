/**
 * Utility exports for Sudojo library
 */

// Board utilities (legacy - for useGame hook)
export {
  BLOCK_SIZE,
  BOARD_SIZE,
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
  parseBoardString,
  stringifyBoard,
  TOTAL_CELLS,
} from './board';

// Scramble utilities (legacy - for useGame hook)
export { noScramble, scrambleBoard } from './scramble';

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
} from './sudokuPresenter';
