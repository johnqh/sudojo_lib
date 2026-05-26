/**
 * Tests for Sudoku presenter utilities
 */

import { describe, expect, it } from 'vitest';
import type { SudokuCell } from '../types/sudoku';
import {
  SudokuColor,
  ThemeColor,
  UIColorDark,
  UIColorLight,
} from '../types/display';
import type { HintStep } from '../types/display';
import {
  calculateCellHints,
  computeSelectedDigitCells,
  convertSolverCellGroup,
  convertSolverLink,
  getCellsWithDigit,
  getColorPalette,
  getSelectedDigit,
  presentBoard,
  sudokuColorToTheme,
  themeColorToCSS,
} from './sudokuPresenter';
import { parsePuzzleString } from './sudokuScrambler';

const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function createTestCells(): SudokuCell[] {
  return parsePuzzleString(SAMPLE_PUZZLE, SAMPLE_SOLUTION);
}

describe('sudokuColorToTheme', () => {
  it('maps SudokuColor to ThemeColor correctly', () => {
    expect(sudokuColorToTheme(SudokuColor.BLUE)).toBe(ThemeColor.SELECTED);
    expect(sudokuColorToTheme(SudokuColor.GREEN)).toBe(ThemeColor.SUCCESS);
    expect(sudokuColorToTheme(SudokuColor.YELLOW)).toBe(
      ThemeColor.WARNING_SECONDARY
    );
    expect(sudokuColorToTheme(SudokuColor.ORANGE)).toBe(ThemeColor.WARNING);
    expect(sudokuColorToTheme(SudokuColor.RED)).toBe(ThemeColor.ERROR);
    expect(sudokuColorToTheme(SudokuColor.WHITE)).toBe(ThemeColor.BACKGROUND);
    expect(sudokuColorToTheme(SudokuColor.LIGHT_GRAY)).toBe(
      ThemeColor.BACKGROUND_SECONDARY
    );
    expect(sudokuColorToTheme(SudokuColor.BLACK)).toBe(ThemeColor.LABEL);
    expect(sudokuColorToTheme(SudokuColor.GRAY)).toBe(
      ThemeColor.LABEL_SECONDARY
    );
    expect(sudokuColorToTheme(SudokuColor.CLEAR)).toBe(ThemeColor.CLEAR);
  });

  it('returns null for null input', () => {
    expect(sudokuColorToTheme(null)).toBeNull();
  });
});

describe('themeColorToCSS', () => {
  it('maps theme colors to CSS colors in light palette', () => {
    expect(themeColorToCSS(UIColorLight, ThemeColor.SELECTED)).toBe(
      UIColorLight.systemPurple
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.SUCCESS)).toBe(
      UIColorLight.systemBlue
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.ERROR)).toBe(
      UIColorLight.systemRed
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.WARNING)).toBe(
      UIColorLight.systemOrange
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.BACKGROUND)).toBe(
      UIColorLight.systemBackground
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.LABEL)).toBe(
      UIColorLight.label
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.DISABLED)).toBe(
      UIColorLight.systemGray
    );
  });

  it('returns clear color for NONE and CLEAR', () => {
    expect(themeColorToCSS(UIColorLight, ThemeColor.NONE)).toBe(
      UIColorLight.clear
    );
    expect(themeColorToCSS(UIColorLight, ThemeColor.CLEAR)).toBe(
      UIColorLight.clear
    );
  });

  it('returns null for null theme color', () => {
    expect(themeColorToCSS(UIColorLight, null)).toBeNull();
  });

  it('works with dark palette', () => {
    expect(themeColorToCSS(UIColorDark, ThemeColor.SELECTED)).toBe(
      UIColorDark.systemPurple
    );
    expect(themeColorToCSS(UIColorDark, ThemeColor.ERROR)).toBe(
      UIColorDark.systemRed
    );
  });
});

