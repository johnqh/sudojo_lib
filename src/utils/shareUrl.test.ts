/**
 * Tests for share URL utilities
 */

import { describe, expect, it } from 'vitest';
import { buildShareUrl, getWebUrl, parseShareParams } from './shareUrl';

const D = 'https://sudojo.com';
const PUZZLE = '1'.repeat(81);
const USER = `${'0'.repeat(80)}5`;

describe('buildShareUrl', () => {
  it('builds page URLs', () => {
    expect(buildShareUrl({ type: 'daily' })).toBe(`${D}/play/daily`);
    expect(buildShareUrl({ type: 'levels' })).toBe(`${D}/play`);
    expect(buildShareUrl({ type: 'play', level: 4 })).toBe(`${D}/play/4`);
    expect(buildShareUrl({ type: 'play' })).toBe(`${D}/play`);
    expect(
      buildShareUrl({ type: 'enter', domain: 'http://localhost:5173' })
    ).toBe('http://localhost:5173/play/enter');
    expect(buildShareUrl({ type: 'techniques' })).toBe(`${D}/techniques`);
  });

  it('builds technique URLs with the canonical slug and hint step', () => {
    expect(buildShareUrl({ type: 'technique', path: '3d-medusa' })).toBe(
      `${D}/techniques/medusa-coloring`
    );
    expect(buildShareUrl({ type: 'technique', path: 'x-wing', hint: 2 })).toBe(
      `${D}/techniques/x-wing?hint=2`
    );
    expect(buildShareUrl({ type: 'technique' })).toBe(`${D}/techniques`);
  });

  it('builds puzzle URLs with raw pencilmarks', () => {
    const url = buildShareUrl({
      type: 'puzzle',
      original: PUZZLE,
      user: USER,
      pencilmarks: '12,,3',
      autopencilmarks: true,
      level: 3,
      hint: 1,
    });
    expect(url).toBe(
      `${D}/play/puzzle?level=3&original=${PUZZLE}&user=${USER}&autopencilmarks=true&pencilmarks=12,,3&hint=1`
    );
  });
});

describe('parseShareParams', () => {
  it('round-trips a puzzle URL', () => {
    const url = buildShareUrl({
      type: 'puzzle',
      original: PUZZLE,
      user: USER,
      pencilmarks: '12,,3',
      autopencilmarks: true,
      level: 3,
      hint: 1,
    });
    expect(parseShareParams(new URL(url).searchParams)).toEqual({
      original: PUZZLE,
      user: USER,
      pencilmarks: '12,,3',
      autopencilmarks: true,
      level: 3,
      hint: 1,
    });
  });

  it('accepts plain route params (RN)', () => {
    expect(
      parseShareParams({
        original: PUZZLE,
        user: USER,
        autopencilmarks: 'false',
        pencilmarks: '',
        level: undefined,
        hint: '0',
      })
    ).toEqual({
      original: PUZZLE,
      user: USER,
      pencilmarks: '',
      autopencilmarks: false,
      hint: 0,
    });
  });

  it('requires original, and defaults a missing user to an empty board', () => {
    expect(parseShareParams(new URLSearchParams('user=1'))).toBeNull();
    expect(
      parseShareParams(new URLSearchParams(`original=${PUZZLE}`))?.user
    ).toBe('0'.repeat(81));
  });

  it('drops invalid level and hint values', () => {
    const parsed = parseShareParams(
      new URLSearchParams(`original=${PUZZLE}&level=13&hint=-1`)
    );
    expect(parsed?.level).toBeUndefined();
    expect(parsed?.hint).toBeUndefined();
    const junk = parseShareParams(
      new URLSearchParams(`original=${PUZZLE}&level=abc&hint=1.5`)
    );
    expect(junk?.level).toBeUndefined();
    expect(junk?.hint).toBeUndefined();
  });
});

describe('getWebUrl', () => {
  it('strips the api subdomain and keeps localhost', () => {
    expect(getWebUrl('https://api.sudojo.com')).toBe('https://sudojo.com');
    expect(getWebUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(getWebUrl('not a url')).toBe(D);
  });

  it('keeps a port', () => {
    expect(getWebUrl('https://api.sudojo.com:8443')).toBe(
      'https://sudojo.com:8443'
    );
  });

  it("works with React Native's URL, which has no setters", () => {
    // RN's URL ignores `url.hostname = …`; the api subdomain must still go.
    const NativeURL = globalThis.URL;
    class SetterlessURL extends NativeURL {
      override get hostname() {
        return super.hostname;
      }
      override set hostname(_value: string) {
        // ignored, as in React Native
      }
    }
    globalThis.URL = SetterlessURL as typeof URL;
    try {
      expect(getWebUrl('https://api.sudojo.com')).toBe('https://sudojo.com');
    } finally {
      globalThis.URL = NativeURL;
    }
  });
});
