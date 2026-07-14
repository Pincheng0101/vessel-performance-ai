class QAPair {
  constructor({
    question,
    answer = null,
  } = {}) {
    this.question = question;
    this.answer = answer;
  }

  /**
   * @param {QAPair} pair
   */
  static toRequestPayload(pair) {
    return {
      question: pair.question,
      answer: pair.answer,
    };
  }
}

export default QAPair;
