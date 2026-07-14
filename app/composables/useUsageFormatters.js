import { ResourceConstant } from '~/constants';

export default function useUsageFormatters() {
  const { t } = useI18n();

  const formatUsageCount = (value, i18nKey) => {
    const count = numUtils.toFiniteNumber(value);

    return strUtils.addSpacesAroundAscii(t(i18nKey, { count: numUtils.format(count) }, count));
  };

  const formatResourceInstanceCount = value => formatUsageCount(value, '__labelUsageInstanceCount');

  const formatUsageQueryCount = value => formatUsageCount(value, '__labelUsageQueryCount');

  const formatUsageTotalQueryCount = value => formatUsageCount(value, '__labelUsageTotalQueryCount');

  const formatResourceCallCount = (resourceType, value) => {
    switch (resourceType) {
      case ResourceConstant.Type.SEARCH_ENGINE.value:
        return formatUsageQueryCount(value);
      default:
        return numUtils.format(numUtils.toFiniteNumber(value));
    }
  };

  const formatResourceTotalCallCount = (resourceType, value) => {
    switch (resourceType) {
      case ResourceConstant.Type.SEARCH_ENGINE.value:
        return formatUsageTotalQueryCount(value);
      default:
        return numUtils.format(numUtils.toFiniteNumber(value));
    }
  };

  return {
    formatResourceInstanceCount,
    formatUsageQueryCount,
    formatResourceCallCount,
    formatResourceTotalCallCount,
  };
}
