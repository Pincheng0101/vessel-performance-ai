import QuestionWithId from './QuestionWithId';

class AskUserQuestionPayload {
  constructor({
    questions,
  } = {}) {
    this.questions = Array.isArray(questions) ? questions.map(q => new QuestionWithId(q)) : [];
  }
}

export default AskUserQuestionPayload;
