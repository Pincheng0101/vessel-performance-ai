import { ResourceConstant, WorkflowTemplateConstant } from '~/constants';
import {
  WorkflowDefinition,
  WorkflowDefinitionToExport,
  WorkflowDefinitionToImport,
  WorkflowTemplate,
} from '~/models/server/workflowTemplate';

export default function useWorkflowTemplate() {
  const server = useServer();
  const auth = useAuth();
  const authStore = useAuthStore();
  const snackbarStore = useSnackbarStore();
  const workflowStore = useWorkflowStore();
  const { isFirstPartyEnv } = useRuntimeConfig().public;

  const isWorkflowResourceKey = (key, workflowDefinitionName) => {
    return key.startsWith(ResourceConstant.Type.WORKFLOW.value) && key.includes(workflowDefinitionName);
  };

  /**
   * @param {WorkflowDefinition} workflowDefinition
   */
  const findWorkflowResourceKey = (workflowDefinition) => {
    if (!workflowDefinition) return null;
    const definitionInstance = new WorkflowDefinition(workflowDefinition);
    return Object.keys(definitionInstance.resources).find(key =>
      isWorkflowResourceKey(key, workflowDefinition.workflowDefinitionName),
    );
  };

  const canAccessWorkflowTemplate = computed(() => isFirstPartyEnv && auth.isSignedIn.value && authStore.parsedToken.isAdmin);

  const canPublishTemplate = resourceType => canAccessWorkflowTemplate.value && findField(ResourceConstant.Type, resourceType, 'allowPublishTemplate');

  const canDownloadWorkflowDefinition = resourceType => findField(ResourceConstant.Type, resourceType, 'allowDownloadWorkflowDefinition');

  /**
   * @param {Object} params
   * @param {{resourceId: string, resourceType: string}[]} params.resources
   * @param {{name: string, description: string, tags: string[]}} params.formData
   */
  const publishTemplate = async ({ resources, formData }) => {
    const exportedWorkflowDefinition = new WorkflowDefinitionToExport({
      resources,
    });
    const { data, error } = await server.workflowTemplate.exportDefinition(exportedWorkflowDefinition);
    if (error.value) {
      return { error: error.value };
    }
    const createdWorkflowTemplate = new WorkflowTemplate({
      workflowDefinition: data.value.workflowDefinition,
      description: formData.description,
      tags: formData.tags,
      workflowTemplateName: formData.name,
    });
    const { data: createData, error: createError } = await server.workflowTemplate.create(createdWorkflowTemplate);
    if (createError.value) {
      return { error: createError.value };
    }
    snackbarStore.setActionSuccess('__actionPublish');
    navigateTo(`/workflow-templates/${createData.value.workflowTemplateId}`);
  };

  const deleteTemplate = async ({ workflowTemplateId }) => {
    const { data, error } = await server.workflowTemplate.destroy({ workflowTemplateId });
    if (error.value) {
      snackbarStore.setActionError('__actionDelete', error);
      return { error: error.value };
    }
    snackbarStore.setActionSuccess('__actionDelete');
    return { data: data.value };
  };

  const createTemplateFromDefinition = async (formData) => {
    const createdWorkflowTemplate = new WorkflowTemplate({
      workflowDefinition: new WorkflowDefinition(formData.workflowDefinition),
      workflowTemplateName: formData.name,
      description: formData.description,
      tags: formData.tags,
    });
    const { data, error } = await server.workflowTemplate.create(createdWorkflowTemplate);
    if (error.value) {
      return { error: error.value };
    }
    snackbarStore.setActionSuccess('__actionCreate');
    navigateTo(`/workflow-templates/${data.value.workflowTemplateId}`);
  };

  const importWorkflowDefinition = async (formData) => {
    const importedWorkflowDefinition = new WorkflowDefinitionToImport({
      workflowDefinition: new WorkflowDefinition(formData),
    });
    const { data, error } = await server.workflowTemplate.importDefinition(importedWorkflowDefinition, {
      lazy: false,
    });
    if (error.value) {
      return;
    }
    const importWorkflowDefinitionResult = data.value;
    const { status, resources } = importWorkflowDefinitionResult;
    if (status === WorkflowTemplateConstant.ImportDefinitionStatus.SUCCESS.value) {
      const newWorkflows = Object.values(resources).filter(
        resource => resource.resourceType === ResourceConstant.Type.WORKFLOW.value,
      );
      if (newWorkflows.length > 0) {
        snackbarStore.setActionSuccess('__actionCreate');
        workflowStore.setDependencyResourcesCreatedByWorkflowDefinition(resources);
        navigateTo(newWorkflows.length === 1
          ? `${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, newWorkflows[0].resourceId)}/edit`
          : resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value));
        return;
      }
      snackbarStore.setActionFailure('__actionCreate');
      return;
    }
    snackbarStore.setActionFailure('__actionCreate');
  };

  const downloadWorkflowDefinition = async (resource) => {
    const workflowDefinitionToExport = new WorkflowDefinitionToExport({
      resources: [{
        resourceId: resource.id,
        resourceType: resource.resourceType,
      }],
      workflowDefinitionName: resource.name,
    });
    const { data, error } = await server.workflowTemplate.exportDefinition(workflowDefinitionToExport);
    if (error.value) {
      return;
    }
    // Use raw data with snake_case key for users to download and import
    const rawData = data.value.workflowDefinitionRaw;
    fileUtils.download({
      data: rawData,
      fileName: `definition-${resource.name}.json`,
      type: 'application/json',
    });
  };

  return {
    canAccessWorkflowTemplate,
    canDownloadWorkflowDefinition,
    canPublishTemplate,
    createTemplateFromDefinition,
    deleteTemplate,
    downloadWorkflowDefinition,
    findWorkflowResourceKey,
    importWorkflowDefinition,
    isWorkflowResourceKey,
    publishTemplate,
  };
}
