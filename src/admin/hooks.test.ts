/**
 * Hook tests: every network call goes through (mocked) sudojo_client hooks.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { NetworkClient } from '@sudobility/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  solve: vi.fn(),
  validate: vi.fn(),
  generate: vi.fn(),
  fetchBoards: vi.fn(),
  createBoard: vi.fn(),
  updateBoard: vi.fn(),
  createExample: vi.fn(),
  createPractice: vi.fn(),
  updateStats: vi.fn(),
  levelsRefetch: vi.fn(),
  techniquesRefetch: vi.fn(),
  boardCounts: { data: undefined as unknown, isLoading: false },
  exampleCounts: { data: undefined as unknown, isLoading: false },
  byTechnique: { data: undefined as unknown, isLoading: false },
  queryOptions: [] as unknown[],
}));

vi.mock('@sudobility/sudojo_client', () => {
  const mutation = (fn: (...args: unknown[]) => unknown) => () => ({
    mutateAsync: fn,
    isPending: false,
  });
  return {
    useSolverSolveMutation: mutation(m.solve),
    useSolverValidateMutation: mutation(m.validate),
    useSolverGenerateMutation: mutation(m.generate),
    useSudojoFetchBoards: mutation(m.fetchBoards),
    useSudojoCreateBoard: mutation(m.createBoard),
    useSudojoUpdateBoard: mutation(m.updateBoard),
    useSudojoCreateExample: mutation(m.createExample),
    useSudojoCreatePractice: mutation(m.createPractice),
    useSudojoUpdatePuzzleStats: mutation(m.updateStats),
    useSudojoLevels: () => ({ refetch: m.levelsRefetch }),
    useSudojoTechniques: () => ({ refetch: m.techniquesRefetch }),
    useSudojoBoardCounts: (...args: unknown[]) => {
      m.queryOptions.push(args[3]);
      return { ...m.boardCounts, refetch: vi.fn() };
    },
    useSudojoExampleCounts: () => ({ ...m.exampleCounts, refetch: vi.fn() }),
    useSudojoBoardCountsByTechnique: () => ({
      ...m.byTechnique,
      refetch: vi.fn(),
    }),
  };
});

import { useAdminApi } from './adminApi';
import { useAdminStats } from './useAdminStats';
import { useBoardGenerator } from './useBoardGenerator';
import { useBoardTechniquesUpdater } from './useBoardTechniquesUpdater';
import { useExampleCreator } from './useExampleCreator';
import { useSingleBoardExtractor } from './useSingleBoardExtractor';
import { useTechniqueExtractor } from './useTechniqueExtractor';

const ok = <T>(data: T) => ({ success: true, timestamp: '', data });
const PUZZLE = `00${'1'.repeat(79)}`;
const SOLUTION = '1'.repeat(81);
const base = {
  networkClient: {} as NetworkClient,
  baseUrl: 'https://api',
};
const withToken = { ...base, getToken: async () => 'tok' };

beforeEach(() => {
  vi.clearAllMocks();
  m.boardCounts = { data: undefined, isLoading: false };
  m.exampleCounts = { data: undefined, isLoading: false };
  m.byTechnique = { data: undefined, isLoading: false };
  m.queryOptions = [];
});

describe('useAdminApi', () => {
  it('routes calls to the sudojo_client hooks', async () => {
    m.solve.mockResolvedValue('solved');
    m.validate.mockResolvedValue('validated');
    m.fetchBoards.mockResolvedValue('boards');
    m.updateBoard.mockResolvedValue('updated');
    m.levelsRefetch.mockResolvedValue({ data: 'levels', error: null });
    m.techniquesRefetch.mockResolvedValue({
      data: undefined,
      error: new Error('down'),
    });

    const { result } = renderHook(() =>
      useAdminApi(base.networkClient, base.baseUrl)
    );
    const api = result.current;

    await expect(
      api.solve('t', { original: PUZZLE, user: PUZZLE })
    ).resolves.toBe('solved');
    expect(m.solve).toHaveBeenCalledWith({
      token: 't',
      options: { original: PUZZLE, user: PUZZLE },
    });
    await api.validate('t', { original: PUZZLE });
    expect(m.validate).toHaveBeenCalledWith({
      token: 't',
      options: { original: PUZZLE },
    });
    await api.generate('t', { symmetrical: true });
    expect(m.generate).toHaveBeenCalledWith({
      token: 't',
      options: { symmetrical: true },
    });
    await api.getBoards('t', { limit: 1 } as never);
    expect(m.fetchBoards).toHaveBeenCalledWith({
      token: 't',
      queryParams: { limit: 1 },
    });
    await api.updateBoard('t', 'u', {} as never);
    expect(m.updateBoard).toHaveBeenCalledWith({
      token: 't',
      uuid: 'u',
      data: {},
    });
    await expect(api.getLevels()).resolves.toBe('levels');
    await expect(api.getTechniques()).rejects.toThrow('down');
  });

  it('keeps the same api object across renders', () => {
    const { result, rerender } = renderHook(() =>
      useAdminApi(base.networkClient, base.baseUrl)
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe('useBoardGenerator', () => {
  it('generates, tracks progress and stops on cancel', async () => {
    m.levelsRefetch.mockResolvedValue({ data: ok([{ level: 1 }]) });
    m.generate.mockResolvedValue(
      ok({ board: { level: 3, original: PUZZLE, solution: SOLUTION } })
    );
    m.validate.mockResolvedValue(
      ok({ board: { level: 4, techniques: 6, original: PUZZLE } })
    );
    const { result } = renderHook(() => useBoardGenerator(withToken));
    m.createBoard.mockImplementation(async () => {
      result.current.cancel();
      return ok({});
    });

    let count = 0;
    await act(async () => {
      count = await result.current.start({ symmetrical: true });
    });

    expect(count).toBe(1);
    expect(m.generate).toHaveBeenCalledWith({
      token: 'tok',
      options: { symmetrical: true },
    });
    expect(m.createBoard.mock.calls[0]![0]).toMatchObject({
      token: 'tok',
      data: { level: 4, techniques: '6', symmetrical: true },
    });
    expect(result.current.generatedCount).toBe(1);
    expect(result.current.lastBoard).toEqual({ level: 4, techniques: 6n });
    expect(result.current.isRunning).toBe(false);
    expect(result.current.progress).toBe('Stopped. Generated 1 boards.');
    expect(result.current.log).toContain('Fetching levels...');
  });

  it('reports Not authenticated without a token', async () => {
    const { result } = renderHook(() =>
      useBoardGenerator({ ...base, getToken: async () => null })
    );
    await act(async () => {
      await result.current.start({ symmetrical: false });
    });
    expect(result.current.progress).toBe('Error: Not authenticated');
    expect(result.current.error).toBe('Not authenticated');
    expect(m.levelsRefetch).not.toHaveBeenCalled();
  });
});

describe('useTechniqueExtractor', () => {
  it('extracts until no boards are left', async () => {
    const board = { uuid: 'aaaaaaaa-1', board: PUZZLE, solution: SOLUTION };
    m.fetchBoards.mockResolvedValueOnce(ok([board])).mockResolvedValue(ok([]));
    m.validate.mockResolvedValue(
      ok({ board: { level: 2, techniques: 4, original: PUZZLE } })
    );
    m.updateBoard.mockResolvedValue(ok({}));

    const { result } = renderHook(() => useTechniqueExtractor(withToken));
    await act(async () => {
      await result.current.start({ testWithFrontend: false });
    });

    expect(result.current.extractedCount).toBe(1);
    expect(m.updateBoard).toHaveBeenCalledWith({
      token: 'tok',
      uuid: 'aaaaaaaa-1',
      data: expect.objectContaining({ techniques: '4', level: 2 }),
    });
    expect(result.current.progress).toBe(
      'Done! Extracted techniques for 1 boards.'
    );
    expect(result.current.isRunning).toBe(false);
  });

  it('cancel shows Stopped at once and ignores later output', async () => {
    let release: (v: unknown) => void = () => {};
    m.fetchBoards.mockImplementation(
      () =>
        new Promise(resolve => {
          release = resolve;
        })
    );
    const { result } = renderHook(() => useTechniqueExtractor(withToken));

    let done: Promise<number> = Promise.resolve(0);
    act(() => {
      done = result.current.start({ testWithFrontend: false });
    });
    await waitFor(() => {
      expect(m.fetchBoards).toHaveBeenCalled();
    });
    expect(result.current.isRunning).toBe(true);

    act(() => {
      result.current.cancel();
    });
    expect(result.current.isRunning).toBe(false);
    expect(result.current.progress).toBe('Stopped');

    await act(async () => {
      release(ok([]));
      await done;
    });
    expect(result.current.progress).toBe('Stopped');
  });
});

describe('useExampleCreator', () => {
  it('runs one technique by bit and tracks counts', async () => {
    const board = { uuid: 'bbbbbbbb-1', board: PUZZLE, solution: SOLUTION };
    m.techniquesRefetch.mockResolvedValue({
      data: ok([{ technique: 60, level: 10 }]),
    });
    m.fetchBoards.mockResolvedValue(ok([board]));
    m.solve.mockResolvedValue(
      ok({
        hints: { technique: 60, level: 10, steps: [{ title: 'x' }] },
        board: { original: PUZZLE, user: PUZZLE, pencilmark: { numbers: '' } },
      })
    );
    m.createExample.mockResolvedValue(ok({ uuid: 'ex-1' }));
    m.createPractice.mockResolvedValue(ok({}));

    const { result } = renderHook(() => useExampleCreator(withToken));
    let finalCounts: Record<number, number> = {};
    await act(async () => {
      finalCounts = await result.current.start({
        mode: 'bit',
        techniqueId: 60,
        currentCounts: { 1: 1 },
      });
    });

    expect(finalCounts).toEqual({ 1: 1, 60: 1 });
    expect(result.current.counts).toEqual({ 1: 1, 60: 1 });
    expect(result.current.creatingTechniqueId).toBeNull();
    expect(m.createPractice.mock.calls[0]![0]).toMatchObject({
      token: 'tok',
      data: { source_example_uuid: 'ex-1', technique: 60 },
    });
    expect(result.current.progress).toBe('Done!');
  });

  it('falls back to the level search when the bit query fails', async () => {
    m.techniquesRefetch.mockResolvedValue({ data: ok([]) });
    m.fetchBoards.mockRejectedValue(new Error('kaput'));
    const { result } = renderHook(() => useExampleCreator(withToken));
    await act(async () => {
      await result.current.start({
        mode: 'bit',
        techniqueId: 60,
        currentCounts: {},
      });
    });
    // fetchBoardsWithTechnique swallows errors → level search → no level.
    expect(result.current.progress).toBe('Done!');
    expect(result.current.log).toContain(
      'No boards with Grouped X-Cycles bit set, searching by level...'
    );
  });
});

describe('useSingleBoardExtractor / useBoardTechniquesUpdater', () => {
  it('extracts with the current token', async () => {
    m.solve.mockResolvedValue({ success: true, timestamp: '', data: null });
    const { result } = renderHook(() => useSingleBoardExtractor(withToken));
    await expect(result.current.extract(PUZZLE, 60)).resolves.toEqual({
      techniques: 0n,
      level: 0,
    });
    expect(m.solve.mock.calls[0]![0]).toMatchObject({
      token: 'tok',
      options: { techniques: '60' },
    });
  });

  it('returns an error / false / [] without a token', async () => {
    const noToken = { ...base, getToken: async () => null };
    const extractor = renderHook(() => useSingleBoardExtractor(noToken));
    await expect(extractor.result.current.extract(PUZZLE)).resolves.toEqual({
      error: 'Not authenticated',
    });
    const updater = renderHook(() => useBoardTechniquesUpdater(noToken));
    await expect(
      updater.result.current.updateBoardTechniques('u', 1n, 1)
    ).resolves.toBe(false);
    await expect(
      updater.result.current.fetchBoardsWithTechnique(60, 5)
    ).resolves.toEqual([]);
  });

  it('updates a board with an exact bitmask string', async () => {
    m.updateBoard.mockResolvedValue(ok({}));
    const { result } = renderHook(() => useBoardTechniquesUpdater(withToken));
    await expect(
      result.current.updateBoardTechniques('u', 1152921504606846978n, 10)
    ).resolves.toBe(true);
    expect(m.updateBoard.mock.calls[0]![0]).toMatchObject({
      data: { techniques: '1152921504606846978', level: 10 },
    });
  });
});

describe('useAdminStats', () => {
  it('normalizes the counts', () => {
    m.boardCounts = {
      data: ok({ total: 120, withoutTechniques: 7 }),
      isLoading: false,
    };
    m.exampleCounts = { data: ok({ '1': 2, '60': 1 }), isLoading: true };
    m.byTechnique = { data: ok({ 1: 40 }), isLoading: false };

    const { result } = renderHook(() =>
      useAdminStats({ ...base, token: 'tok' })
    );
    expect(result.current.totalBoards).toBe(120);
    expect(result.current.boardsWithoutTechniques).toBe(7);
    expect(result.current.exampleCounts).toEqual({ 1: 2, 60: 1 });
    expect(result.current.boardCountsByTechnique).toEqual({ 1: 40 });
    expect(result.current.isTechniqueCountsLoading).toBe(true);
  });

  it('disables the queries without a token', () => {
    renderHook(() => useAdminStats({ ...base, token: null }));
    expect(m.queryOptions[0]).toEqual({ enabled: false });
  });

  it('updates puzzle stats and reports the result', async () => {
    m.updateStats.mockResolvedValue(
      ok({ levels: { 1: 0.5, 2: 0.5 }, techniques: { 1: 1 } })
    );
    const { result } = renderHook(() =>
      useAdminStats({ ...base, token: 'tok' })
    );
    await act(async () => {
      await result.current.updatePuzzleStats();
    });
    expect(m.updateStats).toHaveBeenCalledWith({ token: 'tok' });
    expect(result.current.statsProgress).toBe(
      'Updated 2 levels and 1 techniques.'
    );
    expect(result.current.statsResult).toEqual({
      levels: { 1: 0.5, 2: 0.5 },
      techniques: { 1: 1 },
    });
  });

  it('reports failures', async () => {
    m.updateStats.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() =>
      useAdminStats({ ...base, token: 'tok' })
    );
    await act(async () => {
      await result.current.updatePuzzleStats();
    });
    expect(result.current.statsProgress).toBe('Error: 500');

    const signedOut = renderHook(() => useAdminStats({ ...base, token: null }));
    await act(async () => {
      await signedOut.result.current.updatePuzzleStats();
    });
    expect(signedOut.result.current.statsProgress).toBe(
      'Error: Not authenticated'
    );
  });
});

describe('end-to-end against the mocked client', () => {
  const solveStep = (technique: number, level: number, user: string) =>
    ok({
      hints: { technique, level, steps: [{ title: 'x' }] },
      board: { original: PUZZLE, user, pencilmark: { numbers: '' } },
    });

  it('technique extractor test mode: /solve walk matches /validate, then saves', async () => {
    const board = { uuid: 'cccccccc-1', board: PUZZLE, solution: SOLUTION };
    m.fetchBoards.mockResolvedValueOnce(ok([board])).mockResolvedValue(ok([]));
    m.solve
      .mockResolvedValueOnce(solveStep(1, 1, `10${'0'.repeat(79)}`))
      .mockResolvedValueOnce(solveStep(60, 10, `11${'0'.repeat(79)}`));
    m.validate.mockResolvedValue(
      ok({
        board: {
          level: 10,
          techniques: Number('1152921504606846978'),
          techniques_bitmask: '1152921504606846978',
          original: PUZZLE,
        },
      })
    );
    m.updateBoard.mockResolvedValue(ok({}));

    const { result } = renderHook(() => useTechniqueExtractor(withToken));
    await act(async () => {
      await result.current.start({ testWithFrontend: true });
    });

    expect(m.solve).toHaveBeenCalledTimes(2);
    expect(m.fetchBoards.mock.calls[0]![0]).toMatchObject({
      token: 'tok',
      queryParams: { techniques: 0, limit: 1 },
    });
    expect(m.updateBoard.mock.calls[0]![0]).toMatchObject({
      uuid: 'cccccccc-1',
      data: { techniques: '1152921504606846978', level: 10 },
    });
    expect(result.current.extractedCount).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('example creator all mode: bit search, level fallback, saves pairs', async () => {
    const board = { uuid: 'dddddddd-1', board: PUZZLE, solution: SOLUTION };
    m.techniquesRefetch.mockResolvedValue({
      data: ok([
        { technique: 1, level: 1 },
        { technique: 60, level: 10 },
      ]),
    });
    m.fetchBoards.mockImplementation(
      async ({ queryParams }: { queryParams: Record<string, unknown> }) => {
        // Technique 1: found by bit. Technique 60: no bit, found at level 10.
        if (queryParams.technique_bit === '2') return ok([board]);
        if (queryParams.level === 10) return ok([board]);
        return ok([]);
      }
    );
    m.solve.mockImplementation(
      async ({ options }: { options: { techniques: string } }) =>
        solveStep(Number(options.techniques), 1, `1${'0'.repeat(80)}`)
    );
    m.createExample.mockResolvedValue(ok({ uuid: 'ex' }));
    m.createPractice.mockResolvedValue(ok({}));

    const { result } = renderHook(() => useExampleCreator(withToken));
    let counts: Record<number, number> = {};
    await act(async () => {
      counts = await result.current.start({
        mode: 'all',
        currentCounts: {},
        techniqueOrder: [1, 60],
      });
    });

    expect(counts).toEqual({ 1: 1, 60: 1 });
    expect(m.createExample).toHaveBeenCalledTimes(2);
    expect(m.createPractice).toHaveBeenCalledTimes(2);
    const levels = m.fetchBoards.mock.calls
      .map(c => (c[0] as { queryParams: { level?: number } }).queryParams.level)
      .filter(l => l !== undefined);
    expect(levels).toEqual([9, 10]);
    expect(result.current.progress).toBe('Done!');
  });

  it('fetchBoardsWithTechnique filters by the exact bit', async () => {
    const boards = [{ uuid: 'b1' }];
    m.fetchBoards.mockResolvedValue(ok(boards));
    const { result } = renderHook(() => useBoardTechniquesUpdater(withToken));
    await expect(
      result.current.fetchBoardsWithTechnique(60, 50)
    ).resolves.toEqual(boards);
    expect(m.fetchBoards).toHaveBeenCalledWith({
      token: 'tok',
      queryParams: expect.objectContaining({
        limit: 50,
        technique_bit: '1152921504606846976',
      }),
    });
  });
});
