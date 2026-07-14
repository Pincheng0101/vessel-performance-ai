import { defineStore } from 'pinia';

export const useBreadcrumbStore = defineStore('breadcrumb', () => {
  const breadcrumbs = ref({});
  const isLoading = ref(false);

  const setBreadcrumb = (id, name) => {
    breadcrumbs.value[id] = name;
  };

  const getBreadcrumb = (id) => {
    return breadcrumbs.value[id] ?? id;
  };

  const setLoading = (status) => {
    isLoading.value = status;
  };

  return {
    breadcrumbs,
    isLoading,
    setBreadcrumb,
    getBreadcrumb,
    setLoading,
  };
});
