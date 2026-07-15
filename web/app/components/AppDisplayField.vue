<script setup>
import * as StatusConstant from '~/constants/StatusConstant';

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

const useFlexWrap = computed(() => (
  props.item.isChip
));

const values = computed(() => {
  const result = Array.isArray(props.item.value)
    ? props.item.value
    : arrUtils.cast(props.item.value);
  return result.filter(value => value !== undefined);
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
    :style="{ '--dynamic-max-width': `${state.maxWidth}px` }"
    :class="{
      'd-flex': true,
      'overflow-auto': true,
      'flex-wrap': useFlexWrap,
      'flex-column': !useFlexWrap,
      'ga-1': true,
    }"
  >
    <template v-if="values.length < 1">
      -
    </template>
    <template v-else>
      <div
        v-for="(v, i) in values"
        :key="i"
        class="display-field d-flex"
        :class="{
          'overflow-hidden': props.item.isChip,
        }"
      >
        <template v-if="strUtils.isEmpty(v)">
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
        <template v-else>
          <div
            class="d-flex ga-1"
            :class="{ ellipsis: !!props.item.isSingleLine }"
          >
            <AppDisplayFieldText
              :index="i"
              :item="props.item"
              :mutated-value="typeof v === 'object' ? JSON.stringify(v) : v"
              :on-click="props.onTextClick"
            />
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
