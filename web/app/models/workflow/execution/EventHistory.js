class EventHistory {
  constructor({
    id,
    details,
    startedAfter,
    step,
    timestamp,
    type,
  } = {}) {
    this.id = id;
    this.details = details;
    this.startedAfter = startedAfter;
    this.step = step;
    this.timestamp = timestamp;
    this.type = type;
  }
}

export default EventHistory;
