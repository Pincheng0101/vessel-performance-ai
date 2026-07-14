class CodeRuntime {
  constructor({
    runtimeType,
    data,
    code,
  } = {}) {
    this.runtimeType = runtimeType;
    this.data = data;
    this.code = code;
  }

  static toRequestPayload(runtime) {
    if (!runtime) return null;

    return {
      runtime_type: runtime.runtimeType,
      data: runtime.data,
      code: runtime.code,
    };
  }

  static createFromAsl(asl) {
    if (!asl) return null;
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new CodeRuntime({
      runtimeType: normalized.runtime_type,
      data: normalized.data,
      code: normalized.code,
    });
  }
}

export default CodeRuntime;
