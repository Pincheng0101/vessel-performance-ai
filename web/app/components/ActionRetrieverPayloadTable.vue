<script setup>
import { KnowledgeBaseConstant, ResourceConstant, RetrieverConstant } from '~/constants';

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
  resources: {
    type: Object,
    default: null,
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

const retrievers = computed(() => props.resources?.[ResourceConstant.Type.RETRIEVER.listKey] || {});
const knowledgeBases = computed(() => props.resources?.[ResourceConstant.Type.KNOWLEDGE_BASE.listKey] || {});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: $t('__fieldRetrieverName'), key: 'retrieverName', value: item => retrievers[item.retrieverId]?.retrieverName || item.retrieverId, iconPath: item => findField(RetrieverConstant.Type, retrievers[item.retrieverId]?.retrieverType || item.retrieverType, 'iconPath'), link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, item.retrieverId), target: '_blank' }) },
      { title: $t('__fieldKnowledgeBaseName'), key: 'knowledgeBaseName', value: item => knowledgeBases[item.knowledgeBaseId]?.knowledgeBaseName || item.knowledgeBaseId, iconPath: item => findField(KnowledgeBaseConstant.Type, knowledgeBases[item.knowledgeBaseId]?.knowledgeBaseType, 'iconPath'), link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, item.knowledgeBaseId), target: '_blank' }) },
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
          <ActionRetrieverPayloadForm
            :item="item"
            :resources="props.resources"
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
            <ActionRetrieverPayloadForm
              :resources="props.resources"
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
