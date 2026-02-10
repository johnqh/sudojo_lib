import type { TranslateFunction } from './localizedHint';

/** Get i18n key for a belt name. e.g. getBeltKey(1) → "belts.1.name" */
export function getBeltKey(levelIndex: number): string {
  return `belts.${levelIndex}.name`;
}

/** Get localized belt name using translation function */
export function getLocalizedBeltName(
  t: TranslateFunction,
  levelIndex: number,
  fallback?: string
): string {
  return t(getBeltKey(levelIndex), { defaultValue: fallback ?? '' });
}

/** Get i18n key for a belt label. e.g. getBeltLabelKey(1) → "belts.1.label" */
export function getBeltLabelKey(levelIndex: number): string {
  return `belts.${levelIndex}.label`;
}

/** Get localized "X Belt" string */
export function getLocalizedBeltLabel(
  t: TranslateFunction,
  levelIndex: number,
  fallback?: string
): string {
  return t(getBeltLabelKey(levelIndex), { defaultValue: fallback ?? '' });
}

/** Get i18n key for a level title. e.g. getLevelKey(3) → "levels.3" */
export function getLevelKey(levelNumber: number): string {
  return `levels.${levelNumber}`;
}

/** Get localized level title */
export function getLocalizedLevelTitle(
  t: TranslateFunction,
  levelNumber: number,
  fallback?: string
): string {
  return t(getLevelKey(levelNumber), { defaultValue: fallback ?? '' });
}

/**
 * Get i18n key for a technique name by path slug.
 * e.g. getTechniqueKey("full-house") → "techniques.full-house.title"
 */
export function getTechniqueKey(path: string): string {
  return `techniques.${path}.title`;
}

/** Get localized technique name */
export function getLocalizedTechniqueName(
  t: TranslateFunction,
  path: string,
  fallback?: string
): string {
  return t(getTechniqueKey(path), { defaultValue: fallback ?? '' });
}
