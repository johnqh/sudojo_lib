/**
 * Tests for useHint: solver requests go through sudojo_client's
 * useSolverSolveMutation (filtered first, then the unfiltered fallback).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import type { NetworkClient } from '@sudobility/types';

const { mutateAsync, mutationArgs, FakeHintAccessDeniedError } = vi.hoisted(
  () => {
    class FakeHintAccessDeniedError extends Error {
      hintLevel = 9;
      requiredEntitlement = 'red_belt';
      userState = 'no_subscription';
      static isHintAccessDeniedError(err: unknown): boolean {
        return err instanceof FakeHintAccessDeniedError;
      }
    }
    return {
      mutateAsync: vi.fn(),
      mutationArgs: [] as unknown[][],
      FakeHintAccessDeniedError,
    };
  }
);

vi.mock('@sudobility/sudojo_client', () => ({
  useSolverSolveMutation: (...args: unknown[]) => {
    mutationArgs.push(args);
    return { mutateAsync };
  },
  HintAccessDeniedError: FakeHintAccessDeniedError,
}));

import { SudojoApiProvider } from '../context/SudojoApiProvider';
import { useHint } from './useHint';

const PUZZLE = '0'.repeat(81);
const client = { name: 'client' } as unknown as NetworkClient;

function solveResponse(technique: number) {
  return {
    success: true,
    data: {
      board: {
        original: PUZZLE,
        user: '1'.repeat(81),
        pencilmark: { numbers: '', autopencil: false },
      },
      hints: {
        level: 2,
        technique,
        steps: [{ title: 't1' }, { title: 't2' }],
      },
    },
  };
}

describe('useHint', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutationArgs.length = 0;
  });

  it('asks the filtered technique first and uses it when found', async () => {
    mutateAsync.mockResolvedValueOnce(solveResponse(7));
    const { result } = renderHook(() =>
      useHint({
        networkClient: client,
        baseUrl: 'https://api',
        token: 'tok',
        puzzle: PUZZLE,
        userInput: PUZZLE,
        techniqueFilter: 7,
      })
    );
    await act(async () => {
      await result.current.getHint();
    });
    expect(mutationArgs[0]).toEqual([client, 'https://api']);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      token: 'tok',
      options: {
        original: PUZZLE,
        user: PUZZLE,
        autoPencilmarks: false,
        techniques: '7',
      },
    });
    expect(result.current.isTargetTechnique).toBe(true);
    expect(result.current.totalSteps).toBe(2);
  });

  it('falls back to an unfiltered request when the filter finds nothing', async () => {
    mutateAsync
      .mockResolvedValueOnce({ success: true, data: { hints: { steps: [] } } })
      .mockResolvedValueOnce(solveResponse(3));
    const { result } = renderHook(() =>
      useHint({
        networkClient: client,
        baseUrl: 'https://api',
        token: 'tok',
        puzzle: PUZZLE,
        userInput: PUZZLE,
        pencilmarks: '',
        techniqueFilter: 7,
      })
    );
    await act(async () => {
      await result.current.getHint();
    });
    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync.mock.calls[1]?.[0]).toEqual({
      token: 'tok',
      options: {
        original: PUZZLE,
        user: PUZZLE,
        autoPencilmarks: false,
        pencilmarks: '',
      },
    });
    expect(result.current.isTargetTechnique).toBe(false);
    expect(result.current.hint).toEqual({ title: 't1' });
    expect(result.current.applyHint()).toEqual({
      user: '1'.repeat(81),
      pencilmarks: '',
      autoPencilmarks: false,
    });
  });

  it('reports a rejected request as an error', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Failed to get hints'));
    const { result } = renderHook(() =>
      useHint({
        networkClient: client,
        baseUrl: 'https://api',
        token: '',
        puzzle: PUZZLE,
        userInput: PUZZLE,
      })
    );
    await act(async () => {
      await result.current.getHint();
    });
    expect(result.current.error).toBe('Failed to get hints');
    expect(result.current.hints).toBeNull();
  });

  it('maps a 402 HintAccessDeniedError to accessError', async () => {
    mutateAsync.mockRejectedValueOnce(new FakeHintAccessDeniedError('402'));
    const { result } = renderHook(() =>
      useHint({
        networkClient: client,
        baseUrl: 'https://api',
        token: 'tok',
        puzzle: PUZZLE,
        userInput: PUZZLE,
      })
    );
    await act(async () => {
      await result.current.getHint();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.accessError).toEqual({
      hintLevel: 9,
      requiredEntitlement: 'red_belt',
      userState: 'no_subscription',
    });
  });

  it('takes networkClient, baseUrl and token from SudojoApiProvider', async () => {
    mutateAsync.mockResolvedValueOnce(solveResponse(1));
    const ctxClient = { name: 'ctx' } as unknown as NetworkClient;
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SudojoApiProvider,
        { networkClient: ctxClient, baseUrl: 'https://ctx', token: 'ctx-tok' },
        children
      );
    const { result } = renderHook(
      () => useHint({ puzzle: PUZZLE, userInput: PUZZLE }),
      { wrapper }
    );
    await act(async () => {
      await result.current.getHint();
    });
    expect(mutationArgs[0]).toEqual([ctxClient, 'https://ctx']);
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({ token: 'ctx-tok' });
  });
});