describe('getColorPalette', () => {
  it('returns light palette for light mode', () => {
    expect(getColorPalette(false)).toBe(UIColorLight);
  });

  it('returns dark palette for dark mode', () => {
    expect(getColorPalette(true)).toBe(UIColorDark);
  });
});

describe('calculateCellHints', () => {
  it('returns null when no hint step', () => {
    expect(calculateCellHints(null)).toBeNull();
  });

  it('processes row area hints', () => {
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test hint',
      areas: [{ type: 'row', index: 0, color: SudokuColor.BLUE }],
    };

    const hints = calculateCellHints(hintStep);
    expect(hints).not.toBeNull();
    // Row 0 has indices 0-8
    for (let i = 0; i < 9; i++) {
      expect(hints!.has(i)).toBe(true);
      expect(hints!.get(i)!.color).toBe(SudokuColor.BLUE);
      expect(hints!.get(i)!.fill).toBe(true);
    }
  });

  it('processes column area hints', () => {
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test hint',
      areas: [{ type: 'column', index: 0, color: SudokuColor.GREEN }],
    };

    const hints = calculateCellHints(hintStep);
    expect(hints).not.toBeNull();
    // Column 0 has indices 0, 9, 18, 27, 36, 45, 54, 63, 72
    for (let r = 0; r < 9; r++) {
      expect(hints!.has(r * 9)).toBe(true);
    }
  });

  it('processes block area hints', () => {
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test hint',
      areas: [{ type: 'block', index: 0, color: SudokuColor.YELLOW }],
    };

    const hints = calculateCellHints(hintStep);
    expect(hints).not.toBeNull();
    // Block 0: indices 0,1,2,9,10,11,18,19,20
    const expectedIndices = [0, 1, 2, 9, 10, 11, 18, 19, 20];
    for (const idx of expectedIndices) {
      expect(hints!.has(idx)).toBe(true);
    }
  });

  it('cells override areas', () => {
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test hint',
      areas: [{ type: 'row', index: 0, color: SudokuColor.BLUE }],
      cells: [{ index: 0, color: SudokuColor.RED, fill: false }],
    };

    const hints = calculateCellHints(hintStep);
    expect(hints).not.toBeNull();
    // Cell 0 should have RED (from cell override), not BLUE (from area)
    expect(hints!.get(0)!.color).toBe(SudokuColor.RED);
    expect(hints!.get(0)!.fill).toBe(false);
    // Cell 1 should still have BLUE (from area)
    expect(hints!.get(1)!.color).toBe(SudokuColor.BLUE);
  });
});

