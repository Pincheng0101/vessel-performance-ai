<script setup>
const props = defineProps({
  defaultValue: {
    type: String,
    default: '',
  },
  enableAnchors: {
    type: Boolean,
    default: true,
  },
  enableToc: {
    type: Boolean,
    default: false,
  },
  anchorPrefix: {
    type: String,
    default: '',
  },
  downloadFileName: {
    type: String,
    default: '',
  },
  dialogTitle: {
    type: String,
    default: '',
  },
  isDialogMode: {
    type: Boolean,
    default: false,
  },
  maxHeight: {
    type: Number,
    default: undefined,
  },
  width: {
    type: Number,
    default: undefined,
  },
  onJsonModeToggle: {
    type: Function,
    default: null,
  },
});

const route = useRoute();
const { initAnchors, scrollToAnchor, processTocList } = useMarkdownViewer();

const viewerRef = ref(null);
const dialogRef = ref(null);

const initialize = async () => {
  if (props.enableAnchors) {
    // Wait for the markdown to render
    await nextTick();
    initAnchors(viewerRef.value.$el);
    scrollToAnchor(route.hash);
  }
};

const PADDING_TOP = 28 + 16 - 2 - 16; // Toolbar button height + padding - border - heading margin;

const items = computed(() => viewerRef.value ? processTocList(viewerRef.value.$el.querySelector('ul')) : []);
const isTocVisible = computed(() => props.enableToc && viewerRef.value && items.value.length > 0);

onMounted(() => {
  initialize();
});
</script>

<template>
  <v-sheet
    color="transparent"
    width="100%"
    aria-label="Markdown Viewer"
    class="toolbar-wrapper position-relative"
  >
    <v-row no-gutters>
      <template v-if="isTocVisible">
        <v-col
          :md="2"
          class="d-none d-md-flex"
        >
          <AppMarkdownViewerToc
            :viewer-element="viewerRef.$el"
            :items="items"
          />
        </v-col>
      </template>
      <v-col :md="isTocVisible ? 10 : 12">
        <v-sheet
          ref="viewerRef"
          :max-height="props.isDialogMode ? undefined : props.maxHeight"
          :width="props.isDialogMode ? undefined : props.width"
          border
          color="transparent"
          rounded="lg"
          class="overflow-auto"
          :class="props.enableAnchors ? 'px-6' : 'px-3'"
        >
          <AppMarkdown
            :text="props.defaultValue || ''"
            :enable-anchors="props.enableAnchors"
            :anchor-prefix="props.anchorPrefix"
            :generate-toc="props.enableToc"
          />
        </v-sheet>
      </v-col>
    </v-row>
    <div class="toolbar d-flex align-center ga-2">
      <AppCopyable :text="props.defaultValue">
        <template #default="{ copy, tooltip }">
          <AppIconButton
            :on-click="copy"
            :tooltip="tooltip"
            icon="mdi-content-copy"
            variant="flat"
          />
        </template>
      </AppCopyable>
      <template v-if="props.downloadFileName">
        <AppMarkdownDownloadButton
          :text="props.defaultValue"
          :file-name="props.downloadFileName"
          variant="flat"
        />
      </template>
      <template v-if="props.onJsonModeToggle">
        <AppIconButton
          :on-click="props.onJsonModeToggle"
          :tooltip="$t('__actionViewAsJson')"
          aria-label="View as JSON"
          icon="mdi-code-json"
          variant="flat"
        />
      </template>
      <AppIconButton
        v-if="!props.isDialogMode"
        :tooltip="$t('__actionViewInDialog')"
        icon="mdi-open-in-new"
        variant="flat"
        :on-click="() => dialogRef.open()"
      />
    </div>
  </v-sheet>
  <AppDialog
    ref="dialogRef"
    :width="1000"
    :persistent="false"
  >
    <template #body>
      <AppForm :form-title="props.dialogTitle || $t('__titleMarkdownViewer')">
        <template #actions>
          <AppIconButton
            icon="mdi-close"
            size="small"
            variant="text"
            :on-click="dialogRef.close"
          />
        </template>
        <template #body>
          <AppMarkdownViewer
            v-bind="props"
            is-dialog-mode
          />
        </template>
      </AppForm>
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
.markdown {
  padding-top: v-bind('`${PADDING_TOP}px`');
  padding-bottom: 8px;
}
</style>
