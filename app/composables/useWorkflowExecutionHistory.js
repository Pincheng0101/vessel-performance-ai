import { StatusConstant, WorkflowExecutionConstant } from '~/constants';
import { EventHistory, StateHistory } from '~/models/workflow/execution';

export default function useWorkflowExecutionHistory() {
  const server = useServer();
  const dayjs = useDayjs();

  const state = reactive({
    executionStartedAt: null,
  });

  const rawHistory = ref(new Map());
  const isLoading = ref(false);
  const nextToken = ref(null);

  const SUCCEEDED_EVENT_TYPES = new Set([
    WorkflowExecutionConstant.EventType.CHOICE_STATE_EXITED.value,
    WorkflowExecutionConstant.EventType.MAP_STATE_EXITED.value,
    WorkflowExecutionConstant.EventType.PARALLEL_STATE_SUCCEEDED.value,
    WorkflowExecutionConstant.EventType.PASS_STATE_EXITED.value,
    WorkflowExecutionConstant.EventType.SUCCEED_STATE_EXITED.value,
    WorkflowExecutionConstant.EventType.TASK_SUCCEEDED.value,
    WorkflowExecutionConstant.EventType.WAIT_STATE_EXITED.value,
  ]);

  const EXECUTION_CANCELED_EVENT_TYPES = new Set([
    WorkflowExecutionConstant.EventType.EXECUTION_ABORTED.value,
    WorkflowExecutionConstant.EventType.EXECUTION_FAILED.value,
  ]);

  const getWorkflowExecutionHistory = async ({
    executionArn,
    nextToken,
  } = {}) => {
    const { data, error } = await server.workflowExecution.getHistory({
      executionArn,
      nextToken,
    }, { lazy: false });
    return {
      data: data.value,
      error: error.value,
    };
  };

  const updateRawHistory = (data) => {
    for (const item of data) {
      if (!rawHistory.value.has(item.id)) {
        rawHistory.value.set(item.id, item);
      }
    }
  };

  const updateExecutionStartedAt = () => {
    for (const item of rawHistory.value.values()) {
      if (item.type === WorkflowExecutionConstant.EventType.EXECUTION_STARTED.value) {
        state.executionStartedAt = item.timestamp;
        break;
      }
    }
  };

  const fetchCompleteHistory = async ({
    executionArn,
  } = {}) => {
    isLoading.value = true;
    try {
      do {
        const { data, error } = await getWorkflowExecutionHistory({
          executionArn,
          nextToken: nextToken.value,
        });
        if (error) return;
        if (data) {
          nextToken.value = data.nextToken;
          updateRawHistory(data.data);
        }
      } while (nextToken.value);
    } finally {
      isLoading.value = false;
    }
    updateExecutionStartedAt();
  };

  const findEnteredEventId = (id, initialEventType, finishedStateIds) => {
    const event = rawHistory.value.get(id);
    if (!event) return null;

    const type = event.type;
    let targetSuffix = '';
    switch (true) {
      case initialEventType.startsWith('MapState'):
        targetSuffix = WorkflowExecutionConstant.EventType.MAP_STATE_ENTERED.value;
        break;
      case initialEventType.startsWith('MapIteration'):
        targetSuffix = WorkflowExecutionConstant.EventType.MAP_ITERATION_STARTED.value;
        break;
      case initialEventType.startsWith('ParallelState'):
        targetSuffix = WorkflowExecutionConstant.EventType.PARALLEL_STATE_ENTERED.value;
        break;
      default:
        targetSuffix = 'Entered';
    }

    const isTaskStateExited = initialEventType === WorkflowExecutionConstant.EventType.TASK_STATE_EXITED.value;
    const isUnfinished = finishedStateIds.length === 0 || !finishedStateIds.includes(id);
    if (type.endsWith(targetSuffix) && (isTaskStateExited || isUnfinished)) return id;

    const previousEventId = event.previousEventId;
    return previousEventId ? findEnteredEventId(previousEventId, initialEventType, finishedStateIds) : null;
  };

  const findStateName = (enteredEventId) => {
    const enteredEvent = rawHistory.value.get(enteredEventId);
    const details = findField(WorkflowExecutionConstant.EventType, enteredEvent?.type, 'details');
    return enteredEvent ? enteredEvent[details].name : '';
  };

  const resolveRawHistory = () => {
    const enteredEventIdMap = {};
    const historyByStateMap = {};
    for (const item of rawHistory.value.values()) {
      const { id, type, timestamp } = item;
      // If the execution is aborted or failed, all the states that are not finished should be marked as canceled.
      if (EXECUTION_CANCELED_EVENT_TYPES.has(type)) {
        for (const key in historyByStateMap) {
          if (historyByStateMap[key].status !== StatusConstant.Runtime.SUCCEEDED.value) {
            historyByStateMap[key].status = type === WorkflowExecutionConstant.EventType.EXECUTION_ABORTED.value ? StatusConstant.Runtime.ABORTED.value : StatusConstant.Runtime.FAILED.value;
            historyByStateMap[key].duration = dayjs(timestamp) - dayjs(historyByStateMap[key].enteredAt);
          }
        }
        continue;
      }
      const finishedStateIds = Object.values(historyByStateMap).filter(state => state.duration).map(state => state.id);
      const enteredEventId = findEnteredEventId(id, type, finishedStateIds);
      if (!enteredEventId) continue;

      enteredEventIdMap[id] = enteredEventId;
      const details = item[findField(WorkflowExecutionConstant.EventType, type, 'details')];
      if (type.endsWith('Entered')) {
        const startedAfter = dayjs(timestamp) - dayjs(state.executionStartedAt);
        historyByStateMap[id] = new StateHistory({
          id,
          name: findStateName(enteredEventId),
          type: findField(WorkflowExecutionConstant.EventType, type, 'stateType'),
          input: details?.input,
          startedAfter: Number.isNaN(startedAfter) ? null : startedAfter,
          enteredAt: timestamp,
          isStarted: false,
        });
        if (type.startsWith('Wait')) {
          historyByStateMap[enteredEventId].isStarted = true;
          historyByStateMap[enteredEventId].status = StatusConstant.Runtime.RUNNING.value;
        }
        continue;
      }
      if (type.endsWith('Started')) {
        // Skip MapIterationStarted, only handle MapStateStarted
        if (type === WorkflowExecutionConstant.EventType.MAP_ITERATION_STARTED.value) continue;
        historyByStateMap[enteredEventId].isStarted = true;
        historyByStateMap[enteredEventId].status = StatusConstant.Runtime.RUNNING.value;
        continue;
      }
      if (SUCCEEDED_EVENT_TYPES.has(type)) {
        historyByStateMap[enteredEventId].output = details?.output;
        historyByStateMap[enteredEventId].status = StatusConstant.Runtime.SUCCEEDED.value;
        historyByStateMap[enteredEventId].duration = dayjs(timestamp) - dayjs(historyByStateMap[enteredEventId].enteredAt);
        continue;
      }
      if (type.endsWith('Failed')) {
        // Skip MapIterationFailed, only handle MapStateFailed
        if (type === WorkflowExecutionConstant.EventType.MAP_ITERATION_FAILED.value) continue;
        historyByStateMap[enteredEventId].error = details?.error;
        historyByStateMap[enteredEventId].cause = details?.cause;
        historyByStateMap[enteredEventId].status = historyByStateMap[enteredEventId].isStarted ? StatusConstant.Runtime.FAILED.value : StatusConstant.Runtime.NOT_STARTED.value;
        historyByStateMap[enteredEventId].duration = historyByStateMap[enteredEventId].isStarted ? dayjs(timestamp) - dayjs(historyByStateMap[enteredEventId].enteredAt) : null;
        continue;
      }
    }
    return {
      historyByState: Object.values(historyByStateMap),
      enteredEventIdMap,
    };
  };

  const resolvedRawHistory = computed(resolveRawHistory);

  const historyByState = computed(() => resolvedRawHistory.value.historyByState);
  const enteredEventIdMap = computed(() => resolvedRawHistory.value.enteredEventIdMap);

  const historyByFinishedState = computed(() => {
    return nextToken.value ? historyByState.value.filter(state => state.duration) : historyByState.value;
  });

  const historyByEvent = computed(() => {
    return Array.from(rawHistory.value.values()).map((item) => {
      const startedAfter = dayjs(item.timestamp) - dayjs(state.executionStartedAt);
      const enteredEventId = enteredEventIdMap.value[item.id];
      const step = findStateName(enteredEventId);
      return new EventHistory({
        id: item.id,
        type: item.type,
        details: item[findField(WorkflowExecutionConstant.EventType, item.type, 'details')],
        timestamp: item.timestamp,
        step,
        startedAfter: Number.isNaN(startedAfter) ? null : startedAfter,
      });
    });
  });

  return {
    fetchCompleteHistory,
    historyByEvent,
    historyByFinishedState,
    historyByState,
    isLoading,
  };
}
