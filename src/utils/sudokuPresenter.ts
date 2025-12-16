/**
 * Sudoku presenter - port of renderable/SudokuPresenter.kt
 *
 * Handles all display logic for the Sudoku board including:
 * - Cell background colors based on selection state
 * - Cell border colors for selected cells
 * - Text colors (given, input, hint actions)
 * - Hint visualization (areas, cells)
 * - Pencilmark coloring
 */

import type { SudokuCell } from '../types/sudoku';
import { blockOf, columnOf, rowOf } from '../types/sudoku';
import {
  type CellDisplayState,
  type HintCell,
  type HintStep,
  type PencilmarkDisplayState,
  SudokuColor,
  ThemeColor,
  UIColorDark,
  UIColorLight,
  type UIColorPalette,
} from '../types/display';

// =============================================================================
// Block Definition (matches PlayBoard.blocks)
// =============================================================================

/**
 * Block class - matches Kotlin Block class
 */
class Block {
  readonly index: number;
  readonly cellIndices: number[];

  constructor(index: number) {
    this.index = index;
    const blockRow = Math.floor(index / 3);
    const blockCol = index % 3;
    this.cellIndices = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const row = blockRow * 3 + r;
        const col = blockCol * 3 + c;
        this.cellIndices.push(row * 9 + col);
      }
    }
  }
}

/**
 * Row class - matches Kotlin Row class
 */
class Row {
  readonly index: number;
  readonly cellIndices: number[];

  constructor(index: number) {
    this.index = index;
    this.cellIndices = Array.from({ length: 9 }, (_, col) => index * 9 + col);
  }
}

/**
 * Column class - matches Kotlin Column class
 */
class Column {
  readonly index: number;
  readonly cellIndices: number[];

  constructor(index: number) {
    this.index = index;
    this.cellIndices = Array.from({ length: 9 }, (_, row) => row * 9 + index);
  }
}

// =============================================================================
// Color Conversion (matches CellPresenter.colorOf)
// =============================================================================

/**
 * Convert SudokuColor to ThemeColor - matches CellPresenter.colorOf
 */
function sudokuColorToTheme(
  sudokuColor: SudokuColor | null
): ThemeColor | null {
  switch (sudokuColor) {
    case SudokuColor.BLUE:
      return ThemeColor.SELECTED;
    case SudokuColor.GREEN:
      return ThemeColor.SUCCESS;
    case SudokuColor.YELLOW:
      return ThemeColor.WARNING_SECONDARY;
    case SudokuColor.ORANGE:
      return ThemeColor.WARNING;
    case SudokuColor.RED:
      return ThemeColor.ERROR;
    case SudokuColor.WHITE:
      return ThemeColor.BACKGROUND;
    case SudokuColor.LIGHT_GRAY:
      return ThemeColor.BACKGROUND_SECONDARY;
    case SudokuColor.BLACK:
      return ThemeColor.LABEL;
    case SudokuColor.GRAY:
      return ThemeColor.LABEL_SECONDARY;
    case SudokuColor.CLEAR:
      return ThemeColor.CLEAR;
    default:
      return null;
  }
}

/**
 * Convert ThemeColor to actual CSS color - matches RendererColor.color
 */
export function themeColorToCSS(
  palette: UIColorPalette,
  themeColor: ThemeColor | null
): string | null {
  switch (themeColor) {
    case ThemeColor.NONE:
    case ThemeColor.CLEAR:
      return palette.clear;
    case ThemeColor.SELECTED:
      return palette.systemPurple;
    case ThemeColor.SUCCESS:
      return palette.systemBlue;
    case ThemeColor.WARNING_SECONDARY:
      return palette.systemYellow;
    case ThemeColor.WARNING:
      return palette.systemOrange;
    case ThemeColor.ERROR:
      return palette.systemRed;
    case ThemeColor.BACKGROUND:
      return palette.systemBackground;
    case ThemeColor.BACKGROUND_SECONDARY:
      return palette.secondarySystemBackground;
    case ThemeColor.LABEL:
      return palette.label;
    case ThemeColor.LABEL_SECONDARY:
      return palette.secondaryLabel;
    case ThemeColor.DISABLED:
      return palette.systemGray;
    default:
      return null;
  }
}

