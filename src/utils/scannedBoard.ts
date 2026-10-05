/**
 * Scanned board - turn an OCR result from sudojo_api into game state.
 *
 * A photo of a game in progress shows three things: the puzzle's givens, the
 * digits a player had already entered (drawn in another color), and
 * pencilmarks. `POST /api/v1/ocr/extract` returns them as a SolverBoard
 * (`original`, `user`, `pencilmark`). Every client that scans a board goes
 * through here, so they all keep the same parts of it.
 */

import type { OCRExtractData } from '@sudobility/sudojo_types';
import { MIN_CLUES } from '@sudobility/sudojo_types';
import type { BaseResponse } from '@sudobility/types';

/**
 * Fewest givens a scanned board needs: MIN_CLUES (17) from sudojo_types, the
 * fewest a Sudoku can have and still be solvable to a unique answer. Kept as an
 * alias so existing imports keep working.
 */
export const MIN_SCAN_CLUES = MIN_CLUES;

const BOARD_PATTERN = /^[0-9]{81}$/;

/** A scanned board, normalized and ready to load into entry or play. */
export interface ScannedBoard {
  /** The givens, 81 chars, '0' = empty. Goes into the entry grid. */
  original: string;
  /**
   * Digits the player had entered, 81 chars, '0' = no input. Given cells are
   * always '0', the same shape as the game's input string, so it can be passed
   * straight to `initialInput` / `applyHintData`.
   */
  user: string;
  /** 81 comma-separated pencilmark entries (e.g. "126"), or '' when none. */
  pencilmarks: string;
  /** Whether the pencilmarks were auto-filled in the scanned game. */
  autopencil: boolean;
  /** Number of givens in `original`. */
  clueCount: number;
  /** OCR confidence, 0-100. */
  confidence: number;
  /** Which backend read the image, when the API says. */
  engine?: OCRExtractData['engine'];
}

export type ScanBoardErrorCode =
  /** The request failed or the API reported an error. */
  | 'REQUEST_FAILED'
  /** The API answered without a usable 81-cell board. */
  | 'INVALID_BOARD'
  /** The board has fewer than MIN_SCAN_CLUES givens. */
  | 'TOO_FEW_CLUES';

export class ScanBoardError extends Error {
  readonly code: ScanBoardErrorCode;
  /** The board as read, when there was one (set for TOO_FEW_CLUES). */
  readonly board?: ScannedBoard;

  constructor(
    code: ScanBoardErrorCode,
    message: string,
    options: { board?: ScannedBoard; cause?: unknown } = {}
  ) {
    super(message);
    this.name = 'ScanBoardError';
    this.code = code;
    if (options.board) this.board = options.board;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * Normalize an OCR result into a ScannedBoard.
 *
 * - `user` keeps only the player's digits: given cells are blanked, so a given
 *   can never be overwritten by a misread input digit.
 * - Pencilmarks are dropped from cells that hold a digit, and kept only when
 *   there are 81 entries.
 *
 * @throws ScanBoardError `INVALID_BOARD` when `original` is not 81 digits
 */
export function toScannedBoard(
  data: OCRExtractData | null | undefined
): ScannedBoard {
  const board = data?.board;
  const original = board?.original;
  if (!original || !BOARD_PATTERN.test(original)) {
    throw new ScanBoardError(
      'INVALID_BOARD',
      'OCR did not return an 81-cell board'
    );
  }

  const rawUser =
    board.user && BOARD_PATTERN.test(board.user) ? board.user : null;
  const user = Array.from({ length: 81 }, (_, i) =>
    rawUser && original[i] === '0' ? rawUser[i] : '0'
  ).join('');

  const entries = board.pencilmark?.numbers?.split(',') ?? [];
  let pencilmarks = '';
  if (entries.length === 81) {
    const cleaned = entries.map((entry, i) =>
      original[i] !== '0' || user[i] !== '0'
        ? ''
        : Array.from(new Set(entry.replace(/[^1-9]/g, '')))
            .sort()
            .join('')
    );
    if (cleaned.some(entry => entry !== '')) {
      pencilmarks = cleaned.join(',');
    }
  }

  const result: ScannedBoard = {
    original,
    user,
    pencilmarks,
    autopencil: pencilmarks !== '' && board.pencilmark?.autopencil === true,
    clueCount: original.replace(/0/g, '').length,
    confidence: data?.confidence ?? 0,
  };
  if (data?.engine) result.engine = data.engine;
  return result;
}

/** Whether the scan recorded any player digits. */
export function hasScannedInput(board: ScannedBoard): boolean {
  return /[1-9]/.test(board.user);
}

/**
 * Turn the OCR endpoint's response into a playable ScannedBoard.
 *
 * The request itself belongs to sudojo_client (`useSudojoOcrExtract`); this
 * only interprets what came back.
 *
 * @throws ScanBoardError `REQUEST_FAILED` when the API reported an error,
 *   `INVALID_BOARD` when there is no 81-cell board, `TOO_FEW_CLUES` when the
 *   board has fewer than MIN_SCAN_CLUES givens (the error carries the board)
 */
export function scannedBoardFromResponse(
  response: BaseResponse<OCRExtractData>
): ScannedBoard {
  if (!response.success) {
    throw new ScanBoardError(
      'REQUEST_FAILED',
      response.error || 'OCR request failed'
    );
  }

  const board = toScannedBoard(response.data);
  if (board.clueCount < MIN_SCAN_CLUES) {
    throw new ScanBoardError(
      'TOO_FEW_CLUES',
      `Too few clues detected (${board.clueCount}/${MIN_SCAN_CLUES} minimum)`,
      { board }
    );
  }
  return board;
}
