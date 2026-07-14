<script setup>
import { LlmConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  rules: {
    type: Array,
    default: () => [],
  },
});

const model = defineModel({
  type: Array,
  default: [],
});

const { resourceMap, restoreResources } = useRestoredResource({ resourceType: ResourceConstant.Type.LLM.module, keyField: ResourceConstant.Type.LLM.id });

restoreResources(model.value.map(item => item.llm.llmId));
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: $t('__fieldAugmentedFieldName'), key: 'augmentedFieldName' },
      { title: $t('__fieldLlm'), key: 'llm', value: item => item.llm.llmName || resourceMap[item.llm.llmId]?.llmName || item.llm.llmId, iconPath: item => findField(LlmConstant.Type, item.llm.llmType, 'iconPath'), link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, item.llm.llmId), target: '_blank' }) },
    ]"
    :enable-search="false"
    :hint="props.hint"
    :rules="props.rules"
    :server-side="false"
    bordered
    draggable
    enable-scroll-button
    hide-no-data
  >
    <template #actions="{ item, onItemUpdate, onItemRemove }">
      <AppDialog :on-submit="onItemUpdate">
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceLoaderFormFieldsAugmentedFieldForm
            :items="model"
            :item="item"
            :on-submit="onSubmit"
            :on-discard="onCancel"
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
        <AppDialog :on-submit="onItemAdd">
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel"
              color="primary"
              icon="mdi-plus"
              :on-click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <ResourceLoaderFormFieldsAugmentedFieldForm
              :items="model"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>
