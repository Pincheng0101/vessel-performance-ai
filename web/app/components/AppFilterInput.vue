<script setup>
/**
 * @import { FilterOption } from '~/models/ui/FilterOption.d'
 */

/**
 * @type {{ filterOptions: FilterOption[] }}
 */
const props = defineProps({
  filterOptions: {
    type: Array,
    default: () => [],
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const FILTER_TYPE = Object.freeze({
  FIELD: 'field',
  OPERATOR: 'operator',
  VALUE: 'value',
});

const { t } = useI18n();

const filters = defineModel('filters', {
  type: Array,
  default: [],
});

const query = defineModel('query', {
  type: String,
  default: '',
});

const keywords = defineModel('keywords', {
  type: [String, Number, Array, Object],
  default: [],
  get(value) {
    return value.map((v) => {
      const { title, rawValue, filterOperator, filterValue } = v;
      const restored = allFilterOptions.value.find(({ value }) => value.toLowerCase() === rawValue.toLowerCase());
      return {
        ...v,
        id: strUtils.generateRandom(),
        title: restored ? `${restored?.title}${filterOperator ? ` ${filterOperator.value}` : ''}${filterValue ? ` ${filterValue.title}` : ''}` : title,
        type: restored?.type || FILTER_TYPE.VALUE,
        rawValue: restored?.value || rawValue,
      };
    });
  },
});

const menu = defineModel('menu', {
  type: Boolean,
  default: false,
});

const filterFields = computed(() => {
  return props.filterOptions.map(({ title, field }) => ({
    id: strUtils.generateRandom(),
    title,
    value: field,
    rawValue: field,
    type: FILTER_TYPE.FIELD,
  }));
});

const filterOperators = computed(() => {
  return [
    { id: strUtils.generateRandom(), title: t('__fieldFilterOperatorEquals'), value: '=', type: FILTER_TYPE.OPERATOR },
    { id: strUtils.generateRandom(), title: t('__fieldFilterOperatorNotEquals'), value: '!=', type: FILTER_TYPE.OPERATOR },
    { id: strUtils.generateRandom(), title: t('__fieldFilterOperatorContains'), value: '*=', type: FILTER_TYPE.OPERATOR },
  ];
});

const currentKeyword = computed(() => keywords.value[keywords.value.length - 1]);

const previousKeyword = computed(() => keywords.value[keywords.value.length - 2]);

const allFilterOptions = computed(() => {
  return [
    ...filterFields.value,
    ...filterOperators.value,
  ];
});

const items = computed(() => {
  const lastKeyword = keywords.value[keywords.value.length - 1];
  if (!lastKeyword) {
    return filterFields.value;
  }
  if (lastKeyword.type === FILTER_TYPE.FIELD) {
    // List all possible operators for the selected field
    if (!lastKeyword.filterOperator) {
      return filterOperators.value;
    }
    // List all possible values for the selected field
    if (!lastKeyword.filterValue) {
      return props.filterOptions.find(({ field }) => field === lastKeyword.rawValue)?.values || [];
    }
  }
  return filterFields.value.filter(({ value }) => !keywords.value.some(({ rawValue }) => rawValue === value));
});

// Restore the keywords from the filters
if (filters.value.length) {
  const restoredKeywords = filters.value.map((filter) => {
    const restoredFilterField = filterFields.value.find(({ value }) => value === filter.field);
    const restoredFilterOperator = filterOperators.value.find(({ value }) => value === filter.operator);
    const customFilterValue = { title: filter.value, value: filter.value };
    const restoredFilterValue = props.filterOptions.find(({ field }) => field === filter.field)?.values?.find(({ value }) => value === filter.value) || customFilterValue;
    return {
      id: strUtils.generateRandom(),
      title: `${restoredFilterField.title}${restoredFilterOperator ? ` ${restoredFilterOperator.title}` : ''}${restoredFilterValue ? restoredFilterValue.title : ''}`,
      value: `${filter.field}@${strUtils.generateRandom()}`,
      rawValue: filter.field,
      type: FILTER_TYPE.FIELD,
      filterOperator: restoredFilterOperator,
      filterValue: restoredFilterValue,
    };
  });
  keywords.value = [...keywords.value, ...restoredKeywords];
}

// Restore the keywords from the query
if (query.value) {
  const restoredKeywords = query.value.split(' ').map((value) => {
    return {
      id: strUtils.generateRandom(),
      title: value,
      value: `${value}@${strUtils.generateRandom()}`,
      rawValue: value,
      type: FILTER_TYPE.VALUE,
    };
  });
  keywords.value = [...keywords.value, ...restoredKeywords];
}

// Update filters and query from the keywords
watch(keywords, (after, before) => {
  const getFieldFilters = filters => filters.filter(({ type, filterOperator, filterValue }) => type === FILTER_TYPE.FIELD && filterOperator && filterValue);
  const getValueFilters = filters => filters.filter(({ type }) => type === FILTER_TYPE.VALUE);

  const fieldFilters = getFieldFilters(after);
  const previousFieldFilters = getFieldFilters(before);
  const valueFilters = getValueFilters(after);
  const previousValueFilters = getValueFilters(before);

  const isFieldFiltersCleared = fieldFilters.length < 1 && previousFieldFilters.length > 0;
  const isValueFiltersCleared = valueFilters.length < 1 && previousValueFilters.length > 0;
  const isFieldFiltersChanged = fieldFilters.length !== previousFieldFilters.length;
  const isValueFiltersChanged = valueFilters.length !== previousValueFilters.length;

  if (isFieldFiltersCleared && isValueFiltersCleared) {
    filters.value = [];
    query.value = '';
    props.onUpdate(filters.value, query.value);
    return;
  }

  if (isFieldFiltersChanged) {
    filters.value = fieldFilters.map(({ rawValue, filterOperator, filterValue }) => {
      return {
        field: rawValue,
        operator: filterOperator?.value,
        value: filterValue?.value,
      };
    });
    props.onUpdate(filters.value, query.value);
    closeMenu();
  }

  if (isValueFiltersChanged) {
    query.value = valueFilters.map(({ rawValue }) => rawValue).join(' ');
    props.onUpdate(filters.value, query.value);
    closeMenu();
  }
});

const closeMenu = async () => {
  await nextTick();
  menu.value = false;
};

const handleUpdate = (values) => {
  const current = currentKeyword.value;
  const previous = previousKeyword.value;
  if (!current || !previous) return;
  // Start to build keywords
  if (previous.type === FILTER_TYPE.FIELD && !previous.filterValue) {
    // Remove current keyword if it is a filter field
    if (current.type === FILTER_TYPE.FIELD) {
      values.pop();
      return;
    }
    // Assign current keyword to previous keyword if it is a filter operator
    if (current.type === FILTER_TYPE.OPERATOR) {
      const restoredFilterOperator = filterOperators.value.find(({ value }) => value === current.rawValue);
      values[values.length - 2].filterOperator = restoredFilterOperator;
      values.pop();
      return;
    }
    // Remove current keyword if previous keyword lacks an operator
    if (!previous.filterOperator) {
      values.pop();
      return;
    }
    // Assign current keyword to previous keyword if it is a filter value
    if (current.type === FILTER_TYPE.VALUE) {
      const customFilterValue = { title: current.title, value: current.rawValue };
      const restoredFilterValue = props.filterOptions.find(({ field }) => field === previous.rawValue)?.values?.find(({ value }) => String(value) === String(current.rawValue)) || customFilterValue;
      values[values.length - 2].filterValue = restoredFilterValue;
      values.pop();
      return;
    }
  }
  // Remove current keyword if it is a filter operator
  if (filterOperators.value.some(({ value }) => value === current.rawValue)) {
    values.pop();
    return;
  }
};
</script>

<template>
  <AppCombobox
    v-model.repeatable="keywords"
    v-model:menu="menu"
    :items="items"
    :label="$t('__actionSearch')"
    persistent-placeholder
    clearable
    hide-details
    prepend-inner-icon="mdi-magnify"
    return-object
    @update:model-value="handleUpdate"
  >
    <template #selection="{ item, handleClose }">
      <AppChip
        :text="item.title"
        closable
        class="px-2 py-0"
        @click:close="handleClose(item)"
      />
    </template>
  </AppCombobox>
</template>
