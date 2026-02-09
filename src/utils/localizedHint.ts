import type { SolverHintStep } from '@sudobility/sudojo_types';

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
 * Get localized text for a hint step using a provided translation function.
 * Returns the translated text with interpolated values,
 * or falls back to step.text if localization is unavailable.
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
  if (!step.localization?.stringKey) {
    return step.text;
  }

  const { stringKey, values } = step.localization;
  const interpolation = valuesToInterpolation(values);
  const fullKey = keyPrefix + stringKey;

  const translated = t(fullKey, interpolation);

  // If translation returns the key itself (missing translation), use fallback
  if (translated === fullKey) {
    return step.text;
  }

  return translated;
}
