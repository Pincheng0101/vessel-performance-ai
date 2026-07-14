import { ChartConstant } from '~/constants';

const getColorAtIndex = (colors, index) => {
  if (!colors?.length) {
    return ChartConstant.ColorPalette.PRIMARY;
  }

  const colorIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const normalizedIndex = ((colorIndex % colors.length) + colors.length) % colors.length;

  return colors[normalizedIndex];
};

export function useChartColors() {
  const { isDarkTheme } = useCustomTheme();

  const getThemePalette = (palette) => {
    return (isDarkTheme.value ? palette.DARK : palette.LIGHT);
  };

  const getPaletteColor = (palette, index) => getColorAtIndex(getThemePalette(palette), index);
  const getSecondaryColor = index => getPaletteColor(ChartConstant.ColorPalette.SECONDARY, index);
  const getOthersColor = () => getThemePalette(ChartConstant.ColorPalette.OTHERS);
  const getPaletteColorByKey = (paletteKey, index = 0) => {
    switch (paletteKey) {
      case ChartConstant.ColorPaletteKey.PRIMARY:
        return ChartConstant.ColorPalette.PRIMARY;
      case ChartConstant.ColorPaletteKey.OTHERS:
        return getOthersColor();
      case ChartConstant.ColorPaletteKey.SECONDARY:
      default:
        return getSecondaryColor(index);
    }
  };
  const getRankedSegmentColorMap = ({
    items = [],
    keyField,
    valueField,
    valueGetter = null,
    segmentLimit = ChartConstant.Donut.SEGMENT_LIMIT,
  } = {}) => (
    Object.fromEntries(
      (Array.isArray(items) ? items : [])
        .map((item, index) => {
          const rawValue = typeof valueGetter === 'function'
            ? valueGetter(item)
            : item?.[valueField];
          const value = Number(rawValue ?? 0);

          return {
            index,
            key: item?.[keyField],
            value: Number.isFinite(value) ? value : 0,
          };
        })
        .filter(item => item.key !== undefined && item.key !== null && item.key !== '')
        .sort((left, right) => right.value - left.value || left.index - right.index)
        .map((item, rank) => [
          item.key,
          segmentLimit && rank >= segmentLimit ? getOthersColor() : getSecondaryColor(rank),
        ]),
    )
  );

  return {
    getPrimaryColor: () => ChartConstant.ColorPalette.PRIMARY,
    getSecondaryColor,
    getOthersColor,
    getPaletteColorByKey,
    getRankedSegmentColorMap,
  };
}
