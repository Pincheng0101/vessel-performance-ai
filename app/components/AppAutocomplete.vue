<script setup>
const props = defineProps({
  defaultValue: {
    type: [String, Number, Array, Object],
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    required: false,
  },
  chips: {
    type: Boolean,
    required: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  onRefresh: {
    type: Function,
    default: null,
  },
});

const model = defineModel({
  type: [String, Number, Array, Object],
  default: null,
});

const object = defineModel('object', {
  type: Object,
  default: null,
});

if (props.defaultValue) {
  model.value = props.defaultValue;
}

const handleClose = (v) => {
  model.value = model.value.filter(item => item !== v.value);
};
</script>

<template>
  <v-autocomplete
    v-model="model"
    :items="props.items"
    autocomplete="off"
    color="primary"
    variant="outlined"
    density="compact"
    persistent-hint
    persistent-counter
    :readonly="props.readonly"
  >
    <template
      v-if="props.chips"
      #chip="{ item }"
    >
      <v-chip
        color="primary"
        :closable="!props.readonly"
        @click:close="handleClose(item)"
      >
        {{ item.title }}
      </v-chip>
    </template>
    <template
      v-if="$slots.counter"
      #counter
    >
      <slot name="counter" />
    </template>
    <template
      v-if="$slots.append"
      #append
    >
      <slot name="append" />
    </template>
    <template #append-inner>
      <AppInputRefresh
        :loading="props.loading"
        :on-refresh="props.onRefresh"
      />
    </template>
    <template #message="{ message }">
      <AppMarkdown
        :text="message"
        inline
      />
    </template>
    <template
      v-if="props.items.length > 0 && props.items.some(item => item.iconPath)"
      #item="{ item, props }"
    >
      <v-list-item v-bind="props">
        <template #title>
          <div
            :aria-label="item.title"
            class="d-flex align-center"
          >
            {{ item.title }}
          </div>
        </template>
        <template #prepend>
          <AppImageIcon
            :src="item.raw.iconPath"
            :mask-color="item.raw.iconPathMaskColor"
          />
        </template>
      </v-list-item>
    </template>
    <template
      v-if="object && object.iconPath"
      #prepend-inner
    >
      <AppImageIcon
        :src="object.iconPath"
        :mask-color="object.iconPathMaskColor"
      />
    </template>
  </v-autocomplete>
</template>

<style lang="scss" scoped>
:deep(input) {
  cursor: text;
}
:deep(.v-list-item__prepend) {
  width: 32px;
}
</style>
