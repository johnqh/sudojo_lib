import { describe, expect, it, vi } from 'vitest';
import type { SolverHints } from '@sudobility/sudojo_types';
import {
  buildExtractionSolveOptions,
  computeNextExtractionState,
  createInitialExtractionState,
  extractBoardTechniques,
  interpretSolveError,
  interpretSolveResponse,
  isExtractionError,
  isTechniqueFound,
  MAX_EXTRACTION_ITERATIONS,
} from './extraction';

const PUZZLE = `00${'1'.repeat(79)}`;
const EMPTY = '0'.repeat(81);
const PENCILS = `1,2${','.repeat(79)}`;

const hints = (technique: number, level: number, title = 'x'): SolverHints =>
  ({
    technique,
    level,
    steps: [{ title, text: 'x' }],
  }) as unknown as SolverHints;

const solveResponse = (
  technique: number,
  level: number,
  user: string,
  pencilmarks = '',
  title = 'x'
) => ({
  success: true,
  timestamp: '',
  data: {
    hints: hints(technique, level, title),
    board: {
      original: PUZZLE,
      user,
      pencilmark: { numbers: pencilmarks, autopencil: pencilmarks !== '' },
    },
  },
});

describe('buildExtractionSolveOptions', () => {
  it('omits pencilmarks and forces autoPencilmarks off without content', () => {
    const state = { ...createInitialExtractionState(), autoPencilmarks: true };
    expect(buildExtractionSolveOptions(PUZZLE, state)).toEqual({
      original: PUZZLE,
      user: EMPTY,
      autoPencilmarks: false,
    });
  });

  it('sends pencilmarks, the auto flag and a technique filter', () => {
    const state = {
      ...createInitialExtractionState(),
      pencilmarks: PENCILS,
      autoPencilmarks: true,
    };
    expect(buildExtractionSolveOptions(PUZZLE, state, 60)).toEqual({
      original: PUZZLE,
      user: EMPTY,
      autoPencilmarks: true,
      pencilmarks: PENCILS,
      techniques: '60',
    });
  });
});

describe('computeNextExtractionState', () => {
  const start = createInitialExtractionState();
  const board = (user: string, numbers = '') => ({
    original: PUZZLE,
    user,
    pencilmark: { numbers, autopencil: true },
  });

  it('returns null without a board or when nothing changed', () => {
    expect(computeNextExtractionState(start, hints(1, 1), undefined)).toBe(
      null
    );
    expect(computeNextExtractionState(start, hints(1, 1), board(EMPTY))).toBe(
      null
    );
  });

  it('accumulates the bit and the max level', () => {
    const s1 = computeNextExtractionState(
      start,
      hints(60, 10),
      board(`1${'0'.repeat(80)}`)
    )!;
    const s2 = computeNextExtractionState(
      s1,
      hints(1, 1),
      board(`11${'0'.repeat(79)}`)
    )!;
    expect(s2.techniquesBitfield).toBe((1n << 60n) | (1n << 1n));
    expect(s2.maxLevel).toBe(10);
    expect(s2.autoPencilmarks).toBe(true);
  });

  it('ignores technique 0 and level 0 (auto-pencilmark hint)', () => {
    const next = computeNextExtractionState(
      start,
      hints(0, 0),
      board(EMPTY, PENCILS)
    )!;
    expect(next.techniquesBitfield).toBe(0n);
    expect(next.maxLevel).toBe(0);
    expect(next.pencilmarks).toBe(PENCILS);
  });
});

