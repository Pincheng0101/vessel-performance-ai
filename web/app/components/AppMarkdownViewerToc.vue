<script setup>
const props = defineProps({
  viewerElement: {
    type: Object,
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
});

const TOC_HEADER_HEIGHT = 40;
const TOC_MARGIN_TOP = 16;

const route = useRoute();
const routeStore = useRouteStore();
const { scrollToAnchor } = useMarkdownViewer();

const tocRef = ref(null);

const parentElement = computed(() => tocRef.value ? tocRef.value.$el.parentElement : null);
const cardElement = computed(() => parentElement.value ? parentElement.value.querySelector('.v-card') : null);
const cardTextElement = computed(() => parentElement.value ? parentElement.value.querySelector('.v-card-text') : null);
const headerElement = computed(() => document.querySelector('header'));

const handleScroll = () => {
  renderToc();
  highlightVisibleAnchor();
};

const renderToc = () => {
  const headerHeight = headerElement.value.offsetHeight;
  const { bottom: parentBottom, height: parentHeight, right: parentRight, top: parentTop, width: parentWidth } = parentElement.value.getBoundingClientRect();
  const tocHeight = parentTop + parentHeight - headerHeight - TOC_MARGIN_TOP;
  cardElement.value.style.top = `${Math.min(Math.max(parentTop, headerHeight) + TOC_MARGIN_TOP, parentBottom - TOC_HEADER_HEIGHT)}px`;
  cardElement.value.style.height = `${Math.max(tocHeight, TOC_HEADER_HEIGHT)}px`;
  cardElement.value.style.right = `${window.innerWidth - parentRight}px`;
  cardElement.value.style.width = `${parentWidth}px`;
  cardTextElement.value.style.height = `${tocHeight - TOC_HEADER_HEIGHT}px`;
  cardTextElement.value.style.maxHeight = `${parentHeight - TOC_MARGIN_TOP - TOC_HEADER_HEIGHT}px`;
};

const highlightVisibleAnchor = () => {
  const [firstVisibleAnchor] = getVisibleAnchors();
  if (firstVisibleAnchor) {
    highlightTocLink(firstVisibleAnchor.getAttribute('href'));
  }
};

const getVisibleAnchors = () => {
  if (!props.viewerElement) return [];
  const headerHeight = headerElement.value.offsetHeight;
  const { top: viewerTop } = props.viewerElement.getBoundingClientRect();
  if (viewerTop >= headerHeight) return [];
  const anchors = props.viewerElement.querySelectorAll('a[id]');
  return Array.from(anchors).filter((anchor) => {
    const { top: anchorTop, height: anchorHeight } = anchor.getBoundingClientRect();
    const visibleThreshold = headerHeight - (anchorHeight / 2);
    return anchorTop >= visibleThreshold && anchorTop <= window.innerHeight;
  });
};

const handleAnchorClick = (hash) => {
  scrollToAnchor(hash);
  highlightTocLink(hash);
};

const centerTocLink = async (targetHash) => {
  const links = cardTextElement.value.querySelectorAll('a');
  const activeLink = Array.from(links).find(link => link.getAttribute('href') === targetHash);
  if (!activeLink) return;
  const getScrollTop = () => {
    const { top: linkTop, height: linkHeight } = activeLink.getBoundingClientRect();
    const { top: containerTop, height: containerHeight } = cardTextElement.value.getBoundingClientRect();
    const relativeTop = linkTop - containerTop + cardTextElement.value.scrollTop;
    return relativeTop - containerHeight / 2 + linkHeight / 2;
  };
  const scroll = () => {
    if (!parentElement.value) return;
    scrollUtils.scrollTo({ top: getScrollTop(), target: cardTextElement.value });
  };
  const resizeObserver = new ResizeObserver(scroll);
  resizeObserver.observe(cardTextElement.value);
  scroll();
  // Wait for layout to stabilize
  await delay(3000);
  resizeObserver.disconnect();
};

const highlightTocLink = (hash) => {
  if (!hash) return;
  routeStore.setHash(hash);
  centerTocLink(hash);
};

const scrollToTop = () => {
  const { top: parentTop } = parentElement.value.getBoundingClientRect();
  const position = window.scrollY + parentTop - 64;
  scrollUtils.scrollTo({ top: position });
  routeStore.updateHistoryHash('');
};

const scrollToBottom = () => {
  const { bottom: parentBottom } = parentElement.value.getBoundingClientRect();
  const footerElement = document.querySelector('footer');
  const footerOffset = getComputedStyle(footerElement).position === 'fixed' ? footerElement.offsetHeight : 0;
  const position = window.scrollY + parentBottom - window.innerHeight + footerOffset;
  scrollUtils.scrollTo({ top: position });
  routeStore.updateHistoryHash('');
};

const initParentPositionMonitor = () => {
  let running = true;
  const lastPosition = { top: 0, left: 0 };
  const checkParentPosition = () => {
    if (!parentElement.value) return;
    if (!running) return;
    const { top, left } = parentElement.value.getBoundingClientRect();
    if (lastPosition.top !== top || lastPosition.left !== left) {
      lastPosition.top = top;
      lastPosition.left = left;
      handleScroll();
    }
    requestAnimationFrame(checkParentPosition);
  };
  requestAnimationFrame(checkParentPosition);
  onBeforeUnmount(() => {
    running = false;
  });
};

watch(() => routeStore.hash, (after) => {
  highlightTocLink(after);
});

onMounted(() => {
  renderToc();
  highlightTocLink(route.hash);
  initParentPositionMonitor();
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleScroll);
});

onBeforeUnmount(() => {
  routeStore.setHash('');
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleScroll);
});
</script>

<template>
  <v-card
    ref="tocRef"
    :elevation="0"
    color="transparent"
    class="px-5"
  >
    <v-card-title class="d-flex align-center pa-0 text-body-2 font-weight-bold">
      {{ $t('__titleTableOfContents') }}
    </v-card-title>
    <v-card-text class="d-flex flex-column ga-4 pa-0">
      <AppMarkdownViewerTocItem
        :items="props.items"
        :active-hash="routeStore.hash"
        :on-click="handleAnchorClick"
      />
      <div class="d-flex flex-column text-caption pl-3">
        <a
          class="link cursor-pointer"
          @click.prevent="scrollToTop"
        >
          {{ $t('__actionScrollToTop') }}
        </a>
        <a
          class="link cursor-pointer"
          @click.prevent="scrollToBottom"
        >
          {{ $t('__actionScrollToBottom') }}
        </a>
      </div>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
@use '@/assets/vuetify.scss';

.v-card {
  max-width: 200px;
  position: fixed;
  transition: width 0.25s;
  .v-card-title {
    height: v-bind('`${TOC_HEADER_HEIGHT}px`');
    background: rgba(var(--v-theme-backgroundScale)) !important;
    font-size: 14px !important;
  }
  .v-card-text {
    overflow-y: auto;
    font-weight: 500;
    @extend %persistent-scrollbar;
  }
}
a {
  color: rgba(var(--v-theme-text), 0.75);
  display: block;
  font-weight: 500;
  line-height: 1.5;
  transition: color 0.25s;
  &:hover {
    color: rgba(var(--v-theme-primary));
  }
}
</style>
