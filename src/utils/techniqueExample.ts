/**
 * Technique example walkthrough: turn a stored example/practice (board,
 * pencilmarks, solution, hint_data) into the cards the technique screens
 * render (web and RN TechniqueExample).
 */

import type { WalkthroughStep } from './techniqueWalkthrough';
import {
  buildWalkthroughSteps,
  parseHintData,
  parsePracticeBoard,
} from './techniqueWalkthrough';
import { createNamespacedTranslate } from './entityTranslate';
import {
  getLocalizedHintTitle,
  getStepHeadingLocalization,
  localizedField,
  type TranslateFunction,
} from './localizedHint';

/** The stored puzzle a walkthrough is built from (example or practice). */
export interface TechniqueExampleSource {
  board: string;
  pencilmarks: string | null;
  solution: string;
  hint_data: string | null;
}

/** Translation functions a walkthrough needs (i18next `t`s). */
export interface TechniqueWalkthroughTranslations {
  /** The 'hints' namespace */
  tHints: TranslateFunction;
  /** The 'techniques' namespace */
  tTechniques: TranslateFunction;
  /** The default namespace */
  tCommon: TranslateFunction;
}

/** A built walkthrough: one card per step, each with its heading. */
export interface TechniqueWalkthrough {
  /** Cards: starting board, one per solver step, final result */
  steps: WalkthroughStep[];
  /**
   * Heading per card ('' = none): 'Starting position' for the first card,
   * 'Result' for the last, the step's `headings.<path>` otherwise.
   */
  stepHeadings: string[];
}

/**
 * Build the walkthrough cards and headings for a stored example.
 *
 * The "Look for {technique}" name comes from the technique's own title when a
 * path is given (falling back to the first step's title), else the first
 * step's localized title (RN's rule; the web used the raw title there).
 */
export function buildTechniqueWalkthrough(
  source: TechniqueExampleSource | null | undefined,
  translations: TechniqueWalkthroughTranslations,
  techniquePath?: string
): TechniqueWalkthrough {
  if (!source) return { steps: [], stepHeadings: [] };
  const { tHints, tTechniques, tCommon } = translations;
  // localizeHintStep asks tCommon for 'techniques.<path>.title'; route that
  // prefix to the techniques namespace, as the apps' tMerged did.
  const tMerged = createNamespacedTranslate(tCommon, {
    techniques: tTechniques,
  });

  const initialBoard = parsePracticeBoard(
    source.board,
    source.pencilmarks,
    source.solution
  );
  const hintData = parseHintData(source.hint_data);
  const firstStep = hintData?.steps?.[0];

  const techniqueName = techniquePath
    ? tTechniques(`${techniquePath}.title`, {
        defaultValue: firstStep?.title || 'technique',
      })
    : firstStep
      ? getLocalizedHintTitle(tMerged, firstStep)
      : tTechniques('technique', { defaultValue: 'technique' });
  const lookForText = tTechniques('lookFor', { technique: techniqueName });
  const resultText = tTechniques('resultAfterApplying', {
    defaultValue: 'Result after applying the technique.',
  });

  const steps = buildWalkthroughSteps(
    initialBoard,
    hintData,
    lookForText,
    resultText,
    tHints,
    tMerged,
    techniquePath
  );

  const last = steps.length - 1;
  const stepHeadings = steps.map((step, index) => {
    if (index === 0) {
      return tTechniques('walkthroughStartHeading', {
        defaultValue: 'Starting position',
      });
    }
    if (index === last) {
      return tTechniques('walkthroughResultHeading', {
        defaultValue: 'Result',
      });
    }
    const loc = getStepHeadingLocalization(step.hint);
    return loc ? localizedField(tHints, loc, '') : '';
  });

  return { steps, stepHeadings };
}