/**
 * Get the color palette for the current theme
 */
export function getColorPalette(isDarkMode: boolean): UIColorPalette {
  return isDarkMode ? UIColorDark : UIColorLight;
}

// =============================================================================
// Hint Processing (matches BoardPresenter.calculateCellHints)
// =============================================================================

/**
 * Process hint areas and cells into a map of cell hints
 * Matches BoardPresenter.calculateCellHints
 */
export function calculateCellHints(
  hintStep: HintStep | null
): Map<number, HintCell> | null {
  if (!hintStep) return null;

  const hintsCell = new Map<number, HintCell>();

  // Process areas first
  hintStep.areas?.forEach(area => {
    let cellIndices: number[];

    switch (area.type) {
      case 'block':
        cellIndices = new Block(area.index).cellIndices;
        break;
      case 'row':
        cellIndices = new Row(area.index).cellIndices;
        break;
      case 'column':
        cellIndices = new Column(area.index).cellIndices;
        break;
    }

    cellIndices.forEach(index => {
      hintsCell.set(index, {
        index,
        color: area.color,
        fill: true, // Areas always use fill
      });
    });
  });

  // Process cells (overrides areas)
  hintStep.cells?.forEach(cell => {
    hintsCell.set(cell.index, cell);
  });

  return hintsCell;
}

// =============================================================================
// Cell Color Logic (matches BlockPresenter.color)
// =============================================================================

interface CellColorResult {
  backgroundColor: ThemeColor;
  borderColor: ThemeColor | null;
}

/**
 * Determine background and border colors for a cell
 * Matches BlockPresenter.color exactly
 */
function getCellColors(
  cellIndex: number,
  cellBlockIndex: number,
  cellRowIndex: number,
  cellColumnIndex: number,
  cellHasValue: boolean,
  selectedIndex: number | null,
  selectedBlockIndex: number | null,
  selectedRowIndex: number | null,
  selectedColumnIndex: number | null,
  selectedDigitCells: Set<number> | null
): CellColorResult {
  // Default background based on block (checkerboard pattern)
  const defaultBackgroundColor =
    cellBlockIndex % 2 === 0
      ? ThemeColor.BACKGROUND_SECONDARY
      : ThemeColor.BACKGROUND;

  if (selectedIndex === null) {
    return { backgroundColor: defaultBackgroundColor, borderColor: null };
  }

  if (selectedDigitCells !== null) {
    // Digit highlighting mode
    if (selectedDigitCells.has(cellIndex)) {
      // Highlighted cells (have the same digit)
      return { backgroundColor: ThemeColor.SELECTED, borderColor: null };
    }

    // Check if this cell is "impossible" (in same row/col/block as highlighted cells)
    let isImpossible = cellHasValue;
    if (!isImpossible) {
      for (const highlightedIndex of selectedDigitCells) {
        const hRow = rowOf(highlightedIndex);
        const hCol = columnOf(highlightedIndex);
        const hBlock = blockOf(highlightedIndex);
        if (
          cellRowIndex === hRow ||
          cellColumnIndex === hCol ||
          cellBlockIndex === hBlock
        ) {
          isImpossible = true;
          break;
        }
      }
    }

    if (isImpossible) {
      return { backgroundColor: ThemeColor.LABEL_SECONDARY, borderColor: null };
    }

    // Possible cells
    return { backgroundColor: defaultBackgroundColor, borderColor: null };
  }

  // Normal selection mode
  if (selectedIndex === cellIndex) {
    // Selected cell: default background + SELECTED border
    return {
      backgroundColor: defaultBackgroundColor,
      borderColor: ThemeColor.SELECTED,
    };
  }

  if (
    selectedBlockIndex === cellBlockIndex ||
    selectedRowIndex === cellRowIndex ||
    selectedColumnIndex === cellColumnIndex
  ) {
    // Same row, column or block: SELECTED background
    return { backgroundColor: ThemeColor.SELECTED, borderColor: null };
  }

  // Other cells
  return { backgroundColor: defaultBackgroundColor, borderColor: null };
}

