<script setup>
import { ResourceConstant } from '~/constants';

const props = defineProps({
  type: {
    type: String,
    default: ResourceConstant.DependencyType.DEPENDENT.value,
  },
  resourceId: {
    type: String,
    required: true,
  },
  resourceType: {
    type: String,
    required: true,
  },
  lowercaseResourceTitle: {
    type: Boolean,
    default: true,
  },
});

const {
  dependencies,
  dependents,
  fetchDependencies,
  isLoading,
} = useResourceDependency();
const { t } = useI18n();

fetchDependencies({
  resourceType: props.resourceType,
  resourceId: props.resourceId,
});

const formattedResourceTitle = computed(() => {
  const text = t(findField(ResourceConstant.Type, props.resourceType, 'i18nTitle'));
  return props.lowercaseResourceTitle ? text.toLowerCase() : text;
});

</script>

<template>
  <AppTable
    :title="$t(findField(ResourceConstant.DependencyType, props.type, 'i18nTitle'), 2)"
    :server-side="false"
    :icon="findField(ResourceConstant.DependencyType, props.type, 'icon')"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(item.type, item.id), target: '_blank' }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => $t(findField(ResourceConstant.Type, item.type, 'i18nTitle')), icon: item => findField(ResourceConstant.Type, item.type, 'icon'), iconPath: item => findField(ResourceConstant.Type, item.resourceType, 'iconPath'), iconPathMaskColor: 'primary' },
    ]"
    :items="isLoading ? [] : (props.type === ResourceConstant.DependencyType.DEPENDENT.value ? dependents : dependencies)"
    :loading="isLoading"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchDependencies({
          resourceType: props.resourceType,
          resourceId: props.resourceId,
        })"
      />
    </template>
    <template #no-data>
      <AppInfoCard
        :title="$t(findField(ResourceConstant.DependencyType, props.type, 'notFoundTitle'))"
        :instruction="$t(findField(ResourceConstant.DependencyType, props.type, 'notFoundInstruction'), { item: formattedResourceTitle })"
        :icon="findField(ResourceConstant.DependencyType, props.type, 'icon')"
        min-height="400"
      />
    </template>
  </AppTable>
</template>
