<script setup>
import { LlmConstant } from '~/constants';

const props = defineProps({
  llmType: {
    type: String,
    default: '',
  },
  llmId: {
    type: String,
    default: '',
  },
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
  enableReferencePathSwitch: {
    type: Boolean,
    default: true,
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
      { title: $t('__fieldRole'), key: 'role', value: item => findField(LlmConstant.MessageRole, item.role, 'i18nTitle') ? $t(findField(LlmConstant.MessageRole, item.role, 'i18nTitle')) : item.role },
      { title: $t('__fieldContent'), key: 'content', value: item => Array.isArray(item.content) ? `${numUtils.format(item.content.length)} ${$t('__unitContent', item.content.length)}` : item.content },
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
    <template #actions="{ index, item, onItemUpdate, onItemRemove }">
      <AppDialog
        :on-submit="onItemUpdate"
        aria-label="Edit Message Dialog"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <LlmMessageForm
            :items="model"
            :item="item"
            :only-user-role="index === 0"
            :enable-reference-path-switch="props.enableReferencePathSwitch"
            :llm-type="props.llmType"
            :llm-id="props.llmId"
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
        <AppDialog
          :on-submit="onItemAdd"
          aria-label="Create Message Dialog"
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
            <LlmMessageForm
              :items="model"
              :only-user-role="model.length === 0"
              :enable-reference-path-switch="props.enableReferencePathSwitch"
              :llm-type="props.llmType"
              :llm-id="props.llmId"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>
