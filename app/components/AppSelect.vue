<script setup>
const props = defineProps({
  id: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  defaultValue: {
    type: [String, Number, Boolean],
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  onRefresh: {
    type: Function,
    default: null,
  },
  menuWidth: {
    type: String,
    default: null,
  },
  iconSize: {
    type: String,
    default: undefined,
  },
});

const model = defineModel({
  type: [String, Number, Boolean, Object],
  default: null,
});

if (props.defaultValue) {
  model.value = props.defaultValue;
}

const select = ref(null);

const iconPath = computed(() => {
  if (!props.items) return null;
  const item = props.items.find(item => item.value === model.value);
  return item ? item.iconPath : null;
});

const iconPathMaskColor = computed(() => {
  if (!props.items) return null;
  const item = props.items.find(item => item.value === model.value);
  return item ? item.iconPathMaskColor : null;
});

const icon = computed(() => {
  if (!props.items) return null;
  const item = props.items.find(item => item.value === model.value);
  return item ? item.icon : null;
});
</script>

<template>
  <v-select
    :id="props.id"
    ref="select"
    v-model="model"
    color="primary"
    density="compact"
    item-props
    persistent-hint
    variant="outlined"
    :items="props.items || []"
    :menu-props="{ maxWidth: props.menuWidth || '100%' }"
  >
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps">
        <template #title>
          <div
            :aria-label="item.title"
            class="d-flex align-center"
          >
            <template v-if="item.raw.iconPath">
              <span>
                <AppImageIcon
                  :src="item.raw.iconPath"
                  :mask-color="item.raw.iconPathMaskColor"
                />
              </span>
            </template>
            <template v-else-if="item.raw.icon">
              <span>
                <v-icon
                  :icon="item.raw.icon"
                  :size="props.iconSize"
                  color="primary"
                  class="mr-2"
                />
              </span>
            </template>
            {{ item.title }}
          </div>
        </template>
        <template #subtitle="{ subtitle }">
          <div
            v-if="subtitle"
            class="py-1"
          >
            <AppMarkdown
              :text="subtitle"
              inline
            />
          </div>
        </template>
      </v-list-item>
    </template>
    <template
      v-if="$slots['prepend-inner'] || iconPath || icon"
      #prepend-inner
    >
      <template v-if="iconPath">
        <AppImageIcon
          :src="iconPath"
          :mask-color="iconPathMaskColor"
        />
      </template>
      <template v-else-if="icon">
        <v-icon
          :icon="icon"
          :size="props.iconSize"
          color="primary"
          class="mr-2"
        />
      </template>
    </template>
    <template #append-inner>
      <AppInputRefresh
        :loading="props.loading"
        :on-refresh="props.onRefresh"
      />
    </template>
  </v-select>
</template>

<style lang="scss" scoped>
:deep() {
  .v-field__field,
  .v-field__input {
    pointer-events: none;
  }
  input {
    pointer-events: auto !important;
  }
}
</style>
