import { ResourceConstant, SearchEngineConstant } from '~/constants';

/**
 * @import { UsageResourceItem } from './UsageResource.d'
 */

const SEARCH_ENGINE_RESOURCE_CONFIG = ResourceConstant.Type.SEARCH_ENGINE;
const AGENT_ID_KEY = ResourceConstant.Type.AGENT.id;
const WORKFLOW_ID_KEY = ResourceConstant.Type.WORKFLOW.id;
const getOriginalResourceIdKey = resourceIdKey => `original${resourceIdKey.charAt(0).toUpperCase()}${resourceIdKey.slice(1)}`;
const ORIGINAL_AGENT_ID_KEY = getOriginalResourceIdKey(AGENT_ID_KEY);
const ORIGINAL_WORKFLOW_ID_KEY = getOriginalResourceIdKey(WORKFLOW_ID_KEY);
const USAGE_ENTITY_KEY_CONFIG_BY_TYPE = Object.freeze({
  [ResourceConstant.Type.AGENT.value]: {
    idKey: AGENT_ID_KEY,
    originalIdKey: ORIGINAL_AGENT_ID_KEY,
  },
  [ResourceConstant.Type.WORKFLOW.value]: {
    idKey: WORKFLOW_ID_KEY,
    originalIdKey: ORIGINAL_WORKFLOW_ID_KEY,
  },
});

const buildResourceDetailRow = ({
  callCount,
  iconPath,
  id,
  link,
  name,
  resourceId,
  totalCallCount,
  type,
}) => {
  const numericCallCount = numUtils.toFiniteNumber(callCount);
  const share = totalCallCount ? (numericCallCount / totalCallCount) * 100 : 0;

  return {
    id,
    callCount: numericCallCount,
    iconPath,
    link,
    name,
    resourceId,
    share,
    type: type || '-',
  };
};

const getSearchEngineTypeTitle = (searchEngineType) => {
  if (!searchEngineType) {
    return '';
  }

  return findField(SearchEngineConstant.Type, searchEngineType, 'title') || strUtils.toTitleCase(String(searchEngineType));
};

const getSearchEngineTypeIconPath = searchEngineType => findField(SearchEngineConstant.Type, searchEngineType, 'iconPath');

const buildSearchEngineDetailRows = ({
  queryCountMapBySearchEngineType,
  totalQueries,
}) => [...queryCountMapBySearchEngineType.entries()]
  .map(([searchEngineType, queryCount]) => ({
    id: searchEngineType || 'unknown',
    queryCount,
    searchEngineType,
  }))
  .sort((left, right) => right.queryCount - left.queryCount)
  .map(row => buildResourceDetailRow({
    callCount: row.queryCount,
    iconPath: getSearchEngineTypeIconPath(row.searchEngineType),
    id: row.id,
    totalCallCount: totalQueries,
    type: getSearchEngineTypeTitle(row.searchEngineType),
  }));

const getSearchEngineResource = searchEngineId => ({
  resourceId: searchEngineId,
  resourceType: ResourceConstant.Type.SEARCH_ENGINE.value,
});

const buildSearchEngineInstanceDetailRows = ({
  getResourceLink,
  getResourceName,
  queryCountMapBySearchEngineInstance,
  totalQueries,
}) => [...queryCountMapBySearchEngineInstance.values()]
  .sort((left, right) => right.queryCount - left.queryCount)
  .map((row) => {
    const searchEngineTypeTitle = getSearchEngineTypeTitle(row.searchEngineType);
    const searchEngineResource = getSearchEngineResource(row.searchEngineId);

    return buildResourceDetailRow({
      callCount: row.queryCount,
      iconPath: getSearchEngineTypeIconPath(row.searchEngineType),
      id: row.id,
      link: typeof getResourceLink === 'function' ? getResourceLink(searchEngineResource) : null,
      name: (typeof getResourceName === 'function' ? getResourceName(searchEngineResource) : '')
        || row.searchEngineId
        || searchEngineTypeTitle,
      resourceId: searchEngineResource.resourceId,
      totalCallCount: totalQueries,
      type: searchEngineTypeTitle,
    });
  });

