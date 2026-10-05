/**
 * Translation of API entities (levels, techniques, badges) in the apps.
 *
 * Two key schemes are in use, and this file documents both:
 *
 * 1. **API localization keys** (`level.localization.title.stringKey`): dotted
 *    paths whose first segment names the entity family, e.g. `levels.3.title`,
 *    `techniques.full-house.title`, `badges.level_1.title`. Resolve them with
 *    `localizedField(tEntity, ...)` where `tEntity` comes from
 *    {@link createNamespacedTranslate}.
 * 2. **Namespace keys** the apps look up directly in an i18next namespace:
 *    `${level}.title` / `${level}.text` in `levels`, `${path}.title` in
 *    `techniques`, `${level}.name` / `${level}.label` in `belts`.
 *
 * The older helpers in `i18nKeys.ts` (`getLevelKey` → `levels.N`,
 * `getBeltKey` → `belts.N.name`) build keys for a single merged namespace and
 * keep that behavior; the display helpers here match what the apps render.
 */

import type { LocalizedHint } from '@sudobility/sudojo_types';
import { getBeltForLevel } from '@sudobility/sudojo_types';
import { localizedField, type TranslateFunction } from './localizedHint';
import { toCanonicalTechniquePath } from './technique';

/**
 * Route entity keys to the i18next namespace that holds them.
 *
 * Some families live in their own namespace whose file is NOT nested under the
 * family segment (`levels.json` is `{ "3": { "title": ... } }`), so a key like
 * `levels.3.title` only resolves once the prefix is stripped and the lookup is
 * routed to that namespace. Others (`badges.*`) live nested inside the default
 * namespace and resolve as-is.
 *
 * On a miss the returned function defers to `fallback` with the untouched key,
 * so callers such as `localizedField` still get the original key back, detect
 * the miss, and fall back to the raw API value.
 *
 * @example
 * const tEntity = createNamespacedTranslate(tApp, { levels: tLevels, techniques: tTechniques });
 * localizedField(tEntity, level.localization?.title, level.title);
 */
export function createNamespacedTranslate(
  fallback: TranslateFunction,
  routes: Record<string, TranslateFunction>
): TranslateFunction {
  return (key, values) => {
    for (const [prefix, translate] of Object.entries(routes)) {
      const scope = `${prefix}.`;
      if (!key.startsWith(scope)) continue;

      const scopedKey = key.slice(scope.length);
      const translated = translate(scopedKey, values);
      // i18next returns the key itself when the translation is missing.
      if (translated !== scopedKey) return translated;
      break;
    }

    return fallback(key, values);
  };
}

/**
 * Translate `key` with i18next-style `defaultValue`, treating a result equal to
 * the key (a `t` that ignores defaultValue) or '' as a miss.
 */
function translateOr(
  t: TranslateFunction,
  key: string,
  fallback: string
): string {
  const translated = t(key, { defaultValue: fallback });
  return translated && translated !== key ? translated : fallback;
}

/** The fields of a Level the display helpers read. */
export interface LevelDisplaySource {
  level: number;
  title?: string | null;
  text?: string | null;
  localization?: { title?: LocalizedHint; text?: LocalizedHint };
}

/** The fields of a Technique the display helpers read. */
export interface TechniqueDisplaySource {
  title?: string | null;
  path?: string | null;
  localization?: { title?: LocalizedHint; text?: LocalizedHint };
}

/**
 * Display title for a level, the way both apps build it:
 * `localizedField(tEntity, level.localization?.title, '')`, then
 * `tLevels(`${level}.title`, level.title)`, then the raw title.
 *
 * @param tEntity - Entity translate function (see createNamespacedTranslate)
 * @param tLevels - Optional translate function for the `levels` namespace
 * @returns '' when nothing is available (apps may then show "Level N")
 */
