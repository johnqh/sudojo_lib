import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import type { NetworkClient } from '@sudobility/types';
import { resolveSudojoApi, useSudojoApi } from './SudojoApiContext';
import { SudojoApiProvider } from './SudojoApiProvider';

const a = { id: 'a' } as unknown as NetworkClient;
const b = { id: 'b' } as unknown as NetworkClient;

describe('resolveSudojoApi', () => {
  it('prefers explicit options over the context', () => {
    expect(
      resolveSudojoApi(
        { networkClient: a, baseUrl: 'x', token: 't' },
        { networkClient: b, baseUrl: 'y', token: 'u' }
      )
    ).toEqual({ networkClient: a, baseUrl: 'x', token: 't' });
  });

  it('falls back to the context, field by field', () => {
    expect(
      resolveSudojoApi(
        { baseUrl: 'x' },
        { networkClient: b, baseUrl: 'y', token: 'u' }
      )
    ).toEqual({ networkClient: b, baseUrl: 'x', token: 'u' });
  });

  it('keeps an explicit null token and defaults to empty', () => {
    expect(
      resolveSudojoApi(
        { token: null },
        { networkClient: b, baseUrl: 'y', token: 'u' }
      ).token
    ).toBe('');
    expect(
      resolveSudojoApi({ networkClient: a, baseUrl: 'x' }, null).token
    ).toBe('');
  });

  it('throws without a network client or base URL', () => {
    expect(() => resolveSudojoApi({}, null, 'useX')).toThrow(/useX/);
    expect(() => resolveSudojoApi({ networkClient: a }, null)).toThrow(
      /SudojoApiProvider/
    );
  });
});

describe('useSudojoApi', () => {
  it('reads the provider and throws without one', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SudojoApiProvider,
        { networkClient: a, baseUrl: 'x', token: null },
        children
      );
    const { result } = renderHook(() => useSudojoApi(), { wrapper });
    expect(result.current).toEqual({
      networkClient: a,
      baseUrl: 'x',
      token: null,
    });
    expect(() => renderHook(() => useSudojoApi())).toThrow(/SudojoApiProvider/);
  });
});
