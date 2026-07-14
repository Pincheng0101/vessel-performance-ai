class Feature {
  constructor({
    enabled,
    featureName,
  } = {}) {
    this.enabled = enabled;
    this.featureName = featureName;
  }

  get name() {
    return this.featureName;
  }
}

export default Feature;
