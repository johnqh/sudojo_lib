/**
 * Display types for Sudoku rendering
 *
 * Matches Kotlin renderable types exactly
 */

// =============================================================================
// Theme Color (matches ThemeColor.kt)
// =============================================================================

/**
 * Theme colors for the UI - matches Kotlin ThemeColor enum
 */
export enum ThemeColor {
  NONE = 'NONE',
  CLEAR = 'CLEAR',
  LABEL = 'LABEL',
  LABEL_SECONDARY = 'LABEL_SECONDARY',
  LABEL_TERTIARY = 'LABEL_TERTIARY',
  LABEL_QUATERNARY = 'LABEL_QUATERNARY',
  BACKGROUND = 'BACKGROUND',
  BACKGROUND_SECONDARY = 'BACKGROUND_SECONDARY',
  BACKGROUND_TERTIARY = 'BACKGROUND_TERTIARY',
  BACKGROUND_QUATERNARY = 'BACKGROUND_QUATERNARY',
  SELECTED = 'SELECTED',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  WARNING_SECONDARY = 'WARNING_SECONDARY',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED',
}

// =============================================================================
// Sudoku Color (matches SudokuColor in Shared.kt)
// =============================================================================

/**
 * Sudoku-specific colors - matches Kotlin SudokuColor enum
 */
export enum SudokuColor {
  NONE = 'none',
  CLEAR = 'clear',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  ORANGE = 'orange',
  RED = 'red',
  WHITE = 'white',
  LIGHT_GRAY = 'lightgray',
  BLACK = 'black',
  GRAY = 'gray',
  ACTION = 'action',
  SECONDARY_ACTION = 'secondary-action',
  DISABLED = 'disabled',
}

// =============================================================================
// Hint Types (matches Hint.kt)
// =============================================================================

/**
 * Area type for highlighting - matches HintArea.Type
 */
export type HintAreaType = 'row' | 'column' | 'block';

/**
 * Highlighted area in a hint - matches HintArea
 */
export interface HintArea {
  type: HintAreaType;
  color: SudokuColor | null;
  index: number;
}

/**
 * Actions to perform on a cell - matches HintCellActions
 */
export interface HintCellActions {
  select: number | null;
  unselect: number | null;
  add: number[] | null;
  remove: number[] | null;
  highlight: number[] | null;
}

/**
 * Cell display information in a hint - matches HintCell
 */
export interface HintCell {
  index: number;
  color: SudokuColor | null;
  fill: boolean;
  actions?: HintCellActions;
}

/**
 * A single hint step - matches HintStep
 */
export interface HintStep {
  title: string;
  text: string;
  areas?: HintArea[] | null;
  cells?: HintCell[] | null;
}

// =============================================================================
// Cell Display State
// =============================================================================

/**
 * Complete display state for a single cell
 */
export interface CellDisplayState {
  /** Cell index (0-80) */
  index: number;
  /** Background color */
  backgroundColor: ThemeColor;
  /** Border color (null for no border) */
  borderColor: ThemeColor | null;
  /** Text color */
  textColor: ThemeColor | null;
  /** The digit to display (1-9) or null */
  digit: number | null;
  /** Whether this is a given (original) digit */
  isGiven: boolean;
  /** Pencilmarks to display */
  pencilmarks: PencilmarkDisplayState[];
}

/**
 * Display state for a single pencilmark
 */
export interface PencilmarkDisplayState {
  /** The digit (1-9) */
  digit: number;
  /** Color of the pencilmark */
  color: ThemeColor | null;
}

// =============================================================================
// Color Palette
// =============================================================================

/**
 * UI color palette - matches UIColorType from sudojo-web
 */
export interface UIColorPalette {
  systemBackground: string;
  secondarySystemBackground: string;
  tertiarySystemBackground: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  quaternaryLabel: string;
  systemBlue: string;
  systemGreen: string;
  systemOrange: string;
  systemPurple: string;
  systemRed: string;
  systemYellow: string;
  systemGray: string;
  clear: string;
}

/**
 * Light mode color palette
 */
export const UIColorLight: UIColorPalette = {
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  label: '#000000',
  secondaryLabel: '#3C3C4399',
  tertiaryLabel: '#3C3C434D',
  quaternaryLabel: '#3C3C432E',
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemOrange: '#FF9500',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemYellow: '#FFCC00',
  systemGray: '#8E8E93',
  clear: 'transparent',
};

/**
 * Dark mode color palette
 */
export const UIColorDark: UIColorPalette = {
  systemBackground: '#000000',
  secondarySystemBackground: '#1C1C1E',
  tertiarySystemBackground: '#2C2C2E',
  label: '#FFFFFF',
  secondaryLabel: '#EBEBF599',
  tertiaryLabel: '#EBEBF54D',
  quaternaryLabel: '#EBEBF52E',
  systemBlue: '#0A84FF',
  systemGreen: '#30D158',
  systemOrange: '#FF9F0A',
  systemPurple: '#BF5AF2',
  systemRed: '#FF453A',
  systemYellow: '#FFD60A',
  systemGray: '#8E8E93',
  clear: 'transparent',
};
