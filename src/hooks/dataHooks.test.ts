/**
 * Tests for the client-hook wrappers: usePracticeGame, useStrategies,
 * useIsSiteAdmin / useIsRealUser, useTechniqueByPath, useTechniqueExample,
 * useDeleteAccount. '@sudobility/sudojo_client' is mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { NetworkClient } from '@sudobility/types';

const m = vi.hoisted(() => ({
  practice: vi.fn(),
  strategies: vi.fn(),
  user: vi.fn(),
  techniques: vi.fn(),
  techniqueByPath: vi.fn(),
  examples: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock('@sudobility/sudojo_client', () => ({
  queryKeys: {
    sudojo: {
      practiceRandom: (t: number) => ['sudojo', 'practices', 'random', t],
    },
  },
  useSudojoRandomPractice: (...args: unknown[]) => m.practice(...args),
  useSudojoStrategies: (...args: unknown[]) => m.strategies(...args),
  useSudojoUser: (...args: unknown[]) => m.user(...args),
  useSudojoTechniques: (...args: unknown[]) => m.techniques(...args),
  useSudojoTechnique: () => ({ data: undefined, isLoading: false }),
  useSudojoTechniqueByPath: (...args: unknown[]) => m.techniqueByPath(...args),
  useSudojoExamples: (...args: unknown[]) => m.examples(...args),
  useSudojoDeleteUser: () => ({ mutateAsync: m.deleteUser }),
}));

import { usePracticeGame } from './usePracticeGame';
import { useStrategies } from './useStrategies';
import { useIsRealUser, useIsSiteAdmin } from './useIsSiteAdmin';
import { useTechniqueByPath } from './useTechniqueByPath';
import { useTechniqueExample } from './useTechniqueExample';
import { useDeleteAccount } from './useDeleteAccount';
import { SudojoApiProvider } from '../context/SudojoApiProvider';

const client = {} as NetworkClient;
const api = { networkClient: client, baseUrl: 'https://api' };

function queryWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function query(over: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isSuccess: false,
    isError: false,
    ...over,
  };
}

describe('usePracticeGame', () => {
  beforeEach(() => {
    m.practice.mockReset();
  });

  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['loading', { isLoading: true }, 'loading'],
    [
      '401',
      { error: Object.assign(new Error('x'), { status: 401 }) },
      'auth_required',
    ],
    [
      '402',
      { error: Object.assign(new Error('x'), { status: 402 }) },
      'subscription_required',
    ],
    ['403', { error: Object.assign(new Error('x'), { status: 403 }) }, 'error'],
    ['message auth', { error: new Error('auth failed') }, 'auth_required'],
    [
      'no practices',
      { data: { success: false, error: 'No practices found' } },
      'no_practices',
    ],
    ['other failure', { data: { success: false, error: 'boom' } }, 'error'],
    ['ready', { data: { success: true, data: { uuid: 'p' } } }, 'ready'],
    ['empty success', { data: { success: true } }, 'no_practices'],
  ];

  it.each(cases)('status for %s', (_name, over, expected) => {
    m.practice.mockReturnValue(query(over));
    const { result } = renderHook(
      () => usePracticeGame({ ...api, token: 't', techniqueId: 5 }),
      { wrapper: queryWrapper() }
    );
    expect(result.current.status).toBe(expected);
  });

  it('passes the web query options and is idle for an invalid technique', () => {
    m.practice.mockReturnValue(query({}));
    const { result } = renderHook(
      () => usePracticeGame({ ...api, token: 't', techniqueId: 0 }),
      { wrapper: queryWrapper() }
    );
    expect(result.current.status).toBe('no_practices');
    expect(m.practice).toHaveBeenCalledWith(client, 'https://api', 't', 0, {
      enabled: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
      retry: false,
    });
  });

  it('refetches when the token changes while auth_required', () => {
    const refetch = vi.fn();
    m.practice.mockReturnValue(
      query({ refetch, error: Object.assign(new Error('x'), { status: 401 }) })
    );
    const { rerender } = renderHook(
      ({ token }: { token: string }) =>
        usePracticeGame({ ...api, token, techniqueId: 5 }),
      { initialProps: { token: '' }, wrapper: queryWrapper() }
    );
    expect(refetch).not.toHaveBeenCalled();
    rerender({ token: 'new' });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useStrategies', () => {
  it('unwraps success data and finds by stub', () => {
    m.strategies.mockReturnValue(
      query({ data: { success: true, data: [{ stub: 'singles' }] } })
    );
    const { result } = renderHook(() => useStrategies(api));
    expect(result.current.strategies).toEqual([{ stub: 'singles' }]);
    expect(result.current.findStrategyByStub('singles')).toEqual({
      stub: 'singles',
    });
    expect(result.current.findStrategyByStub('nope')).toBeUndefined();
  });

  it('returns [] for a failed response', () => {
    m.strategies.mockReturnValue(query({ data: { success: false } }));
    const { result } = renderHook(() => useStrategies(api));
    expect(result.current.strategies).toEqual([]);
  });
});

describe('useIsRealUser / useIsSiteAdmin', () => {
  beforeEach(() => {
    m.user.mockReset();
  });

  it('useIsRealUser is !!user && !user.isAnonymous', () => {
    expect(renderHook(() => useIsRealUser(null)).result.current).toBe(false);
    expect(
      renderHook(() => useIsRealUser({ isAnonymous: true })).result.current
    ).toBe(false);
    expect(
      renderHook(() => useIsRealUser({ isAnonymous: false })).result.current
    ).toBe(true);
  });

  it('reads siteAdmin and only queries for a real user with a token', () => {
    m.user.mockReturnValue(
      query({ data: { data: { siteAdmin: true } }, isSuccess: true })
    );
    const { result } = renderHook(() =>
      useIsSiteAdmin({
        ...api,
        token: 'tok',
        user: { uid: 'u1', isAnonymous: false },
      })
    );
    expect(result.current).toEqual({ isSiteAdmin: true, isResolved: true });
    expect(m.user).toHaveBeenCalledWith(client, 'https://api', 'tok', 'u1', {
      enabled: true,
    });

    renderHook(() =>
      useIsSiteAdmin({
        ...api,
        token: 'tok',
        user: { uid: 'a', isAnonymous: true },
      })
    );
    expect(m.user.mock.calls.at(-1)?.[4]).toEqual({ enabled: false });
  });
});

describe('useTechniqueByPath', () => {
  beforeEach(() => {
    m.techniques.mockReset();
    m.techniqueByPath.mockReset();
    m.techniqueByPath.mockReturnValue(query({}));
  });

  it('finds an aliased path in the technique list', () => {
    m.techniques.mockReturnValue(
      query({
        data: { success: true, data: [{ technique: 30, path: '3d-medusa' }] },
      })
    );
    const { result } = renderHook(() =>
      useTechniqueByPath({ ...api, path: 'medusa-coloring' })
    );
    expect(result.current.technique).toEqual({
      technique: 30,
      path: '3d-medusa',
    });
    expect(result.current.apiPath).toBe('3d-medusa');
    expect(result.current.canonicalPath).toBe('medusa-coloring');
    expect(m.techniqueByPath.mock.calls.at(-1)?.[4]).toMatchObject({
      enabled: false,
    });
  });

  it('falls back to GET by path when the list lacks it', () => {
    m.techniques.mockReturnValue(query({ data: { success: true, data: [] } }));
    m.techniqueByPath.mockReturnValue(
      query({
        data: { success: true, data: { technique: 30, path: '3d-medusa' } },
      })
    );
    const { result } = renderHook(() =>
      useTechniqueByPath({ ...api, path: 'medusa-coloring' })
    );
    expect(m.techniqueByPath.mock.calls.at(-1)?.[3]).toBe('3d-medusa');
    expect(result.current.technique?.technique).toBe(30);
    expect(result.current.notFound).toBe(false);
  });

  it('reports notFound', () => {
    m.techniques.mockReturnValue(query({ data: { success: true, data: [] } }));
    const { result } = renderHook(() =>
      useTechniqueByPath({ ...api, path: 'nope' })
    );
    expect(result.current.notFound).toBe(true);
  });
});

describe('useTechniqueExample', () => {
  const t = (key: string, values?: Record<string, string>) =>
    values?.defaultValue ??
    (values?.technique ? `${key}:${values.technique}` : key);

  beforeEach(() => {
    m.examples.mockReset();
    m.practice.mockReset();
    m.practice.mockReturnValue(query({}));
  });

  it('builds the walkthrough from the first example', () => {
    m.examples.mockReturnValue(
      query({
        data: {
          success: true,
          data: [
            {
              board: '0'.repeat(81),
              pencilmarks: null,
              solution: '1'.repeat(81),
              hint_data: null,
            },
          ],
        },
      })
    );
    const { result } = renderHook(() =>
      useTechniqueExample({
        ...api,
        techniqueId: 3,
        techniquePath: 'naked-pair',
        tHints: t,
        tTechniques: t,
        tCommon: t,
      })
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.steps).toHaveLength(1);
    expect(result.current.steps[0]?.text).toBe('lookFor:technique');
    expect(result.current.stepHeadings).toEqual(['Starting position']);
    expect(m.examples.mock.calls.at(-1)?.[3]).toEqual({ technique: 3 });
    expect(m.practice.mock.calls.at(-1)?.[4]).toEqual({ enabled: false });
  });

  it('is empty when there is no example', () => {
    m.examples.mockReturnValue(query({ data: { success: true, data: [] } }));
    const { result } = renderHook(() =>
      useTechniqueExample({
        ...api,
        techniqueId: 3,
        tHints: t,
        tTechniques: t,
        tCommon: t,
      })
    );
    expect(result.current.status).toBe('empty');
    expect(result.current.steps).toEqual([]);
  });
});

describe('useDeleteAccount', () => {
  beforeEach(() => {
    m.deleteUser.mockReset();
  });

  it('blocks an active subscriber without calling the API', async () => {
    const { result } = renderHook(() =>
      useDeleteAccount({
        ...api,
        token: 'tok',
        user: { uid: 'u', isAnonymous: false },
        subscriptionActive: true,
      })
    );
    expect(result.current.canDelete).toEqual({
      allowed: false,
      reason: 'active_subscription',
    });
    const outcome = await result.current.deleteAccount();
    expect(outcome).toEqual({
      status: 'blocked',
      reason: 'active_subscription',
    });
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes, then signs out', async () => {
    m.deleteUser.mockResolvedValue({ success: true });
    const signOut = vi.fn();
    const { result } = renderHook(() =>
      useDeleteAccount({
        ...api,
        token: 'tok',
        user: { uid: 'u', isAnonymous: false },
        subscriptionActive: false,
        signOut,
      })
    );
    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ googleAccessToken: 'g' });
    });
    expect(outcome).toEqual({ status: 'deleted' });
    expect(m.deleteUser).toHaveBeenCalledWith({
      token: 'tok',
      userId: 'u',
      providerTokens: { googleAccessToken: 'g' },
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('reports a failure and does not sign out', async () => {
    m.deleteUser.mockRejectedValue(new Error('nope'));
    const signOut = vi.fn();
    const { result } = renderHook(() =>
      useDeleteAccount({
        ...api,
        token: 'tok',
        user: { uid: 'u', isAnonymous: false },
        subscriptionActive: false,
        signOut,
      })
    );
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.deleteAccount();
    });
    expect(outcome).toMatchObject({ status: 'failed' });
    expect(result.current.error?.message).toBe('nope');
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('SudojoApiProvider fallback', () => {
  it('throws a clear error without options or provider', () => {
    m.strategies.mockReturnValue(query({}));
    expect(() => renderHook(() => useStrategies())).toThrow(
      /SudojoApiProvider/
    );
  });

  it('uses the provider when options omit the connection', () => {
    m.strategies.mockReturnValue(query({}));
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SudojoApiProvider,
        { networkClient: client, baseUrl: 'https://ctx', token: 'ctx' },
        children
      );
    renderHook(() => useStrategies(), { wrapper });
    expect(m.strategies.mock.calls.at(-1)?.slice(0, 3)).toEqual([
      client,
      'https://ctx',
      'ctx',
    ]);
  });
});
