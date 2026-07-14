class ValidateAgentToolsResult {
  constructor({
    error,
    ok,
  } = {}) {
    this.error = error ?? null;
    this.ok = ok ?? false;
  }
}

class ValidateAgentToolsResponse {
  constructor({
    results,
  } = {}) {
    this.results = Object.fromEntries(
      Object.entries(results || {}).map(([key, val]) => [key, new ValidateAgentToolsResult(val)]),
    );
  }
}

export { ValidateAgentToolsResult };
export default ValidateAgentToolsResponse;
