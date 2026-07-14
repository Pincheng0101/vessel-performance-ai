class StateHistory {
  constructor({
    cause,
    duration,
    enteredAt,
    id,
    input,
    isStarted,
    name,
    output,
    startedAfter,
    status,
    type,
  } = {}) {
    this.cause = cause;
    this.duration = duration;
    this.enteredAt = enteredAt;
    this.id = id;
    this.input = input;
    this.isStarted = isStarted;
    this.name = name;
    this.output = output;
    this.startedAfter = startedAfter;
    this.status = status;
    this.type = type;
  }
}

export default StateHistory;
