import { describe, expect, test } from 'vitest';
import isRetryableFetchError from './isRetryableFetchError';

describe('isRetryableFetchError', () => {
  test('retries server errors (5xx)', () => {
    expect(isRetryableFetchError({ statusCode: 500 })).toBe(true);
    expect(isRetryableFetchError({ statusCode: 503 })).toBe(true);
  });

  test('does not retry client errors (4xx)', () => {
    expect(isRetryableFetchError({ statusCode: 400 })).toBe(false);
    expect(isRetryableFetchError({ statusCode: 403 })).toBe(false);
    expect(isRetryableFetchError({ statusCode: 422 })).toBe(false);
  });

  test('retries network errors that carry no status code', () => {
    expect(isRetryableFetchError({})).toBe(true);
    expect(isRetryableFetchError(null)).toBe(true);
    expect(isRetryableFetchError(undefined)).toBe(true);
  });
});
