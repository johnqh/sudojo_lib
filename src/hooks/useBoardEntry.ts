/**
 * Hook for managing Sudoku board entry mode state
 * Allows users to enter given clues for a custom puzzle
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SudokuCell } from '../types';
import { createEmptyBoard } from '../types';
import { useSolverValidate } from '@sudobility/sudojo_client';
import { MIN_CLUES } from '@sudobility/sudojo_types';
import { cellsToPuzzleString, countClues } from '../utils/sudokuScrambler';
import type { NetworkClient } from '@sudobility/types';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import { hasScannedInput, type ScannedBoard } from '../utils/scannedBoard';
import {
  parsePencilmarksString,
  pencilmarksToString,
} from '../utils/techniqueWalkthrough';

export interface ValidatedPuzzle {
  puzzle: string;
  solution: string;
  /** Difficulty level (1-12) the solver rated the puzzle at */
  level?: number;
  /** Solver's difficulty_score for the puzzle, when the API sends it */
  difficultyScore?: number | undefined;
}

export interface UseBoardEntryOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
  /** Access token (default: SudojoApiProvider) */
  token?: string | null | undefined;
}

/**
 * What the game should apply once the entered puzzle is validated: the
 * scanned player digits and/or the entry pencilmarks. Pass the fields to the
 * game as initialInput / initialPencilmarks / initialAutoPencilmarks (or to
 * useSudoku's applyHintData).
 */
export interface BoardEntryPlayState {
  /** 81-char player input ('0' = none). '0'.repeat(81) when only pencilmarks exist */
  input?: string;
  /** 81 comma-separated pencilmark entries */
  pencilmarks?: string;
  /** Whether the pencilmarks were auto-filled */
  autopencil?: boolean;
}

export interface UseBoardEntryReturn {
  /** 81 cells with given values only */
  cells: SudokuCell[];
  /** Currently selected cell index */
  selectedIndex: number | null;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Validation error message key */
  validationError: string | null;
  /** Validated puzzle data (puzzle + solution + solver rating) */
  validatedPuzzle: ValidatedPuzzle | null;
  /** Select a cell by index */
  selectCell: (index: number) => void;
  /** Set a given value at the selected cell */
  setGiven: (value: number) => void;
  /** Erase the selected cell */
  erase: () => void;
  /** Get the puzzle as an 81-character string */
  getPuzzleString: () => string;
  /** Trigger validation */
  validate: () => void;
  /** Reset to empty board */
  reset: () => void;
  /** Number of clues entered */
  clueCount: number;
  /** Set cells from an 81-character puzzle string (clears pencilmarks and scanned input) */
  setCellsFromPuzzle: (puzzle: string) => void;

  // --- Entry pencilmarks ---------------------------------------------------
  /** Per-cell entry pencilmarks (81 sorted digit arrays; [] = none) */
  pencilmarks: number[][];
  /** Whether the pencilmarks were auto-filled (from a scan) */
  autopencil: boolean;
  /** Whether any cell has pencilmarks */
  hasPencilmarks: boolean;
  /** Pencilmarks as 81 comma-separated entries (e.g. "12,,9,...") */
  pencilmarksString: string;
  /** Toggle a pencilmark digit on the selected cell (ignored on givens) */
  togglePencilmark: (digit: number) => void;
  /** `cells` with the entry pencilmarks merged in, for display */
  displayCells: SudokuCell[];
  /** Whether digit input goes to pencilmarks instead of givens */
  isPencilMode: boolean;
  /** Toggle pencil mode */
  togglePencilMode: () => void;
  /** Set pencil mode */
  setPencilMode: (on: boolean) => void;
  /**
   * Route a digit: in pencil mode toggle a pencilmark, otherwise set a given
   * (web/RN entry keypad behavior).
   */
  enterDigit: (value: number) => void;

  // --- Givens --------------------------------------------------------------
  /**
   * Set a given at the selected cell, or erase it when the cell already holds
   * that digit (extension keypad behavior).
   */
  toggleGiven: (value: number) => void;
  /** Whether Validate may run (enough clues and not already validating) */
  canValidate: boolean;

