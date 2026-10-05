import { describe, expect, it } from 'vitest';
import {
  adjustPracticeSolution,
  describeTechniqueMask,
  errorMessage,
  formatTechniqueMaskHex,
  hasInvalidPencilmarksStep,
  isPuzzleFilled,
  isPuzzleSolved,
  levelToSave,
  mergeBoardWithUserInput,
  shortUuid,
} from './boardStrings';

const SOLUTION = '1'.repeat(81);
const ORIGINAL = `00${'1'.repeat(79)}`;

describe('isPuzzleFilled', () => {
  it('is false while any cell is empty', () => {
    expect(isPuzzleFilled(ORIGINAL, '0'.repeat(81))).toBe(false);
    expect(isPuzzleFilled(ORIGINAL, `1${'0'.repeat(80)}`)).toBe(false);
  });

  it('is true when user input fills the gaps', () => {
    expect(isPuzzleFilled(ORIGINAL, `11${'0'.repeat(79)}`)).toBe(true);
  });

  it('treats short strings as empty cells', () => {
    expect(isPuzzleFilled('1', '')).toBe(false);
  });
});

describe('isPuzzleSolved', () => {
  it('requires every cell to match the solution', () => {
    expect(isPuzzleSolved(ORIGINAL, `11${'0'.repeat(79)}`, SOLUTION)).toBe(
      true
    );
    expect(isPuzzleSolved(ORIGINAL, `12${'0'.repeat(79)}`, SOLUTION)).toBe(
      false
    );
    expect(isPuzzleSolved(ORIGINAL, '0'.repeat(81), SOLUTION)).toBe(false);
  });
});

describe('hasInvalidPencilmarksStep', () => {
  it('detects the correction step', () => {
    expect(hasInvalidPencilmarksStep([{ title: 'Invalid Pencilmarks' }])).toBe(
      true
    );
    expect(hasInvalidPencilmarksStep([{ title: 'X-Wing' }, {}])).toBe(false);
    expect(hasInvalidPencilmarksStep(undefined)).toBe(false);
    expect(hasInvalidPencilmarksStep(null)).toBe(false);
  });
});

describe('mergeBoardWithUserInput', () => {
  it('takes user digits over givens and keeps givens elsewhere', () => {
    const original = `5${'0'.repeat(79)}9`;
    const user = `03${'0'.repeat(79)}`;
    const merged = mergeBoardWithUserInput(original, user);
    expect(merged).toBe(`53${'0'.repeat(78)}9`);
    expect(merged).toHaveLength(81);
  });

  it('pads short inputs with 0', () => {
    expect(mergeBoardWithUserInput('', '')).toBe('0'.repeat(81));
  });
});

describe('adjustPracticeSolution', () => {
  it('blanks the solution where the board is filled', () => {
    const board = `12${'0'.repeat(79)}`;
    const solution = '9'.repeat(81);
    expect(adjustPracticeSolution(board, solution)).toBe(`00${'9'.repeat(79)}`);
  });
});

describe('mask formatting', () => {
  const mask = (1n << 60n) | 2n;

  it('formats hex exactly above 2^53', () => {
    expect(formatTechniqueMaskHex(mask)).toBe('0x1000000000000002');
  });

  it('describes decimal, binary and hex', () => {
    expect(describeTechniqueMask(mask)).toEqual({
      techniques: '1152921504606846978',
      techniquesBinary: `0b1${'0'.repeat(58)}10`,
      techniquesHex: '0x1000000000000002',
    });
  });
});

describe('small helpers', () => {
  it('levelToSave maps non-positive levels to null', () => {
    expect(levelToSave(3)).toBe(3);
    expect(levelToSave(0)).toBeNull();
    expect(levelToSave(-1)).toBeNull();
  });

  it('shortUuid keeps 8 chars', () => {
    expect(shortUuid('abcdefgh-1234')).toBe('abcdefgh');
  });

  it('errorMessage handles non-Errors', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});