// =============================================================================
// Cell Text Logic (matches CellPresenter.present)
// =============================================================================

interface CellTextResult {
  digit: number | null;
  textColor: ThemeColor | null;
  isGiven: boolean;
}

/**
 * Determine what digit and color to display in a cell
 * Matches CellPresenter.present logic
 */
function getCellText(
  cell: SudokuCell,
  showErrors: boolean,
  hintCell: HintCell | null
): CellTextResult {
  // Hint select action takes priority
  if (hintCell?.actions?.select != null) {
    return {
      digit: hintCell.actions.select,
      textColor: ThemeColor.SELECTED,
      isGiven: false,
    };
  }

  // Hint unselect action (wrong digit to remove)
  if (hintCell?.actions?.unselect != null) {
    return {
      digit: hintCell.actions.unselect,
      textColor: ThemeColor.ERROR,
      isGiven: false,
    };
  }

  // User input
  if (cell.input !== null) {
    let textColor: ThemeColor;
    if (showErrors) {
      textColor =
        cell.input === cell.solution ? ThemeColor.SUCCESS : ThemeColor.ERROR;
    } else {
      textColor = ThemeColor.LABEL_SECONDARY;
    }
    return { digit: cell.input, textColor, isGiven: false };
  }

  // Given (original)
  if (cell.given !== null) {
    return { digit: cell.given, textColor: ThemeColor.LABEL, isGiven: true };
  }

  return { digit: null, textColor: null, isGiven: false };
}

// =============================================================================
// Pencilmark Logic (matches CellPresenter.present pencilmark section)
// =============================================================================

/**
 * Get pencilmark display states
 * Matches CellPresenter.present pencilmark logic
 */
function getPencilmarks(
  cell: SudokuCell,
  hintCell: HintCell | null
): PencilmarkDisplayState[] {
  const cellPencilmarks = cell.pencilmarks
    ? new Set(cell.pencilmarks)
    : new Set<number>();
  const adding = hintCell?.actions?.add ? new Set(hintCell.actions.add) : null;
  const removing = hintCell?.actions?.remove
    ? new Set(hintCell.actions.remove)
    : null;
  const highlighting = hintCell?.actions?.highlight
    ? new Set(hintCell.actions.highlight)
    : null;

  const result: PencilmarkDisplayState[] = [];

  for (let pencilmark = 1; pencilmark <= 9; pencilmark++) {
    let color: ThemeColor | null = null;

    if (highlighting?.has(pencilmark)) {
      color = ThemeColor.SELECTED;
    } else if (adding?.has(pencilmark)) {
      color = ThemeColor.SUCCESS;
    } else if (removing?.has(pencilmark)) {
      color = ThemeColor.ERROR;
    } else if (cellPencilmarks.has(pencilmark)) {
      color = ThemeColor.LABEL_SECONDARY;
    }

    if (color !== null) {
      result.push({ digit: pencilmark, color });
    }
  }

  return result;
}

// =============================================================================
// Main Presenter Function
// =============================================================================

export interface PresentBoardOptions {
  /** The 81 cells of the board */
  cells: SudokuCell[];
  /** Currently selected cell index (0-80) or null */
  selectedIndex: number | null;
  /** Whether to show errors (compare input vs solution) */
  showErrors: boolean;
  /** Current hint step (if any) */
  hintStep?: HintStep | null;
  /** Set of cell indices with the selected digit (for digit highlighting) */
  selectedDigitCells?: Set<number> | null;
}

/**
 * Generate display states for all cells
 * This is the main presenter function that matches the Kotlin renderable behavior
 */
