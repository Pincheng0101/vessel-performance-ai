<script setup>
import { ResourceConstant, StorageConstant } from '~/constants';

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
  llmType: {
    type: String,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: [Array, Object],
  default: [],
});
</script>

<template>
  <AppTable
    v-model="model"
    :headers="[
      { title: $t('__fieldName'), key: 'contentBlockName' },
      { title: $t('__fieldStorage'), key: 'storageId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, item.storageId), target: '_blank' }), iconPath: StorageConstant.Type.STORAGE.iconPath },
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
      <AppDialog
        :on-submit="onItemUpdate"
        aria-label="Edit Attachment Dialog"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            :disabled="props.loading"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <PromptRewriteAttachmentForm
            :items="model"
            :item="item"
            :llm-type="props.llmType"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        :disabled="props.loading"
        @click="onItemRemove"
      />
    </template>
    <template #bottom="{ onItemAdd }">
      <div class="d-flex justify-center">
        <AppDialog
          :on-submit="onItemAdd"
          aria-label="Create Attachment Dialog"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="props.ariaLabel"
              color="primary"
              icon="mdi-plus"
              :disabled="props.loading"
              :on-click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <PromptRewriteAttachmentForm
              :items="model"
              :llm-type="props.llmType"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>
