/**
 * Status line for the admin "Regenerate hints" action (web AdminPage).
 */

import type {
  BaseResponse,
  PracticesRegenerateHintsData,
} from '@sudobility/sudojo_types';

/**
 * Describe a regenerate-hints result, e.g.
 * `Done: Examples: 10/12, Practices: 5/5 (15/17 total), 2 failed (examples/technique 4: 2).`
 * Failures are grouped by table and technique.
 */
export function describeRegenerateHintsResult(
  data: PracticesRegenerateHintsData
): string {
  const { examples, practices, updated, failed, total, failures } = data;
  const parts: string[] = [];
  if (examples) parts.push(`Examples: ${examples.updated}/${examples.total}`);
  if (practices) {
    parts.push(`Practices: ${practices.updated}/${practices.total}`);
  }
  let msg =
    parts.length > 0
      ? `Done: ${parts.join(', ')} (${updated}/${total} total)`
      : `Done: ${updated}/${total} updated`;
  if (failed > 0) {
    msg += `, ${failed} failed`;
    const byTableTechnique = new Map<string, number>();
    for (const f of failures ?? []) {
      const key = `${f.table ?? 'unknown'}/technique ${f.technique ?? 0}`;
      byTableTechnique.set(key, (byTableTechnique.get(key) ?? 0) + 1);
    }
    const details = Array.from(byTableTechnique.entries())
      .map(([k, c]) => `${k}: ${c}`)
      .join(', ');
    msg += ` (${details})`;
  }
  return `${msg}.`;
}

/**
 * Describe a regenerate-hints response: the result line on success,
 * otherwise `Error: Failed to regenerate hints`.
 */
export function describeRegenerateHintsResponse(
  response: BaseResponse<PracticesRegenerateHintsData>
): string {
  return response.success && response.data
    ? describeRegenerateHintsResult(response.data)
    : 'Error: Failed to regenerate hints';
}
