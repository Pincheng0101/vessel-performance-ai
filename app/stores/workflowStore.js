import { defineStore } from 'pinia';

export const useWorkflowStore = defineStore('workflow', () => {
  const dependencyResourcesCreatedByWorkflowDefinition = ref({});

  const setDependencyResourcesCreatedByWorkflowDefinition = (v) => {
    dependencyResourcesCreatedByWorkflowDefinition.value = v;
  };

  const clearDependencyResourcesCreatedByWorkflowDefinition = () => {
    dependencyResourcesCreatedByWorkflowDefinition.value = {};
  };

  const clearDependencyResourcesByType = (type) => {
    const resources = dependencyResourcesCreatedByWorkflowDefinition.value;
    Object.keys(resources).forEach((key) => {
      if (resources[key].resourceType === type) {
        delete resources[key];
      }
    });
  };

  return {
    dependencyResourcesCreatedByWorkflowDefinition,
    setDependencyResourcesCreatedByWorkflowDefinition,
    clearDependencyResourcesCreatedByWorkflowDefinition,
    clearDependencyResourcesByType,
  };
});
