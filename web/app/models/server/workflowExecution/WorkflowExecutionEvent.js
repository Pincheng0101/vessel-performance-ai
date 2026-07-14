/**
 * According to AWS api reference.
 * @see https://docs.aws.amazon.com/step-functions/latest/apireference/API_HistoryEvent.html
 */
class WorkflowExecutionEvent {
  constructor({
    id,
    timestamp,
    type,
    activityFailedEventDetails,
    activityScheduledEventDetails,
    activityScheduleFailedEventDetails,
    activityStartedEventDetails,
    activitySucceededEventDetails,
    activityTimedOutEventDetails,
    evaluationFailedEventDetails,
    executionAbortedEventDetails,
    executionFailedEventDetails,
    executionRedrivenEventDetails,
    executionStartedEventDetails,
    executionSucceededEventDetails,
    executionTimedOutEventDetails,
    lambdaFunctionFailedEventDetails,
    lambdaFunctionScheduledEventDetails,
    lambdaFunctionScheduleFailedEventDetails,
    lambdaFunctionStartFailedEventDetails,
    lambdaFunctionSucceededEventDetails,
    lambdaFunctionTimedOutEventDetails,
    mapIterationAbortedEventDetails,
    mapIterationFailedEventDetails,
    mapIterationStartedEventDetails,
    mapIterationSucceededEventDetails,
    mapRunFailedEventDetails,
    mapRunRedrivenEventDetails,
    mapRunStartedEventDetails,
    mapStateStartedEventDetails,
    previousEventId,
    stateEnteredEventDetails,
    stateExitedEventDetails,
    taskFailedEventDetails,
    taskScheduledEventDetails,
    taskStartedEventDetails,
    taskStartFailedEventDetails,
    taskSubmitFailedEventDetails,
    taskSubmittedEventDetails,
    taskSucceededEventDetails,
    taskTimedOutEventDetails,
  } = {}) {
    this.id = id;
    this.timestamp = timestamp;
    this.type = type;
    this.activityFailedEventDetails = activityFailedEventDetails;
    this.activityScheduledEventDetails = activityScheduledEventDetails;
    this.activityScheduleFailedEventDetails = activityScheduleFailedEventDetails;
    this.activityStartedEventDetails = activityStartedEventDetails;
    this.activitySucceededEventDetails = activitySucceededEventDetails;
    this.activityTimedOutEventDetails = activityTimedOutEventDetails;
    this.evaluationFailedEventDetails = evaluationFailedEventDetails;
    this.executionAbortedEventDetails = executionAbortedEventDetails;
    this.executionFailedEventDetails = executionFailedEventDetails;
    this.executionRedrivenEventDetails = executionRedrivenEventDetails;
    this.executionStartedEventDetails = executionStartedEventDetails;
    this.executionSucceededEventDetails = executionSucceededEventDetails;
    this.executionTimedOutEventDetails = executionTimedOutEventDetails;
    this.lambdaFunctionFailedEventDetails = lambdaFunctionFailedEventDetails;
    this.lambdaFunctionScheduledEventDetails = lambdaFunctionScheduledEventDetails;
    this.lambdaFunctionScheduleFailedEventDetails = lambdaFunctionScheduleFailedEventDetails;
    this.lambdaFunctionStartFailedEventDetails = lambdaFunctionStartFailedEventDetails;
    this.lambdaFunctionSucceededEventDetails = lambdaFunctionSucceededEventDetails;
    this.lambdaFunctionTimedOutEventDetails = lambdaFunctionTimedOutEventDetails;
    this.mapIterationAbortedEventDetails = mapIterationAbortedEventDetails;
    this.mapIterationFailedEventDetails = mapIterationFailedEventDetails;
    this.mapIterationStartedEventDetails = mapIterationStartedEventDetails;
    this.mapIterationSucceededEventDetails = mapIterationSucceededEventDetails;
    this.mapRunFailedEventDetails = mapRunFailedEventDetails;
    this.mapRunRedrivenEventDetails = mapRunRedrivenEventDetails;
    this.mapRunStartedEventDetails = mapRunStartedEventDetails;
    this.mapStateStartedEventDetails = mapStateStartedEventDetails;
    this.previousEventId = previousEventId;
    this.stateEnteredEventDetails = stateEnteredEventDetails;
    this.stateExitedEventDetails = stateExitedEventDetails;
    this.taskFailedEventDetails = taskFailedEventDetails;
    this.taskScheduledEventDetails = taskScheduledEventDetails;
    this.taskStartedEventDetails = taskStartedEventDetails;
    this.taskStartFailedEventDetails = taskStartFailedEventDetails;
    this.taskSubmitFailedEventDetails = taskSubmitFailedEventDetails;
    this.taskSubmittedEventDetails = taskSubmittedEventDetails;
    this.taskSucceededEventDetails = taskSucceededEventDetails;
    this.taskTimedOutEventDetails = taskTimedOutEventDetails;
  }
}

export default WorkflowExecutionEvent;
