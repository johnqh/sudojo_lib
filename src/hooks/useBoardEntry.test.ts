/**
 * Tests for useBoardEntry's entry pencilmarks, toggleGiven, canValidate and
 * scan restore. useSolverValidate is mocked (idle).
 */

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { NetworkClient } from '@sudobility/types';

vi.mock('@sudobility/sudojo_client', () => ({
  useSolverValidate: () => ({
    data: undefined,
    error: null,
    isLoading: false,
  }),
}));

import { useBoardEntry } from './useBoardEntry';
import type { ScannedBoard } from '../utils/scannedBoard';

const ORIGINAL =
  '000010040530000000000000200200509000008000010000000030014000000000700600000200500';

function render() {
  return renderHook(() =>
    useBoardEntry({
      networkClient: {} as NetworkClient,
      baseUrl: 'https://api',
      token: '',
    })
  );
}

describe('useBoardEntry', () => {
  it('toggles sorted pencilmarks, not on givens, and merges them for display', () => {
    const { result } = render();
    act(() => result.current.selectCell(0));
    act(() => result.current.togglePencilmark(5));
    act(() => result.current.togglePencilmark(2));
    expect(result.current.pencilmarks[0]).toEqual([2, 5]);
    expect(result.current.displayCells[0]?.pencilmarks).toEqual([2, 5]);
    expect(result.current.hasPencilmarks).toBe(true);
    expect(result.current.pencilmarksString.split(',')).toHaveLength(81);
    expect(result.current.pencilmarksString.startsWith('25,')).toBe(true);

    act(() => result.current.togglePencilmark(5));
    expect(result.current.pencilmarks[0]).toEqual([2]);

    // A given clears the cell's pencilmarks, and blocks new ones
    act(() => result.current.setGiven(7));
    expect(result.current.pencilmarks[0]).toEqual([]);
    act(() => result.current.togglePencilmark(3));
    expect(result.current.pencilmarks[0]).toEqual([]);
  });

  it('enterDigit routes through pencil mode', () => {
    const { result } = render();
    act(() => result.current.selectCell(4));
    act(() => result.current.togglePencilMode());
    act(() => result.current.enterDigit(9));
    expect(result.current.pencilmarks[4]).toEqual([9]);
    expect(result.current.cells[4]?.given).toBeNull();
    act(() => result.current.setPencilMode(false));
    act(() => result.current.enterDigit(9));
    expect(result.current.cells[4]?.given).toBe(9);
  });

  it('toggleGiven erases the same digit and sets another', () => {
    const { result } = render();
    act(() => result.current.selectCell(10));
    act(() => result.current.toggleGiven(3));
    expect(result.current.cells[10]?.given).toBe(3);
    act(() => result.current.toggleGiven(3));
    expect(result.current.cells[10]?.given).toBeNull();
    act(() => result.current.toggleGiven(4));
    act(() => result.current.toggleGiven(6));
    expect(result.current.cells[10]?.given).toBe(6);
  });

  it('canValidate needs MIN_CLUES', () => {
    const { result } = render();
    expect(result.current.canValidate).toBe(false);
    act(() => result.current.setCellsFromPuzzle(ORIGINAL));
    expect(result.current.clueCount).toBe(17);
    expect(result.current.canValidate).toBe(true);
  });

  it('applyScan merges the player digits into the givens and keeps pencilmarks', () => {
    const user = `00000500${'0'.repeat(73)}`;
    const puzzle = `${ORIGINAL.slice(0, 5)}5${ORIGINAL.slice(6)}`;
    const marks = Array.from({ length: 81 }, (_, i) => (i === 0 ? '93' : ''));
    const scanned: ScannedBoard = {
      puzzle,
      original: ORIGINAL,
      user,
      pencilmarks: marks.join(','),
      autopencil: true,
      clueCount: 18,
      confidence: 99,
    };
    const { result } = render();
    act(() => result.current.applyScan(scanned));
    expect(result.current.getPuzzleString()).toBe(puzzle);
    expect(result.current.cells[5]?.given).toBe(5);
    expect(result.current.clueCount).toBe(18);
    expect(result.current.displayCells[5]?.input).toBeNull();
    expect(result.current.pencilmarks[0]).toEqual([3, 9]);
    expect(result.current.autopencil).toBe(true);
    expect(result.current.scannedInput).toBeNull();
    expect(result.current.initialPlayState).toEqual({
      input: '0'.repeat(81),
      pencilmarks: `39${','.repeat(80)}`,
      autopencil: true,
    });

    act(() => result.current.reset());
    expect(result.current.hasPencilmarks).toBe(false);
    expect(result.current.autopencil).toBe(false);
    expect(result.current.initialPlayState).toBeUndefined();
  });

  it('applyScan without pencilmarks restores nothing', () => {
    const { result } = render();
    act(() =>
      result.current.applyScan({
        puzzle: ORIGINAL,
        original: ORIGINAL,
        user: '0'.repeat(81),
        pencilmarks: '',
        autopencil: false,
        clueCount: 17,
        confidence: 90,
      })
    );
    expect(result.current.clueCount).toBe(17);
    expect(result.current.initialPlayState).toBeUndefined();
  });

  it('initialPlayState with pencilmarks only uses an empty input', () => {
    const { result } = render();
    act(() => result.current.selectCell(0));
    act(() => result.current.togglePencilmark(1));
    expect(result.current.initialPlayState).toEqual({
      input: '0'.repeat(81),
      pencilmarks: `1${','.repeat(80)}`,
      autopencil: false,
    });
  });
});
