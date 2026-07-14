<script setup>
import { ResourceConstant } from '~/constants';

const { t } = useI18n();

const model = defineModel({
  type: Boolean,
  default: false,
});

const dialogCreateRef = ref(null);

const closeMenu = () => {
  model.value = false;
};

const openCreateTemplateDialog = async () => {
  closeMenu();
  await nextTick();
  dialogCreateRef.value?.open();
};

const items = computed(() => [
  {
    title: t(ResourceConstant.WorkflowTemplateCreateMode.FROM_BLANK.i18nTitle),
    value: ResourceConstant.WorkflowTemplateCreateMode.FROM_BLANK.value,
    icon: ResourceConstant.WorkflowTemplateCreateMode.FROM_BLANK.icon,
    callback: openCreateTemplateDialog,
  },
  {
    title: t(ResourceConstant.WorkflowTemplateCreateMode.FROM_EXISTING_WORKFLOW.i18nTitle),
    value: ResourceConstant.WorkflowTemplateCreateMode.FROM_EXISTING_WORKFLOW.value,
    icon: ResourceConstant.WorkflowTemplateCreateMode.FROM_EXISTING_WORKFLOW.icon,
    callback: async () => {
      closeMenu();
      await navigateTo('/workflows');
    },
  },
]);
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props }">
      <AppIconButton
        v-bind="props"
        icon="mdi-plus"
        class="primary-gradient"
      />
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
  <WorkflowTemplatePublishDialog
    ref="dialogCreateRef"
    enable-definition-file
  />
</template>
