<script setup>
// Shared ECharts wrapper for the fleet dashboard. Bakes in the Phase 3 spike learnings:
// a langforge-derived theme (Roboto font + distinct categorical palette + axis/tooltip/
// legend colors from the Vuetify theme), waits for fonts before the first canvas render,
// rebuilds on light/dark toggle, and handles resize + dispose. Callers pass a plain
// ECharts `option`; all styling comes from the theme so charts stay consistent.
import * as echarts from 'echarts';
import { FleetChartConstant } from '~/constants';

/**
 * @import { EChartsOption } from 'echarts'
 */

const props = defineProps({
  /** @type {EChartsOption} */
  option: {
    type: Object,
    required: true,
  },
  height: {
    type: [Number, String],
    default: 320,
  },
  // GeoJSON maps to register before init, e.g. [{ name: 'world', geoJson }].
  maps: {
    type: Array,
    default: () => [],
  },
  // Bordered frame + hover highlight (off for inline sparklines).
  bordered: {
    type: Boolean,
    default: true,
  },
  // Forwards ECharts' native 'click' event (series/data params) — e.g. a map dot click that
  // should navigate elsewhere. Optional since most charts are display-only.
  onSeriesClick: {
    type: Function,
    default: null,
  },
});

const THEME_NAME = 'fleet-echart';

const { themeColors } = useCustomTheme();

const el = ref(null);
let chart = null;
let resizeObserver = null;

const resolvedHeight = computed(() => (typeof props.height === 'number' ? `${props.height}px` : props.height));

const buildTheme = () => {
  const c = themeColors.value;
  const axisCommon = {
    axisLine: { lineStyle: { color: c.backgroundScale3 } },
    axisTick: { lineStyle: { color: c.backgroundScale3 } },
    axisLabel: { color: c.text },
    splitLine: { lineStyle: { color: c.backgroundScale3 } },
  };
  return {
    color: [...FleetChartConstant.CategoricalPalette],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FleetChartConstant.Font.FAMILY, color: c.text },
    title: { textStyle: { color: c.text } },
    // Legend fixed top-right for cross-chart consistency (callers may override).
    legend: { top: 8, right: 8, textStyle: { color: c.text } },
    categoryAxis: axisCommon,
    valueAxis: axisCommon,
    timeAxis: axisCommon,
    logAxis: axisCommon,
    tooltip: {
      backgroundColor: c.backgroundScale1,
      borderColor: c.backgroundScale3,
      borderWidth: 1,
      textStyle: { color: c.text },
    },
    visualMap: { textStyle: { color: c.text } },
  };
};

const render = () => {
  if (!el.value) return;
  chart?.dispose();
  echarts.registerTheme(THEME_NAME, buildTheme());
  chart = echarts.init(el.value, THEME_NAME);
  chart.setOption(props.option);
  if (props.onSeriesClick) chart.on('click', props.onSeriesClick);
};

onMounted(async () => {
  props.maps.forEach(m => echarts.registerMap(m.name, m.geoJson));
  // Canvas text uses whatever font is loaded at draw time — wait for Roboto first.
  await document.fonts?.ready?.catch(() => {});
  render();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(el.value);
});

// Data/option changes merge in place; a theme toggle rebuilds so colors follow light/dark.
watch(() => props.option, () => chart?.setOption(props.option, true), { deep: true });
watch(themeColors, render);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});

// Escape hatch for callers that need to dispatchAction directly (e.g. a custom wheel-zoom
// handler on the geo map) — most charts never need this.
defineExpose({
  getChart: () => chart,
});
</script>

<template>
  <div
    ref="el"
    class="app-echart"
    :class="{ bordered: props.bordered }"
    :style="{ height: resolvedHeight }"
  />
</template>

<style lang="scss" scoped>
.app-echart {
  width: 100%;
}

// Bordered frame with hover highlight, mirroring AppTable's `.bordered`.
.bordered {
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  transition: border 0.25s;

  &:hover {
    border: 1px solid #000000;
  }

  @at-root .v-theme--dark & {
    &:hover {
      border: 1px solid #ffffff;
    }
  }
}
</style>
