import { InputOutput } from '~/models/workflow/state';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class PassInputOutput extends InputOutput {
  constructor({
    inputPath,
    outputPath,
    parameters,
    result,
    resultPath,
  } = {}) {
    super({
      inputPath,
      outputPath,
    });
    // Set to null if empty string is provided, as it is an invalid value
    this.parameters = parameters || null;
    this.result = result || null;
    this.resultPath = resultPath || null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldStateInputPath'), value: this.inputPath, isCopyable: true },
      { title: $i18n.t('__fieldStateParameter', 2), value: this.parameters, isJsonCode: true },
      { title: $i18n.t('__fieldStateResult'), value: this.result, isJsonCode: true },
      { title: $i18n.t('__fieldStateResultPath'), value: this.resultPath, isCopyable: true },
      { title: $i18n.t('__fieldStateOutputPath'), value: this.outputPath, isCopyable: true },
    ];
  }
}

export default PassInputOutput;
