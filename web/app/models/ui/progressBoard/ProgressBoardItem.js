import { StatusConstant } from '~/constants';

class ProgressBoardItem {
  constructor({
    errorMessage,
    key,
    onRun,
    status,
    subtitle,
    title,
  }) {
    this.errorMessage = errorMessage;
    this.key = key;
    this.onRun = onRun;
    this.status = status;
    this.subtitle = subtitle;
    this.title = title;
  }

  get isNotStarted() {
    return this.status === StatusConstant.Runtime.NOT_STARTED.value;
  }

  get isProcessing() {
    return this.status === StatusConstant.Runtime.PROCESSING.value;
  }

  get isFailed() {
    return this.status === StatusConstant.Runtime.FAILED.value;
  }
}

export default ProgressBoardItem;
