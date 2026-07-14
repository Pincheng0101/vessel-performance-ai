<script setup>
import { ChartConstant } from '~/constants';

/**
 * @import { TooltipItem } from 'chart.js'
 */

definePageMeta({
  layout: 'fluid',
});

const BAR_CHART_HEIGHT = 320;

const stackedBarChartData = [
  {
    label: 'Mon',
    planning: 6,
    design: 4,
    build: 10,
  },
  {
    label: 'Tue',
    planning: 8,
    design: 5,
    build: 12,
  },
  {
    label: 'Wed',
    planning: 5,
    design: 7,
    build: 13,
  },
  {
    label: 'Thu',
    planning: 7,
    design: 6,
    build: 11,
  },
  {
    label: 'Fri',
    planning: 4,
    design: 5,
    build: 9,
  },
  {
    label: 'Sat',
    planning: 3,
    design: 2,
    build: 5,
  },
  {
    label: 'Sun',
    planning: 2,
    design: 1,
    build: 3,
  },
];

const stackedBarSeries = [
  {
    label: 'Planning',
    field: 'planning',
  },
  {
    label: 'Design',
    field: 'design',
  },
  {
    label: 'Build',
    field: 'build',
  },
];

const stackedBarChartLabels = stackedBarChartData.map(item => item.label);

const stackedBarDatasets = stackedBarSeries.map(series => ({
  label: series.label,
  data: stackedBarChartData.map(item => item[series.field]),
}));

const stackedBarOptions = {
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      ticks: {
        callback: value => `${numUtils.format(value)}h`,
      },
    },
  },
};

const horizontalBarChartData = [
  {
    label: 'Build',
    value: 63,
  },
  {
    label: 'Planning',
    value: 35,
  },
  {
    label: 'Design',
    value: 30,
  },
  {
    label: 'QA',
    value: 18,
  },
  {
    label: 'Review',
    value: 12,
  },
];

const horizontalBarChartLabels = horizontalBarChartData.map(item => item.label);

const horizontalBarDatasets = [
  {
    label: 'Hours logged',
    data: horizontalBarChartData.map(item => item.value),
  },
];

const horizontalBarOptions = {
  scales: {
    x: {
      ticks: {
        callback: value => `${numUtils.format(value)}h`,
      },
    },
  },
};

const lineChartData = [
  {
    label: 'Mon',
    createdTasks: 18,
    reviewedTasks: 14,
    completedTasks: 10,
  },
  {
    label: 'Tue',
    createdTasks: 24,
    reviewedTasks: 19,
    completedTasks: 15,
  },
  {
    label: 'Wed',
    createdTasks: 28,
    reviewedTasks: 23,
    completedTasks: 18,
  },
  {
    label: 'Thu',
    createdTasks: 26,
    reviewedTasks: 21,
    completedTasks: 17,
  },
  {
    label: 'Fri',
    createdTasks: 30,
    reviewedTasks: 25,
    completedTasks: 20,
  },
  {
    label: 'Sat',
    createdTasks: 16,
    reviewedTasks: 12,
    completedTasks: 9,
  },
  {
    label: 'Sun',
    createdTasks: 13,
    reviewedTasks: 10,
    completedTasks: 7,
  },
];

const lineChartSeries = [
  {
    label: 'Created tasks',
    field: 'createdTasks',
  },
  {
    label: 'Reviewed tasks',
    field: 'reviewedTasks',
  },
  {
    label: 'Completed tasks',
    field: 'completedTasks',
    backgroundColor: ChartConstant.ColorPalette.PRIMARY,
  },
];

const lineChartLabels = lineChartData.map(item => item.label);

const lineChartDatasets = lineChartSeries.map(series => ({
  backgroundColor: series.backgroundColor,
  label: series.label,
  data: lineChartData.map(item => item[series.field]),
}));

const lineChartOptions = {
  scales: {
    y: {
      ticks: {
        callback: value => numUtils.format(value),
      },
    },
  },
};

const donutChartData = [
  {
    label: 'Build',
    value: 44,
  },
  {
    label: 'Design',
    value: 24,
  },
  {
    label: 'Research',
    value: 18,
  },
  {
    label: 'Planning',
    value: 16,
  },
  {
    label: 'QA',
    value: 14,
  },
  {
    label: 'Review',
    value: 12,
  },
  {
    label: 'Support',
    value: 10,
  },
  {
    label: 'Operations',
    value: 9,
  },
  {
    label: 'Documentation',
    value: 8,
  },
  {
    label: 'Training',
    value: 6,
  },
  {
    label: 'Discovery',
    value: 5,
  },
  {
    label: 'Maintenance',
    value: 4,
  },
  {
    label: 'Integration',
    value: 3,
  },
];

const sortedDonutChartData = [...donutChartData].sort((left, right) => right.value - left.value);

const donutChartLabels = sortedDonutChartData.map(item => item.label);

const donutChartDatasets = [
  {
    data: sortedDonutChartData.map(item => item.value),
  },
];

/**
 * @param {TooltipItem<'bar'>} context
 * @returns {string}
 */
const hourTooltipLabelCallback = (context) => {
  const value = context.parsed?.y ?? context.raw;
  const label = context.dataset.label ? `${context.dataset.label}: ` : '';

  return `${label}${numUtils.format(value)}h`;
};
</script>

<template>
  <div>
    <ResourceInfoTitle
      title="Charts"
      class="mb-2"
    />
    <v-row>
      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <v-card-title>
            Stacked Bar Chart
          </v-card-title>
          <v-divider />
          <v-card-text>
            <AppBarChart
              :height="BAR_CHART_HEIGHT"
              :labels="stackedBarChartLabels"
              :datasets="stackedBarDatasets"
              :options="stackedBarOptions"
              :tooltip-label-callback="hourTooltipLabelCallback"
              title="Daily Project Hours"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <v-card-title>
            Horizontal Bar Chart
          </v-card-title>
          <v-divider />
          <v-card-text>
            <AppBarChart
              direction="horizontal"
              :height="BAR_CHART_HEIGHT"
              :labels="horizontalBarChartLabels"
              :datasets="horizontalBarDatasets"
              :options="horizontalBarOptions"
              :tooltip-label-callback="hourTooltipLabelCallback"
              title="Project Hours by Activity"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <v-card-title>
            Line Chart
          </v-card-title>
          <v-divider />
          <v-card-text>
            <AppLineChart
              :height="320"
              :labels="lineChartLabels"
              :datasets="lineChartDatasets"
              :options="lineChartOptions"
              title="Weekly Task Flow"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col
        cols="12"
        md="6"
      >
        <v-card>
          <v-card-title>
            Donut Chart
          </v-card-title>
          <v-divider />
          <v-card-text>
            <AppDonutChart
              :height="320"
              :labels="donutChartLabels"
              :datasets="donutChartDatasets"
              :tooltip-value-formatter="value => `${numUtils.format(value)}h`"
              title="Project Time Allocation"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
