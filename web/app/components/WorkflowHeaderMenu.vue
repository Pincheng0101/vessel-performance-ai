<script setup>
import { ResourceConstant } from '~/constants';

const { t } = useI18n();
const { canAccessWorkflowTemplate } = useWorkflowTemplate();

const props = defineProps({
  blankWorkflow: {
    type: Object,
    default: null,
  },
  onBlankWorkflowCreate: {
    type: Function,
    default: () => {},
  },
  onWorkflowDefinitionImport: {
    type: Function,
    default: () => {},
  },
  withText: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const dialogCreateRef = ref(null);

const state = reactive({
  createMode: ResourceConstant.WorkflowCreateMode.FROM_BLANK.value,
});

const closeMenu = () => {
  model.value = false;
};

const openCreateWorkflowDialog = async () => {
  closeMenu();
  await nextTick();
  state.createMode = ResourceConstant.WorkflowCreateMode.FROM_BLANK.value;
  dialogCreateRef.value?.open();
};

const openCreateFromDefinitionDialog = async () => {
  closeMenu();
  await nextTick();
  state.createMode = ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.value;
  dialogCreateRef.value?.open();
};

const items = computed(() => [
  {
    title: t(ResourceConstant.WorkflowCreateMode.FROM_BLANK.i18nTitle),
    value: ResourceConstant.WorkflowCreateMode.FROM_BLANK.value,
    icon: ResourceConstant.WorkflowCreateMode.FROM_BLANK.icon,
    callback: openCreateWorkflowDialog,
  },
  {
    title: t(ResourceConstant.WorkflowCreateMode.FROM_TEMPLATE.i18nTitle),
    value: ResourceConstant.WorkflowCreateMode.FROM_TEMPLATE.value,
    icon: ResourceConstant.WorkflowCreateMode.FROM_TEMPLATE.icon,
    callback: async () => {
      closeMenu();
      await navigateTo('/workflow-templates');
    },
    hidden: !canAccessWorkflowTemplate.value,
  },
  {
    title: t(ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.i18nTitle),
    value: ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.value,
    icon: ResourceConstant.WorkflowCreateMode.FROM_WORKFLOW_DEFINITION.icon,
    callback: openCreateFromDefinitionDialog,
  },
].filter(item => !item.hidden));
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props: activatorProps }">
      <template v-if="props.withText">
        <AppButton
          v-bind="activatorProps"
          :width="160"
          :text="$t('__actionCreate')"
          size="large"
          color="primary"
          prepend-icon="mdi-plus"
        />
      </template>
      <template v-else>
        <AppIconButton
          v-bind="activatorProps"
          icon="mdi-plus"
          class="primary-gradient"
        />
      </template>
    </template>
    <v-card
      :elevation="1"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <v-list-item
          v-for="item in items"
          :key="item.value"
          class="text-body-2"
          @click="item.callback"
        >
          <template #prepend>
            <v-icon
              :icon="item.icon"
              size="small"
              color="primary"
            />
          </template>
          {{ item.title }}
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
  <AppDialog
    ref="dialogCreateRef"
    :width="1000"
  >
    <template #body="{ onCancel }">
      <WorkflowCreateForm
        :blank-workflow="props.blankWorkflow"
        :create-mode="state.createMode"
        :on-blank-workflow-create="props.onBlankWorkflowCreate"
        :on-workflow-definition-import="props.onWorkflowDefinitionImport"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>
