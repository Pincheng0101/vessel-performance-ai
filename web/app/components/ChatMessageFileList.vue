<script setup>
import { StreamingConstant } from '~/constants';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});

const resolveName = (item) => {
  if (item.name) return item.name;
  const objectPath = item.objectPaths?.[0] ?? '';
  return pathUtils.extractLast(objectPath) || item.contentBlockName || '';
};

const resolveTypeLabel = (item) => {
  if (item.typeLabel) return item.typeLabel;
  const name = resolveName(item);
  const extension = pathUtils.getFileExtension(name).replace('.', '').toUpperCase();
  return extension || '';
};

const resolvedItems = computed(() => {
  return props.items
    .flatMap((item, index) => {
      if (Array.isArray(item.attachments)) {
        return item.attachments.map((attachment, attachmentIndex) => ({
          ...attachment,
          key: `${item.contentBlockName || item.contentBlockType || 'file'}-${index}-${attachmentIndex}`,
        }));
      }
      if (item.contentBlockType !== StreamingConstant.ContentBlockType.ATTACHMENT.value) return [];
      return [{
        icon: item.icon,
        key: `${item.contentBlockName || item.contentBlockType || 'file'}-${index}`,
        name: resolveName(item),
        size: item.size,
        typeLabel: resolveTypeLabel(item),
      }];
    })
    .filter(item => item.name);
});
</script>

<template>
  <div class="d-flex flex-column align-end ga-2 w-100">
    <v-sheet
      v-for="item in resolvedItems"
      :key="item.key"
      rounded="lg"
      color="transparent"
      class="file-card d-flex align-center ga-3 px-3"
    >
      <v-sheet
        :height="36"
        :width="36"
        rounded="lg"
        color="primary"
        class="d-flex align-center justify-center flex-shrink-0"
      >
        <v-icon
          :icon="item.icon || 'mdi-file-document-outline'"
          color="on-primary"
          size="26"
        />
      </v-sheet>
      <div class="overflow-hidden">
        <p class="font-weight-bold text-truncate">
          {{ item.name }}
        </p>
        <p class="text-body-2 text-medium-emphasis text-truncate">
          {{ item.typeLabel || $t('__fieldFile') }}
        </p>
      </div>
    </v-sheet>
  </div>
</template>

<style lang="scss" scoped>
.file-card {
  width: min(360px, 100%);
  min-height: 68px;
  border: 1px solid rgba(var(--v-theme-backgroundScale4), 0.4);
}
</style>
