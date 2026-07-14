<script setup>
import { ContentBlockConstant } from '~/constants';

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '',
  },
  llmId: {
    type: String,
    default: '',
  },
  llmType: {
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
  type: [Array, Object],
  default: [],
});

const useJsonInput = defineModel('useJsonInput', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <template v-if="useJsonInput">
    <AppJsonEditor
      v-model:object="model"
      :aria-label="props.ariaLabel"
      :rules="(
        $validator
          .defineField($t('__fieldInput'))
          .json()
          .collect()
      )"
      :readonly="props.readonly"
      fill-height
    />
  </template>
  <template v-else>
    <AppTable
      v-model="model"
      :headers="[
        { title: $t('__fieldName'), key: 'contentBlockName' },
        { title: $t('__fieldType'), key: 'contentBlockType', value: item => $t(findField(ContentBlockConstant.Type, item.contentBlockType, 'i18nTitle')) },
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
          aria-label="Edit Content Dialog"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              icon="mdi-pencil"
              variant="text"
              @click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <ContentBlockForm
              :items="model"
              :item="item"
              :llm-id="props.llmId"
              :llm-type="props.llmType"
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
            aria-label="Create Content Dialog"
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
              <ContentBlockForm
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
</template>