describe('presentBoard', () => {
  it('generates display states for all 81 cells', () => {
    const cells = createTestCells();
    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    expect(result).toHaveLength(81);
  });

  it('assigns checkerboard background pattern based on block', () => {
    const cells = createTestCells();
    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    // Block 0 (even): BACKGROUND_SECONDARY
    expect(result[0]!.backgroundColor).toBe(ThemeColor.BACKGROUND_SECONDARY);
    // Block 1 (odd): BACKGROUND
    expect(result[3]!.backgroundColor).toBe(ThemeColor.BACKGROUND);
  });

  it('marks selected cell with border', () => {
    const cells = createTestCells();
    const result = presentBoard({
      cells,
      selectedIndex: 0,
      showErrors: false,
    });

    expect(result[0]!.borderColor).toBe(ThemeColor.SELECTED);
  });

  it('highlights cells in same row/col/block as selected', () => {
    const cells = createTestCells();
    const result = presentBoard({
      cells,
      selectedIndex: 0,
      showErrors: false,
    });

    // Same row (index 1)
    expect(result[1]!.backgroundColor).toBe(ThemeColor.SELECTED);
    // Same column (index 9)
    expect(result[9]!.backgroundColor).toBe(ThemeColor.SELECTED);
    // Same block (index 10)
    expect(result[10]!.backgroundColor).toBe(ThemeColor.SELECTED);
  });

  it('displays given cells with LABEL text color', () => {
    const cells = createTestCells();
    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    // Cell 0 has given value 5
    expect(result[0]!.digit).toBe(5);
    expect(result[0]!.isGiven).toBe(true);
    expect(result[0]!.textColor).toBe(ThemeColor.LABEL);
  });

  it('displays empty cells with no digit', () => {
    const cells = createTestCells();
    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    // Cell 2 is empty in the puzzle
    expect(result[2]!.digit).toBeNull();
    expect(result[2]!.isGiven).toBe(false);
  });

  it('shows errors for incorrect input when showErrors is true', () => {
    const cells = createTestCells();
    cells[2]!.input = 9; // Wrong value (correct is 4)

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: true,
    });

    expect(result[2]!.digit).toBe(9);
    expect(result[2]!.textColor).toBe(ThemeColor.ERROR);
  });

  it('shows success color for correct input when showErrors is true', () => {
    const cells = createTestCells();
    cells[2]!.input = 4; // Correct value

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: true,
    });

    expect(result[2]!.digit).toBe(4);
    expect(result[2]!.textColor).toBe(ThemeColor.SUCCESS);
  });

  it('uses LABEL_SECONDARY for input when showErrors is false', () => {
    const cells = createTestCells();
    cells[2]!.input = 9;

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    expect(result[2]!.digit).toBe(9);
    expect(result[2]!.textColor).toBe(ThemeColor.LABEL_SECONDARY);
  });

  it('handles pencilmarks when no digit is present', () => {
    const cells = createTestCells();
    cells[2]!.pencilmarks = [1, 4, 7];

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    expect(result[2]!.digit).toBeNull();
    expect(result[2]!.pencilmarks).toHaveLength(3);
    expect(result[2]!.pencilmarks.map(p => p.digit)).toEqual([1, 4, 7]);
    expect(
      result[2]!.pencilmarks.every(p => p.color === ThemeColor.LABEL_SECONDARY)
    ).toBe(true);
  });

  it('does not show pencilmarks when digit is present', () => {
    const cells = createTestCells();
    cells[2]!.input = 4;
    cells[2]!.pencilmarks = [1, 4, 7];

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
    });

    expect(result[2]!.digit).toBe(4);
    expect(result[2]!.pencilmarks).toHaveLength(0);
  });

  it('applies hint fill colors', () => {
    const cells = createTestCells();
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test',
      cells: [{ index: 0, color: SudokuColor.GREEN, fill: true }],
    };

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
      hintStep,
    });

    expect(result[0]!.backgroundColor).toBe(ThemeColor.SUCCESS);
  });

  it('applies hint border colors', () => {
    const cells = createTestCells();
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test',
      cells: [{ index: 0, color: SudokuColor.BLUE, fill: false }],
    };

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
      hintStep,
    });

    expect(result[0]!.borderColor).toBe(ThemeColor.SELECTED);
  });

  it('applies hint select action to cell text', () => {
    const cells = createTestCells();
    // Use an empty cell
    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test',
      cells: [
        {
          index: 2,
          color: null,
          fill: false,
          actions: {
            select: 4,
            unselect: null,
            add: null,
            remove: null,
            highlight: null,
          },
        },
      ],
    };

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
      hintStep,
    });

    expect(result[2]!.digit).toBe(4);
    expect(result[2]!.textColor).toBe(ThemeColor.SELECTED);
  });

  it('applies hint pencilmark actions', () => {
    const cells = createTestCells();
    cells[2]!.pencilmarks = [1, 4];

    const hintStep: HintStep = {
      title: 'Test',
      text: 'Test',
      cells: [
        {
          index: 2,
          color: null,
          fill: false,
          actions: {
            select: null,
            unselect: null,
            add: [7],
            remove: [1],
            highlight: [4],
          },
        },
      ],
    };

    const result = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
      hintStep,
    });

    const pencilmarks = result[2]!.pencilmarks;
    // 1 = LABEL_SECONDARY (exists) but remove overrides -> ERROR
    const pm1 = pencilmarks.find(p => p.digit === 1);
    expect(pm1?.color).toBe(ThemeColor.ERROR);
    // 4 = LABEL_SECONDARY (exists) but highlight overrides -> SELECTED
    const pm4 = pencilmarks.find(p => p.digit === 4);
    expect(pm4?.color).toBe(ThemeColor.SELECTED);
    // 7 = add -> SUCCESS
    const pm7 = pencilmarks.find(p => p.digit === 7);
    expect(pm7?.color).toBe(ThemeColor.SUCCESS);
  });

  it('supports digit highlighting mode', () => {
    const cells = createTestCells();
    // Cell 0 has given=5, so create selectedDigitCells for digit 5
    const selectedDigitCells = getCellsWithDigit(cells, 5);

    const result = presentBoard({
      cells,
      selectedIndex: 0,
      showErrors: false,
      selectedDigitCells,
    });

    // Cell 0 (has digit 5): SELECTED background
    expect(result[0]!.backgroundColor).toBe(ThemeColor.SELECTED);

    // Cells without digit 5 in same row/col/block: LABEL_SECONDARY
    // Cell 3 is in the same row and has no digit (empty), but has a value in row 0
    // It depends on whether it has a value. Cell 3 has given=null, not in selectedDigitCells.
    // It should be LABEL_SECONDARY if it has a value OR is in same row/col/block
  });
});

