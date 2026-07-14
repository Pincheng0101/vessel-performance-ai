<script setup>
import { CreateResourcePermissionConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  permissionData: {
    type: Object,
    default: null,
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: () => ({
    resourceType: null,
    subTypes: [],
  }),
});

const { t } = useI18n();

const getDisplayMaskColor = (maskColor) => {
  return maskColor === 'white' ? 'primary' : maskColor;
};

const resourceTypeItems = computed(() => {
  return Object.values(ResourceConstant.Type)
    .filter((resourceType) => {
      const currentEntry = props.permissionData?.[resourceType.value] || {};
      const subTypes = CreateResourcePermissionConstant.SubTypeMap[resourceType.value] || [];

      if (subTypes.length === 0) {
        return Object.keys(currentEntry).length === 0;
      }

      return subTypes.length > Object.keys(currentEntry).length;
    })
    .map(resourceType => ({
      ...resourceType,
      title: t(resourceType.i18nTitle),
      iconPathMaskColor: getDisplayMaskColor(resourceType.iconPathMaskColor),
    }));
});

const selectedResourceType = computed(() => {
  return resourceTypeItems.value.find(item => item.value === formData.value.resourceType);
});

const availableSubTypeItems = computed(() => {
  if (!selectedResourceType.value) {
    return [];
  }

  const currentEntry = props.permissionData?.[selectedResourceType.value.value] || {};
  const usedSubTypes = new Set(Object.keys(currentEntry));
  const subTypes = CreateResourcePermissionConstant.SubTypeMap[selectedResourceType.value.value] || [];

  if (subTypes.length === 0) {
    return [];
  }

  return subTypes
    .filter(subType => !usedSubTypes.has(subType.value))
    .map(subType => ({
      ...subType,
      title: subType.fullTitle || subType.title || subType.value,
      iconPathMaskColor: getDisplayMaskColor(subType.iconPathMaskColor),
    }));
});

watch(() => formData.value.resourceType, () => {
  if (!selectedResourceType.value) {
    formData.value.subTypes = [];
    return;
  }

  const selectedSubTypes = Array.isArray(formData.value.subTypes) ? formData.value.subTypes : [];
  const nextSubTypes = selectedSubTypes.filter(subType => availableSubTypeItems.value.some(item => item.value === subType));

  if (nextSubTypes.length > 0) {
    formData.value.subTypes = nextSubTypes;
    return;
  }

  formData.value.subTypes = [];
}, { immediate: true });
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldResourceType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.resourceType"
      :items="resourceTypeItems"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <template v-if="selectedResourceType && availableSubTypeItems.length > 0">
    <AppInputGroup
      v-slot="{ id, label }"
      :label="$t('__fieldType')"
      required
    >
      <AppAutocomplete
        :id="id"
        v-model="formData.subTypes"
        :items="availableSubTypeItems"
        chips
        multiple
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
      />
    </AppInputGroup>
  </template>
</template>
