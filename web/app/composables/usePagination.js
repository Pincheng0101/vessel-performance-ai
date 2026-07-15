import * as ListConstant from '~/constants/ListConstant';

export function usePagination({
  perPageOptions = ListConstant.ItemsPerPageOption.LIST,
  enableUrlParams,
} = {}) {
  const route = useRoute();
  const router = useRouter();

  const isInsideDialog = inject('isInsideDialog', false);
  const useUrl = enableUrlParams ?? !isInsideDialog;

  const category = ref(useUrl ? route.query.category : undefined);
  const page = ref(ListConstant.DefaultParams.PAGE);
  const perPage = ref(ListConstant.DefaultParams.PER_PAGE);
  const sortField = ref(useUrl ? route.query.sort : undefined);
  const sortOrder = ref(useUrl ? route.query.order : undefined);
  const filters = ref(ListConstant.DefaultParams.FILTERS);
  const filterLogic = ref(ListConstant.DefaultParams.FILTER_LOGIC);
  const query = ref(useUrl ? route.query.q : undefined);
  const nextTokenMap = ref({});
  const storagePerPage = Number(localStorage.getItem('per_page'));

  const decodePageTokens = (pageTokens) => {
    if (!pageTokens) return {};
    return decodeURIComponent(pageTokens).split(',').reduce((acc, token, index) => {
      acc[index + 1] = token;
      return acc;
    }, {});
  };

  const encodePageTokens = (nextTokenMap, page) => {
    const tokens = Array.from({ length: page - 1 }, (_, i) => nextTokenMap[i + 1]).filter(Boolean);
    return tokens.length ? encodeURIComponent(tokens.join(',')) : undefined;
  };

  const updateFiltersByCategory = ({ reset } = {}) => {
    if (reset) {
      filters.value = ListConstant.DefaultParams.FILTERS;
      filterLogic.value = ListConstant.DefaultParams.FILTER_LOGIC;
      return;
    }
  };

  const initPage = () => {
    if (!useUrl) return;
    if (route.query.page > 0 && route.query.pageToken) {
      page.value = Number(route.query.page);
      return;
    }
    router.replace({
      query: {
        ...route.query,
        page: undefined,
        pageToken: undefined,
      },
    });
  };

  const initPerPage = () => {
    if (!useUrl) {
      if (perPageOptions.includes(storagePerPage)) {
        perPage.value = storagePerPage;
      }
      return;
    }
    const perPageValue = Number(route.query.perPage) || storagePerPage;
    if (perPageOptions.includes(perPageValue)) {
      perPage.value = perPageValue;
      return;
    }
    router.replace({
      query: {
        ...route.query,
        perPage: undefined,
      },
    });
  };

  const initFilters = () => {
    if (!useUrl) return;
    try {
      filters.value = JSON.parse(decodeURIComponent(route.query.filters));
    } catch {
      router.replace({
        query: {
          ...route.query,
          filters: undefined,
        },
      });
    }
  };

  const initUrlParams = () => {
    initPage();
    initPerPage();
    initFilters();
    updateFiltersByCategory();
  };

  const goToPreviousPage = () => {
    page.value = page.value - 1;
    const pageToken = encodePageTokens(nextTokenMap.value, page.value);
    nextTokenMap.value = decodePageTokens(pageToken);
    if (!useUrl) return;
    router.replace({
      query: {
        ...route.query,
        page: page.value,
        pageToken,
      },
    });
  };

  if (useUrl) {
    nextTokenMap.value = decodePageTokens(route.query.pageToken);
  }

  return {
    category,
    page,
    perPage,
    sortField,
    sortOrder,
    filters,
    filterLogic,
    query,
    nextTokenMap,
    encodePageTokens,
    initUrlParams,
    updateFiltersByCategory,
    goToPreviousPage,
  };
}
