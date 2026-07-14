import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import waitFor from './waitFor';

describe('waitFor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('resolves immediately when the predicate is already true', async () => {
    await expect(waitFor(() => true)).resolves.toBeUndefined();
  });

  test('resolves after the predicate becomes true on a later tick', async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 120);
    const promise = waitFor(() => ready, { interval: 50 });
    await vi.advanceTimersByTimeAsync(200);
    await expect(promise).resolves.toBeUndefined();
  });

  test('rejects with "waitFor timeout" when the predicate never becomes true', async () => {
    const promise = waitFor(() => false, { interval: 10, timeout: 50 });
    const assertion = expect(promise).rejects.toThrow(/waitFor timeout/);
    await vi.advanceTimersByTimeAsync(60);
    await assertion;
  });

  test('rejects with the predicate error when it throws', async () => {
    const error = new Error('boom');
    const throwingPredicate = () => {
      throw error;
    };
    await expect(waitFor(throwingPredicate)).rejects.toBe(error);
  });
});
