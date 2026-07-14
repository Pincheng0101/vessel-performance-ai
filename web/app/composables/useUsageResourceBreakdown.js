import { ResourceConstant } from '~/constants';
import { UsageResourceDataHelper } from '~/models/ui/usage';

/**
 * Composable for building resource items and chip items for usage pages.
 *
 * @param {Object} options
 * @param {string} [options.entityKey] - The key to group activities by (e.g., 'agentId', 'workflowId').
 * @param {Function} [options.entityIdGetter] - Function to extract entity ID from a table item.
 * @param {Function} [options.getResourceLink] - Function to resolve resource links for instance-level rows.
 * @param {Function} [options.getResourceName] - Function to resolve resource names for instance-level rows.
 * @param {Function} [options.mapBuilder] - Optional custom builder for the resource item map.
 * @param {import('vue').ComputedRef<Object[]>} options.rows - Reactive reference to usage rows.
 * @param {boolean} [options.withInstances=false] - Whether to build instance-level resource details.
 * @returns {Object} Methods to get resource items and chip items.
 */
export default function useUsageResourceBreakdown({
  entityKey,
  entityIdGetter,
  getResourceLink,
  getResourceName,
  mapBuilder,
  rows,
  withInstances = false,
} = {}) {
  const { t } = useI18n();
  const { getSecondaryColor } = useChartColors();
  const normalizedRows = computed(() => rows?.value || []);

  const buildSearchEngineItem = () => {
    if (withInstances) {
      return UsageResourceDataHelper.buildSearchEngineItemWithInstances({
        getResourceLink,
        getResourceName,
        rows: normalizedRows.value,
      });
    }

    return UsageResourceDataHelper.buildSearchEngineItem({
      rows: normalizedRows.value,
    });
  };

  const buildSearchEngineItemMap = () => {
    if (!entityKey) {
      return new Map();
    }

    if (typeof mapBuilder === 'function') {
      return mapBuilder({
        entityKey,
        getResourceLink,
        getResourceName,
        rows: normalizedRows.value,
      });
    }

    if (withInstances) {
      return UsageResourceDataHelper.mapSearchEngineWithInstancesByEntity({
        entityKey,
        getResourceLink,
        getResourceName,
        rows: normalizedRows.value,
      });
    }

    return UsageResourceDataHelper.mapSearchEngineByEntity({
      entityKey,
      rows: normalizedRows.value,
    });
  };

  const totalResourceItems = computed(() => (
    UsageResourceDataHelper.buildResourceItems({
      getColor: getSecondaryColor,
      items: [buildSearchEngineItem()],
    })
  ));

  const itemMap = computed(() => (
    buildSearchEngineItemMap()
  ));

  const getResourceItems = (item) => {
    if (typeof entityIdGetter !== 'function') {
      return [];
    }

    const entityId = entityIdGetter(item);

    return UsageResourceDataHelper.buildResourceItems({
      getColor: getSecondaryColor,
      items: [itemMap.value.get(entityId)],
    });
  };

  const getResourceChipItems = (item) => {
    return getResourceItems(item).map((resourceItem) => {
      const resourceTypeConfig = Object.values(ResourceConstant.Type)
        .find(type => type.value === resourceItem.resourceType);

      return {
        id: resourceItem.resourceType,
        icon: resourceTypeConfig?.icon,
        iconPath: resourceTypeConfig?.iconPath,
        iconPathMaskColor: resourceTypeConfig?.iconPathMaskColor,
        title: t(resourceItem.i18nTitle),
      };
    });
  };

  const hasResourceItems = item => getResourceItems(item).length > 0;

  return {
    hasResourceItems,
    totalResourceItems,
    getResourceItems,
    getResourceChipItems,
  };
}
