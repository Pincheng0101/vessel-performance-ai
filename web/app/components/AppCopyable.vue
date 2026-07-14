<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
});

const { copy, copied } = useClipboard({
  legacy: true,
});
</script>

<template>
  <slot
    :tooltip="copied ? $t('__titleModifySuccessfully', { action: $t('__actionCopy', 2) }) : $t('__actionCopy')"
    :copy="() => copy(props.text)"
  />
</template>