describe('getCellsWithDigit', () => {
  it('returns cells with given digit', () => {
    const cells = createTestCells();
    const result = getCellsWithDigit(cells, 5);

    expect(result.has(0)).toBe(true); // Cell 0 has given=5
    expect(result.size).toBeGreaterThan(0);
  });

  it('includes cells with input digit', () => {
    const cells = createTestCells();
    cells[2]!.input = 5;

    const result = getCellsWithDigit(cells, 5);
    expect(result.has(2)).toBe(true);
  });

  it('returns empty set for digit not on board', () => {
    // Create cells with all given values except no "1"
    const cells: SudokuCell[] = Array.from({ length: 81 }, (_, i) => ({
      index: i,
      solution: null,
      given: null,
      input: null,
      pencilmarks: null,
    }));
    cells[0]!.given = 2;

    const result = getCellsWithDigit(cells, 1);
    expect(result.size).toBe(0);
  });
});

describe('getSelectedDigit', () => {
  it('returns null when no cell is selected', () => {
    const cells = createTestCells();
    expect(getSelectedDigit(cells, null)).toBeNull();
  });

  it('returns given value of selected cell', () => {
    const cells = createTestCells();
    // Cell 0 has given=5
    expect(getSelectedDigit(cells, 0)).toBe(5);
  });

  it('returns correct input value', () => {
    const cells = createTestCells();
    // Cell 2 is empty, set correct input
    cells[2]!.input = 4;
    cells[2]!.solution = 4;

    expect(getSelectedDigit(cells, 2)).toBe(4);
  });

  it('returns null for incorrect input', () => {
    const cells = createTestCells();
    cells[2]!.input = 9; // Wrong value
    cells[2]!.solution = 4;

    expect(getSelectedDigit(cells, 2)).toBeNull();
  });

  it('returns null for empty cell', () => {
    const cells = createTestCells();
    // Cell 2 is empty
    expect(getSelectedDigit(cells, 2)).toBeNull();
  });
});

