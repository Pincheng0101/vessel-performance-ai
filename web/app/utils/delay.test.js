import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import delay from './delay';

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('resolves only after the specified delay has elapsed', async () => {
    let resolved = false;
    delay(100).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });

  test('resolves with undefined when the delay is 0', async () => {
    const promise = delay(0);
    await vi.advanceTimersByTimeAsync(0);
    await expect(promise).resolves.toBeUndefined();
  });
});
