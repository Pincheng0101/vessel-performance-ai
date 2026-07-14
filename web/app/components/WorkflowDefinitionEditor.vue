<script setup>
import { workflowAslLinter } from '~/codemirror/linters';
import { WorkflowDefinition } from '~/models/workflow/state';
import workflowAslValidator from '~/validator/plugin/rules/workflowAslValidator';

const props = defineProps({
  width: {
    type: Number,
    default: 400,
  },
  selectedNode: {
    type: Object,
    default: null,
  },
  onDefinitionChange: {
    type: Function,
    required: true,
  },
  onClose: {
    type: Function,
    default: () => {},
  },
});

const { definition } = useWorkflow();

const state = reactive({
  asl: null,
  expandForm: true,
});

if (definition.value) {
  state.asl = WorkflowDefinition.toAsl(definition.value);
}

watch(() => definition.value, (after) => {
  state.asl = WorkflowDefinition.toAsl(after);
});

const formWidth = computed(() => {
  return props.width * (state.expandForm ? 2 : 1);
});

const handleDefinitionChange = (v) => {
  const isValid = workflowAslValidator()(v);
  if (!isValid) return;
  props.onDefinitionChange(v);
};
</script>

<template>
  <v-card class="wrapper">
    <v-card-title class="d-flex align-center justify-space-between">
      <AppTitle
        :font-size="16"
        :text="$t('__titleEditorAsl')"
        font-weight="bold"
      />
      <v-spacer />
      <div class="d-flex flex-end align-center">
        <AppIconButton
          :icon="state.expandForm ? 'mdi-window-minimize' : 'mdi-window-maximize'"
          variant="text"
          @click="state.expandForm = !state.expandForm"
        />
        <AppIconButton
          icon="mdi-close"
          variant="text"
          @click="props.onClose"
        />
      </div>
    </v-card-title>
    <v-divider />
    <v-card-text>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldDefinition')"
        required
      >
        <AppJsonEditor
          :id="id"
          v-model:object="state.asl"
          :field-name="$t('__fieldDefinition')"
          :highlight-key="props.selectedNode?.data.stateDefinition?.name"
          :linters="[workflowAslLinter]"
          enable-lint-gutter
          :rules="(
            $validator
              .defineField($t('__fieldDefinition'))
              .required()
              .json()
              .apply('workflowAslValidator')
              .collect()
          )"
          :on-update="handleDefinitionChange"
        />
      </AppInputGroup>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.wrapper:not(.full-width) {
  max-width: calc(100% - 32px * 2);
  position: absolute;
  left: 32px;
  top: calc(60px + 20px); // header + offset
  transition: width 0.25s;
  width: v-bind('`${formWidth}px`');
  z-index: 1;
  .v-card-text {
    // Workflow edit page floating component: 100dvh - app header - top offset - card title - bottom offset
    height: calc(100dvh - 60px - 20px - 60px - 60px);
    overflow-y: hidden;
    :deep(.cm-editor) {
      // Workflow edit page floating component: 100dvh - app header - top offset - card title - bottom offset - card padding - input label - hint
      height: calc(100dvh - 60px - 20px - 60px - 60px - 20px * 2 - 24px - 24px);
      max-height: none;
    }
  }
}
</style>
