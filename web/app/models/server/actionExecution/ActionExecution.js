import { StatusConstant } from '~/constants';
import Runtime from '~/models/server/Runtime';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class ActionExecution extends Runtime {
  constructor({
    actionOutput,
    cause,
    error,
    executionArn,
    startTs,
    status,
    stopTs,
  } = {}) {
    super({
      status,
    });
    this.actionOutput = actionOutput;
    this.cause = cause;
    this.error = error;
    this.executionArn = executionArn;
    this.startTs = startTs;
    this.stopTs = stopTs;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldActionOutput'), value: this.actionOutput, isJsonToMarkdown: true, isInProgress: this.status === StatusConstant.Runtime.RUNNING.value },
      { title: $i18n.t('__fieldExecutionArn'), value: this.executionArn, isCopyable: true, link: { href: arnUtils.toUrl(this.executionArn), target: '_blank' } },
      { title: $i18n.t('__fieldError'), value: this.error, isChip: true, isHidden: !this.error },
      { title: $i18n.t('__fieldCause'), value: this.cause, isJsonCode: true, isHidden: !this.cause, editorOptions: { enableLineWrapping: true, lines: 10 } },
      { title: $i18n.t('__fieldExecutionTime'), value: this.stopTs ? (this.stopTs - this.startTs) * 1000 : null, isTimeInterval: !!this.stopTs },
      { title: $i18n.t('__fieldStartTs'), value: this.startTs, isTimestamp: true, timestampOptions: { isRelative: false } },
      { title: $i18n.t('__fieldStopTs'), value: this.stopTs, isTimestamp: true, timestampOptions: { isRelative: false } },
    ];
  }
}

export default ActionExecution;
