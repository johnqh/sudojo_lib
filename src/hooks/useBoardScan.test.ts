/**
 * Tests for useBoardScan: the request goes through sudojo_client's
 * useSudojoOcrExtract, and the response comes back as a ScannedBoard.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { NetworkClient } from '@sudobility/types';

const mutateAsync = vi.fn();

vi.mock('@sudobility/sudojo_client', () => ({
  useSudojoOcrExtract: () => ({ mutateAsync, isPending: false }),
}));

import { ScanBoardError } from '../utils/scannedBoard';
import { useBoardScan } from './useBoardScan';

const ORIGINAL =
  '000010040530000000000000200200509000008000010000000030014000000000700600000200500';
const USER =
  '000015040530000100140000250201539000308000010400100030014050000000700600000200500';

function renderScan() {
  return renderHook(() =>
    useBoardScan({
      networkClient: {} as NetworkClient,
      baseUrl: 'https://api',
    })
  ).result.current;
}

describe('useBoardScan', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });

  it('sends the image through useSudojoOcrExtract and returns the board', async () => {
    mutateAsync.mockResolvedValue({
      success: true,
      data: {
        board: {
          original: ORIGINAL,
          user: USER,
          pencilmark: { numbers: '', autopencil: false },
        },
        confidence: 98,
        digitCount: 17,
      },
    });

    const board = await renderScan().scan('tok', 'AAAA', 'camera');

    expect(mutateAsync).toHaveBeenCalledWith({
      token: 'tok',
      image: 'AAAA',
      source: 'camera',
    });
    expect(board.original).toBe(ORIGINAL);
    expect(board.user[5]).toBe('5');
    expect(board.user[4]).toBe('0');
  });

  it('defaults the source to library', async () => {
    mutateAsync.mockResolvedValue({
      success: true,
      data: { board: { original: ORIGINAL }, confidence: 1, digitCount: 17 },
    });
    await renderScan().scan('tok', 'AAAA');
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'library' })
    );
  });

  it('reports a failed request as REQUEST_FAILED', async () => {
    mutateAsync.mockRejectedValue(new Error('network down'));
    const error = await renderScan()
      .scan('tok', 'AAAA')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ScanBoardError);
    expect((error as ScanBoardError).code).toBe('REQUEST_FAILED');
    expect((error as ScanBoardError).message).toBe('network down');
  });
});
