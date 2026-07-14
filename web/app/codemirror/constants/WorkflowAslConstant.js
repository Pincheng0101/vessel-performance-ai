const Key = Object.freeze({
  BRANCHES: 'Branches',
  ITEM_PROCESSOR: 'ItemProcessor',
  START_AT: 'StartAt',
  STATES: 'States',
  NEXT: 'Next',
  DEFAULT: 'Default',
  CHOICES: 'Choices',
  CATCH: 'Catch',
});

const StateType = Object.freeze({
  MAP: 'Map',
  PARALLEL: 'Parallel',
  TASK: 'Task',
});

export {
  Key,
  StateType,
};