  // --- Scans ---------------------------------------------------------------
  /**
   * Load a scanned board: givens from `original`, pencilmarks and autopencil
   * from the scan, and the player's digits as `scannedInput`.
   */
  applyScan: (scanned: ScannedBoard) => void;
  /** The scanned player digits (81 chars), or null when the scan had none */
  scannedInput: string | null;
  /**
   * What the game should apply once validated (scanned input and/or entry
   * pencilmarks), or undefined when there is nothing to restore.
   */
  initialPlayState: BoardEntryPlayState | undefined;
}

/**
 * Create an empty 81-cell board for entry mode
 */
function createEmptyCells(): SudokuCell[] {
  return createEmptyBoard().cells;
}

/**
 * Create a board from an 81-character puzzle string
 * '0' or '.' for empty, '1'-'9' for given values
 */
function puzzleStringToCells(puzzle: string): SudokuCell[] {
  if (puzzle.length !== 81) {
    return createEmptyCells();
  }

  return Array.from({ length: 81 }, (_, index) => {
    const char = puzzle.charAt(index);
    const value = parseInt(char, 10);
    const given = value >= 1 && value <= 9 ? value : null;

    return {
      index,
      solution: null,
      given,
      input: null,
      pencilmarks: null,
    };
  });
}

/**
 * Classify a validation error message into a translation key
 */
function classifyValidationError(errorMsg: string): string {
  const lower = errorMsg.toLowerCase();
  if (lower.includes('multiple') || lower.includes('not unique')) {
    return 'enter.errors.multipleSolutions';
  }
  if (lower.includes('cannot solve') || lower.includes('no solution')) {
    return 'enter.errors.noSolution';
  }
  return 'enter.errors.validationFailed';
}

function createEmptyPencilmarks(): number[][] {
  return Array.from({ length: 81 }, () => []);
}

const EMPTY_INPUT = '0'.repeat(81);

