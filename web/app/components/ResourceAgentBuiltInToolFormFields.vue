<script setup>
const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: () => ({}),
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('trackToolResults')"
    v-slot="{ id }"
    :label="$t('__fieldTrackToolResults')"
  >
    <AppSwitch
      :id="id"
      v-model="formData.trackToolResults"
    />
  </AppInputGroup>
</template>
