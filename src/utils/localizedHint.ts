import type { LocalizedHint, SolverHintStep } from '@sudobility/sudojo_types';

/**
 * A translation function that takes a key and interpolation values.
 * Compatible with i18next's `t` function.
 */
export type TranslateFunction = (
  key: string,
  values?: Record<string, string>
) => string;

/**
 * Convert localization values array to i18next interpolation object.
 * values: ["3", "R1C5"] → { value1: "3", value2: "R1C5" }
 */
function valuesToInterpolation(values: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  values.forEach((value, index) => {
    result[`value${index + 1}`] = value;
  });
  return result;
}

/**
 * Resolve a LocalizedHint to translated text, falling back to the raw value.
 */
function resolveLocalization(
  t: TranslateFunction,
  loc: LocalizedHint | undefined,
  fallback: string,
  keyPrefix: string = ''
): string {
  if (!loc?.stringKey) return fallback;

  const interpolation = valuesToInterpolation(loc.values);
  const fullKey = keyPrefix + loc.stringKey;
  const translated = t(fullKey, interpolation);

  // If translation returns the key itself (missing translation), use fallback
  if (translated === fullKey) return fallback;
  return translated;
}

/**
 * Extract the text LocalizedHint from a hint step's localization field.
 * Handles both the new structured format { text?: LocalizedHint }
 * and the old flat format (LocalizedHint directly) for backward compatibility.
 */
function getTextLocalization(step: SolverHintStep): LocalizedHint | undefined {
  const loc = step.localization as
    | { text?: LocalizedHint; title?: LocalizedHint }
    | (LocalizedHint & { text?: never })
    | undefined;

  if (!loc) return undefined;

  // New structured format: { text: { stringKey, values } }
  if (loc.text?.stringKey) return loc.text;

  // Old flat format: { stringKey, values } directly
  if ('stringKey' in loc && (loc as LocalizedHint).stringKey) {
    return loc as unknown as LocalizedHint;
  }

  return undefined;
}

/**
 * Get localized text for a hint step using a provided translation function.
 * Returns the translated text with interpolated values,
 * or falls back to step.text if localization is unavailable.
 *
 * Handles both new structured format { text?: LocalizedHint, title?: LocalizedHint }
 * and old flat format (LocalizedHint directly) for backward compatibility.
 *
 * @param t - Translation function (e.g. from `useTranslation('hints')`)
 * @param step - The hint step containing localization data
 * @param keyPrefix - Optional prefix to prepend to the string key (e.g. 'hints.')
 */
export function getLocalizedHintText(
  t: TranslateFunction,
  step: SolverHintStep,
  keyPrefix: string = ''
): string {
  const textLoc = getTextLocalization(step);
  return resolveLocalization(t, textLoc, step.text, keyPrefix);
}

/**
 * Get localized title for a hint step (technique name).
 * Returns the translated title or falls back to step.title.
 *
 * @param t - Translation function (e.g. from `useTranslation()` for common namespace)
 * @param step - The hint step containing localization data
 * @param keyPrefix - Optional prefix to prepend to the string key
 */
/**
 * Resolve a localized field value using the API-provided string key.
 * Falls back to the raw value if translation is missing.
 *
 * @param t - Translation function (e.g. from `useTranslation()`)
 * @param loc - LocalizedHint from API response (stringKey + values)
 * @param fallback - Raw value from API to use if translation is missing
 */
export function localizedField(
  t: TranslateFunction,
  loc: LocalizedHint | undefined,
  fallback: string | null | undefined
): string {
  return resolveLocalization(t, loc, fallback ?? '');
}

export function getLocalizedHintTitle(
  t: TranslateFunction,
  step: SolverHintStep,
  keyPrefix: string = ''
): string {
  const loc = step.localization as { title?: LocalizedHint } | undefined;
  return resolveLocalization(t, loc?.title, step.title, keyPrefix);
}

// =============================================================================
// Per-step hint headings
// =============================================================================

const HINT_STEP_KEY_PREFIX = 'hints.';

/**
 * Top-level tree in the apps' `hints.json` that mirrors `hints`, with one
 * heading per step: `hints.hiddenSingle.row.scan` → `headings.hiddenSingle.row.scan`.
 */
export const HINT_HEADING_KEY_PREFIX = 'headings.';

