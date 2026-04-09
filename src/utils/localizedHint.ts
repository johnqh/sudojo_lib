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
export function getLocalizedHintTitle(
  t: TranslateFunction,
  step: SolverHintStep,
  keyPrefix: string = ''
): string {
  const loc = step.localization as { title?: LocalizedHint } | undefined;
  return resolveLocalization(t, loc?.title, step.title, keyPrefix);
}
