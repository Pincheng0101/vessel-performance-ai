<script setup>
import { FileExtensionConstant, JsonSchemaConstant, ResourceConstant, WorkflowTemplateConstant } from '~/constants';
import { WorkflowDefinition, WorkflowDefinitionConstant, WorkflowDefinitionResourceInForm, WorkflowDefinitionResourceReferenceResourceId, WorkflowDefinitionResponse } from '~/models/server/workflowTemplate';

const props = defineProps({
  enableUploadFile: {
    type: Boolean,
    default: false,
  },
  onExampleDownload: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<WorkflowDefinition>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: null,
});

const fileInputRef = ref(null);
const dialogInvalidWorkflowDefinitionRef = ref(null);

const state = reactive({
  workflowDefinitionFile: null,
  resourceKeyJsonSchemaMap: {},
  constants: {},
  resourceMap: {},
});

const initResourceMap = () => {
  const definitionInstance = new WorkflowDefinition(formData.value);
  state.resourceMap = Object.fromEntries(
    Object.entries(definitionInstance.resources)
      .sort(([, a], [, b]) => {
        const A_IS_WORKFLOW = a.resourceType === ResourceConstant.Type.WORKFLOW.value;
        const B_IS_WORKFLOW = b.resourceType === ResourceConstant.Type.WORKFLOW.value;

        // Place workflows at the beginning
        if (A_IS_WORKFLOW && !B_IS_WORKFLOW) return -1;
        if (!A_IS_WORKFLOW && B_IS_WORKFLOW) return 1;

        // Sort the rest by resourceType alphabetically
        if (a.resourceType < b.resourceType) return -1;
        if (a.resourceType > b.resourceType) return 1;
        return 0;
      })
      .map(([key, resource]) => [
        key,
        new WorkflowDefinitionResourceInForm({
          id: null,
          createRequest: resource.createRequest,
          description: resource.description,
          isReferenceTypeResource: true,
          references: resource.references,
          resourceType: resource.resourceType,
        }),
      ]),
  );
};

const normalizeDataType = (type) => {
  switch (type) {
    case WorkflowTemplateConstant.ConstantDataType.INT.value:
      return JsonSchemaConstant.DataType.INTEGER.value;
    case WorkflowTemplateConstant.ConstantDataType.FLOAT.value:
      return JsonSchemaConstant.DataType.NUMBER.value;
    default:
      return type;
  }
};

const initConstantsJsonSchema = () => {
  const constants = formData.value.constants || {};
  // Build a map of constant usage across resources
  const constantUsageMap = {};
  for (const [resourceKey, resource] of Object.entries(state.resourceMap)) {
    for (const refKey in resource.references) {
      const reference = resource.references[refKey];
      if (reference.referenceType === WorkflowTemplateConstant.ReferenceType.CONSTANT.value) {
        const constantKey = reference.key;
        if (!constantUsageMap[constantKey]) {
          constantUsageMap[constantKey] = new Set();
        }
        constantUsageMap[constantKey].add(resourceKey);
      }
    }
  }

  const schemaMap = {};
  for (const [constantKey, constant] of Object.entries(constants)) {
    const type = normalizeDataType(constant.dtype);
    const baseSchema = {
      type: 'object',
      properties: {},
      required: [],
    };
    const fieldSchema = {
      type,
      title: constant.description || '',
    };

    const usageSet = constantUsageMap[constantKey];
    // Used by multiple resources, create a shared schema
    if (usageSet && usageSet.size > 1) {
      schemaMap._shared ||= baseSchema;
      schemaMap._shared.properties[constantKey] = fieldSchema;
      schemaMap._shared.required.push(constantKey);
      continue;
    }
    // Used by a single resource, create a specific schema
    if (usageSet && usageSet.size === 1) {
      const [resourceKey] = usageSet;
      schemaMap[resourceKey] ||= baseSchema;
      schemaMap[resourceKey].properties[constantKey] = fieldSchema;
      schemaMap[resourceKey].required.push(constantKey);
      continue;
    }
  }

  state.resourceKeyJsonSchemaMap = schemaMap;
};

