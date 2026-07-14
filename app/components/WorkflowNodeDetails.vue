<script setup>
import { ExternalMemoryConstant } from '~/constants';

const props = defineProps({
  text: {
    type: [String, Object],
    default: null,
  },
  icon: {
    type: String,
    default: '',
  },
  iconPath: {
    type: String,
    default: '',
  },
  iconPathMaskColor: {
    type: String,
    default: '',
  },
});

const normalizedText = computed(() => {
  if (objUtils.isObject(props.text)) {
    if (Object.values(ExternalMemoryConstant.Type).some(t => t.value === props.text.type)) {
      return props.text.jsonpath;
    }
    return JSON.stringify(props.text);
  }
  if (props.text) {
    return props.text;
  }
  return '-';
});
</script>

<template>
  <AppTitle
    :font-size="12"
    :icon-path="props.iconPath"
    :icon-path-mask-color="props.iconPathMaskColor"
    :icon-size="20"
    :icon="props.icon"
    :text="normalizedText"
    icon-color="primary"
    class="px-2 py-1"
  />
</template>
