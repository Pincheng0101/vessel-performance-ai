const SortField = Object.freeze({
  START_TS: 'start_ts',
  UPDATED_TS: 'updated_ts',
});

const SortOrder = Object.freeze({
  ASC: 'ASC',
  DESC: 'DESC',
});

const FilterLogic = Object.freeze({
  AND: 'AND',
  OR: 'OR',
});

const Category = Object.freeze({
  ALL: {
    i18nTitle: '__fieldTableCategoryAll',
    value: 'all',
  },
  FAVORITES: {
    i18nTitle: '__fieldTableCategoryFavorites',
    value: 'favorites',
  },
});

const DefaultParams = Object.freeze({
  CATEGORY: Category.ALL.value,
  FILTER_LOGIC: FilterLogic.AND,
  FILTERS: undefined,
  OUTPUT_FIELDS: null,
  PAGE: 1,
  PER_PAGE: 10,
  QUERY: '',
  SORT_FIELD: SortField.UPDATED_TS,
  SORT_ORDER: SortOrder.DESC,
});

const StorageObjectParams = Object.freeze({
  PER_PAGE: 1000,
  PREVIEW_CONTENT_LIMIT: 10,
});

const WorkflowExecutionParams = Object.freeze({
  PER_PAGE: 200,
});

const WorkflowExecutionHistoryParams = Object.freeze({
  PER_PAGE: 1000,
});

const ItemsPerPageOption = Object.freeze({
  LIST: [10, 20, 50, 100, 200],
  GRID: [12, 24, 48, 96, 192],
});

export {
  Category,
  DefaultParams,
  FilterLogic,
  ItemsPerPageOption,
  SortField,
  SortOrder,
  StorageObjectParams,
  WorkflowExecutionHistoryParams,
  WorkflowExecutionParams,
};
