/**
 * Admin batch jobs as framework-agnostic async functions over an
 * {@link AdminApi}. The hooks in this folder wrap them with React state; the
 * functions themselves hold the business rules (token refresh cadence, retry
 * delays, stop conditions, technique → level search fallback).
 *
 * Ported from `sudojo_app/src/utils/admin/{BoardGenerator,TechniqueExtractor,
 * ExampleCreator,boardTechniquesApi}.ts`; progress messages are unchanged.
 */

import {
  type Board,
  getTechniqueNameById,
  techniqueBitmaskOf,
  type TechniqueId,
} from '@sudobility/sudojo_types';
import type { AdminApi } from './adminApi';
import {
  boardsAtLevelQuery,
  boardsWithoutTechniquesQuery,
  boardsWithTechniqueQuery,
  buildBoardTechniquesUpdate,
  buildValidatedBoard,
  compareExtractionWithSolver,
  parseGeneratedBoard,
} from './boardRules';
import {
  describeTechniqueMask,
  errorMessage,
  formatTechniqueMaskHex,
  levelToSave,
  shortUuid,
} from './boardStrings';
import {
  ADMIN_EXAMPLE_TARGET_PER_TECHNIQUE,
  ADMIN_TECHNIQUE_ORDER,
  BOARDS_PER_LEVEL_LIMIT,
  BOARDS_WITH_TECHNIQUE_LIMIT,
  buildExampleSaveRequests,
  buildTechniqueLevelMap,
  countForTechnique,
  hasReachedTarget,
  levelsToSearchForTechnique,
  type TechniqueCounts,
} from './examples';
import {
  type BoardExtractionOutcome,
  type BoardExtractionResult,
  extractBoardTechniques,
  isExtractionError,
  isTechniqueFound,
  type TechniqueExampleFound,
} from './extraction';
import { type AbortHandle, ADMIN_TOKEN_REFRESH_INTERVAL } from './types';

// ============================================================================
// Shared plumbing
// ============================================================================

/** Current admin token, refreshable mid-job. */
export interface AdminTokenManager {
  readonly current: string;
  /** Ask `getToken` again; keeps the old token if it fails or returns null. */
  refresh(): Promise<void>;
}

/**
 * Get the starting token. Returns null when `getToken` yields none (the job
 * should report "Not authenticated"). Refreshes log "Token refreshed,
 * continuing..." through `onProgress`; refresh failures only warn.
 */
export async function createAdminTokenManager(
  getToken: () => Promise<string | null>,
  onProgress: (message: string) => void
): Promise<AdminTokenManager | null> {
  const initial = await getToken();
  if (!initial) return null;
  let current = initial;
  return {
    get current() {
      return current;
    },
    async refresh() {
      try {
        const next = await getToken();
        if (next) {
          current = next;
          onProgress('Token refreshed, continuing...');
        }
      } catch (err) {
        // The existing token might still be valid.
        console.warn('[admin] Token refresh failed:', err);
      }
    },
  };
}

/** True when the job should refresh its token before item `processed + 1`. */
export function shouldRefreshToken(
  processed: number,
  interval: number = ADMIN_TOKEN_REFRESH_INTERVAL
): boolean {
  return processed > 0 && processed % interval === 0;
}

/** What every job needs. */
export interface AdminJobContext {
  api: AdminApi;
  token: AdminTokenManager;
  abort: AbortHandle;
  onProgress: (message: string) => void;
  onError: (error: Error) => void;
  /** Wait between retries (default: setTimeout). Injectable for tests. */
  delay?: (ms: number) => Promise<void>;
}

const defaultDelay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const techniqueName = (id: number) => getTechniqueNameById(id);

// ============================================================================
// Board API helpers (were boardTechniquesApi.ts)
// ============================================================================

/**
 * Set a board's techniques bitmask (sent as an exact string) and level.
 * Returns false on any failure.
 */
export async function updateBoardTechniques(
  api: AdminApi,
  token: string,
  boardUuid: string,
  techniques: bigint,
  level: number | null
): Promise<boolean> {
  try {
    const response = await api.updateBoard(
      token,
      boardUuid,
      buildBoardTechniquesUpdate(techniques, level)
    );
    return response.success;
  } catch {
    return false;
  }
}

