class Step {
  constructor({
    hideButtons = false,
    i18nAction,
    loadingMessage,
    onNext,
    onValidate,
    progressBoardItems,
    subtitle,
    title,
    value,
  }) {
    this.hideButtons = hideButtons;
    this.i18nAction = i18nAction;
    this.loadingMessage = loadingMessage;
    this.onNext = onNext;
    this.onValidate = onValidate;
    this.progressBoardItems = progressBoardItems;
    this.subtitle = subtitle;
    this.title = title;
    this.value = value;
  }
}

export default Step;
