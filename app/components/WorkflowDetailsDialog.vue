<script setup>
import { ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { Workflow } from '~/models/server/workflow'
 */

/**
 * @type {{ workflow: Workflow }}
 */
const props = defineProps({
  workflow: {
    type: Object,
    default: () => {},
  },
  onClose: {
    type: Function,
    default: () => {},
  },
});

const { actionTypes } = props.workflow.definition;

const { t } = useI18n();
const {
  isLoading,
  dependencies,
  fetchDependencies,
} = useResourceDependency();

const resources = computed(() => {
  const items = dependencies.value
    .map((dependency) => {
      const type = findField(ResourceConstant.Type, dependency.type, 'type');
      const icon = findField(ResourceConstant.Type, dependency.type, 'icon');
      const i18nTitle = findField(ResourceConstant.Type, dependency.type, 'i18nTitle');
      const subtypeTitle = findField(type, dependency.subtype, 'title');
      const subtypeIconPath = findField(type, dependency.subtype, 'iconPath');
      return {
        title: `${t(i18nTitle)}${subtypeTitle ? ` - ${subtypeTitle}` : ''}`,
        subtypeTitle,
        icon,
        iconPath: subtypeIconPath,
      };
    })
    .sort((a, b) => {
      if (a.subtypeTitle && !b.subtypeTitle) return -1;
      if (!a.subtypeTitle && b.subtypeTitle) return 1;
      return 0;
    });
  return arrUtils.deduplicateByKey(items, 'title');
});
</script>

<template>
  <AppDialog>
    <template #activator="{ onOpen }">
      <slot
        name="activator"
        :on-open="async () => {
          await fetchDependencies({
            resourceType: 'workflow',
            resourceId: props.workflow.id,
          });
          onOpen();
        }"
        :is-loading="isLoading"
      />
    </template>
    <template #body="{ onCancel }">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <p>{{ props.workflow.name }}</p>
          <AppIconButton
            icon="mdi-close"
            variant="text"
            :on-click="() => {
              onCancel();
              props.onClose();
            }"
          />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-row>
            <v-col :cols="12">
              <AppDisplayLabel :label="$t('__fieldAction', 2)" />
              <div class="d-flex align-center">
                <template
                  v-for="(actionType, i) in actionTypes"
                  :key="i"
                >
                  <v-sheet
                    :height="24"
                    :width="24"
                    rounded="sm"
                    class="d-flex align-center justify-center mr-2 bg-action"
                  >
                    <v-icon
                      :icon="findField(StateConstant.ActionType, actionType, 'icon')"
                      color="white"
                      size="small"
                    />
                    <AppTooltip
                      :text="$t(findField(StateConstant.ActionType, actionType, 'i18nTitle'))"
                      activator="parent"
                    />
                  </v-sheet>
                </template>
              </div>
            </v-col>
            <v-col :cols="12">
              <AppDisplayLabel
                class="mb-2"
                :label="$t('__fieldResource', 2)"
              />
              <div class="d-flex align-center">
                <template
                  v-for="(resource, i) in resources"
                  :key="i"
                >
                  <div>
                    <template v-if="resource.iconPath">
                      <AppImageIcon
                        :src="resource.iconPath"
                        :width="24"
                        :height="24"
                      />
                    </template>
                    <template v-else-if="resource.icon">
                      <v-sheet
                        :height="24"
                        :width="24"
                        rounded="sm"
                        class="d-flex align-center justify-center mr-2 bg-white"
                      >
                        <v-icon
                          :icon="resource.icon"
                          color="primary"
                          size="small"
                        />
                        <AppTooltip
                          :text="resource.title"
                          activator="parent"
                        />
                      </v-sheet>
                    </template>
                    <AppTooltip
                      :text="resource.title"
                      activator="parent"
                    />
                  </div>
                </template>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </AppDialog>
</template>