if (formData.value) {
  initResourceMap();
  initConstantsJsonSchema();
}

const handleFileUpload = async (file) => {
  if (!file) return;
  state.workflowDefinitionFile = file;
  const text = await file.text();
  const json = JSON.parse(text);
  // Restore formData with original workflow definition in snake_case
  const restoredWorkflowDefinition = new WorkflowDefinitionResponse(json);
  if (!WorkflowDefinitionResponse.isValid(restoredWorkflowDefinition)) {
    formData.value = null;
    state.workflowDefinitionFile = null;
    if (dialogInvalidWorkflowDefinitionRef.value) {
      dialogInvalidWorkflowDefinitionRef.value.open();
    }
    return;
  }
  formData.value = objUtils.toRaw(restoredWorkflowDefinition);
  await nextTick();
  initResourceMap();
  initConstantsJsonSchema();
};

const fillConstants = () => {
  const originalConstants = formData.value.constants;
  if (!originalConstants) return;

  for (const [key, val] of Object.entries(state.constants)) {
    const originalConstant = originalConstants[key];
    if (!originalConstant || typeof originalConstant !== 'object') continue;
    const updatedConstant = new WorkflowDefinitionConstant({
      ...originalConstants[key],
      value: val,
    });
    formData.value.constants[key] = updatedConstant;
  }
};

const fillResources = () => {
  const resourceKeysToRemove = [];

  for (const [key, resource] of Object.entries(state.resourceMap)) {
    // Update resource references in formData if user selects existing resource
    if (!resource.isReferenceTypeResource) {
      const { resourceType, id } = resource;
      for (const [, resValue] of Object.entries(formData.value.resources)) {
        const references = resValue.references || {};
        for (const [refField, refInfo] of Object.entries(references)) {
          if (refInfo?.key === key) {
            references[refField] = new WorkflowDefinitionResourceReferenceResourceId({
              referenceType: WorkflowTemplateConstant.ReferenceType.RESOURCE_ID.value,
              id,
              resourceType,
            });
          }
        }
      }
      resourceKeysToRemove.push(key);
    }
  }
  // Remove the resource from the formData if user selects existing resource
  for (const key of resourceKeysToRemove) {
    delete formData.value.resources[key];
  }
};

const handleReferenceTypeUpdate = (key, isReferenceTypeResource) => {
  const resource = formData.value.resources?.[key];
  if (!resource || !resource.references) return;

  // Find all constants used in the resource references
  const usedConstantKeys = state.resourceKeyJsonSchemaMap[key]?.required || [];

  for (const constantKey of usedConstantKeys) {
    if (isReferenceTypeResource) {
      // Update used constants if user allow to create a new resource
      const original = formData.value.constants?.[constantKey];
      if (!original) continue;
      formData.value.constants[constantKey] = new WorkflowDefinitionConstant({
        ...original,
        value: null,
      });
      continue;
    }
    // Remove used constants if user selects an existing resource
    delete formData.value.constants?.[constantKey];
  }
};

const handleSubmit = () => {
  fillResources();
  fillConstants();
};

defineExpose({
  handleSubmit,
});
</script>

