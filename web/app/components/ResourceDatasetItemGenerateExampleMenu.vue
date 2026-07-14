<script setup>
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  importDisabled: {
    type: Boolean,
    default: false,
  },
  onAdd: {
    type: Function,
    default: null,
  },
  onImportExisting: {
    type: Function,
    default: null,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const { t } = useI18n();

const items = computed(() => [
  {
    title: t('__actionAdd'),
    value: 'add',
    icon: 'mdi-plus',
    enabled: true,
    disabled: props.loading,
    callback: props.onAdd,
  },
  {
    title: t('__actionImportFromExistingData'),
    value: 'importExisting',
    icon: 'mdi-database-import',
    enabled: true,
    disabled: props.loading || props.importDisabled,
    callback: props.onImportExisting,
  },
]);

const enabledItems = computed(() => items.value.filter(item => item.enabled));

const handleItemClick = async (item) => {
  model.value = false;
  await item.callback?.();
};
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        :aria-label="$t('__actionAdd')"
        color="primary"
        icon="mdi-plus"
        :disabled="props.loading"
      />
    </template>
    <v-card
      :elevation="1"
      :min-width="220"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <v-list-item
          v-for="item in enabledItems"
          :key="item.value"
          class="text-body-2"
          :disabled="item.disabled"
          @click="() => handleItemClick(item)"
        >
          <template #prepend>
            <v-icon
              :icon="item.icon"
              size="small"
              color="primary"
            />
          </template>
          {{ item.title }}
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>
