import { describe, expect, it, vi } from 'vitest';
import { type Board, TechniqueId } from '@sudobility/sudojo_types';
import type { AdminApi } from './adminApi';
import {
  type AdminJobContext,
  createAdminTokenManager,
  fetchBoardsWithTechnique,
  runBoardGeneration,
  runExampleCreation,
  runTechniqueExtraction,
  shouldRefreshToken,
  updateBoardTechniques,
} from './jobs';
import { createAbortHandle } from './types';

// Bit 60 (Grouped X-Cycles) + bit 1 (Full House). Above 2^53, so a JS number
// rounds it to 1152921504606846976 and silently drops bit 1.
const MASK_60_AND_1 = '1152921504606846978';
const MASK_60_ONLY = '1152921504606846976';
const SOLUTION = '1'.repeat(81);
const PUZZLE = `00${'1'.repeat(79)}`;
const AFTER_STEP_1 = `10${'0'.repeat(79)}`;
const AFTER_STEP_2 = `11${'0'.repeat(79)}`;

const ok = <T>(data: T) => ({ success: true, timestamp: '', data });

const makeBoard = (overrides: Partial<Board> = {}): Board =>
  ({
    uuid: 'aaaaaaaa-0000-0000-0000-000000000000',
    level: null,
    symmetrical: false,
    board: PUZZLE,
    solution: SOLUTION,
    techniques: 0,
    created_at: null,
    updated_at: null,
    ...overrides,
  }) as Board;

const solveResponse = (technique: number, level: number, user: string) =>
  ok({
    hints: {
      technique,
      level,
      title: 'x',
      text: 'x',
      steps: [{ title: 'x', text: 'x' }],
    },
    board: {
      original: PUZZLE,
      user,
      pencilmark: { numbers: '', autopencil: false },
    },
  });

const validateResponse = (bitmask: string, level: number) =>
  ok({
    board: {
      level,
      techniques: Number(bitmask),
      techniques_bitmask: bitmask,
      original: PUZZLE,
      solution: SOLUTION,
    },
  });

function fakeApi(overrides: Partial<Record<keyof AdminApi, unknown>> = {}) {
  const api = {
    solve: vi.fn(),
    validate: vi.fn(),
    generate: vi.fn(),
    getBoards: vi.fn().mockResolvedValue(ok([])),
    getLevels: vi.fn().mockResolvedValue(ok([{ level: 1 }])),
    getTechniques: vi.fn().mockResolvedValue(ok([])),
    createBoard: vi.fn().mockResolvedValue(ok({})),
    updateBoard: vi.fn().mockResolvedValue(ok({})),
    createExample: vi.fn().mockResolvedValue(ok({ uuid: 'example-uuid' })),
    createPractice: vi.fn().mockResolvedValue(ok({})),
    ...overrides,
  };
  return api as typeof api & AdminApi;
}

function makeContext(api: AdminApi, token = 'token') {
  const abort = createAbortHandle();
  const ctx: AdminJobContext = {
    api,
    token: { current: token, refresh: vi.fn().mockResolvedValue(undefined) },
    abort,
    onProgress: vi.fn(),
    onError: vi.fn(),
    delay: vi.fn().mockResolvedValue(undefined),
  };
  return ctx as AdminJobContext & {
    onProgress: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    token: { current: string; refresh: ReturnType<typeof vi.fn> };
  };
}