class UsageResourceDataHelper {
  static getUsageResourceIdKey(resourceType) {
    return USAGE_ENTITY_KEY_CONFIG_BY_TYPE[resourceType]?.idKey;
  }

  static getUsageOriginalResourceIdKey(resourceType) {
    return USAGE_ENTITY_KEY_CONFIG_BY_TYPE[resourceType]?.originalIdKey;
  }

  /**
   * Flattens entity breakdown rows and search-engine items into a list of
   * `{ resourceId, resourceType }` refs for resource-map lookups. Entries with a
   * missing id or type are dropped; duplicates are left for the caller to dedupe.
   *
   * @param {Object} options
   * @param {{ resourceId?: string, resourceType?: string }[]} [options.resourceRows=[]]
   * @param {{ detailRows?: { resourceId?: string }[] }[]} [options.searchEngineItems=[]]
   * @returns {{ resourceId: string, resourceType: string }[]}
   */
  static collectResourceRefs({
    resourceRows = [],
    searchEngineItems = [],
  } = {}) {
    const resources = [];

    const addResource = ({ resourceId, resourceType }) => {
      if (!resourceId || !resourceType) {
        return;
      }

      resources.push({ resourceId, resourceType });
    };

    resourceRows.forEach(addResource);

    searchEngineItems.forEach(searchEngineItem => (searchEngineItem?.detailRows ?? []).forEach(detailRow => addResource({
      resourceId: detailRow.resourceId,
      resourceType: SEARCH_ENGINE_RESOURCE_CONFIG.value,
    })));

    return resources;
  }

  /**
   * Builds a deduplicated list of resource refs from one or more row sets. Each source
   * reads `idField` off its `rows`, drops blank ids, dedupes, and tags the rest with
   * `resourceType`.
   *
   * @param {{ rows?: Object[], idField: string, resourceType: string }[]} [sources=[]]
   * @returns {{ resourceId: string, resourceType: string }[]}
   */
  static collectResourceRefsFromRows(sources = []) {
    return sources.flatMap(({ rows, idField, resourceType }) => (
      arrUtils.deduplicate((rows ?? []).map(row => row[idField]).filter(Boolean))
        .map(resourceId => ({ resourceId, resourceType }))
    ));
  }

  /**
   * Aggregates search engine usage rows into a resource item with type-level details.
   *
   * @param {Object} options
   * @param {Object[]} [options.rows=[]] - Normalized search engine usage rows.
   * @returns {UsageResourceItem} Resource item grouped by search engine type.
   */
  static buildSearchEngineItem({
    rows = [],
  } = {}) {
    const searchEngineRows = Array.isArray(rows) ? rows : [];
    const totalQueries = searchEngineRows.reduce((sum, row) => sum + numUtils.toFiniteNumber(row.queryCount), 0);
    const instanceCount = new Set(searchEngineRows.map(row => row.searchEngineId).filter(Boolean)).size;
    const queryCountMapBySearchEngineType = searchEngineRows.reduce((map, row) => {
      const searchEngineType = row.searchEngineType || '';

      map.set(searchEngineType, (map.get(searchEngineType) ?? 0) + numUtils.toFiniteNumber(row.queryCount));

      return map;
    }, new Map());

    return {
      detailRows: buildSearchEngineDetailRows({
        queryCountMapBySearchEngineType,
        totalQueries,
      }),
      icon: SEARCH_ENGINE_RESOURCE_CONFIG.icon,
      i18nTitle: SEARCH_ENGINE_RESOURCE_CONFIG.i18nTitle,
      instanceCount,
      resourceType: SEARCH_ENGINE_RESOURCE_CONFIG.value,
      totalCallCount: totalQueries,
    };
  }

