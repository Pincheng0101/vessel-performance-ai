class InputOutput {
  constructor({
    inputPath,
    outputPath,
  } = {}) {
    // Set to null if empty string is provided, as it is an invalid value
    this.inputPath = inputPath || null;
    this.outputPath = outputPath || null;
  }
}

export default InputOutput;
