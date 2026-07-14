<script setup>
import { StatusConstant } from '~/constants';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

/**
 * @type {{ item: DisplayField }}
 */
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  onTextClick: {
    type: Function,
    default: () => {},
  },
});

const rootRef = ref(null);

const state = reactive({
  maxWidth: null,
});

const useMinWidth = computed(() => (
  props.item.isBlockText
  || props.item.isJavaScriptCode
  || props.item.isJinjaCode
  || (props.item.isJsonCode && !props.item.forceText)
  || props.item.isJsonToMarkdown
  || props.item.isMarkdown
  || props.item.isPythonCode
  || props.item.isShellCode
));

const useFullWidth = computed(() => (
  props.item.isBlockText
  || props.item.isImage
  || props.item.isInProgress
  || props.item.isJavaScriptCode
  || props.item.isJinjaCode
  || (props.item.isJsonCode && !props.item.forceText)
  || props.item.isJsonToMarkdown
  || props.item.isMarkdown
  || props.item.isPythonCode
  || props.item.isShellCode
  || props.item.table
));

const useFlexWrap = computed(() => (
  props.item.isChip
));

const values = computed(() => {
  const result = Array.isArray(props.item.value)
    ? props.item.value
    : arrUtils.cast(props.item.value);
  return result.filter(value => value !== undefined);
});

const formatNumberValue = (value) => {
  const decimalPlaces = props.item.numberOptions?.decimalPlaces ?? 0;
  const prefix = props.item.numberOptions?.prefix ?? (props.item.isCurrency ? '$' : '');
  const suffix = props.item.numberOptions?.suffix ?? '';
  const formattedValue = numUtils.format(value, decimalPlaces);

  if (formattedValue == null) {
    return null;
  }

  return `${prefix}${formattedValue}${suffix}`;
};

const getCodeEditorProps = value => ({
  dialogTitle: props.item.title,
  ariaLabel: props.item.title,
  defaultValue: value,
  maxLines: props.item.editorOptions?.maxLines,
  minLines: props.item.editorOptions?.minLines,
  disabled: props.item.editorOptions?.disabled,
  readonly: props.item.editorOptions?.readonly ?? true,
  hideDetails: true,
});

const getMaxWidth = () => {
  const rootElement = rootRef.value?.$el;
  const tableElement = rootElement?.closest?.('.v-table');
  const tableInnerWidth = Math.floor(tableElement?.getBoundingClientRect().width);
  const tablePadding = 16;
  state.maxWidth = tableInnerWidth ? tableInnerWidth - tablePadding * 2 : 9999;
};