describe('computeSelectedDigitCells', () => {
  it('returns null when no cell selected', () => {
    const cells = createTestCells();
    expect(computeSelectedDigitCells(cells, null)).toBeNull();
  });

  it('returns null when selected cell has no highlightable digit', () => {
    const cells = createTestCells();
    // Cell 2 is empty
    expect(computeSelectedDigitCells(cells, 2)).toBeNull();
  });

  it('returns set of cells with same digit', () => {
    const cells = createTestCells();
    // Cell 0 has given=5
    const result = computeSelectedDigitCells(cells, 0);

    expect(result).not.toBeNull();
    expect(result!.has(0)).toBe(true);
    // All cells with 5 should be included
    cells.forEach((cell, i) => {
      if (cell.given === 5 || cell.input === 5) {
        expect(result!.has(i)).toBe(true);
      }
    });
  });
});

describe('convertSolverLink', () => {
  it('converts row/col coordinates to flat indices', () => {
    const link = convertSolverLink({
      fromRow: 0,
      fromCol: 0,
      toRow: 8,
      toCol: 8,
      type: 'strong',
      digit: 5,
    });

    expect(link.fromIndex).toBe(0);
    expect(link.toIndex).toBe(80);
    expect(link.type).toBe('strong');
    expect(link.digit).toBe(5);
  });

  it('handles middle of board coordinates', () => {
    const link = convertSolverLink({
      fromRow: 4,
      fromCol: 4,
      toRow: 4,
      toCol: 5,
      type: 'weak',
      digit: 3,
    });

    expect(link.fromIndex).toBe(40);
    expect(link.toIndex).toBe(41);
    expect(link.type).toBe('weak');
  });
});

describe('convertSolverCellGroup', () => {
  it('converts cell group with known color', () => {
    const group = convertSolverCellGroup({
      name: 'ALS A',
      color: 'blue',
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
    });

    expect(group.name).toBe('ALS A');
    expect(group.color).toBe(ThemeColor.SELECTED);
    expect(group.cellIndices).toEqual([0, 1, 2]);
  });

  it('converts cell coordinates to flat indices', () => {
    const group = convertSolverCellGroup({
      name: 'Test',
      color: 'green',
      cells: [
        [4, 4],
        [8, 8],
      ],
    });

    expect(group.cellIndices).toEqual([40, 80]);
    expect(group.color).toBe(ThemeColor.SUCCESS);
  });

  it('defaults to SELECTED for unknown color', () => {
    const group = convertSolverCellGroup({
      name: 'Test',
      color: 'unknown_color',
      cells: [[0, 0]],
    });

    expect(group.color).toBe(ThemeColor.SELECTED);
  });
});

describe('presentBoard conflict hint textColor', () => {
  it('overrides textColor to WARNING for orange source cells in conflict hints', () => {
    const cells = createTestCells();
    // Index 0 has given=5, index 4 has given=7 in SAMPLE_PUZZLE
    const hintStep: HintStep = {
      title: 'Conflict',
      text: 'Digit 5 cannot go here',
      cells: [
        { index: 0, color: SudokuColor.ORANGE, fill: false }, // source cell (given=5)
        { index: 4, color: SudokuColor.BLUE, fill: false }, // target cell (given=7)
      ],
      links: [
        { fromIndex: 0, toIndex: 4, type: 'conflict', digit: 5 },
      ],
    };

    const states = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
      hintStep,
    });

    // Orange source cell should have WARNING textColor
    expect(states[0].textColor).toBe(ThemeColor.WARNING);
    // Blue target cell should keep normal textColor (LABEL for given)
    expect(states[4].textColor).toBe(ThemeColor.LABEL);
  });

  it('does not override textColor when no conflict links', () => {
    const cells = createTestCells();
    const hintStep: HintStep = {
      title: 'Normal hint',
      text: 'Some hint',
      cells: [
        { index: 1, color: SudokuColor.ORANGE, fill: false },
      ],
    };

    const states = presentBoard({
      cells,
      selectedIndex: null,
      showErrors: false,
      hintStep,
    });

    // Without conflict links, orange cell should keep LABEL textColor
    expect(states[1].textColor).toBe(ThemeColor.LABEL);
  });
});
