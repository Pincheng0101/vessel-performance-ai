<script setup>
import { LlmConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  enableReferencePathSwitch: {
    type: Boolean,
    default: true,
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  resources: {
    type: Object,
    default: null,
  },
  messages: {
    type: [Array, String],
    default: () => [],
  },
  jsonSchema: {
    type: Object,
    default: () => ({}),
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: Array,
  default: [],
});

const { resourceMap, isLoading, restoreResources } = useRestoredResource({ resourceType: ResourceConstant.Type.LLM.module, keyField: ResourceConstant.Type.LLM.id });

restoreResources(model.value.map(item => item.llmId), props.resources);

watch(() => props.jsonSchema, (after) => {
  if (!after) {
    model.value.map(item => item.jsonSchema = null);
  }
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: $t('__fieldName'), key: 'llmName', value: item => item.llmName || resourceMap[item.llmId]?.llmName || item.llmId, iconPath: item => findField(LlmConstant.Type, item.llmType, 'iconPath'), link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, item.llmId), target: '_blank' }) },
      { title: $t('__fieldModel'), key: 'model', value: item => findField(LlmConstant.Model, item.model || resourceMap[item.llmId]?.model, 'title') || item.model },
    ]"
    :enable-search="false"
    :server-side="false"
    bordered
    draggable
    enable-scroll-button
    hide-no-data
    :loading-rows="2"
    :loading="isLoading"
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog
        :on-submit="onItemUpdate"
        aria-label="Edit Fallback LLMs Dialog"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <LlmFallbackLlmForm
            :item="item"
            :resource-map="resourceMap"
            :enable-reference-path-switch="props.enableReferencePathSwitch"
            :hidden-fields="props.hiddenFields"
            :on-submit="onSubmit"
            :on-discard="onCancel"
            :on-resources-update="props.onResourcesUpdate"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        @click="onItemRemove"
      />
    </template>
    <template #bottom="{ onItemAdd }">
      <div class="d-flex justify-center">
        <AppDialog
          :on-submit="onItemAdd"
          aria-label="Create Fallback LLM Dialog"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel"
              color="primary"
              icon="mdi-plus"
              :on-click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <LlmFallbackLlmForm
              :messages="props.messages"
              :json-schema="props.jsonSchema"
              :enable-reference-path-switch="props.enableReferencePathSwitch"
              :hidden-fields="props.hiddenFields"
              :on-submit="onSubmit"
              :on-discard="onCancel"
              :on-resources-update="props.onResourcesUpdate"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>
