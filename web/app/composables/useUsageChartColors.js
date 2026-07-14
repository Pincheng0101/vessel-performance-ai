import { UsageConstant } from '~/constants';

const datasetTypeConfigByValue = Object.freeze(
  Object.fromEntries(
    Object.values(UsageConstant.DatasetType).map(item => [item.value, item]),
  ),
);

export function useUsageChartColors() {
  const {
    getPaletteColorByKey,
    getRankedSegmentColorMap,
  } = useChartColors();

  const getUsageDatasetTypeColor = (datasetType, fallbackIndex = 0) => {
    const chartColor = datasetTypeConfigByValue[datasetType]?.chartColor;
    const colorIndex = Number.isFinite(chartColor?.index) ? chartColor.index : fallbackIndex;

    return getPaletteColorByKey(chartColor?.palette, colorIndex);
  };

  const getUsageModelColorMap = ({
    rows = [],
    keyField = 'model',
    valueField = UsageConstant.MetricField.TOTAL_TOKENS.value,
    valueGetter = null,
    segmentLimit,
  } = {}) => getRankedSegmentColorMap({
    items: rows,
    keyField,
    valueField,
    valueGetter,
    segmentLimit,
  });

  return {
    getUsageDatasetTypeColor,
    getUsageModelColorMap,
  };
}
