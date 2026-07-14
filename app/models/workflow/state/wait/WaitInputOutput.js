import { InputOutput } from '~/models/workflow/state';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class WaitInputOutput extends InputOutput {
  constructor({
    inputPath,
    outputPath,
  } = {}) {
    super({
      inputPath,
      outputPath,
    });
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldStateInputPath'), value: this.inputPath, isCopyable: true },
      { title: $i18n.t('__fieldStateOutputPath'), value: this.outputPath, isCopyable: true },
    ];
  }
}

export default WaitInputOutput;
