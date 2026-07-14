import { InputOutput } from '~/models/workflow/state';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class ParallelInputOutput extends InputOutput {
  constructor({
    inputPath,
    outputPath,
    parameters,
    resultPath,
    resultSelector,
  } = {}) {
    super({
      inputPath,
      outputPath,
    });
    // Set to null if empty string is provided, as it is an invalid value
    this.parameters = parameters || null;
    this.resultPath = resultPath || null;
    this.resultSelector = resultSelector || null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldStateInputPath'), value: this.inputPath, isCopyable: true },
      { title: $i18n.t('__fieldStateParameter', 2), value: this.parameters, isJsonCode: true },
      { title: $i18n.t('__fieldStateResultSelector'), value: this.resultSelector, isJsonCode: true },
      { title: $i18n.t('__fieldStateResultPath'), value: this.resultPath, isCopyable: true },
      { title: $i18n.t('__fieldStateOutputPath'), value: this.outputPath, isCopyable: true },
    ];
  }
}

export default ParallelInputOutput;
