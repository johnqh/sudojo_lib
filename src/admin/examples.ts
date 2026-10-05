/**
 * Pure rules for the technique-example creator: which techniques still need
 * examples, where to search for boards, and the example + linked practice
 * requests built from a find.
 *
 * Ported from `sudojo_app/src/utils/admin/ExampleCreator.ts` and the
 * constants of `sudojo_app/src/pages/AdminPage.tsx`.
 */

import {
  ALL_TECHNIQUE_IDS,
  type Board,
  formatTechniqueBitmask,
  MAX_LEVEL,
  MIN_LEVEL,
  type Technique,
  type TechniqueExampleCreateRequest,
  type TechniqueId,
  techniqueIdsToBitmask,
  type TechniquePracticeCreateRequest,
} from '@sudobility/sudojo_types';
import {
  adjustPracticeSolution,
  mergeBoardWithUserInput,
} from './boardStrings';
import type { TechniqueExampleFound } from './extraction';

/** Examples wanted per technique. */
export const ADMIN_EXAMPLE_TARGET_PER_TECHNIQUE = 1;

/** Every technique id, easiest (lowest id) first: the creator's work order. */
export const ADMIN_TECHNIQUE_ORDER: readonly TechniqueId[] = [
  ...ALL_TECHNIQUE_IDS,
].sort((a, b) => a - b);

/** Boards fetched per technique by bit. */
export const BOARDS_WITH_TECHNIQUE_LIMIT = 50;

/** Boards fetched per level in the level-based search. */
export const BOARDS_PER_LEVEL_LIMIT = 100;

/** Example counts keyed by technique id. */
export type TechniqueCounts = Readonly<Record<number, number>>;

/**
 * Normalize an API counts map (string keys, e.g. `/examples/counts`) to
 * numeric technique-id keys. null/undefined → {}.
 */
export function normalizeTechniqueCounts(
  data:
    | Readonly<Record<string, number>>
    | Readonly<Record<number, number>>
    | null
    | undefined
): Record<number, number> {
  const result: Record<number, number> = {};
  if (!data) return result;
  for (const [key, value] of Object.entries(data)) {
    const id = parseInt(key, 10);
    if (!Number.isNaN(id)) result[id] = value;
  }
  return result;
}

/** Count for a technique (0 when absent). */
export function countForTechnique(
  counts: TechniqueCounts,
  techniqueId: number
): number {
  return counts[techniqueId] || 0;
}

/** True when the technique already has `target` examples. */
export function hasReachedTarget(
  counts: TechniqueCounts,
  techniqueId: number,
  target: number
): boolean {
  return countForTechnique(counts, techniqueId) >= target;
}

/** Techniques in `order` that still need examples. */
export function techniquesNeedingExamples(
  order: readonly TechniqueId[],
  counts: TechniqueCounts,
  target: number
): TechniqueId[] {
  return order.filter(id => !hasReachedTarget(counts, id, target));
}

/** Sum of all counts. */
export function totalTechniqueCount(counts: TechniqueCounts): number {
  return Object.values(counts).reduce((sum, c) => sum + c, 0);
}

/** technique id → level (null when the technique has no level). */
export function buildTechniqueLevelMap(
  techniques: readonly Technique[] | null | undefined
): Map<number, number | null> {
  const map = new Map<number, number | null>();
  for (const tech of techniques ?? []) map.set(tech.technique, tech.level);
  return map;
}

/**
 * Levels to search, in order, for a technique at `techniqueLevel`: one below,
 * its own, then two above (a technique often first appears on harder
 * boards). Clamped to MIN_LEVEL..MAX_LEVEL.
 */
export function levelsToSearchForTechnique(techniqueLevel: number): number[] {
  return [
    techniqueLevel - 1,
    techniqueLevel,
    techniqueLevel + 1,
    techniqueLevel + 2,
  ].filter(level => level >= MIN_LEVEL && level <= MAX_LEVEL);
}

/** Requests to save a find: the example, then (after it) the linked practice. */
export interface ExampleSaveRequests {
  /** Source givens + the cells the solver filled before reaching the technique */
  mergedBoard: string;
  example: TechniqueExampleCreateRequest;
  /** Practice request without `source_example_uuid` (set it from the example) */
  practice: TechniquePracticeCreateRequest;
}

/**
 * Build the example and practice requests for a find on `board`.
 *
 * `found.userInput` holds only the solver's cells (never the givens), so the
 * stored board is `mergeBoardWithUserInput(board.board, found.userInput)`.
 * The practice's solution is blanked ('0') wherever that board is filled.
 */
export function buildExampleSaveRequests(
  board: Pick<Board, 'uuid' | 'board' | 'solution'>,
  found: TechniqueExampleFound
): ExampleSaveRequests {
  const mergedBoard = mergeBoardWithUserInput(board.board, found.userInput);
  const hintData = JSON.stringify(found.hintData);
  const pencilmarks = found.pencilmarks || undefined;
  return {
    mergedBoard,
    example: {
      board: mergedBoard,
      pencilmarks,
      solution: board.solution,
      techniques_bitfield: formatTechniqueBitmask(
        techniqueIdsToBitmask([found.techniqueId])
      ),
      primary_technique: found.techniqueId,
      hint_data: hintData,
      source_board_uuid: board.uuid,
    },
    practice: {
      technique: found.techniqueId,
      board: mergedBoard,
      pencilmarks,
      solution: adjustPracticeSolution(mergedBoard, board.solution),
      hint_data: hintData,
      source_example_uuid: undefined,
    },
  };
}