/**
 * Heading lookup for ONE hint step.
 *
 * Every step key the solver emits (`hints.hiddenSingle.row.scan`) has a heading
 * at the same path under the `headings` tree (`headings.hiddenSingle.row.scan`),
 * interpolated with that step's own values, so `{{valueN}}` means the same in
 * the heading as in the body. Injected `hints.conflict.*` steps get headings too.
 *
 * Accepts the legacy flat localization shape. Returns undefined when the step
 * carries no `hints.*` localization; callers then render no heading.
 */
export function getStepHeadingLocalization(
  step: SolverHintStep | null | undefined
): LocalizedHint | undefined {
  if (!step) return undefined;
  const loc = getTextLocalization(step);
  if (!loc?.stringKey.startsWith(HINT_STEP_KEY_PREFIX)) return undefined;
  return {
    stringKey:
      HINT_HEADING_KEY_PREFIX +
      loc.stringKey.slice(HINT_STEP_KEY_PREFIX.length),
    values: loc.values ?? [],
  };
}

/**
 * Translated heading for one hint step, or '' when it has none (no `hints.*`
 * key, or the heading is missing), so the UI renders nothing instead of a raw key.
 *
 * @param t - Translation function for the `hints` namespace
 */
export function getLocalizedHintHeading(
  t: TranslateFunction,
  step: SolverHintStep | null | undefined
): string {
  const loc = getStepHeadingLocalization(step);
  return loc ? localizedField(t, loc, '') : '';
}

/** A nested heading tree, e.g. the `headings` object of `hints.json`. */
export interface HintHeadingTree {
  [key: string]: string | HintHeadingTree;
}

/**
 * Fill `{{valueN}}` placeholders from a values array (values[0] → `{{value1}}`).
 * Missing values become ''.
 */
export function interpolateHintValues(
  template: string,
  values: readonly string[]
): string {
  return template.replace(
    /\{\{\s*value(\d+)\s*\}\}/g,
    (_match, n: string) => values[Number(n) - 1] ?? ''
  );
}

/**
 * Heading for one hint step looked up directly in a heading tree, without an
 * i18n library (the Chrome extension bundles the English tree as JSON).
 *
 * The step's `hints.<path>` key maps to `<path>` in the tree and the template
 * is interpolated with the step's values. Returns '' when there is no heading.
 */
export function getStepHeadingFromTree(
  tree: HintHeadingTree,
  step: SolverHintStep | null | undefined
): string {
  const loc = getStepHeadingLocalization(step);
  if (!loc) return '';
  let node: string | HintHeadingTree | undefined = tree;
  for (const segment of loc.stringKey
    .slice(HINT_HEADING_KEY_PREFIX.length)
    .split('.')) {
    if (!node || typeof node === 'string') return '';
    node = Object.prototype.hasOwnProperty.call(node, segment)
      ? node[segment]
      : undefined;
  }
  return typeof node === 'string'
    ? interpolateHintValues(node, loc.values)
    : '';
}

/** Localized text, title and heading resolvers for hint steps. */
export interface LocalizedHintHelpers {
  /** Localized body text (falls back to `step.text`). */
  getLocalizedText: (step: SolverHintStep) => string;
  /** Localized technique title (falls back to `step.title`). */
  getLocalizedTitle: (step: SolverHintStep) => string;
  /** Localized per-step heading, or ''. */
  getLocalizedHeading: (step: SolverHintStep | null | undefined) => string;
}

/**
 * Build the hint text/title/heading resolvers the apps' `useLocalizedHint`
 * hooks return. The hooks stay in the apps because they read react-i18next;
 * they should wrap this.
 *
 * @param tHints - Translate function for the `hints` namespace (text + headings)
 * @param tTitle - Entity translate function for titles
 *   (`techniques.<path>.title`), e.g. from createNamespacedTranslate
 */
export function createLocalizedHintHelpers(
  tHints: TranslateFunction,
  tTitle: TranslateFunction
): LocalizedHintHelpers {
  return {
    getLocalizedText: step => getLocalizedHintText(tHints, step),
    getLocalizedTitle: step => getLocalizedHintTitle(tTitle, step),
    getLocalizedHeading: step => getLocalizedHintHeading(tHints, step),
  };
}
