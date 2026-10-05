import { describe, expect, it } from 'vitest';
import {
  ALL_TECHNIQUE_IDS,
  type SolverHints,
  type Technique,
} from '@sudobility/sudojo_types';
import {
  ADMIN_TECHNIQUE_ORDER,
  buildExampleSaveRequests,
  buildTechniqueLevelMap,
  countForTechnique,
  hasReachedTarget,
  levelsToSearchForTechnique,
  normalizeTechniqueCounts,
  techniquesNeedingExamples,
  totalTechniqueCount,
} from './examples';

describe('ADMIN_TECHNIQUE_ORDER', () => {
  it('lists every technique, ascending', () => {
    expect(ADMIN_TECHNIQUE_ORDER).toHaveLength(ALL_TECHNIQUE_IDS.length);
    expect([...ADMIN_TECHNIQUE_ORDER]).toEqual(
      [...ALL_TECHNIQUE_IDS].sort((a, b) => a - b)
    );
  });
});

describe('counts', () => {
  it('normalizes string keys to numbers and drops junk', () => {
    expect(normalizeTechniqueCounts({ '1': 3, '60': 1, x: 9 })).toEqual({
      1: 3,
      60: 1,
    });
    expect(normalizeTechniqueCounts(null)).toEqual({});
  });

  it('counts, targets and totals', () => {
    const counts = { 1: 1, 2: 0 };
    expect(countForTechnique(counts, 3)).toBe(0);
    expect(hasReachedTarget(counts, 1, 1)).toBe(true);
    expect(hasReachedTarget(counts, 2, 1)).toBe(false);
    expect(techniquesNeedingExamples([1, 2, 3], counts, 1)).toEqual([2, 3]);
    expect(totalTechniqueCount({ 1: 2, 5: 3 })).toBe(5);
  });
});

describe('buildTechniqueLevelMap', () => {
  it('maps technique to level, keeping null', () => {
    const map = buildTechniqueLevelMap([
      { technique: 1, level: 1 },
      { technique: 60, level: null },
    ] as Technique[]);
    expect(map.get(1)).toBe(1);
    expect(map.get(60)).toBeNull();
    expect(buildTechniqueLevelMap(undefined).size).toBe(0);
  });
});

describe('levelsToSearchForTechnique', () => {
  it('searches one below, own, then two above', () => {
    expect(levelsToSearchForTechnique(5)).toEqual([4, 5, 6, 7]);
  });

  it('clamps to the 1..12 range', () => {
    expect(levelsToSearchForTechnique(1)).toEqual([1, 2, 3]);
    expect(levelsToSearchForTechnique(12)).toEqual([11, 12]);
  });
});

describe('buildExampleSaveRequests', () => {
  const board = {
    uuid: 'board-uuid',
    board: `5${'0'.repeat(80)}`,
    solution: '9'.repeat(81),
  };
  const hintData = {
    technique: 60,
    level: 10,
    steps: [],
  } as unknown as SolverHints;

  it('merges givens with solver cells and links the practice', () => {
    const found = {
      type: 'found' as const,
      userInput: `03${'0'.repeat(79)}`,
      pencilmarks: '1,2',
      techniqueId: 60,
      hintData,
    };
    const { mergedBoard, example, practice } = buildExampleSaveRequests(
      board,
      found
    );
    expect(mergedBoard).toBe(`53${'0'.repeat(79)}`);
    expect(example).toEqual({
      board: mergedBoard,
      pencilmarks: '1,2',
      solution: board.solution,
      techniques_bitfield: '1152921504606846976',
      primary_technique: 60,
      hint_data: JSON.stringify(hintData),
      source_board_uuid: 'board-uuid',
    });
    expect(practice).toEqual({
      technique: 60,
      board: mergedBoard,
      pencilmarks: '1,2',
      solution: `00${'9'.repeat(79)}`,
      hint_data: JSON.stringify(hintData),
      source_example_uuid: undefined,
    });
  });

  it('sends no pencilmarks when there are none', () => {
    const { example, practice } = buildExampleSaveRequests(board, {
      type: 'found',
      userInput: '0'.repeat(81),
      pencilmarks: '',
      techniqueId: 1,
      hintData,
    });
    expect(example.pencilmarks).toBeUndefined();
    expect(practice.pencilmarks).toBeUndefined();
  });
});
