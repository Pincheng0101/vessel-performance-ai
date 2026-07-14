/**
 * Decide whether a failed request is worth retrying.
 *
 * Only transient failures are retryable: network errors (no HTTP status) and
 * server errors (5xx). Deterministic client errors (4xx, e.g. 400 / 403 / 422)
 * will fail again on retry, so they should surface immediately.
 *
 * @param {{ statusCode?: number }} [error] - The H3Error returned by useServer.
 * @returns {boolean}
 */
export default function isRetryableFetchError(error) {
  return !error?.statusCode || error.statusCode >= 500;
}