describe('token management', () => {
  it('refreshes every 50 items, never at 0', () => {
    expect(shouldRefreshToken(0)).toBe(false);
    expect(shouldRefreshToken(49)).toBe(false);
    expect(shouldRefreshToken(50)).toBe(true);
    expect(shouldRefreshToken(100)).toBe(true);
  });

  it('returns null without a token', async () => {
    expect(await createAdminTokenManager(async () => null, vi.fn())).toBe(null);
  });

  it('keeps the old token when refresh fails or yields null', async () => {
    const getToken = vi
      .fn()
      .mockResolvedValueOnce('t1')
      .mockResolvedValueOnce('t2')
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('offline'));
    const onProgress = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = (await createAdminTokenManager(getToken, onProgress))!;
    expect(manager.current).toBe('t1');
    await manager.refresh();
    expect(manager.current).toBe('t2');
    expect(onProgress).toHaveBeenCalledWith('Token refreshed, continuing...');
    await manager.refresh();
    await manager.refresh();
    expect(manager.current).toBe('t2');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('board API helpers', () => {
  it('updateBoardTechniques sends an exact string and returns success', async () => {
    const api = fakeApi();
    await expect(
      updateBoardTechniques(api, 'token', 'uuid-1', BigInt(MASK_60_AND_1), 10)
    ).resolves.toBe(true);
    expect(api.updateBoard).toHaveBeenCalledWith('token', 'uuid-1', {
      techniques: MASK_60_AND_1,
      level: 10,
      symmetrical: undefined,
      board: undefined,
      solution: undefined,
    });
  });

  it('updateBoardTechniques returns false when the request throws', async () => {
    const api = fakeApi({
      updateBoard: vi.fn().mockRejectedValue(new Error('boom')),
    });
    await expect(
      updateBoardTechniques(api, 'token', 'uuid-1', 0n, null)
    ).resolves.toBe(false);
  });

  it('fetchBoardsWithTechnique returns [] on failure or a throw', async () => {
    const failing = fakeApi({
      getBoards: vi.fn().mockResolvedValue({ success: false }),
    });
    await expect(
      fetchBoardsWithTechnique(failing, 'token', TechniqueId.X_WING, 5)
    ).resolves.toEqual([]);

    const throwing = fakeApi({
      getBoards: vi.fn().mockRejectedValue(new Error('offline')),
    });
    await expect(
      fetchBoardsWithTechnique(throwing, 'token', TechniqueId.X_WING, 5)
    ).resolves.toEqual([]);
  });
});

describe('runBoardGeneration', () => {
  const GEN_PUZZLE = `0${'1'.repeat(80)}`;

  function setup(validateBoard: Record<string, unknown>) {
    const api = fakeApi({
      generate: vi.fn().mockResolvedValue(
        ok({
          board: {
            level: 5,
            board: { original: GEN_PUZZLE, solution: SOLUTION },
          },
        })
      ),
      validate: vi.fn().mockResolvedValue(ok({ board: validateBoard })),
    });
    const ctx = makeContext(api);
    // Stop after the first saved board.
    const onBoardGenerated = vi.fn(() => ctx.abort.abort());
    return { api, ctx, onBoardGenerated };
  }

  it('creates the board with the exact /validate bitmask as a string', async () => {
    const { api, ctx, onBoardGenerated } = setup({
      level: 10,
      techniques: Number(MASK_60_AND_1),
      techniques_bitmask: MASK_60_AND_1,
      original: GEN_PUZZLE,
      solution: SOLUTION,
    });

    await expect(
      runBoardGeneration(ctx, { symmetrical: true, onBoardGenerated })
    ).resolves.toBe(1);

    expect(api.createBoard).toHaveBeenCalledWith('token', {
      board: GEN_PUZZLE,
      solution: SOLUTION,
      level: 10,
      symmetrical: true,
      techniques: MASK_60_AND_1,
    });
    expect(onBoardGenerated).toHaveBeenCalledWith(1, 10, BigInt(MASK_60_AND_1));
    expect(ctx.onProgress).toHaveBeenCalledWith(
      `Generated 1 boards (level 10, techniques: 0x${BigInt(MASK_60_AND_1).toString(16)})`
    );
    expect(ctx.onProgress).toHaveBeenLastCalledWith(
      'Stopped. Generated 1 boards.'
    );
  });

  it('retries after a generate failure with a 1s delay', async () => {
    const { api, ctx, onBoardGenerated } = setup({
      level: 2,
      techniques: 6,
      original: GEN_PUZZLE,
      solution: SOLUTION,
    });
    api.generate.mockResolvedValueOnce({ success: false, error: 'busy' });

    await runBoardGeneration(ctx, { symmetrical: false, onBoardGenerated });

    expect(ctx.onProgress).toHaveBeenCalledWith('Error generating board: busy');
    expect(ctx.delay).toHaveBeenCalledWith(1000);
    expect(api.createBoard.mock.calls[0]![1]).toMatchObject({
      techniques: '6',
    });
  });

  it('stops when a save fails', async () => {
    const { api, ctx } = setup({
      level: 2,
      techniques: 6,
      original: GEN_PUZZLE,
      solution: SOLUTION,
    });
    api.createBoard.mockResolvedValue({ success: false, error: 'nope' });

    await expect(runBoardGeneration(ctx, { symmetrical: false })).resolves.toBe(
      0
    );
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'Error saving board: nope. Stopping.'
    );
  });

  it('reports a level fetch failure without generating', async () => {
    const api = fakeApi({
      getLevels: vi.fn().mockResolvedValue(ok([])),
    });
    const ctx = makeContext(api);
    await expect(runBoardGeneration(ctx, { symmetrical: false })).resolves.toBe(
      0
    );
    expect(ctx.onError).toHaveBeenCalledWith(new Error('No levels found'));
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('retries after a thrown generate call', async () => {
    const { api, ctx, onBoardGenerated } = setup({
      level: 2,
      techniques: 6,
      original: GEN_PUZZLE,
      solution: SOLUTION,
    });
    api.generate.mockRejectedValueOnce(new Error('timeout'));

    await expect(
      runBoardGeneration(ctx, { symmetrical: false, onBoardGenerated })
    ).resolves.toBe(1);
    expect(ctx.onProgress).toHaveBeenCalledWith('Error: timeout');
    expect(ctx.delay).toHaveBeenCalledWith(1000);
    expect(api.generate).toHaveBeenCalledTimes(2);
  });

  it('refreshes the token every 50 boards', async () => {
    const { ctx } = setup({
      level: 2,
      techniques: 6,
      original: GEN_PUZZLE,
      solution: SOLUTION,
    });
    let n = 0;
    await runBoardGeneration(ctx, {
      symmetrical: false,
      onBoardGenerated: () => {
        if (++n === 51) ctx.abort.abort();
      },
    });
    expect(ctx.token.refresh).toHaveBeenCalledTimes(1);
  });
});

describe('runTechniqueExtraction', () => {
  function setup(validateBitmask: string) {
    const board = makeBoard();
    const api = fakeApi({
      solve: vi
        .fn()
        .mockResolvedValueOnce(solveResponse(1, 1, AFTER_STEP_1))
        .mockResolvedValueOnce(solveResponse(60, 10, AFTER_STEP_2)),
      validate: vi
        .fn()
        .mockResolvedValue(validateResponse(validateBitmask, 10)),
      getBoards: vi
        .fn()
        .mockResolvedValueOnce(ok([board]))
        .mockResolvedValue(ok([])),
    });
    return { api, ctx: makeContext(api), board };
  }

  it('saves the exact /validate bitmask (simple mode)', async () => {
    const { api, ctx, board } = setup(MASK_60_AND_1);
    const onBoardExtracted = vi.fn();

    await expect(
      runTechniqueExtraction(ctx, { testWithFrontend: false, onBoardExtracted })
    ).resolves.toBe(1);

    expect(api.getBoards.mock.calls[0]![1]).toMatchObject({
      techniques: 0,
      limit: 1,
    });
    expect(api.updateBoard).toHaveBeenCalledTimes(1);
    expect(api.updateBoard).toHaveBeenCalledWith('token', board.uuid, {
      techniques: MASK_60_AND_1,
      level: 10,
      symmetrical: undefined,
      board: undefined,
      solution: undefined,
    });
    expect(onBoardExtracted).toHaveBeenCalledTimes(1);
    expect(ctx.onProgress).toHaveBeenLastCalledWith(
      'Done! Extracted techniques for 1 boards.'
    );
  });

  it('saves the exact frontend bitmask when it matches /validate (test mode)', async () => {
    const { api, ctx } = setup(MASK_60_AND_1);

    await expect(
      runTechniqueExtraction(ctx, { testWithFrontend: true })
    ).resolves.toBe(1);

    expect(api.solve).toHaveBeenCalledTimes(2);
    expect(ctx.onError).not.toHaveBeenCalled();
    expect(api.updateBoard.mock.calls[0]![2]).toMatchObject({
      techniques: MASK_60_AND_1,
      level: 10,
    });
  });

  it('stops on a mismatch only visible in the bits a JS number drops', async () => {
    const { api, ctx } = setup(MASK_60_ONLY);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(
      runTechniqueExtraction(ctx, { testWithFrontend: true })
    ).resolves.toBe(0);

    expect(api.updateBoard).not.toHaveBeenCalled();
    expect(ctx.onError).toHaveBeenCalledTimes(1);
    const message = (ctx.onError.mock.calls[0]![0] as Error).message;
    expect(message).toContain(
      `FE techniques 0x${BigInt(MASK_60_AND_1).toString(16)}`
    );
    expect(message).toContain(
      `Solver techniques 0x${BigInt(MASK_60_ONLY).toString(16)}`
    );
    log.mockRestore();
  });

  it('falls back to the numeric field when /validate has no bitmask string', async () => {
    const { api, ctx } = setup(MASK_60_AND_1);
    api.validate.mockResolvedValue(
      ok({
        board: {
          level: 3,
          techniques: 6,
          original: PUZZLE,
          solution: SOLUTION,
        },
      })
    );

    await runTechniqueExtraction(ctx, { testWithFrontend: false });

    expect(api.updateBoard.mock.calls[0]![2]).toMatchObject({
      techniques: '6',
      level: 3,
    });
  });

  it('skips a board whose validate fails and stops when a save fails', async () => {
    const board2 = makeBoard({ uuid: 'bbbbbbbb-0000' });
    const api = fakeApi({
      validate: vi
        .fn()
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValue(validateResponse('6', 2)),
      getBoards: vi
        .fn()
        .mockResolvedValueOnce(ok([makeBoard()]))
        .mockResolvedValueOnce(ok([board2])),
      updateBoard: vi.fn().mockResolvedValue({ success: false }),
    });
    const ctx = makeContext(api);

    await expect(
      runTechniqueExtraction(ctx, { testWithFrontend: false })
    ).resolves.toBe(0);
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'Validate failed for aaaaaaaa, skipping...'
    );
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'Failed to save board bbbbbbbb. Stopping.'
    );
  });

  it('treats a failing boards fetch as no more boards', async () => {
    const api = fakeApi({
      getBoards: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const ctx = makeContext(api);
    await expect(
      runTechniqueExtraction(ctx, { testWithFrontend: false })
    ).resolves.toBe(0);
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'Done! Extracted techniques for 0 boards. No more boards.'
    );
  });
});

describe('runExampleCreation', () => {
  const sourceBoard = makeBoard({
    uuid: 'bbbbbbbb-0000-0000-0000-000000000000',
    level: 10,
    techniques: Number(MASK_60_AND_1),
    techniques_bitmask: MASK_60_AND_1,
  } as Partial<Board>);
  const found60 = solveResponse(60, 10, AFTER_STEP_1);

  function setup(solve: unknown, boardsByBit: Board[] = [sourceBoard]) {
    const api = fakeApi({
      getTechniques: vi
        .fn()
        .mockResolvedValue(ok([{ technique: 60, level: 10 }])),
      solve: vi.fn().mockResolvedValue(solve),
      getBoards: vi.fn(async (_token: string, params: { level?: number }) =>
        params.level === undefined ? ok(boardsByBit) : ok([])
      ),
    });
    return { api, ctx: makeContext(api) };
  }

  it('sends the example bitfield as an exact bitmask string and links the practice', async () => {
    const { api, ctx } = setup(found60);
    const onExampleSaved = vi.fn();

    const counts = await runExampleCreation(
      ctx,
      {
        mode: 'bit',
        techniqueId: TechniqueId.GROUPED_X_CYCLES,
        currentCounts: {},
      },
      { onExampleSaved }
    );

    expect(api.getBoards.mock.calls[0]![1]).toMatchObject({
      technique_bit: MASK_60_ONLY,
      limit: 50,
    });
    expect(api.createExample).toHaveBeenCalledTimes(1);
    expect(api.createExample.mock.calls[0]![1]).toMatchObject({
      techniques_bitfield: MASK_60_ONLY,
      primary_technique: 60,
      source_board_uuid: sourceBoard.uuid,
      board: PUZZLE, // found before any solver cell: merged = givens
    });
    expect(api.createPractice.mock.calls[0]![1]).toMatchObject({
      technique: 60,
      source_example_uuid: 'example-uuid',
      solution: `11${'0'.repeat(79)}`,
    });
    expect(onExampleSaved).toHaveBeenCalledWith(60, 1);
    expect(counts).toEqual({ 60: 1 });
    expect(ctx.onProgress).toHaveBeenLastCalledWith('Done!');
  });

  it('resets a board whose technique is not found to an exact 0n bitmask', async () => {
    const { api, ctx } = setup({ success: true, data: { hints: null } });
    const onBoardTechniquesReset = vi.fn();

    await runExampleCreation(
      ctx,
      {
        mode: 'bit',
        techniqueId: TechniqueId.GROUPED_X_CYCLES,
        currentCounts: {},
      },
      { onBoardTechniquesReset }
    );

    expect(api.updateBoard).toHaveBeenCalledWith('token', sourceBoard.uuid, {
      techniques: '0',
      level: null,
      symmetrical: undefined,
      board: undefined,
      solution: undefined,
    });
    expect(onBoardTechniquesReset).toHaveBeenCalledWith(sourceBoard.uuid);
  });

  it('falls back to the level search when no board has the bit', async () => {
    const { api, ctx } = setup(found60, []);
    api.getBoards.mockImplementation(
      async (_token: string, params: { level?: number }) =>
        params.level === 10 ? ok([sourceBoard]) : ok([])
    );

    const counts = await runExampleCreation(ctx, {
      mode: 'bit',
      techniqueId: TechniqueId.GROUPED_X_CYCLES,
      currentCounts: {},
    });

    const levels = api.getBoards.mock.calls
      .map(c => (c[1] as { level?: number }).level)
      .filter(l => l !== undefined);
    // 9 (empty) then 10 (found); stops once the target is reached.
    expect(levels).toEqual([9, 10]);
    expect(counts).toEqual({ 60: 1 });
    expect(api.updateBoard).not.toHaveBeenCalled();
  });

  it('level mode skips the bit search', async () => {
    const { api, ctx } = setup(found60);
    await runExampleCreation(ctx, {
      mode: 'level',
      techniqueId: TechniqueId.GROUPED_X_CYCLES,
      currentCounts: {},
    });
    expect(
      api.getBoards.mock.calls.every(
        c => (c[1] as { level?: number }).level !== undefined
      )
    ).toBe(true);
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'Searching by level for Grouped X-Cycles (level 10)...'
    );
  });

  it('all mode skips techniques that reached the target', async () => {
    const { api, ctx } = setup(found60);
    await runExampleCreation(ctx, {
      mode: 'all',
      currentCounts: { 1: 1 },
      techniqueOrder: [1, 60],
    });
    const bits = api.getBoards.mock.calls.map(
      c => (c[1] as { technique_bit?: string }).technique_bit
    );
    expect(bits[0]).toBe(MASK_60_ONLY);
  });

  it('stops (aborts) when the practice save fails', async () => {
    const { api, ctx } = setup(found60);
    api.createPractice.mockResolvedValue({ success: false, error: 'dup' });

    await runExampleCreation(ctx, {
      mode: 'all',
      currentCounts: {},
      techniqueOrder: [60, 1],
    });

    expect(ctx.abort.shouldAbort()).toBe(true);
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'Failed to save practice: dup. Stopping.'
    );
    expect(ctx.onProgress).not.toHaveBeenCalledWith('Done!');
  });

  it('skips a technique without a level in the level search', async () => {
    const { api, ctx } = setup(found60);
    api.getTechniques.mockResolvedValue(ok([]));
    await runExampleCreation(ctx, {
      mode: 'level',
      techniqueId: TechniqueId.X_WING,
      currentCounts: {},
    });
    expect(api.getBoards).not.toHaveBeenCalled();
    expect(ctx.onProgress).toHaveBeenCalledWith(
      'No level for X-Wing, skipping...'
    );
  });
});
