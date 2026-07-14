<script setup>
import { AccountConstant, LlmConstant, ResourceConstant } from '~/constants';

/**
 * @import { ResourcePermission } from '~/models/server/resourcePermission'
 */

/**
 * @type {{ resource: ResourcePermission }}
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
});

const { isDefaultResource } = useResource();
const {
  dependencies,
  fetchDependencies,
} = useResourceDependency();

/**
 * @type {Ref<ResourcePermission>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  isLoading: false,
});

const disableCondition = computed(() =>
  formData.value.resourceType === ResourceConstant.Type.LLM.value
    ? {
        conditions: [
          { field: 'llmId', operator: '==', value: LlmConstant.DefaultLlm.ID },
        ],
      }
    : null,
);

const filteredDependencies = computed(() => {
  return dependencies.value.filter(dependency => !isDefaultResource(dependency));
});

const updateDependencies = async () => {
  state.isLoading = true;
  await fetchDependencies({
    resourceType: formData.value.resourceType,
    resourceId: formData.value.resourceId,
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
  <AppInputGroup
    v-if="!props.hiddenFields.includes('resourceType')"
    v-slot="{ id, label }"
    :label="$t('__fieldResourceType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.resourceType"
      :disabled="!!props.resource"
      :items="Object.values(ResourceConstant.Type)
        .filter((type) => type.value !== ResourceConstant.Type.WORKFLOW.value && type.value !== ResourceConstant.Type.AGENT.value)
        .map((type) => ({
          title: $t(findField(ResourceConstant.Type, type.value, 'i18nTitle')),
          value: type.value,
          icon: findField(ResourceConstant.Type, type.value, 'icon'),
          iconPath: findField(ResourceConstant.Type, type.value, 'iconPath'),
          iconPathMaskColor: 'primary',
        }))"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="(v) => {
        formData.resourceId = null;
      }"
    />
  </AppInputGroup>
  <ResourcePaginatedSelect
    v-if="formData.resourceType"
    :key="formData.resourceType"
    v-model="formData.resourceId"
    :module="findField(ResourceConstant.Type, formData.resourceType, 'module')"
    :disable-condition="disableCondition"
    :disabled-tooltip="$t('__tooltipPermissionNotApplicableToDefaultResource')"
    :disabled="!!props.resource"
    :return-object="false"
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
  <template v-if="!props.resource && formData.resourceId">
    <AppInputGroup
      bordered
      class="d-flex flex-column ga-3 pb-3"
    >
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldGrantDependencyPermissions')"
        :tooltip="$t('__tooltipGrantDependencyPermissions', {
          permission: findField(AccountConstant.AccessType, formData.permission, 'title'),
          resourceType: $t(findField(ResourceConstant.Type, formData.resourceType, 'i18nTitle')).toLowerCase(),
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
            <p>{{ $t('__instructionNoDependency', { item: $t(findField(ResourceConstant.Type, formData.resourceType, 'i18nTitle')) }) }}</p>
          </template>
        </template>
      </template>
    </AppInputGroup>
  </template>
</template>