export function useBoardEntry(
  options: UseBoardEntryOptions = {}
): UseBoardEntryReturn {
  const { networkClient, baseUrl, token } = useResolvedSudojoApi(
    options,
    'useBoardEntry'
  );
  const [cells, setCells] = useState<SudokuCell[]>(createEmptyCells);
  const [pencilmarks, setPencilmarks] = useState<number[][]>(
    createEmptyPencilmarks
  );
  const [autopencil, setAutopencil] = useState(false);
  const [scannedInput, setScannedInput] = useState<string | null>(null);
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedPuzzle, setValidatedPuzzle] =
    useState<ValidatedPuzzle | null>(null);
  const [shouldValidate, setShouldValidate] = useState(false);

  // Compute puzzle string for validation
  const puzzleString = useMemo(() => cellsToPuzzleString(cells), [cells]);
  const clueCount = useMemo(() => countClues(cells), [cells]);

  // Use the solver validate hook
  const {
    data: validateData,
    error: validateError,
    isLoading: isValidating,
  } = useSolverValidate(
    networkClient,
    baseUrl,
    token,
    { original: puzzleString },
    {
      enabled: shouldValidate && clueCount >= MIN_CLUES,
      retry: false,
    }
  );

  // Track whether we've already processed this validation result
  const processedDataRef = useRef<typeof validateData | null>(null);
  const processedErrorRef = useRef<typeof validateError | null>(null);

  // Handle validation result
  useEffect(() => {
    if (!shouldValidate || isValidating) return;
    if (!validateData) return;
    // Avoid re-processing the same result
    if (processedDataRef.current === validateData) return;
    processedDataRef.current = validateData;

    // ValidateData has board.solution
    const board = validateData.data?.board;
    const solution = board?.solution;
    if (validateData.success && solution) {
      setValidatedPuzzle({
        puzzle: puzzleString,
        solution,
        level: board.level,
        difficultyScore: board.difficulty_score,
      });
      setValidationError(null);
    } else if (validateData.error) {
      // Validation failed with specific error
      setValidationError(classifyValidationError(validateData.error));
      setValidatedPuzzle(null);
    } else {
      // Unexpected response - success but no solution
      console.error('Unexpected validation response:', validateData);
      setValidationError('enter.errors.validationFailed');
      setValidatedPuzzle(null);
    }
    setShouldValidate(false);
  }, [validateData, shouldValidate, isValidating, puzzleString]);

  // Handle network/query errors (e.g. 400 responses throw NetworkError)
  useEffect(() => {
    if (!shouldValidate || isValidating) return;
    if (!validateError) return;
    if (processedErrorRef.current === validateError) return;
    processedErrorRef.current = validateError;

    // Extract error message from NetworkError response body or message
    const networkErr = validateError as {
      response?: { error?: string };
      message?: string;
    };
    const errorMsg = networkErr.response?.error ?? networkErr.message ?? '';
    setValidationError(classifyValidationError(errorMsg));
    setValidatedPuzzle(null);
    setShouldValidate(false);
  }, [validateError, shouldValidate, isValidating]);

  // Select a cell
  const selectCell = useCallback((index: number) => {
    if (index >= 0 && index < 81) {
      setSelectedIndex(index);
    }
  }, []);

  // Set a given value at the selected cell
  const setGiven = useCallback(
    (value: number) => {
      if (selectedIndex === null || value < 1 || value > 9) return;

      setCells(prevCells => {
        const newCells = [...prevCells];
        const existing = newCells[selectedIndex];
        if (existing) {
          newCells[selectedIndex] = { ...existing, given: value };
        }
        return newCells;
      });
      // A given replaces the cell's pencilmarks
      setPencilmarks(prev => {
        if (!prev[selectedIndex]?.length) return prev;
        const next = [...prev];
        next[selectedIndex] = [];
        return next;
      });

      // Clear validation state when board changes
      setValidationError(null);
      setValidatedPuzzle(null);
    },
    [selectedIndex]
  );

  // Erase the selected cell
  const erase = useCallback(() => {
    if (selectedIndex === null) return;

    setCells(prevCells => {
      const newCells = [...prevCells];
      const existing = newCells[selectedIndex];
      if (existing) {
        newCells[selectedIndex] = { ...existing, given: null };
      }
      return newCells;
    });

    // Clear validation state when board changes
    setValidationError(null);
    setValidatedPuzzle(null);
  }, [selectedIndex]);

  // Get puzzle string
  const getPuzzleString = useCallback(() => {
    return puzzleString;
  }, [puzzleString]);

  // Trigger validation
  const validate = useCallback(() => {
    // Check minimum clues
    if (clueCount < MIN_CLUES) {
      setValidationError('enter.errors.notEnoughClues');
      return;
    }

    // Clear previous state and trigger validation
    setValidationError(null);
    setValidatedPuzzle(null);
    // Clear processed refs so cached React Query results are re-processed
    processedDataRef.current = null;
    processedErrorRef.current = null;
    setShouldValidate(true);
  }, [clueCount]);

  // Reset to empty board
  const reset = useCallback(() => {
    setCells(createEmptyCells());
    setPencilmarks(createEmptyPencilmarks());
    setAutopencil(false);
    setScannedInput(null);
    setIsPencilMode(false);
    setSelectedIndex(null);
    setValidationError(null);
    setValidatedPuzzle(null);
    setShouldValidate(false);
    processedDataRef.current = null;
    processedErrorRef.current = null;
  }, []);

  // Set cells from puzzle string
  const setCellsFromPuzzle = useCallback((puzzle: string) => {
    setCells(puzzleStringToCells(puzzle));
    setPencilmarks(createEmptyPencilmarks());
    setAutopencil(false);
    setScannedInput(null);
    setSelectedIndex(null);
    setValidationError(null);
    setValidatedPuzzle(null);
    setShouldValidate(false);
    processedDataRef.current = null;
    processedErrorRef.current = null;
  }, []);

  // Toggle a pencilmark digit on the selected (non-given) cell
  const togglePencilmark = useCallback(
    (digit: number) => {
      if (selectedIndex === null || digit < 1 || digit > 9) return;
      if (cells[selectedIndex]?.given !== null) return;
      setPencilmarks(prev => {
        const next = [...prev];
        const current = next[selectedIndex] ?? [];
        next[selectedIndex] = current.includes(digit)
          ? current.filter(d => d !== digit)
          : [...current, digit].sort((a, b) => a - b);
        return next;
      });
    },
    [selectedIndex, cells]
  );

  const togglePencilMode = useCallback(() => {
    setIsPencilMode(prev => !prev);
  }, []);

  const setPencilMode = useCallback((on: boolean) => {
    setIsPencilMode(on);
  }, []);

  const enterDigit = useCallback(
    (value: number) => {
      if (isPencilMode) {
        togglePencilmark(value);
      } else {
        setGiven(value);
      }
    },
    [isPencilMode, togglePencilmark, setGiven]
  );

  const toggleGiven = useCallback(
    (value: number) => {
      if (selectedIndex !== null && cells[selectedIndex]?.given === value) {
        erase();
      } else {
        setGiven(value);
      }
    },
    [selectedIndex, cells, erase, setGiven]
  );

  // Load a scanned board (givens, pencilmarks, player digits)
  const applyScan = useCallback(
    (scanned: ScannedBoard) => {
      setCellsFromPuzzle(scanned.original);
      const parsed = parsePencilmarksString(scanned.pencilmarks);
      setPencilmarks(
        parsed.length === 81
          ? parsed.map(pm => (pm ? [...pm].sort((a, b) => a - b) : []))
          : createEmptyPencilmarks()
      );
      setAutopencil(scanned.autopencil);
      setScannedInput(hasScannedInput(scanned) ? scanned.user : null);
    },
    [setCellsFromPuzzle]
  );

  // Entry cells with pencilmarks merged in (givens never show pencilmarks)
  const displayCells = useMemo(
    () =>
      cells.map((cell, i) => {
        if (cell.given !== null) return cell;
        const pm = pencilmarks[i];
        return pm && pm.length > 0 ? { ...cell, pencilmarks: pm } : cell;
      }),
    [cells, pencilmarks]
  );

  const hasPencilmarks = useMemo(
    () => pencilmarks.some(pm => pm.length > 0),
    [pencilmarks]
  );

  const pencilmarksString = useMemo(
    () => pencilmarksToString(pencilmarks.map(pm => [...pm])),
    [pencilmarks]
  );

  const initialPlayState = useMemo((): BoardEntryPlayState | undefined => {
    if (!scannedInput && !hasPencilmarks) return undefined;
    // A given corrected after the scan wins over a scanned digit there.
    const input = scannedInput
      ? Array.from(scannedInput, (ch, i) =>
          cells[i]?.given !== null ? '0' : ch
        ).join('')
      : EMPTY_INPUT;
    const state: BoardEntryPlayState = { input };
    if (hasPencilmarks) {
      state.pencilmarks = pencilmarksString;
      state.autopencil = autopencil;
    }
    return state;
  }, [scannedInput, hasPencilmarks, pencilmarksString, autopencil, cells]);

  const canValidate = clueCount >= MIN_CLUES && !isValidating;

  return {
    cells,
    selectedIndex,
    isValidating,
    validationError,
    validatedPuzzle,
    selectCell,
    setGiven,
    erase,
    getPuzzleString,
    validate,
    reset,
    clueCount,
    setCellsFromPuzzle,
    pencilmarks,
    autopencil,
    hasPencilmarks,
    pencilmarksString,
    togglePencilmark,
    displayCells,
    isPencilMode,
    togglePencilMode,
    setPencilMode,
    enterDigit,
    toggleGiven,
    canValidate,
    applyScan,
    scannedInput,
    initialPlayState,
  };
}
