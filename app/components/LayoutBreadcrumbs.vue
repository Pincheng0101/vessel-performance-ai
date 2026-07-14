<script setup>
const props = defineProps({
  offset: {
    type: Number,
    default: 0,
  },
  path: {
    type: String,
    default: '',
  },
  pathTranslationMap: {
    type: Object,
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
});

const { appName } = useAppConfig();
const { mdAndDown } = useDisplay();
const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();

const translateSlug = (slug) => {
  if (!props.pathTranslationMap) return slug;
  const translation = props.pathTranslationMap[slug];
  if (translation) {
    return t(translation.key, translation.plural);
  }
  return breadcrumbStore.getBreadcrumb(slug);
};

const items = computed(() => {
  const baseItems = props.items.length > 0
    ? props.items
    : (props.path || route.path)
        .split('/')
        .map((slug, i) => {
          const decodedSlug = decodeURIComponent(slug);
          return {
            title: translateSlug(decodedSlug),
            to: route.path.split('/').slice(0, i + 1).join('/'),
          };
        })
        .slice(props.offset + 1);
  if (!authStore.canAccessManagementConsole) {
    return baseItems.slice(-1).map(({ title }) => ({ title }));
  }
  return baseItems;
});

const pageTitle = computed(() => {
  return [appName, ...items.value.map(({ title }) => title)].reverse().join(' · ');
});

const setPageTitle = () => {
  useSeoMeta({
    title: pageTitle.value,
  });
};

watch(() => route.path, () => {
  setPageTitle();
}, { immediate: true });

watch(() => breadcrumbStore.isLoading, (after) => {
  if (after) return;
  setPageTitle();
});
</script>

<template>
  <v-sheet
    :height="40"
    color="transparent"
    class="w-100 d-flex align-center text-body-2"
  >
    <template v-if="breadcrumbStore.isLoading">
      <AppSkeletonLoader
        type="text"
        width="200"
      />
    </template>
    <template v-else>
      <v-breadcrumbs
        :items="items"
        class="text-truncate pa-0"
        :class="{ 'ellipsis-compact': mdAndDown }"
      />
    </template>
  </v-sheet>
</template>

<style lang="scss" scoped>
@mixin ellipsis {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:deep(.v-breadcrumbs-item) {
  padding: 0;
}
:deep(.v-breadcrumbs-item--disabled) {
  @include ellipsis;
}
.ellipsis-compact {
  :deep(.v-breadcrumbs-item) {
    @include ellipsis;
  }
}
</style>