export function presentBoard(options: PresentBoardOptions): CellDisplayState[] {
  const {
    cells,
    selectedIndex,
    showErrors,
    hintStep = null,
    selectedDigitCells = null,
  } = options;

  // Calculate hint cell map
  const cellHints = calculateCellHints(hintStep);

  // Get selected cell properties (if any)
  const _selectedCell = selectedIndex !== null ? cells[selectedIndex] : null;
  void _selectedCell; // Reserved for future use
  const selectedBlockIndex =
    selectedIndex !== null ? blockOf(selectedIndex) : null;
  const selectedRowIndex = selectedIndex !== null ? rowOf(selectedIndex) : null;
  const selectedColumnIndex =
    selectedIndex !== null ? columnOf(selectedIndex) : null;

  // Generate display state for each cell
  return cells.map((cell, index) => {
    const cellBlockIndex = blockOf(index);
    const cellRowIndex = rowOf(index);
    const cellColumnIndex = columnOf(index);
    const cellHasValue = cell.input !== null || cell.given !== null;

    // Get hint for this cell
    const hintCell = cellHints?.get(index) ?? null;

    // Get base colors
    const { backgroundColor, borderColor } = getCellColors(
      index,
      cellBlockIndex,
      cellRowIndex,
      cellColumnIndex,
      cellHasValue,
      selectedIndex,
      selectedBlockIndex,
      selectedRowIndex,
      selectedColumnIndex,
      selectedDigitCells
    );

    // Apply hint colors if present
    let finalBgColor = backgroundColor;
    let finalBorderColor = borderColor;

    if (hintCell) {
      if (hintCell.fill) {
        // Hint uses fill: override background
        const hintBgColor = sudokuColorToTheme(hintCell.color);
        if (hintBgColor !== null) {
          finalBgColor = hintBgColor;
        }
      } else {
        // Hint uses border
        const hintBdrColor = sudokuColorToTheme(
          hintCell.color ?? SudokuColor.BLUE
        );
        if (hintBdrColor !== null) {
          finalBorderColor = hintBdrColor;
        }
      }
    }

    // Get text info
    const { digit, textColor, isGiven } = getCellText(
      cell,
      showErrors,
      hintCell
    );

    // Get pencilmarks if no digit
    const pencilmarks = digit === null ? getPencilmarks(cell, hintCell) : [];

    return {
      index,
      backgroundColor: finalBgColor,
      borderColor: finalBorderColor,
      textColor,
      digit,
      isGiven,
      pencilmarks,
    };
  });
}

// =============================================================================
// Utility: Get cells with a specific digit
// =============================================================================

/**
 * Get indices of cells that contain a specific digit (given or input)
 * Used for digit highlighting mode
 */
export function getCellsWithDigit(
  cells: SudokuCell[],
  digit: number
): Set<number> {
  const result = new Set<number>();
  cells.forEach((cell, index) => {
    if (cell.given === digit || cell.input === digit) {
      result.add(index);
    }
  });
  return result;
}

/**
 * Get the selected digit for digit highlighting mode
 * Matches Kotlin SudokuInteractor.selectedDigit logic:
 * - If selected cell has a given value: return given
 * - If selected cell has a CORRECT input (input === solution): return input
 * - Otherwise: return null (no digit highlighting)
 */
export function getSelectedDigit(
  cells: SudokuCell[],
  selectedIndex: number | null
): number | null {
  if (selectedIndex === null) return null;

  const cell = cells[selectedIndex];
  if (!cell) return null;

  // Given value takes priority
  if (cell.given !== null) {
    return cell.given;
  }

  // Only correct input triggers digit highlighting
  if (cell.input !== null && cell.input === cell.solution) {
    return cell.input;
  }

  return null;
}

/**
 * Compute selectedDigitCells based on selected cell
 * Returns Set of cell indices that have the same digit as selected cell
 * Returns null if selected cell doesn't have a highlightable digit
 */
export function computeSelectedDigitCells(
  cells: SudokuCell[],
  selectedIndex: number | null
): Set<number> | null {
  const selectedDigit = getSelectedDigit(cells, selectedIndex);
  if (selectedDigit === null) return null;
  return getCellsWithDigit(cells, selectedDigit);
}