<template>
  <template v-if="props.enableUploadFile">
    <AppInputGroup
      v-slot="{ id, label }"
      :label="$t('__fieldDefinitionFile')"
      required
    >
      <AppFileInput
        :id="id"
        ref="fileInputRef"
        v-model="state.workflowDefinitionFile"
        :supported-extensions="[FileExtensionConstant.Base.JSON.value]"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
        :on-clear="() => {
          state.workflowDefinitionFile = null;
          formData = null;
        }"
        @update:model-value="handleFileUpload"
      />
    </AppInputGroup>
    <AppUploadDropZone
      :text="$t('__instructionDragFileHere', { type: $t('__fieldFile').toLowerCase() })"
      :data-types="['application/json']"
      :on-click="() => fileInputRef.click()"
      :on-drop="(files) => {
        const [file] = files;
        handleFileUpload(file);
      }"
    />
  </template>
  <template v-if="formData && Object.keys(formData).length > 0">
    <template v-if="Object.keys(state.resourceMap).length > 0">
      <AppInputLabel
        :label="$t('__fieldCreateDependencyResources')"
        class="mb-2"
      />
      <template
        v-for="([key, resource], i) in Object.entries(state.resourceMap)"
        :key="key"
      >
        <AppInputGroup
          bordered
          :class="{
            'last-resource': i === Object.keys(state.resourceMap).length - 1,
          }"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <AppTitle
              :font-size="16"
              :text="$t(findField(ResourceConstant.Type, resource.resourceType, 'i18nTitle'))"
              :icon-path="findField(ResourceConstant.Type, resource.resourceType, 'iconPath')"
              :icon-path-mask-color="findField(ResourceConstant.Type, resource.resourceType, 'iconPathMaskColor')"
              :icon="findField(ResourceConstant.Type, resource.resourceType, 'icon')"
              icon-background="primary"
            />
            <div class="d-flex align-center">
              <AppSwitch
                v-model="state.resourceMap[key].isReferenceTypeResource"
                class="ml-0 mr-1"
                size="xx-small"
                hide-details
                @update:model-value="(v) => handleReferenceTypeUpdate(key, v)"
              />
              <AppTooltip
                :text="$t('__tooltipCreateDependencyResource')"
                activator="parent"
                location="top"
              />
            </div>
          </div>
          <template v-if="state.resourceMap[key].isReferenceTypeResource">
            <AppInputGroup
              v-slot="{ id, label }"
              :label="$t('__fieldName')"
              required
            >
              <AppTextField
                :id="id"
                v-model="state.resourceMap[key].createRequest[findField(ResourceConstant.Type, state.resourceMap[key].resourceType, 'createRequestResourceName')]"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              />
            </AppInputGroup>
          </template>
          <template v-if="state.resourceMap[key].isReferenceTypeResource && Object.keys(state.resourceKeyJsonSchemaMap[key]?.properties || {}).length > 0">
            <div class="mb-3">
              <AppJsonSchemaRendererInputGroup
                v-model:form-data="state.constants"
                :enable-json-input-switch="false"
                hide-label
                :schema="state.resourceKeyJsonSchemaMap[key]"
                :bordered="false"
              />
            </div>
          </template>
          <template v-if="!state.resourceMap[key].isReferenceTypeResource">
            <div class="mb-3">
              <ResourcePaginatedSelect
                :key="key"
                v-model="state.resourceMap[key].id"
                :field-name="$t('__actionSelectExistingResource', { resourceType: $t(findField(ResourceConstant.Type, resource.resourceType, 'i18nTitle')) })"
                :module="findField(ResourceConstant.Type, state.resourceMap[key].resourceType, 'module')"
                :title="$t('__actionSelectExistingResource', { resourceType: $t(findField(ResourceConstant.Type, resource.resourceType, 'i18nTitle')) })"
                :return-object="false"
                required
              />
            </div>
          </template>
        </AppInputGroup>
      </template>
    </template>
    <template v-if="Object.keys(state.constantsJsonSchemaMap?.__shared?.properties || {}).length > 0">
      <AppJsonSchemaRendererInputGroup
        v-model:form-data="state.constants"
        :enable-json-input-switch="false"
        :label="$t('__fieldSetting', 2)"
        :schema="state.resourceKeyJsonSchemaMap.__shared"
      />
    </template>
  </template>
  <AppDialog ref="dialogInvalidWorkflowDefinitionRef">
    <template #body="{ onSubmit }">
      <v-card>
        <v-card-title>
          {{ $t('__titleInvalidDefinition') }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          {{ $t('__instructionInvalidDefinition') }}
          <p
            class="text-decoration-underline text-primary cursor-pointer pt-4"
            @click="props.onExampleDownload"
          >
            {{ $t('__instructionDownloadDefinitionExample') }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <AppButton
            :text="$t('__actionOk')"
            color="primary"
            :width="100"
            @click="onSubmit"
          />
        </v-card-actions>
      </v-card>
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
.last-resource {
  :deep() {
    .bordered {
      margin-bottom: 0 !important;
    }
  }
}
</style>
