/**
 * Hook for scanning a Sudoku board from an image.
 *
 * The request goes through sudojo_client's `useSudojoOcrExtract`; this hook
 * turns the response into a ScannedBoard (givens, the player's digits and
 * pencilmarks) with `scannedBoardFromResponse`.
 */

import { useCallback } from 'react';
import { useSudojoOcrExtract } from '@sudobility/sudojo_client';
import type { OcrSource } from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useResolvedSudojoApi } from '../context/SudojoApiContext';
import {
  ScanBoardError,
  type ScannedBoard,
  scannedBoardFromResponse,
} from '../utils/scannedBoard';

export interface UseBoardScanOptions {
  /** Network client for API calls (default: SudojoApiProvider) */
  networkClient?: NetworkClient | undefined;
  /** Base URL for the Sudojo API (default: SudojoApiProvider) */
  baseUrl?: string | undefined;
}

export interface UseBoardScanReturn {
  /**
   * Read the board in an image.
   * @throws ScanBoardError
   */
  scan: (
    token: string,
    image: string,
    source?: OcrSource
  ) => Promise<ScannedBoard>;
  /** Whether a scan is in flight */
  isScanning: boolean;
}

export function useBoardScan(
  options: UseBoardScanOptions = {}
): UseBoardScanReturn {
  const { networkClient, baseUrl } = useResolvedSudojoApi(
    options,
    'useBoardScan'
  );
  const { mutateAsync, isPending } = useSudojoOcrExtract(
    networkClient,
    baseUrl
  );

  const scan = useCallback(
    async (token: string, image: string, source: OcrSource = 'library') => {
      let response;
      try {
        response = await mutateAsync({ token, image, source });
      } catch (error) {
        throw new ScanBoardError(
          'REQUEST_FAILED',
          error instanceof Error ? error.message : String(error),
          { cause: error }
        );
      }
      return scannedBoardFromResponse(response);
    },
    [mutateAsync]
  );

  return { scan, isScanning: isPending };
}