  /**
   * Aggregates search engine usage rows into a resource list item with instance-level details.
   *
   * @param {Object} options
   * @param {Function} [options.getResourceLink] - Function that resolves a resource link from the page/composable resource map.
   * @param {Function} [options.getResourceName] - Function that resolves a resource name from the page/composable resource map.
   * @param {Object[]} [options.rows=[]] - Normalized search engine usage rows.
   * @returns {UsageResourceItem} Resource list item for search engine usage.
   */
  static buildSearchEngineItemWithInstances({
    getResourceLink,
    getResourceName,
    rows = [],
  } = {}) {
    const searchEngineRows = Array.isArray(rows) ? rows : [];
    const totalQueries = searchEngineRows.reduce((sum, row) => sum + numUtils.toFiniteNumber(row.queryCount), 0);
    const instanceCount = new Set(searchEngineRows.map(row => row.searchEngineId).filter(Boolean)).size;
    const queryCountMapBySearchEngineInstance = searchEngineRows.reduce((map, row) => {
      const searchEngineId = row.searchEngineId || '';
      const searchEngineType = row.searchEngineType || '';
      const key = `${searchEngineId || 'unknown'}:${searchEngineType}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          queryCount: 0,
          searchEngineId,
          searchEngineType,
        });
      }

      const item = map.get(key);

      item.queryCount += numUtils.toFiniteNumber(row.queryCount);

      return map;
    }, new Map());

    return {
      detailRows: buildSearchEngineInstanceDetailRows({
        getResourceLink,
        getResourceName,
        queryCountMapBySearchEngineInstance,
        totalQueries,
      }),
      icon: SEARCH_ENGINE_RESOURCE_CONFIG.icon,
      i18nTitle: SEARCH_ENGINE_RESOURCE_CONFIG.i18nTitle,
      instanceCount,
      resourceType: SEARCH_ENGINE_RESOURCE_CONFIG.value,
      totalCallCount: totalQueries,
    };
  }

  /**
   * Builds search engine resource items keyed by an entity id.
   *
   * @param {Object} options
   * @param {string} options.entityKey - Normalized row key to use as the entity id.
   * @param {Object[]} [options.rows=[]] - Normalized search engine usage rows.
   * @returns {Map<string, UsageResourceItem>} Search engine resource item by entity id.
   */
  static mapSearchEngineByEntity({
    entityKey,
    rows = [],
  } = {}) {
    const summaryByEntityId = (Array.isArray(rows) ? rows : []).reduce((map, row) => {
      const entityId = row?.[entityKey];

      if (!entityId) {
        return map;
      }

      if (!map.has(entityId)) {
        map.set(entityId, {
          queryCountMapBySearchEngineType: new Map(),
          searchEngineIds: new Set(),
          totalQueries: 0,
        });
      }

      const summary = map.get(entityId);
      const searchEngineType = row.searchEngineType || '';
      const queryCount = numUtils.toFiniteNumber(row.queryCount);

      summary.totalQueries += queryCount;
      summary.queryCountMapBySearchEngineType.set(
        searchEngineType,
        (summary.queryCountMapBySearchEngineType.get(searchEngineType) ?? 0) + queryCount,
      );

      if (row.searchEngineId) {
        summary.searchEngineIds.add(row.searchEngineId);
      }

      return map;
    }, new Map());

    return new Map(
      [...summaryByEntityId.entries()]
        .map(([entityId, summary]) => [
          entityId,
          {
            detailRows: buildSearchEngineDetailRows({
              queryCountMapBySearchEngineType: summary.queryCountMapBySearchEngineType,
              totalQueries: summary.totalQueries,
            }),
            icon: SEARCH_ENGINE_RESOURCE_CONFIG.icon,
            i18nTitle: SEARCH_ENGINE_RESOURCE_CONFIG.i18nTitle,
            instanceCount: summary.searchEngineIds.size,
            resourceType: SEARCH_ENGINE_RESOURCE_CONFIG.value,
            totalCallCount: summary.totalQueries,
          },
        ]),
    );
  }

  /**
   * Builds search engine resource items keyed by an entity id with instance-level details.
   *
   * @param {Object} options
   * @param {string} options.entityKey - Normalized row key to use as the entity id.
   * @param {Function} [options.getResourceLink] - Function that resolves a resource link from the page/composable resource map.
   * @param {Function} [options.getResourceName] - Function that resolves a resource name from the page/composable resource map.
   * @param {Object[]} [options.rows=[]] - Normalized search engine usage rows.
   * @returns {Map<string, UsageResourceItem>} Search engine resource item by entity id.
   */
  static mapSearchEngineWithInstancesByEntity({
    entityKey = 'entityId',
    getResourceLink,
    getResourceName,
    rows = [],
  } = {}) {
    const summaryByEntityId = (Array.isArray(rows) ? rows : []).reduce((map, row) => {
      const entityId = row?.[entityKey];

      if (!entityId) {
        return map;
      }

      if (!map.has(entityId)) {
        map.set(entityId, {
          queryCountMapBySearchEngineInstance: new Map(),
          searchEngineIds: new Set(),
          totalQueries: 0,
        });
      }

      const summary = map.get(entityId);
      const searchEngineId = row.searchEngineId || '';
      const searchEngineType = row.searchEngineType || '';
      const key = `${searchEngineId || 'unknown'}:${searchEngineType}`;
      const queryCount = numUtils.toFiniteNumber(row.queryCount);

      if (!summary.queryCountMapBySearchEngineInstance.has(key)) {
        summary.queryCountMapBySearchEngineInstance.set(key, {
          id: key,
          queryCount: 0,
          searchEngineId,
          searchEngineType,
        });
      }

      summary.totalQueries += queryCount;
      summary.queryCountMapBySearchEngineInstance.get(key).queryCount += queryCount;

      if (row.searchEngineId) {
        summary.searchEngineIds.add(row.searchEngineId);
      }

      return map;
    }, new Map());

    return new Map(
      [...summaryByEntityId.entries()]
        .map(([entityId, summary]) => [
          entityId,
          {
            detailRows: buildSearchEngineInstanceDetailRows({
              getResourceLink,
              getResourceName,
              queryCountMapBySearchEngineInstance: summary.queryCountMapBySearchEngineInstance,
              totalQueries: summary.totalQueries,
            }),
            icon: SEARCH_ENGINE_RESOURCE_CONFIG.icon,
            i18nTitle: SEARCH_ENGINE_RESOURCE_CONFIG.i18nTitle,
            instanceCount: summary.searchEngineIds.size,
            resourceType: SEARCH_ENGINE_RESOURCE_CONFIG.value,
            totalCallCount: summary.totalQueries,
          },
        ]),
    );
  }

  /**
   * Maps search engine usage by breakdown table row IDs.
   * This method handles the ID format conversion from normalized rows to breakdown table format.
   *
   * @param {Object} options
   * @param {string} options.currentEntityId - The current entity's ID (e.g., 'agent-123' or 'workflow-456').
   * @param {string} options.entityType - The entity type ('agent' or 'workflow').
   * @param {Function} [options.getResourceLink] - Function that resolves a resource link from the page/composable resource map.
   * @param {Function} [options.getResourceName] - Function that resolves a resource name from the page/composable resource map.
   * @param {boolean} [options.isCaller=false] - True for caller breakdown (uses orig_* fields), false for source breakdown.
   * @param {Object[]} [options.rows=[]] - Normalized search engine usage rows.
   * @returns {Map<string, UsageResourceItem>} Map keyed by breakdown table row ID format.
   */
  static mapSearchEngineByBreakdownRow({
    currentEntityId,
    entityType,
    getResourceLink,
    getResourceName,
    isCaller = false,
    rows = [],
  } = {}) {
    const enhancedRows = (Array.isArray(rows) ? rows : []).map((row) => {
      const agentId = isCaller ? row[ORIGINAL_AGENT_ID_KEY] : row[AGENT_ID_KEY];
      const workflowId = isCaller ? row[ORIGINAL_WORKFLOW_ID_KEY] : row[WORKFLOW_ID_KEY];

      const isSelfRow = !isCaller && (
        (entityType === ResourceConstant.Type.AGENT.value && agentId === currentEntityId)
        || (entityType === ResourceConstant.Type.WORKFLOW.value && workflowId === currentEntityId)
      );

      let breakdownRowId;
      if (isSelfRow) {
        breakdownRowId = `self-${entityType}`;
      } else if (agentId) {
        breakdownRowId = `${ResourceConstant.Type.AGENT.value}:${agentId}`;
      } else if (workflowId) {
        breakdownRowId = `${ResourceConstant.Type.WORKFLOW.value}:${workflowId}`;
      }

      return {
        ...row,
        entityId: breakdownRowId || null,
      };
    });

    return this.mapSearchEngineWithInstancesByEntity({
      getResourceLink,
      getResourceName,
      rows: enhancedRows,
    });
  }

  /**
   * Splits L3 agent/workflow detail search engine rows according to the root-tree/own-query spec.
   *
   * @param {Object} options
   * @param {string} options.currentEntityId - The current agent or workflow id.
   * @param {string} options.entityType - ResourceConstant.Type.AGENT.value or ResourceConstant.Type.WORKFLOW.value.
   * @param {Object[]} [options.originalRows=[]] - Root-tree query rows (Q1).
   * @param {Object[]} [options.ownRows=[]] - Own activity query rows (Q2).
   * @returns {{ overviewRows: Object[], asRootRows: Object[], callerRows: Object[], sourceBreakdownRows: Object[] }} Search rows grouped by detail-page usage section.
   */
  static buildDetailSearchEngineUsageRows({
    currentEntityId,
    entityType,
    originalRows = [],
    ownRows = [],
  } = {}) {
    const config = USAGE_ENTITY_KEY_CONFIG_BY_TYPE[entityType];

    if (!config || !currentEntityId) {
      return {
        asRootRows: [],
        callerRows: [],
        overviewRows: [],
        sourceBreakdownRows: [],
      };
    }

    const safeOriginalRows = Array.isArray(originalRows) ? originalRows : [];
    const safeOwnRows = Array.isArray(ownRows) ? ownRows : [];
    const rootRows = safeOwnRows.filter(row => row[config.originalIdKey] === currentEntityId);
    const delegatedRows = safeOriginalRows.filter(row => row[config.idKey] !== currentEntityId);
    const callerRows = safeOwnRows.filter(row => row[config.originalIdKey] !== currentEntityId);
    const asRootRows = [
      ...rootRows,
      ...delegatedRows,
    ];
    const sourceBreakdownRows = [
      ...rootRows.map(row => ({
        ...row,
        [config.idKey]: currentEntityId,
      })),
      ...delegatedRows,
    ];

    return {
      asRootRows,
      callerRows,
      overviewRows: safeOwnRows,
      sourceBreakdownRows,
    };
  }

  /**
   * Filters, sorts, and assigns colors to resource list items.
   *
   * @param {Object} options
   * @param {Function} options.getColor - Function to get color by index.
   * @param {UsageResourceItem[]} [options.items=[]] - Resource list items.
   * @returns {UsageResourceItem[]} Sorted resource list items with colors assigned.
   */
  static buildResourceItems({
    getColor,
    items = [],
  } = {}) {
    return (Array.isArray(items) ? items : [])
      .filter(item => numUtils.toFiniteNumber(item?.totalCallCount) > 0)
      .sort((left, right) => numUtils.toFiniteNumber(right.totalCallCount) - numUtils.toFiniteNumber(left.totalCallCount))
      .map((item, index) => {
        const color = getColor(index);

        return {
          ...item,
          color,
          detailRows: (Array.isArray(item.detailRows) ? item.detailRows : [])
            .map(detail => ({
              ...detail,
              color,
            })),
        };
      });
  }
}

export default UsageResourceDataHelper;
