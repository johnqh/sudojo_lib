import { describe, expect, it } from 'vitest';
import { TechniqueId } from '@sudobility/sudojo_types';
import {
  boardsAtLevelQuery,
  boardsWithoutTechniquesQuery,
  boardsWithTechniqueQuery,
  buildBoardTechniquesUpdate,
  buildValidatedBoard,
  compareExtractionWithSolver,
  parseGeneratedBoard,
} from './boardRules';

const MASK_60_AND_1 = '1152921504606846978';
const PUZZLE = `0${'1'.repeat(80)}`;
const SOLUTION = '1'.repeat(81);

describe('parseGeneratedBoard', () => {
  it('reads the nested { board: { level, board: {...} } } shape', () => {
    expect(
      parseGeneratedBoard({
        board: { level: 5, board: { original: PUZZLE, solution: SOLUTION } },
      })
    ).toEqual({ ok: true, level: 5, original: PUZZLE, solution: SOLUTION });
  });

  it('reads the current { board: { level, original, solution } } shape', () => {
    expect(
      parseGeneratedBoard({
        board: { level: 3, original: PUZZLE, solution: SOLUTION },
      })
    ).toEqual({ ok: true, level: 3, original: PUZZLE, solution: SOLUTION });
  });

  it('reads a flat { level, original } shape', () => {
    expect(parseGeneratedBoard({ level: 2, original: PUZZLE })).toEqual({
      ok: true,
      level: 2,
      original: PUZZLE,
      solution: '',
    });
  });

  it('rejects missing level and missing puzzle', () => {
    expect(parseGeneratedBoard(null)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(parseGeneratedBoard({ board: { original: PUZZLE } })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(parseGeneratedBoard({ board: { level: 1 } })).toEqual({
      ok: false,
      reason: 'missing-puzzle',
    });
  });
});

describe('buildValidatedBoard', () => {
  const generated = { level: 5, original: PUZZLE, solution: 'gen' };

  it('uses the exact /validate bitmask string and values', () => {
    const result = buildValidatedBoard(
      generated,
      {
        board: {
          level: 10,
          techniques: Number(MASK_60_AND_1),
          techniques_bitmask: MASK_60_AND_1,
          original: PUZZLE,
          solution: SOLUTION,
        },
      },
      true
    );
    expect(result).toEqual({
      request: {
        board: PUZZLE,
        solution: SOLUTION,
        level: 10,
        symmetrical: true,
        techniques: MASK_60_AND_1,
      },
      level: 10,
      techniques: BigInt(MASK_60_AND_1),
    });
  });

  it('falls back to the numeric field for an older API', () => {
    const result = buildValidatedBoard(
      generated,
      {
        board: {
          level: 2,
          techniques: 6,
          original: PUZZLE,
          solution: SOLUTION,
        },
      },
      false
    );
    expect(result.request.techniques).toBe('6');
  });

  it('falls back to the generated values without a validate board', () => {
    const result = buildValidatedBoard(generated, null, false);
    expect(result.level).toBe(5);
    expect(result.techniques).toBe(0n);
    expect(result.request.solution).toBe('gen');
  });
});

describe('board queries', () => {
  it('builds the techniques update with an exact string', () => {
    expect(buildBoardTechniquesUpdate(1152921504606846978n, 10)).toEqual({
      techniques: MASK_60_AND_1,
      level: 10,
      symmetrical: undefined,
      board: undefined,
      solution: undefined,
    });
  });

  it('filters by the exact technique bit as a string', () => {
    expect(boardsWithTechniqueQuery(TechniqueId.GROUPED_X_CYCLES, 50)).toEqual({
      limit: 50,
      offset: undefined,
      level: undefined,
      symmetrical: undefined,
      techniques: undefined,
      technique_bit: '1152921504606846976',
    });
  });

  it('asks for one board with techniques 0', () => {
    expect(boardsWithoutTechniquesQuery()).toMatchObject({
      techniques: 0,
      limit: 1,
      level: undefined,
    });
  });

  it('filters by level', () => {
    expect(boardsAtLevelQuery(4, 100)).toMatchObject({ level: 4, limit: 100 });
  });
});

describe('compareExtractionWithSolver', () => {
  const uuid = 'aaaaaaaa-0000-0000-0000-000000000000';

  it('matches on exact bitmask and level', () => {
    expect(
      compareExtractionWithSolver(
        uuid,
        { techniques: BigInt(MASK_60_AND_1), level: 10 },
        {
          level: 10,
          techniques: Number(MASK_60_AND_1),
          techniques_bitmask: MASK_60_AND_1,
        }
      )
    ).toBeNull();
  });

  it('flags a mismatch only visible in the bits a JS number drops', () => {
    const mismatch = compareExtractionWithSolver(
      uuid,
      { techniques: BigInt(MASK_60_AND_1), level: 10 },
      {
        level: 10,
        techniques: Number('1152921504606846976'),
        techniques_bitmask: '1152921504606846976',
      }
    );
    expect(mismatch?.message).toBe(
      'MISMATCH: Board aaaaaaaa - FE techniques 0x1000000000000002 level 10 vs ' +
        'Solver techniques 0x1000000000000000 level 10'
    );
    expect(mismatch?.solverTechniques).toBe(1n << 60n);
  });

  it('flags a level mismatch', () => {
    expect(
      compareExtractionWithSolver(
        uuid,
        { techniques: 2n, level: 1 },
        { level: 2, techniques: 2 }
      )
    ).not.toBeNull();
  });
});
