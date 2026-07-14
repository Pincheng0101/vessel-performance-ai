<script setup>
const props = defineProps({
  defaultValue: {
    type: [String, Number, Array, Object],
    default: null,
  },
  type: {
    type: String,
    default: 'text',
  },
  modelModifiers: {
    type: Object,
    default: () => ({}),
  },
  items: {
    type: Array,
    default: () => [],
  },
  itemTitle: {
    type: String,
    default: 'title',
  },
  itemValue: {
    type: String,
    default: 'value',
  },
  menuWidth: {
    type: String,
    default: null,
  },
  chips: {
    type: Boolean,
    default: true,
  },
  multiple: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    required: false,
  },
  returnObject: {
    type: Boolean,
    default: false,
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

const SEPARATOR = '#';

const encode = v => String(v).includes(SEPARATOR) ? v : `${v}${SEPARATOR}${strUtils.generateRandom()}`;
const decode = v => String(v).split(SEPARATOR).shift();

const [model, modifiers] = defineModel({
  type: [String, Number, Array, Object],
  default: null,
  set(value) {
    if (!value) return '';
    const isInteger = modifiers.integer || props.modelModifiers?.integer;
    const isNumber = modifiers.number || props.type === 'number';
    if (Array.isArray(value)) {
      if (isInteger) {
        return arrUtils.deduplicate(value.map(v => parseInt(v, 10)).filter(v => !isNaN(v)));
      }
      if (isNumber) {
        return arrUtils.deduplicate(value.map(Number).filter(v => !isNaN(v)));
      }
    }
    if (isInteger) {
      return parseInt(value, 10);
    }
    if (isNumber) {
      return Number(value);
    }
    if (modifiers.repeatable) {
      return value.map((v) => {
        return typeof v === 'object'
          ? { ...v, value: encode(v.value), rawValue: decode(v.value) }
          : { title: v, value: encode(v), rawValue: decode(v) };
      });
    }
    return value;
  },
});

const query = defineModel('query', {
  type: String,
  default: '',
});

const menu = defineModel('menu', {
  type: Boolean,
  default: false,
});

if (props.defaultValue) {
  model.value = props.defaultValue;
}

const items = computed(() => {
  if (!props.multiple && query.value) {
    if (props.items.some(item => String(objUtils.isObject(item) ? item.title : item) === query.value)) {
      return props.items;
    }
    const [firstItem] = props.items;
    return [objUtils.isObject(firstItem) ? { title: query.value, value: query.value } : query.value, ...props.items];
  }
  const q = query.value.toLowerCase();
  const hasQuery = q !== '';
  const defaultItem = hasQuery ? [props.returnObject ? { title: query.value, value: query.value } : query.value] : [];
  const isExactMatch = props.items.some(item => String(objUtils.isObject(item) ? item.title : item).toLowerCase() === q);
  const isPartialMatch = props.items.some(item => String(objUtils.isObject(item) ? item.title : item).toLowerCase().includes(q));
  if (isExactMatch) return props.items;
  const shouldIncludeDefault = !props.returnObject || isPartialMatch;
  return shouldIncludeDefault ? [...defaultItem, ...props.items] : defaultItem;
});

const handleClose = (v) => {
  if (props.multiple) {
    model.value = model.value.filter((item) => {
      const itemValue = typeof item === 'object' ? item[props.itemValue] : item;
      const removedValue = typeof v.raw === 'object' ? v.raw[props.itemValue] : v.raw;
      return itemValue !== removedValue;
    });
    return;
  }
  model.value = null;
};

const openMenu = () => {
  menu.value = true;
};

const handleInput = (v) => {
  if (v) {
    openMenu();
  }
};
</script>

<template>
  <v-combobox
    v-model.trim="model"
    v-model:search.trim="query"
    v-model:menu="menu"
    item-props
    :items="items"
    :chips="props.chips"
    :multiple="props.multiple"
    :readonly="props.readonly"
    :return-object="props.returnObject"
    :type="props.type"
    :item-title="props.itemTitle"
    :item-value="props.itemValue"
    auto-select-first
    autocomplete="off"
    color="primary"
    density="compact"
    persistent-hint
    variant="outlined"
    :menu-props="{ width: props.menuWidth }"
    @input="handleInput"
  >
    <template
      v-if="$slots.chip"
      #chip="props"
    >
      <slot
        name="chip"
        v-bind="props"
        :handle-close="handleClose"
        :normalize-value="decode"
      />
    </template>
    <template
      v-else-if="props.chips"
      #chip="{ item }"
    >
      <v-chip
        color="primary"
        :closable="!props.readonly"
        @click:close="handleClose(item)"
      >
        <div class="text-truncate">
          {{ item.title }}
        </div>
      </v-chip>
    </template>
    <template
      v-if="$slots.selection"
      #selection="props"
    >
      <slot
        name="selection"
        v-bind="props"
        :handle-close="handleClose"
        :normalize-value="decode"
      />
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
    <template #item="{ props, item }">
      <v-list-item v-bind="props">
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
                  :width="24"
                  :height="24"
                />
              </span>
            </template>
            <template v-else-if="item.raw.icon">
              <span>
                <v-icon
                  :icon="item.raw.icon"
                  color="primary"
                  class="mr-2"
                />
              </span>
            </template>
            <template v-if="referencePathUtils.hasDollarSuffix(item.title)">
              <AppChip
                color="referencePathSuffix"
                variant="outlined"
                :text="item.title"
              />
            </template>
            <template v-else-if="referencePathUtils.hasDollarPrefix(item.title)">
              <AppChip
                color="referencePathPrefix"
                variant="outlined"
                :text="item.title"
              />
            </template>
            <template v-else>
              {{ item.title }}
            </template>
          </div>
        </template>
      </v-list-item>
    </template>
    <template
      v-if="$slots['prepend-inner']"
      #prepend-inner
    >
      <slot name="prepend-inner" />
    </template>
    <template
      v-if="$slots.append"
      #append
    >
      <slot name="append" />
    </template>
  </v-combobox>
</template>

<style lang="scss" scoped>
:deep(input) {
  cursor: text;
}
</style>
