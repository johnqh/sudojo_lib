/**
 * Pure rules for the board jobs: reading a /generate response, turning a
 * /validate result into a create request, the board query filters, and the
 * frontend-vs-solver comparison of the technique extractor.
 *
 * Masks are exact `bigint`s here and go on the wire as base-10 strings
 * (`formatTechniqueBitmask`): a JSON number drops the low bits once any
 * technique id >= 54 is set.
 *
 * Ported from `sudojo_app/src/utils/admin/BoardGenerator.ts`,
 * `TechniqueExtractor.ts` and `boardTechniquesApi.ts`.
 */

import {
  type BoardCreateRequest,
  type BoardQueryParams,
  type BoardUpdateRequest,
  formatTechniqueBitmask,
  techniqueBitmaskOf,
  type TechniqueId,
  techniqueIdsToBitmask,
  type ValidateData,
} from '@sudobility/sudojo_types';
import { formatTechniqueMaskHex, shortUuid } from './boardStrings';
import type { BoardExtractionResult } from './extraction';

/** Puzzle read from a /generate response. */
export interface GeneratedPuzzle {
  level: number;
  original: string;
  solution: string;
}

export type ParseGeneratedBoardResult =
  | ({ ok: true } & GeneratedPuzzle)
  | { ok: false; reason: 'invalid' | 'missing-puzzle' };

/**
 * Read level/original/solution from a /generate `data`, tolerating the older
 * shapes the web app accepted: `{ board: { level, board: {original, …} } }`,
 * `{ board: { level, original, … } }` and `{ level, original, … }`.
 * `invalid` = no numeric level; `missing-puzzle` = no original.
 */
export function parseGeneratedBoard(data: unknown): ParseGeneratedBoardResult {
  const root = asRecord(data);
  const nested = asRecord(root?.board);
  const boardData = nested?.level !== undefined ? nested : root;
  if (!boardData || typeof boardData.level !== 'number') {
    return { ok: false, reason: 'invalid' };
  }

  const puzzleData = asRecord(boardData.board) ?? boardData;
  const inner = asRecord(puzzleData.board);
  const original = firstString(puzzleData.original, inner?.original);
  const solution = firstString(puzzleData.solution, inner?.solution);
  if (!original) return { ok: false, reason: 'missing-puzzle' };

  return { ok: true, level: boardData.level, original, solution };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

/** A board ready to save, with the values reported back to the UI. */
export interface ValidatedBoard {
  request: BoardCreateRequest;
  level: number;
  /** Exact bitmask (bit N = technique N) */
  techniques: bigint;
}

/**
 * Create request for a generated board. The /validate result is the source of
 * truth for level, techniques and solution; the /generate values are only a
 * fallback when /validate omits them.
 */
export function buildValidatedBoard(
  generated: GeneratedPuzzle,
  validateData: ValidateData | undefined | null,
  symmetrical: boolean
): ValidatedBoard {
  const board = validateData?.board;
  const level = board?.level ?? generated.level;
  // Prefers the exact `techniques_bitmask` string over the lossy number.
  const techniques = board ? techniqueBitmaskOf(board) : 0n;
  return {
    request: {
      board: generated.original,
      solution: board?.solution ?? generated.solution,
      level,
      symmetrical,
      techniques: formatTechniqueBitmask(techniques),
    },
    level,
    techniques,
  };
}

/** Update request that sets only a board's techniques bitmask and level. */
export function buildBoardTechniquesUpdate(
  techniques: bigint,
  level: number | null
): BoardUpdateRequest {
  return {
    techniques: formatTechniqueBitmask(techniques),
    level,
    symmetrical: undefined,
    board: undefined,
    solution: undefined,
  };
}

const NO_BOARD_FILTERS: BoardQueryParams = {
  level: undefined,
  symmetrical: undefined,
  limit: undefined,
  offset: undefined,
  techniques: undefined,
  technique_bit: undefined,
};

/** Filter for the next board whose techniques were never extracted. */
export function boardsWithoutTechniquesQuery(): BoardQueryParams {
  return { ...NO_BOARD_FILTERS, techniques: 0, limit: 1 };
}

/**
 * Filter for boards with the technique's bit set (API `technique_bit`, sent
 * as an exact string). Not filtered by level: boards with the technique may
 * sit at higher levels.
 */
export function boardsWithTechniqueQuery(
  techniqueId: TechniqueId,
  limit: number
): BoardQueryParams {
  return {
    ...NO_BOARD_FILTERS,
    limit,
    technique_bit: formatTechniqueBitmask(techniqueIdsToBitmask([techniqueId])),
  };
}

/** Filter for boards at one level. */
export function boardsAtLevelQuery(
  level: number,
  limit: number
): BoardQueryParams {
  return { ...NO_BOARD_FILTERS, level, limit };
}

/** Frontend extraction disagreed with /validate. */
export interface ExtractionMismatch {
  solverTechniques: bigint;
  solverLevel: number;
  message: string;
}

/**
 * Compare a frontend extraction with /validate. Exact bigint comparison: the
 * numeric `techniques` drops low bits above 2^53, which would hide mismatches.
 * Returns null when techniques and level both match.
 */
export function compareExtractionWithSolver(
  boardUuid: string,
  frontend: BoardExtractionResult,
  solver: { level: number; techniques: number; techniques_bitmask?: string }
): ExtractionMismatch | null {
  const solverTechniques = techniqueBitmaskOf(solver);
  if (
    solverTechniques === frontend.techniques &&
    solver.level === frontend.level
  ) {
    return null;
  }
  return {
    solverTechniques,
    solverLevel: solver.level,
    message:
      `MISMATCH: Board ${shortUuid(boardUuid)} - ` +
      `FE techniques ${formatTechniqueMaskHex(frontend.techniques)} level ${frontend.level} vs ` +
      `Solver techniques ${formatTechniqueMaskHex(solverTechniques)} level ${solver.level}`,
  };
}