onMounted(() => {
  getMaxWidth();
  window.addEventListener('resize', getMaxWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', getMaxWidth);
});
</script>

<template>
  <v-sheet
    ref="rootRef"
    color="transparent"
    :min-width="useMinWidth ? 300 : undefined"
    :style="{ '--dynamic-max-width': `${state.maxWidth}px` }"
    :class="{
      'd-flex': true,
      'overflow-auto': true,
      'flex-wrap': useFlexWrap,
      'flex-column': !useFlexWrap,
      'w-100': useFullWidth,
      'ga-1': true,
      'ga-6': props.item.isJsonToMarkdown,
    }"
  >
    <template v-if="props.item.isInProgress">
      <AppProgressCircular
        :size="20"
        show-elapsed-time
        class="w-100 mt-4"
      />
    </template>
    <template v-else-if="values.length < 1">
      -
    </template>
    <template v-else-if="props.item.isJsonCode && !props.item.forceText">
      <template v-if="strUtils.isEmpty(props.item.value) || values.length < 1">
        -
      </template>
      <template v-else>
        <AppJsonEditor v-bind="getCodeEditorProps(props.item.value)" />
      </template>
    </template>
    <template v-else-if="props.item.table && Array.isArray(props.item.value)">
      <AppDisplayFieldTable :item="props.item" />
    </template>
    <template v-else>
      <div
        v-for="(v, i) in values"
        :key="i"
        class="display-field d-flex"
        :class="{
          'w-100': useFullWidth,
          'overflow-hidden': props.item.isChip,
        }"
      >
        <template v-if="strUtils.isEmpty(v) && !props.item.isSecret">
          -
        </template>
        <template v-else-if="typeof v === 'boolean'">
          <v-chip
            :color="v ? 'success' : null"
            :variant="v ? 'flat' : 'tonal'"
            density="compact"
          >
            {{ v ? $t('__fieldEnabled') : $t('__fieldDisabled') }}
          </v-chip>
        </template>
        <template v-else-if="props.item.isTimestamp">
          <template v-if="v">
            <AppTimestamp
              :value="v"
              :is-relative="props.item.timestampOptions?.isRelative"
              :format="props.item.timestampOptions?.format"
            />
          </template>
          <template v-else>
            -
          </template>
        </template>
        <template v-else-if="props.item.isCountdown">
          <AppCountdownTimer :milliseconds="v * 1000 - Date.now()" />
        </template>
        <template v-else-if="props.item.isTimeInterval">
          <AppTimeDuration
            :milliseconds="v"
            :format="props.item.timeIntervalOptions?.format"
          />
        </template>
        <template v-else-if="props.item.isChip">
          <v-chip
            :color="props.item.chipOptions ? (props.item.value ? props.item.chipOptions.color : null) : 'primary'"
            :variant="props.item.chipOptions?.color ? 'flat' : 'tonal'"
            density="compact"
          >
            <div class="text-truncate">
              {{ v }}
            </div>
          </v-chip>
        </template>
        <template v-else-if="props.item.isStatus">
          <AppChip
            :color="v.toLowerCase()"
            :text="$t(findField(StatusConstant.Runtime, v, 'i18nTitle') || '__fieldStatusUnknown')"
            aria-label="Status"
            variant="flat"
          />
        </template>
        <template v-else-if="props.item.isFileSize">
          {{ fileUtils.formatBytes(v) }}
        </template>
        <template v-else-if="props.item.isImage">
          <v-img
            :src="v"
            :width="props.item.imageOptions?.size ?? 64"
            :height="props.item.imageOptions?.size ?? 64"
            cover
            class="flex-grow-0 bg-backgroundScale1"
            :class="[
              props.item.imageOptions?.variant === 'avatar' ? 'rounded-circle' : 'rounded-0',
            ]"
          />
        </template>
        <template v-else-if="props.item.isCurrency || props.item.isNumber">
          <template v-if="formatNumberValue(v) === null">
            -
          </template>
          <template v-else>
            {{ formatNumberValue(v) }}
          </template>
        </template>
        <template v-else-if="props.item.isBlockText">
          <AppEditor v-bind="getCodeEditorProps(v)" />
        </template>
        <template v-else-if="props.item.isJinjaCode">
          <AppJinjaEditor v-bind="getCodeEditorProps(v)" />
        </template>
        <template v-else-if="props.item.isShellCode">
          <AppShellEditor v-bind="getCodeEditorProps(v)" />
        </template>
        <template v-else-if="props.item.isJavaScriptCode">
          <AppJavaScriptEditor v-bind="getCodeEditorProps(v)" />
        </template>
        <template v-else-if="props.item.isPythonCode">
          <AppPythonEditor v-bind="getCodeEditorProps(v)" />
        </template>
        <template v-else-if="props.item.isJsonToMarkdown">
          <AppJsonMarkdownViewer
            :dialog-title="props.item.title"
            :aria-label="props.item.title"
            :default-value="v"
            :enable-anchors="props.item.markdownViewerOptions?.enableAnchors"
            :enable-toc="props.item.markdownViewerOptions?.enableToc"
            :anchor-prefix="`${props.item.title}${i > 0 ? `-${i + 1}` : ''}`"
            :download-file-name="props.item.markdownViewerOptions?.downloadFileName"
            :max-height="props.item.markdownViewerOptions?.maxHeight"
            :width="props.item.markdownViewerOptions?.width"
          />
        </template>
        <template v-else-if="props.item.isMarkdown">
          <AppMarkdownViewer
            :dialog-title="props.item.title"
            :default-value="v"
            :enable-anchors="props.item.markdownViewerOptions?.enableAnchors"
            :enable-toc="props.item.markdownViewerOptions?.enableToc"
            :anchor-prefix="`${props.item.title}${i > 0 ? `-${i + 1}` : ''}`"
            :download-file-name="props.item.markdownViewerOptions?.downloadFileName"
            :max-height="props.item.markdownViewerOptions?.maxHeight"
            :width="props.item.markdownViewerOptions?.width"
          />
        </template>
        <template v-else>
          <div class="d-flex ga-1">
            <template v-if="props.item.isCopyable">
              <AppCopyable :text="v">
                <template #default="{ copy, tooltip }">
                  <AppIconButton
                    :tooltip="tooltip"
                    icon="mdi-content-copy"
                    variant="text"
                    icon-size="default"
                    :on-click="copy"
                  />
                </template>
              </AppCopyable>
            </template>
            <div
              class="d-flex ga-1"
              :class="{ ellipsis: !!props.item.isSingleLine }"
            >
              <template v-if="props.item.isSecret">
                <AppSecretText :value="v" />
              </template>
              <template v-else-if="props.item.forceText && typeof v === 'object'">
                <AppDisplayFieldText
                  :index="i"
                  :item="props.item"
                  :mutated-value="JSON.stringify(v)"
                  :on-click="props.onTextClick"
                />
              </template>
              <template v-else-if="typeof v === 'object'">
                <AppJsonEditor
                  :default-value="v"
                  readonly
                  hide-details
                />
              </template>
              <template v-else>
                <AppDisplayFieldText
                  :index="i"
                  :item="props.item"
                  :mutated-value="v"
                  :on-click="props.onTextClick"
                />
              </template>
              <template v-if="props.item.appendComponent">
                <v-sheet
                  :height="32"
                  color="transparent"
                  class="d-flex align-center"
                >
                  <component
                    :is="props.item.appendComponent"
                    v-bind="props.item.appendComponentProps"
                  />
                </v-sheet>
              </template>
            </div>
          </div>
        </template>
      </div>
    </template>
  </v-sheet>
</template>

<style lang="scss" scoped>
.ellipsis {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
