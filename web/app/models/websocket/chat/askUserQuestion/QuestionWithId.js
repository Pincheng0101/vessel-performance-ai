import QuestionOption from './QuestionOption';

class QuestionWithId {
  constructor({
    id,
    question,
    header,
    options = null,
    multi_select = false,
  } = {}) {
    this.id = id;
    this.question = question;
    this.header = header;
    this.options = Array.isArray(options) ? options.map(o => new QuestionOption(o)) : null;
    this.multiSelect = multi_select;
  }
}

export default QuestionWithId;
