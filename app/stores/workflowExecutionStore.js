import { defineStore } from 'pinia';
import { InfiniteScrollConstant } from '~/constants';

/**
 * @import {WorkflowExecution} from '~/models/server/workflowExecution'
 */

export const useWorkflowExecutionStore = defineStore('workflowExecution', () => {
  const server = useServer();

  /**
   * @type {Ref<WorkflowExecution[]>}
   */
  const workflowExecutions = ref([]);
  const nextToken = ref(null);
  const isLoading = ref(false);
  const currentWorkflowId = ref(null);
  const updatedWorkflowExecution = ref(null);
  const stoppedWorkflowExecution = ref(null);

  const reset = () => {
    workflowExecutions.value = [];
    nextToken.value = null;
    isLoading.value = false;
    currentWorkflowId.value = null;
    updatedWorkflowExecution.value = null;
    stoppedWorkflowExecution.value = null;
  };

  const loadWorkflowExecutions = async ({ workflowId, done = () => {} } = {}) => {
    if (!workflowId) return;
    if (isLoading.value) return;
    if (currentWorkflowId.value && currentWorkflowId.value !== workflowId) {
      reset();
    }
    if (!currentWorkflowId.value) {
      currentWorkflowId.value = workflowId;
    }
    if (nextToken.value === null && workflowExecutions.value.length > 0) {
      done(InfiniteScrollConstant.LoadStatus.EMPTY);
      return;
    }
    isLoading.value = true;
    const { data, error } = await server.workflowExecution.list({
      workflowId,
      nextToken: nextToken.value,
      limit: 10,
    }, {
      lazy: false,
    });
    if (error.value) {
      done(InfiniteScrollConstant.LoadStatus.EMPTY);
      isLoading.value = false;
      return;
    }
    workflowExecutions.value.push(...data.value.data);
    nextToken.value = data.value.nextToken;
    done(nextToken.value ? InfiniteScrollConstant.LoadStatus.OK : InfiniteScrollConstant.LoadStatus.EMPTY);
    isLoading.value = false;
  };

  const replaceWorkflowExecution = (workflowExecution) => {
    const index = workflowExecutions.value.findIndex(e => e.executionArn === workflowExecution.executionArn);
    if (index !== -1) {
      workflowExecutions.value.splice(index, 1, workflowExecution);
    }
  };

  const prependWorkflowExecution = (workflowExecution) => {
    workflowExecutions.value.unshift(workflowExecution);
  };

  const updateWorkflowExecutionDisplayName = (workflowExecution) => {
    const execution = workflowExecutions.value.find(e => e.executionArn === workflowExecution.executionArn);
    if (!execution) return;
    execution.displayName = workflowExecution.displayName;
  };

  const setUpdatedWorkflowExecution = (workflowExecution) => {
    updatedWorkflowExecution.value = workflowExecution;
  };

  const setStoppedWorkflowExecution = (workflowExecution) => {
    stoppedWorkflowExecution.value = workflowExecution;
    replaceWorkflowExecution(workflowExecution);
  };

  return {
    workflowExecutions,
    nextToken,
    isLoading,
    reset,
    loadWorkflowExecutions,
    replaceWorkflowExecution,
    prependWorkflowExecution,
    updateWorkflowExecutionDisplayName,
    updatedWorkflowExecution,
    stoppedWorkflowExecution,
    setUpdatedWorkflowExecution,
    setStoppedWorkflowExecution,
  };
});