describe('interpretSolveResponse', () => {
  const state = createInitialExtractionState();

  it('is null when there are no steps or the call failed', () => {
    expect(
      interpretSolveResponse({ success: false, timestamp: '' }, state)
    ).toBeNull();
    expect(
      interpretSolveResponse(
        {
          success: true,
          timestamp: '',
          data: { hints: { ...hints(1, 1), steps: [] } } as never,
        },
        state
      )
    ).toBeNull();
  });

  it('flags invalid pencilmarks', () => {
    const outcome = interpretSolveResponse(
      solveResponse(0, 0, EMPTY, '', 'Invalid Pencilmarks') as never,
      state
    );
    expect(outcome).toEqual({ error: 'Invalid pencilmarks detected' });
  });

  it('returns found with the state before the step', () => {
    const outcome = interpretSolveResponse(
      solveResponse(60, 10, `1${'0'.repeat(80)}`) as never,
      state,
      60
    );
    expect(isTechniqueFound(outcome)).toBe(true);
    expect(outcome).toMatchObject({
      type: 'found',
      userInput: EMPTY,
      pencilmarks: '',
      techniqueId: 60,
    });
  });

  it('advances when the hint is another technique', () => {
    const outcome = interpretSolveResponse(
      solveResponse(1, 1, `1${'0'.repeat(80)}`) as never,
      state,
      60
    );
    expect(outcome).toMatchObject({ techniquesBitfield: 2n, maxLevel: 1 });
  });
});

describe('interpretSolveError', () => {
  it('treats Invalid/400 as errors and the rest as no progress', () => {
    expect(interpretSolveError(new Error('HTTP 400'))).toEqual({
      error: 'HTTP 400',
    });
    expect(interpretSolveError(new Error('Invalid board'))).toEqual({
      error: 'Invalid board',
    });
    expect(interpretSolveError(new Error('timeout'))).toBeNull();
  });
});

describe('extractBoardTechniques', () => {
  it('accumulates techniques into an exact bigint bitmask', async () => {
    const solve = vi
      .fn()
      .mockResolvedValueOnce(solveResponse(60, 10, `10${'0'.repeat(79)}`))
      .mockResolvedValueOnce(solveResponse(1, 1, `11${'0'.repeat(79)}`));

    const result = await extractBoardTechniques(solve, PUZZLE);

    // (1n << 60n) | (1n << 1n): a JS number would round this to ...976.
    expect(result).toEqual({ techniques: 1152921504606846978n, level: 10 });
    expect(solve).toHaveBeenCalledTimes(2);
    expect(solve.mock.calls[1]![0]).toMatchObject({
      user: `10${'0'.repeat(79)}`,
    });
  });

  it('stops with the partial result when the solver has no hint', async () => {
    const solve = vi
      .fn()
      .mockResolvedValueOnce(solveResponse(2, 2, `10${'0'.repeat(79)}`))
      .mockResolvedValueOnce({ success: true, timestamp: '', data: null });
    expect(await extractBoardTechniques(solve, PUZZLE)).toEqual({
      techniques: 4n,
      level: 2,
    });
  });

  it('returns found for the desired technique', async () => {
    const solve = vi
      .fn()
      .mockResolvedValue(solveResponse(60, 10, `10${'0'.repeat(79)}`));
    const result = await extractBoardTechniques(solve, PUZZLE, 60);
    expect(isTechniqueFound(result)).toBe(true);
    expect(solve.mock.calls[0]![0]).toMatchObject({ techniques: '60' });
  });

  it('turns a 400 into an error and other throws into no progress', async () => {
    const bad = vi.fn().mockRejectedValue(new Error('400 Bad Request'));
    const r1 = await extractBoardTechniques(bad, PUZZLE);
    expect(isExtractionError(r1)).toBe(true);

    const flaky = vi.fn().mockRejectedValue(new Error('network down'));
    expect(await extractBoardTechniques(flaky, PUZZLE)).toEqual({
      techniques: 0n,
      level: 0,
    });
  });

  it('gives up after the iteration cap', async () => {
    let n = 0;
    const solve = vi.fn(async () => {
      n++;
      // Changes the pencilmarks every call but never fills the board.
      return solveResponse(3, 1, EMPTY, `${n}${','.repeat(80)}`);
    });
    expect(await extractBoardTechniques(solve, PUZZLE)).toEqual({
      error: 'Max iterations exceeded',
    });
    expect(solve).toHaveBeenCalledTimes(MAX_EXTRACTION_ITERATIONS);
  });

  it('does not call the solver for an already-filled board', async () => {
    const solve = vi.fn();
    expect(await extractBoardTechniques(solve, '1'.repeat(81))).toEqual({
      techniques: 0n,
      level: 0,
    });
    expect(solve).not.toHaveBeenCalled();
  });
});
