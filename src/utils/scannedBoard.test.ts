/**
 * Tests for scanned board (OCR result) utilities
 */

import { describe, expect, it } from 'vitest';
import type { OCRExtractData } from '@sudobility/sudojo_types';
import {
  hasScannedInput,
  MIN_SCAN_CLUES,
  ScanBoardError,
  scannedBoardFromResponse,
  toScannedBoard,
} from './scannedBoard';

// A game in progress, as sudojo_ocr_ml read it from a screenshot: 17 givens,
// and `user` holding the givens plus 14 digits the player had entered.
const ORIGINAL =
  '000010040530000000000000200200509000008000010000000030014000000000700600000200500';
const USER =
  '000015040530000100140000250201539000308000010400100030014050000000700600000200500';
// The same player digits with the givens blanked.
const PLAYER =
  '000005000000000100140000050001030000300000000400100000000050000000000000000000000';

function ocr(
  board: Partial<OCRExtractData['board']>,
  extra: Partial<OCRExtractData> = {}
): OCRExtractData {
  return {
    board: {
      original: ORIGINAL,
      user: ORIGINAL,
      pencilmark: { numbers: '', autopencil: false },
      ...board,
    },
    confidence: 98,
    digitCount: 17,
    ...extra,
  };
}

function pencilmarks(cells: Record<number, string>): string {
  return Array.from({ length: 81 }, (_, i) => cells[i] ?? '').join(',');
}

describe('toScannedBoard', () => {
  it('splits the player digits from the givens', () => {
    const board = toScannedBoard(ocr({ user: USER }, { engine: 'ml' }));
    expect(board.original).toBe(ORIGINAL);
    expect(board.user).toBe(PLAYER);
    // The merged board (givens + player digits) is what gets entered
    expect(board.puzzle).toBe(USER);
    expect(board.clueCount).toBe(USER.replace(/0/g, '').length);
    expect(board.confidence).toBe(98);
    expect(board.engine).toBe('ml');
    expect(hasScannedInput(board)).toBe(true);
  });

  it('accepts a user board that already omits the givens', () => {
    expect(toScannedBoard(ocr({ user: PLAYER })).user).toBe(PLAYER);
  });

  it('never lets a player digit overwrite a given', () => {
    // r1c5 is a given 1; a misread says 7.
    const user = `${ORIGINAL.slice(0, 4)}7${ORIGINAL.slice(5)}`;
    expect(toScannedBoard(ocr({ user })).user[4]).toBe('0');
  });

  it('has no player digits when user equals original', () => {
    const board = toScannedBoard(ocr({}));
    expect(board.user).toBe('0'.repeat(81));
    expect(hasScannedInput(board)).toBe(false);
  });

  it('ignores a missing or malformed user board', () => {
    expect(toScannedBoard(ocr({ user: '' })).user).toBe('0'.repeat(81));
    expect(toScannedBoard(ocr({ user: '123' })).user).toBe('0'.repeat(81));
  });

  it('keeps pencilmarks only on empty cells', () => {
    const board = toScannedBoard(
      ocr({
        user: USER,
        // 0: empty cell; 4: a given; 5: a player digit
        pencilmark: {
          numbers: pencilmarks({ 0: '6789', 4: '23', 5: '58' }),
          autopencil: true,
        },
      })
    );
    expect(board.pencilmarks).toBe(pencilmarks({ 0: '6789' }));
    expect(board.autopencil).toBe(true);
  });

  it('sorts, dedupes and strips non-digits from pencilmarks', () => {
    const board = toScannedBoard(
      ocr({
        pencilmark: {
          numbers: pencilmarks({ 0: '9a3309' }),
          autopencil: false,
        },
      })
    );
    expect(board.pencilmarks).toBe(pencilmarks({ 0: '39' }));
  });

  it('drops pencilmarks without 81 entries, or with none left', () => {
    expect(
      toScannedBoard(ocr({ pencilmark: { numbers: '12,3', autopencil: true } }))
    ).toMatchObject({ pencilmarks: '', autopencil: false });
    expect(
      toScannedBoard(
        ocr({
          pencilmark: { numbers: pencilmarks({ 4: '23' }), autopencil: true },
        })
      )
    ).toMatchObject({ pencilmarks: '', autopencil: false });
  });

  it('throws INVALID_BOARD when original is not 81 digits', () => {
    for (const original of ['', '123', 'x'.repeat(81)]) {
      expect(() => toScannedBoard(ocr({ original }))).toThrow(
        expect.objectContaining({ code: 'INVALID_BOARD' })
      );
    }
  });
});

describe('scannedBoardFromResponse', () => {
  const response = (data: unknown, extra: object = {}) =>
    ({ success: true, data, timestamp: '', ...extra }) as Parameters<
      typeof scannedBoardFromResponse
    >[0];

  it('returns the normalized board', () => {
    expect(scannedBoardFromResponse(response(ocr({ user: USER }))).user).toBe(
      PLAYER
    );
  });

  it('throws REQUEST_FAILED with the API error when success is false', () => {
    expect(() =>
      scannedBoardFromResponse(
        response(undefined, {
          success: false,
          error: 'Image recognition is unavailable',
        })
      )
    ).toThrow(
      expect.objectContaining({
        code: 'REQUEST_FAILED',
        message: 'Image recognition is unavailable',
      })
    );
  });

  it('throws INVALID_BOARD when the API returns no board', () => {
    expect(() => scannedBoardFromResponse(response(undefined))).toThrow(
      expect.objectContaining({ code: 'INVALID_BOARD' })
    );
  });

  it('throws TOO_FEW_CLUES with the board it read', () => {
    const sparse =
      '1'.repeat(MIN_SCAN_CLUES - 1) + '0'.repeat(82 - MIN_SCAN_CLUES);
    let error: unknown;
    try {
      scannedBoardFromResponse(
        response(ocr({ original: sparse, user: sparse }))
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ScanBoardError);
    expect((error as ScanBoardError).code).toBe('TOO_FEW_CLUES');
    expect((error as ScanBoardError).board?.clueCount).toBe(MIN_SCAN_CLUES - 1);
  });

  it('counts the merged board for TOO_FEW_CLUES', () => {
    // 16 printed givens + 1 player digit = 17: enough to validate
    const sparse =
      '1'.repeat(MIN_SCAN_CLUES - 1) + '0'.repeat(82 - MIN_SCAN_CLUES);
    const user = `${sparse.slice(0, 80)}2`;
    const board = scannedBoardFromResponse(
      response(ocr({ original: sparse, user }))
    );
    expect(board.clueCount).toBe(MIN_SCAN_CLUES);
    expect(board.puzzle).toBe(user);
    expect(board.original).toBe(sparse);
    expect(board.user).toBe(`${'0'.repeat(80)}2`);
  });
});

describe('toScannedBoard puzzle', () => {
  it('equals the givens when there are no player digits', () => {
    const board = toScannedBoard(ocr({}));
    expect(board.puzzle).toBe(ORIGINAL);
    expect(board.clueCount).toBe(17);
    expect(hasScannedInput(board)).toBe(false);
  });
});
