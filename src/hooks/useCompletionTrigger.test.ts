import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCompletionTrigger } from './useCompletionTrigger';

describe('useCompletionTrigger', () => {
  it('fires once per false -> true transition and re-arms on false', () => {
    const onComplete = vi.fn();
    const { rerender } = renderHook(
      ({ done }: { done: boolean }) => useCompletionTrigger(done, onComplete),
      { initialProps: { done: false } }
    );
    expect(onComplete).not.toHaveBeenCalled();

    rerender({ done: true });
    rerender({ done: true });
    expect(onComplete).toHaveBeenCalledTimes(1);

    rerender({ done: false });
    rerender({ done: true });
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('fires on mount when already completed and uses the latest callback', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ done, cb }: { done: boolean; cb: () => void }) =>
        useCompletionTrigger(done, cb),
      { initialProps: { done: true, cb: first } }
    );
    expect(first).toHaveBeenCalledTimes(1);
    rerender({ done: false, cb: second });
    rerender({ done: true, cb: second });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
});