/**
 * Boards with the technique's bit set (API `technique_bit` filter), any
 * level. Returns [] on any failure.
 */
export async function fetchBoardsWithTechnique(
  api: AdminApi,
  token: string,
  techniqueId: TechniqueId,
  limit: number
): Promise<Board[]> {
  try {
    const response = await api.getBoards(
      token,
      boardsWithTechniqueQuery(techniqueId, limit)
    );
    return response.success && response.data ? response.data : [];
  } catch {
    return [];
  }
}

/** The next board whose techniques were never extracted, or null. */
export async function fetchBoardWithoutTechniques(
  api: AdminApi,
  token: string
): Promise<Board | null> {
  try {
    const response = await api.getBoards(token, boardsWithoutTechniquesQuery());
    return (response.success && response.data?.[0]) || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Board generation (was BoardGenerator.ts)
// ============================================================================

export interface BoardGenerationOptions {
  symmetrical: boolean;
  /** After each saved board. `techniques` is the exact bitmask. */
  onBoardGenerated?: (count: number, level: number, techniques: bigint) => void;
}

/**
 * Generate, validate and save boards until aborted or a save fails.
 * Each board: /generate → /validate (source of truth for level, techniques,
 * solution) → create. Generate/validate failures wait 1 s and retry.
 * Returns the number of boards saved.
 */
export async function runBoardGeneration(
  ctx: AdminJobContext,
  options: BoardGenerationOptions
): Promise<number> {
  const { api, token, abort, onProgress, onError } = ctx;
  const delay = ctx.delay ?? defaultDelay;

  onProgress('Fetching levels...');
  try {
    const levels = await api.getLevels();
    if (!levels.success || !levels.data) {
      onError(new Error('Failed to fetch levels'));
      return 0;
    }
    if (levels.data.length === 0) {
      onError(new Error('No levels found'));
      return 0;
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    return 0;
  }

  onProgress('Starting generation...');
  let count = 0;

  while (!abort.shouldAbort()) {
    if (shouldRefreshToken(count)) await token.refresh();

    try {
      onProgress(`Generating board ${count + 1}...`);
      const generated = await api.generate(token.current, {
        symmetrical: options.symmetrical,
      });
      if (!generated.success || !generated.data) {
        onProgress(
          `Error generating board: ${generated.error || 'Unknown error'}`
        );
        await delay(1000);
        continue;
      }

      const puzzle = parseGeneratedBoard(generated.data);
      if (!puzzle.ok) {
        onProgress(
          puzzle.reason === 'invalid'
            ? 'Error: Invalid response structure from solver'
            : 'Error: Missing puzzle data from solver'
        );
        await delay(1000);
        continue;
      }

      onProgress(`Validating board ${count + 1}...`);
      const validated = await api.validate(token.current, {
        original: puzzle.original,
      });
      if (!validated.success || !validated.data) {
        onProgress(
          `Error validating board: ${validated.error || 'Unknown error'}`
        );
        await delay(1000);
        continue;
      }

      const board = buildValidatedBoard(
        puzzle,
        validated.data,
        options.symmetrical
      );

      onProgress(`Saving board ${count + 1}...`);
      const created = await api.createBoard(token.current, board.request);
      if (!created.success) {
        onProgress(
          `Error saving board: ${created.error || 'Unknown error'}. Stopping.`
        );
        break;
      }

      count++;
      options.onBoardGenerated?.(count, board.level, board.techniques);
      onProgress(
        `Generated ${count} boards (level ${board.level}, techniques: ${formatTechniqueMaskHex(board.techniques)})`
      );
      await delay(100);
    } catch (err) {
      onProgress(
        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      await delay(1000);
    }
  }

  onProgress(`Stopped. Generated ${count} boards.`);
  return count;
}

// ============================================================================
// Technique extraction (was TechniqueExtractor.ts)
// ============================================================================

export interface TechniqueExtractionOptions {
  /**
   * false: trust /validate and save its techniques (fast).
   * true: walk the board with /solve, compare with /validate, stop on any
   * mismatch, and save only matching results.
   */
  testWithFrontend: boolean;
  /** After each saved board. */
  onBoardExtracted?: () => void;
}

/**
 * Process boards without techniques one by one until none are left, aborted,
 * or a critical error (save failure, mismatch, invalid pencilmarks).
 * Returns the number of boards saved.
 */
export async function runTechniqueExtraction(
  ctx: AdminJobContext,
  options: TechniqueExtractionOptions
): Promise<number> {
  const { api, token, abort, onProgress, onError } = ctx;
  let extracted = 0;
  let processed = 0;

  /** Save; false = stop. */
  const save = async (
    board: Board,
    techniques: bigint,
    level: number
  ): Promise<boolean> => {
    const finalLevel = levelToSave(level);
    onProgress(
      `Saving board ${shortUuid(board.uuid)} - ` +
        `techniques: ${formatTechniqueMaskHex(techniques)}, level: ${finalLevel}...`
    );
    const ok = await updateBoardTechniques(
      api,
      token.current,
      board.uuid,
      techniques,
      finalLevel
    );
    if (!ok) {
      onProgress(`Failed to save board ${shortUuid(board.uuid)}. Stopping.`);
      return false;
    }
    extracted++;
    options.onBoardExtracted?.();
    onProgress(`Extracted ${extracted} boards. Finding next...`);
    return true;
  };

  const validate = (board: Board) =>
    api.validate(token.current, { original: board.board });

  const processSimple = async (board: Board): Promise<boolean> => {
    const id = shortUuid(board.uuid);
    onProgress(`Validating board ${id}...`);
    try {
      const response = await validate(board);
      if (!response.success || !response.data?.board) {
        onProgress(`Validate failed for ${id}, skipping...`);
        return true;
      }
      const solverBoard = response.data.board;
      return await save(
        board,
        techniqueBitmaskOf(solverBoard),
        solverBoard.level
      );
    } catch (err) {
      onProgress(`Validate error for ${id}: ${errorMessage(err)}`);
      return true;
    }
  };

  const compareAndSave = async (
    board: Board,
    frontend: BoardExtractionResult
  ): Promise<boolean> => {
    const id = shortUuid(board.uuid);
    if (frontend.techniques === 0n && frontend.level === 0) {
      onProgress(`Skipped board ${id} (no techniques found). Finding next...`);
      return true;
    }

    onProgress(`Validating board ${id}...`);
    try {
      const response = await validate(board);
      if (!response.success || !response.data?.board) {
        onProgress(`Validate failed for ${id}, skipping...`);
        return true;
      }
      const solver = response.data.board;
      const mismatch = compareExtractionWithSolver(
        board.uuid,
        frontend,
        solver
      );
      if (mismatch) {
        console.log('[TechniqueExtractor] MISMATCH DETECTED');
        console.log('[TechniqueExtractor] Board UUID:', board.uuid);
        console.log('[TechniqueExtractor] Board puzzle:', board.board);
        console.log('[TechniqueExtractor] Frontend result:', {
          ...describeTechniqueMask(frontend.techniques),
          level: frontend.level,
        });
        console.log('[TechniqueExtractor] Solver (/validate) result:', {
          ...describeTechniqueMask(mismatch.solverTechniques),
          level: mismatch.solverLevel,
        });
        onError(new Error(mismatch.message));
        return false; // Investigate the discrepancy.
      }
      return await save(board, frontend.techniques, frontend.level);
    } catch (err) {
      onProgress(`Validate error for ${id}: ${errorMessage(err)}`);
      return true;
    }
  };

  const processWithTest = async (board: Board): Promise<boolean> => {
    onProgress(`Processing board ${shortUuid(board.uuid)}...`);
    const result = await extractBoardTechniques(
      opts => api.solve(token.current, opts),
      board.board
    );
    if (isExtractionError(result)) {
      onError(new Error(`Board ${shortUuid(board.uuid)}: ${result.error}`));
      // Invalid pencilmarks means a technique bug: stop and investigate.
      return !result.error.includes('Invalid pencilmarks');
    }
    if (isTechniqueFound(result)) return true; // Not possible without a filter.
    return compareAndSave(board, result);
  };

  const processBoard = options.testWithFrontend
    ? processWithTest
    : processSimple;

  while (!abort.shouldAbort()) {
    if (shouldRefreshToken(processed)) await token.refresh();

    const board = await fetchBoardWithoutTechniques(api, token.current);
    if (!board) {
      onProgress(
        `Done! Extracted techniques for ${extracted} boards. No more boards.`
      );
      break;
    }
    if (!(await processBoard(board))) break;
    processed++;
  }

  if (!abort.shouldAbort()) {
    onProgress(`Done! Extracted techniques for ${extracted} boards.`);
  }
  return extracted;
}

// ============================================================================
// Example creation (was ExampleCreator.ts)
// ============================================================================

/**
 * - `all`: every technique in `techniqueOrder` below target, by bit then level.
 * - `bit`: one technique; boards with its bit set, else the level search.
 * - `level`: one technique; level search only (finds techniques whose bit is
 *   missing on boards).
 */
export type ExampleCreationRequest =
  | {
      mode: 'all';
      currentCounts: TechniqueCounts;
      targetPerTechnique?: number;
      techniqueOrder?: readonly TechniqueId[];
    }
  | {
      mode: 'bit' | 'level';
      techniqueId: TechniqueId;
      currentCounts: TechniqueCounts;
      targetPerTechnique?: number;
    };

export interface ExampleCreationCallbacks {
  /** After an example + practice pair is saved. */
  onExampleSaved?: (techniqueId: TechniqueId, newCount: number) => void;
  /** After a board whose bit lied was reset to techniques 0 / level null. */
  onBoardTechniquesReset?: (boardUuid: string) => void;
}

/**
 * Create technique examples (each with a linked practice). A board fetched by
 * technique bit that turns out not to contain the technique is reset to
 * techniques 0 so the extractor re-processes it. Any failed save stops the
 * job (aborts). Returns the final per-technique counts.
 */
export async function runExampleCreation(
  ctx: AdminJobContext,
  request: ExampleCreationRequest,
  callbacks: ExampleCreationCallbacks = {}
): Promise<Record<number, number>> {
  const { api, token, abort, onProgress, onError } = ctx;
  const target =
    request.targetPerTechnique ?? ADMIN_EXAMPLE_TARGET_PER_TECHNIQUE;
  const counts: Record<number, number> = { ...request.currentCounts };
  let boardsProcessed = 0;

  onProgress('Fetching techniques...');
  let levelMap = new Map<number, number | null>();
  try {
    const response = await api.getTechniques();
    if (response.success) levelMap = buildTechniqueLevelMap(response.data);
  } catch (err) {
    console.error('Failed to fetch techniques:', err);
  }
  const levelOf = (id: TechniqueId) => levelMap.get(id) ?? null;
  const reached = (id: TechniqueId) => hasReachedTarget(counts, id, target);

  /** Save example + practice; false = stop. */
  const saveFound = async (
    board: Board,
    found: TechniqueExampleFound
  ): Promise<boolean> => {
    const name = techniqueName(found.techniqueId);
    onProgress(`Saving ${name} example...`);
    const requests = buildExampleSaveRequests(board, found);
    try {
      const example = await api.createExample(token.current, requests.example);
      if (!example.success || !example.data) {
        onProgress(
          `Failed to save example: ${example.error || 'Unknown error'}. Stopping.`
        );
        return false;
      }
      onProgress(`Saving ${name} practice...`);
      const practice = await api.createPractice(token.current, {
        ...requests.practice,
        source_example_uuid: example.data.uuid,
      });
      if (!practice.success) {
        onProgress(
          `Failed to save practice: ${practice.error || 'Unknown error'}. Stopping.`
        );
        return false;
      }
    } catch (err) {
      onProgress(
        `Error saving example/practice: ${errorMessage(err)}. Stopping.`
      );
      return false;
    }

    const newCount = countForTechnique(counts, found.techniqueId) + 1;
    counts[found.techniqueId] = newCount;
    callbacks.onExampleSaved?.(found.techniqueId, newCount);
    onProgress(`Saved ${name} (${newCount}/${target})`);
    return true;
  };

  const extract = async (
    board: Board,
    techniqueId: TechniqueId
  ): Promise<BoardExtractionOutcome> => {
    boardsProcessed++;
    if (boardsProcessed % ADMIN_TOKEN_REFRESH_INTERVAL === 0) {
      await token.refresh();
    }
    return extractBoardTechniques(
      opts => api.solve(token.current, opts),
      board.board,
      techniqueId
    );
  };

  /** Board found by bit; resets the board when the technique is absent. */
  const processBitBoard = async (
    board: Board,
    techniqueId: TechniqueId
  ): Promise<boolean> => {
    const result = await extract(board, techniqueId);
    if (isTechniqueFound(result)) return saveFound(board, result);
    if (isExtractionError(result)) {
      onError(new Error(`Board ${shortUuid(board.uuid)}: ${result.error}`));
      return true;
    }
    if (abort.shouldAbort()) return true;

    onProgress(
      `Technique ${techniqueName(techniqueId)} not found in board ${shortUuid(board.uuid)}, resetting techniques...`
    );
    const ok = await updateBoardTechniques(
      api,
      token.current,
      board.uuid,
      0n,
      null
    );
    if (!ok) {
      onProgress(`Failed to reset board ${shortUuid(board.uuid)}. Stopping.`);
      return false;
    }
    callbacks.onBoardTechniquesReset?.(board.uuid);
    return true;
  };

  /** Board found by level; nothing to reset when the technique is absent. */
  const processLevelBoard = async (
    board: Board,
    techniqueId: TechniqueId
  ): Promise<boolean> => {
    const result = await extract(board, techniqueId);
    return isTechniqueFound(result) ? saveFound(board, result) : true;
  };

  const searchByLevel = async (techniqueId: TechniqueId): Promise<void> => {
    const name = techniqueName(techniqueId);
    const techniqueLevel = levelOf(techniqueId);
    if (techniqueLevel === null) {
      onProgress(`No level for ${name}, skipping...`);
      return;
    }

    for (const level of levelsToSearchForTechnique(techniqueLevel)) {
      if (abort.shouldAbort() || reached(techniqueId)) break;
      onProgress(`Fetching level ${level} boards for ${name}...`);
      try {
        const response = await api.getBoards(
          token.current,
          boardsAtLevelQuery(level, BOARDS_PER_LEVEL_LIMIT)
        );
        const boards = response.success ? (response.data ?? []) : [];
        if (boards.length === 0) continue;

        onProgress(
          `Found ${boards.length} level ${level} boards, searching for ${name}...`
        );
        for (const board of boards) {
          if (abort.shouldAbort() || reached(techniqueId)) break;
          if (!(await processLevelBoard(board, techniqueId))) {
            abort.abort();
            return;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch level ${level} boards:`, err);
      }
    }
  };

  const searchByBit = async (techniqueId: TechniqueId): Promise<void> => {
    const name = techniqueName(techniqueId);
    onProgress(
      `Fetching boards for ${name} (level ${levelOf(techniqueId) ?? 'any'})...`
    );
    const boards = await fetchBoardsWithTechnique(
      api,
      token.current,
      techniqueId,
      BOARDS_WITH_TECHNIQUE_LIMIT
    );
    if (boards.length === 0) {
      onProgress(`No boards with ${name} bit set, searching by level...`);
      await searchByLevel(techniqueId);
      return;
    }
    for (const board of boards) {
      if (abort.shouldAbort() || reached(techniqueId)) break;
      if (!(await processBitBoard(board, techniqueId))) {
        abort.abort();
        return;
      }
    }
  };

  if (request.mode === 'all') {
    for (const id of request.techniqueOrder ?? ADMIN_TECHNIQUE_ORDER) {
      if (abort.shouldAbort()) break;
      if (reached(id)) continue;
      await searchByBit(id);
    }
  } else if (!abort.shouldAbort()) {
    if (request.mode === 'bit') {
      await searchByBit(request.techniqueId);
    } else {
      onProgress(
        `Searching by level for ${techniqueName(request.techniqueId)} (level ${levelOf(request.techniqueId) ?? 'any'})...`
      );
      await searchByLevel(request.techniqueId);
    }
  }

  if (!abort.shouldAbort()) onProgress('Done!');
  return counts;
}
