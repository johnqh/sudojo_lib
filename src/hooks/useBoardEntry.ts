/**
 * Hook for managing Sudoku board entry mode state
 * Allows users to enter given clues for a custom puzzle
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SudokuCell } from '../types';
import { useSolverValidate } from '@sudobility/sudojo_client';
import type { NetworkClient } from '@sudobility/types';

export interface ValidatedPuzzle {
  puzzle: string;
  solution: string;
}

export interface UseBoardEntryOptions {
  networkClient: NetworkClient;
  baseUrl: string;
  token: string;
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
  /** Validated puzzle data (puzzle + solution) */
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
  /** Set cells from an 81-character puzzle string */
  setCellsFromPuzzle: (puzzle: string) => void;
}

/**
 * Create an empty 81-cell board for entry mode
 */
function createEmptyBoard(): SudokuCell[] {
  return Array.from({ length: 81 }, (_, index) => ({
    index,
    solution: null,
    given: null,
    input: null,
    pencilmarks: null,
  }));
}

/**
 * Convert cells to 81-character puzzle string
 * '0' for empty, '1'-'9' for given values
 */
function cellsToPuzzleString(cells: SudokuCell[]): string {
  return cells.map(cell => cell.given?.toString() ?? '0').join('');
}

/**
 * Count the number of non-empty cells (clues)
 */
function countClues(cells: SudokuCell[]): number {
  return cells.filter(cell => cell.given !== null).length;
}

/**
 * Create a board from an 81-character puzzle string
 * '0' or '.' for empty, '1'-'9' for given values
 */
function puzzleStringToCells(puzzle: string): SudokuCell[] {
  if (puzzle.length !== 81) {
    return createEmptyBoard();
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

export function useBoardEntry({
  networkClient,
  baseUrl,
  token,
}: UseBoardEntryOptions): UseBoardEntryReturn {
  const [cells, setCells] = useState<SudokuCell[]>(createEmptyBoard);
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
      enabled: shouldValidate && clueCount >= 17,
      retry: false,
    }
  );

  // Track whether we've already processed this validation result
  const processedDataRef = useRef<typeof validateData | null>(null);
  const processedErrorRef = useRef<typeof validateError | null>(null);

  // Handle validation result
  useEffect(() => {
    console.log('[useBoardEntry] validate effect:', {
      shouldValidate,
      isValidating,
      hasData: !!validateData,
      sameRef: processedDataRef.current === validateData,
    });
    if (!shouldValidate || isValidating) return;
    if (!validateData) return;
    // Avoid re-processing the same result
    if (processedDataRef.current === validateData) return;
    processedDataRef.current = validateData;

    // ValidateData has board.solution
    const solution = validateData.data?.board?.solution;
    console.log('[useBoardEntry] processing result:', { success: validateData.success, hasSolution: !!solution });
    if (validateData.success && solution) {
      setValidatedPuzzle({
        puzzle: puzzleString,
        solution,
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
    if (clueCount < 17) {
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
    setCells(createEmptyBoard());
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
    setSelectedIndex(null);
    setValidationError(null);
    setValidatedPuzzle(null);
    setShouldValidate(false);
    processedDataRef.current = null;
    processedErrorRef.current = null;
  }, []);

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
  };
}
