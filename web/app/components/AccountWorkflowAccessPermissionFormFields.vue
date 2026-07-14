<script setup>
import { AccountConstant, ResourceConstant } from '~/constants';

/**
 * @import { WorkflowPermission } from '~/models/server/workflowPermission'
 */

/**
 * @type {{ resource: WorkflowPermission }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const { isDefaultResource } = useResource();
const {
  dependencies,
  fetchDependencies,
} = useResourceDependency();

/**
 * @type {Ref<WorkflowPermission>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  isLoading: false,
});

const filteredDependencies = computed(() => {
  return dependencies.value.filter(dependency => !isDefaultResource(dependency));
});

const updateDependencies = async () => {
  state.isLoading = true;
  await fetchDependencies({
    resourceType: ResourceConstant.Type.WORKFLOW.value,
    resourceId: formData.value.workflowId,
  });
  // For better visual experience
  await delay(1000);
  state.isLoading = false;
};

const handleGrantDependencyPermissionsChange = (v) => {
  if (!v) return;
  updateDependencies();
};
</script>

<template>
  <ResourceWorkflowPaginatedSelect
    v-model="formData.workflowId"
    :disabled="!!props.resource"
    :return-object="false"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.WORKFLOW.module ? props.notFoundResource.id : null"
    required
    @update:model-value="() => {
      formData.grantDependencyPermissions = true;
      updateDependencies();
    }"
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('permission')"
    v-slot="{ id, label }"
    :label="$t('__fieldPermission')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.permission"
      :items="Object.values(AccountConstant.AccessType)"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <template v-if="!props.resource && formData.workflowId">
    <AppInputGroup
      bordered
      class="d-flex flex-column ga-3 pb-3"
    >
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldGrantDependencyPermissions')"
        :tooltip="$t('__tooltipGrantDependencyPermissions', {
          permission: findField(AccountConstant.AccessType, formData.permission, 'title'),
          resourceType: $t('__fieldWorkflow').toLowerCase(),
          action: $t(findField(AccountConstant.AccessType, formData.permission, 'i18nAction')).toLowerCase(),
        })"
      >
        <AppSwitch
          :id="id"
          v-model="formData.grantDependencyPermissions"
          hide-details
          @update:model-value="(v) => handleGrantDependencyPermissionsChange(v)"
        />
      </AppInputGroup>
      <template v-if="formData.grantDependencyPermissions">
        <template v-if="state.isLoading">
          <AppProgressLinear
            :height="4"
            indeterminate
            :rounded="false"
            :message="$t('__messageSearchingDependencies')"
            class="mb-4"
          />
        </template>
        <template v-else>
          <template v-if="filteredDependencies.length > 0">
            <AppDisplayField
              :item="{
                value: filteredDependencies,
                table: {
                  headers: [
                    { title: $t('__fieldName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(item.type, item.id), target: '_blank' }) },
                    { title: $t('__fieldId'), key: 'id' },
                    { title: $t('__fieldType'), key: 'type', value: item => $t(findField(ResourceConstant.Type, item.type, 'i18nTitle')), icon: item => ResourceConstant.Type[item.type.toUpperCase()].icon },
                  ],
                },
              }"
            />
          </template>
          <template v-else>
            <p>{{ $t('__instructionNoDependency', { item: $t('__fieldWorkflow') }) }}</p>
          </template>
        </template>
      </template>
    </AppInputGroup>
  </template>
</template>
