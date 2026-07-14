<script setup>
const props = defineProps({
  type: {
    type: String,
    default: '',
  },
  onDelete: {
    type: Function,
    default: () => {},
  },
  onDuplicate: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();
const { disabledNodeTypes } = useFeature();

const open = ref(false);

const items = [
  {
    title: t('__actionDuplicate'),
    icon: 'mdi-content-duplicate',
    disabled: disabledNodeTypes.value.map(type => type.value).includes(props.type),
    callback: props.onDuplicate,
    keyboard: '⌘ + D',
  },
  {
    title: t('__actionDelete'),
    icon: 'mdi-trash-can',
    callback: props.onDelete,
    color: 'error',
    keyboard: 'Del',
  },
];

defineExpose({
  open,
});
</script>

<template>
  <v-menu @update:model-value="(v) => { open = v }">
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        :elevation="0"
        :height="20"
        icon="mdi-dots-horizontal"
        variant="text"
        class="rounded-xl"
      />
    </template>
    <v-card
      :elevation="3"
      :width="200"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <template
          v-for="(item, i) in items"
          :key="item.title"
        >
          <v-list-item
            class="w-100 text-body-2"
            :class="[`text-${item.color || 'text'}`]"
            :disabled="item.disabled"
            @click="item.callback"
          >
            <template #prepend>
              <v-icon
                :icon="item.icon"
                size="small"
              />
            </template>
            {{ item.title }}
            <template v-if="item.keyboard">
              <span class="text-grey">
                {{ item.keyboard }}
              </span>
            </template>
          </v-list-item>
          <v-divider v-if="i < items.length - 1" />
        </template>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style lang="scss" scoped>
:deep(.v-list-item__content) {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
</style>
