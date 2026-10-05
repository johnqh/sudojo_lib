/**
 * Imperative network surface for the admin jobs, built only from
 * `@sudobility/sudojo_client` hooks (never a hand-made SudojoClient).
 *
 * - Writes, /solve, /validate, /generate and the boards list use mutation
 *   hooks' `mutateAsync` (per-call arguments).
 * - Fixed-key reads (levels, techniques) use a disabled query hook's
 *   `refetch()`, which fetches regardless of `enabled`/`staleTime`.
 *
 * The jobs depend on the {@link AdminApi} interface, not on the hooks, so
 * they can be driven by a fake in tests.
 */

import {
  useSolverGenerateMutation,
  useSolverSolveMutation,
  useSolverValidateMutation,
  useSudojoCreateBoard,
  useSudojoCreateExample,
  useSudojoCreatePractice,
  useSudojoFetchBoards,
  useSudojoLevels,
  useSudojoTechniques,
  useSudojoUpdateBoard,
} from '@sudobility/sudojo_client';
import type {
  BaseResponse,
  Board,
  BoardCreateRequest,
  BoardQueryParams,
  BoardUpdateRequest,
  GenerateData,
  GenerateOptions,
  Level,
  SolveData,
  SolveOptions,
  Technique,
  TechniqueExample,
  TechniqueExampleCreateRequest,
  TechniquePractice,
  TechniquePracticeCreateRequest,
  ValidateData,
  ValidateOptions,
} from '@sudobility/sudojo_types';
import type { NetworkClient } from '@sudobility/types';
import { useMemo, useRef } from 'react';

/** Network calls the admin jobs make. `token` is the admin ID token. */
export interface AdminApi {
  solve(token: string, options: SolveOptions): Promise<BaseResponse<SolveData>>;
  validate(
    token: string,
    options: ValidateOptions
  ): Promise<BaseResponse<ValidateData>>;
  generate(
    token: string,
    options: GenerateOptions
  ): Promise<BaseResponse<GenerateData>>;
  getBoards(
    token: string,
    queryParams: BoardQueryParams
  ): Promise<BaseResponse<Board[]>>;
  getLevels(): Promise<BaseResponse<Level[]>>;
  getTechniques(): Promise<BaseResponse<Technique[]>>;
  createBoard(
    token: string,
    data: BoardCreateRequest
  ): Promise<BaseResponse<Board>>;
  updateBoard(
    token: string,
    uuid: string,
    data: BoardUpdateRequest
  ): Promise<BaseResponse<Board>>;
  createExample(
    token: string,
    data: TechniqueExampleCreateRequest
  ): Promise<BaseResponse<TechniqueExample>>;
  createPractice(
    token: string,
    data: TechniquePracticeCreateRequest
  ): Promise<BaseResponse<TechniquePractice>>;
}

async function dataOrThrow<T>(
  refetch: () => Promise<{ data?: T | undefined; error?: Error | null }>
): Promise<T> {
  const result = await refetch();
  if (result.error) throw result.error;
  if (result.data === undefined) throw new Error('No response');
  return result.data;
}

/**
 * Build an {@link AdminApi} from sudojo_client hooks. The returned object is
 * stable for the component's lifetime and always calls the latest hook
 * results, so a long-running job can hold on to it.
 */
export function useAdminApi(
  networkClient: NetworkClient,
  baseUrl: string
): AdminApi {
  const hooks = {
    solve: useSolverSolveMutation(networkClient, baseUrl),
    validate: useSolverValidateMutation(networkClient, baseUrl),
    generate: useSolverGenerateMutation(networkClient, baseUrl),
    fetchBoards: useSudojoFetchBoards(networkClient, baseUrl),
    createBoard: useSudojoCreateBoard(networkClient, baseUrl),
    updateBoard: useSudojoUpdateBoard(networkClient, baseUrl),
    createExample: useSudojoCreateExample(networkClient, baseUrl),
    createPractice: useSudojoCreatePractice(networkClient, baseUrl),
    // Public GETs: no token needed. Disabled; read with refetch().
    levels: useSudojoLevels(networkClient, baseUrl, '', { enabled: false }),
    techniques: useSudojoTechniques(networkClient, baseUrl, '', undefined, {
      enabled: false,
    }),
  };
  const latest = useRef(hooks);
  latest.current = hooks;

  return useMemo<AdminApi>(
    () => ({
      solve: (token, options) =>
        latest.current.solve.mutateAsync({ token, options }),
      validate: (token, options) =>
        latest.current.validate.mutateAsync({ token, options }),
      generate: (token, options) =>
        latest.current.generate.mutateAsync({ token, options }),
      getBoards: (token, queryParams) =>
        latest.current.fetchBoards.mutateAsync({ token, queryParams }),
      getLevels: () => dataOrThrow(() => latest.current.levels.refetch()),
      getTechniques: () =>
        dataOrThrow(() => latest.current.techniques.refetch()),
      createBoard: (token, data) =>
        latest.current.createBoard.mutateAsync({ token, data }),
      updateBoard: (token, uuid, data) =>
        latest.current.updateBoard.mutateAsync({ token, uuid, data }),
      createExample: (token, data) =>
        latest.current.createExample.mutateAsync({ token, data }),
      createPractice: (token, data) =>
        latest.current.createPractice.mutateAsync({ token, data }),
    }),
    []
  );
}
