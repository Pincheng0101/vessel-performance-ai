<script setup>
import { KeyboardConstant } from '~/constants';

definePageMeta({
  layout: 'fluid',
});

const {
  isRedoDisabled,
  isUndoDisabled,
  previousData,
  redo,
  redoStack,
  undo,
  undoStack,
  update,
} = useDataReversible();

const { registerKeyboardShortcuts } = useKeyboardShortcuts();

const state = reactive({
  data: 'Hello, World!',
});

previousData.value = state.data;

const handleUndo = () => {
  const item = undo(state.data);
  if (item) {
    state.data = item;
  }
};

const handleRedo = () => {
  const item = redo(state.data);
  if (item) {
    state.data = item;
  }
};

onMounted(() => {
  registerKeyboardShortcuts([
    {
      bindings: KeyboardConstant.Bindings.UNDO.value,
      callback: handleUndo,
    },
    {
      bindings: KeyboardConstant.Bindings.REDO.value,
      callback: handleRedo,
    },
  ]);
});
</script>

<template>
  <ResourceInfoTitle
    title="Data Reversible"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldData')"
            required
          >
            <AppTextarea
              :id="id"
              v-model.string="state.data"
              fill-height
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
              @input="() => {
                update(previousData, state.data);
              }"
            />
          </AppInputGroup>
          <div class="d-flex align-center ga-2">
            <AppIconButton
              :disabled="isUndoDisabled"
              icon="mdi-arrow-u-left-top"
              variant="text"
              @click="handleUndo"
            />
            <AppIconButton
              :disabled="isRedoDisabled"
              icon="mdi-arrow-u-right-top"
              variant="text"
              @click="handleRedo"
            />
          </div>
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <AppInputGroup
            v-slot="{ id }"
            label="Undo Stack"
          >
            <AppJsonEditor
              :id="id"
              :key="undoStack.length"
              :default-value="undoStack"
              fill-height
              readonly
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            label="Redo Stack"
          >
            <AppJsonEditor
              :id="id"
              :key="redoStack.length"
              :default-value="redoStack"
              fill-height
              readonly
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