export function getLevelDisplayTitle(
  level: LevelDisplaySource,
  tEntity: TranslateFunction,
  tLevels?: TranslateFunction
): string {
  const raw = level.title ?? '';
  return (
    localizedField(tEntity, level.localization?.title, '') ||
    (tLevels ? translateOr(tLevels, `${level.level}.title`, raw) : '') ||
    raw
  );
}

/**
 * Display description for a level: `localization.text`, then
 * `tLevels(`${level}.text`, level.text)`, then the raw text ('' if none).
 */
export function getLevelDisplayText(
  level: LevelDisplaySource,
  tEntity: TranslateFunction,
  tLevels?: TranslateFunction
): string {
  const raw = level.text ?? '';
  return (
    localizedField(tEntity, level.localization?.text, '') ||
    (tLevels ? translateOr(tLevels, `${level.level}.text`, raw) : '') ||
    raw
  );
}

/**
 * Display title for a technique: `localization.title`, then
 * `tTechniques(`${canonicalPath}.title`, technique.title)`, then the raw title.
 *
 * The namespace key uses the canonical path (`3d-medusa` → `medusa-coloring`),
 * which is how `techniques.json` is keyed.
 *
 * @param tEntity - Entity translate function (see createNamespacedTranslate)
 * @param tTechniques - Optional translate function for the `techniques` namespace
 */
export function getTechniqueDisplayTitle(
  technique: TechniqueDisplaySource,
  tEntity: TranslateFunction,
  tTechniques?: TranslateFunction
): string {
  const raw = technique.title ?? '';
  const path = toCanonicalTechniquePath(technique.path);
  return (
    localizedField(tEntity, technique.localization?.title, '') ||
    (tTechniques && path
      ? translateOr(tTechniques, `${path}.title`, raw)
      : '') ||
    raw
  );
}

/**
 * Display name of the belt for a level (e.g. "Yellow"), as AchievementModal
 * shows it: `tBelts(`${level}.name`, belt.name)` in the `belts` namespace,
 * falling back to the belt's English name ('' for an unknown level).
 *
 * @param tBelts - Optional translate function for the `belts` namespace
 */
export function getBeltDisplayName(
  level: number,
  tBelts?: TranslateFunction
): string {
  const raw = getBeltForLevel(level)?.name ?? '';
  return tBelts ? translateOr(tBelts, `${level}.name`, raw) : raw;
}

/**
 * Display label of the belt for a level (e.g. "Yellow Belt"):
 * `tBelts(`${level}.label`, `${belt.name} Belt`)` in the `belts` namespace,
 * falling back to `"<name> Belt"` ('' for an unknown level).
 *
 * @param tBelts - Optional translate function for the `belts` namespace
 */
export function getBeltDisplayLabel(
  level: number,
  tBelts?: TranslateFunction
): string {
  const name = getBeltForLevel(level)?.name;
  const raw = name ? `${name} Belt` : '';
  return tBelts ? translateOr(tBelts, `${level}.label`, raw) : raw;
}

/**
 * The fields of a Strategy the display helper reads. The API's Strategy has
 * only `stub` today; `title` / `localization` are read when present.
 */
export interface StrategyDisplaySource {
  stub: string;
  title?: string | null;
  localization?: { title?: LocalizedHint };
}

/**
 * Display title for a strategy: `localization.title`, then
 * `tStrategies(`${stub}.title`, title ?? stub)`, then the raw title, then the
 * stub (the apps' `tStrat(`${stub}.title`, stub)`).
 *
 * @param tEntity - Entity translate function (see createNamespacedTranslate)
 * @param tStrategies - Optional translate function for the `strategies` namespace
 */
export function getStrategyDisplayTitle(
  strategy: StrategyDisplaySource,
  tEntity: TranslateFunction,
  tStrategies?: TranslateFunction
): string {
  const raw = strategy.title || strategy.stub;
  return (
    localizedField(tEntity, strategy.localization?.title, '') ||
    (tStrategies
      ? translateOr(tStrategies, `${strategy.stub}.title`, raw)
      : '') ||
    raw
  );
}
