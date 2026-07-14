<script setup>
const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('skillName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.skillName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('skillMarkdown')"
    v-slot="{ id, label }"
    :label="$t('__fieldSkillMarkdown')"
    :tooltip="$t('__tooltipSkillMarkdown')"
    required
  >
    <AppMarkdownEditor
      :id="id"
      v-model="formData.skillMarkdown"
      :min-lines="8"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(10000)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('description')"
    v-slot="{ id }"
    :label="$t('__fieldDescription')"
  >
    <AppTextarea
      :id="id"
      v-model="formData.description"
    />
  </AppInputGroup>
</template>
