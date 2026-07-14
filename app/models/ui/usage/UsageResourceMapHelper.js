import { ResourceConstant } from '~/constants';
import { MultiRequestResourceQuery } from '~/models/server/multiRequest';

const DEFAULT_RESOURCE_TYPES = Object.freeze([
  ResourceConstant.Type.AGENT.value,
  ResourceConstant.Type.WORKFLOW.value,
  ResourceConstant.Type.SEARCH_ENGINE.value,
]);

class UsageResourceMapHelper {
  static get defaultResourceTypes() {
    return DEFAULT_RESOURCE_TYPES;
  }

  static getResourceTypeConfig(resourceType) {
    return Object.values(ResourceConstant.Type).find(item => item.value === resourceType);
  }

  static createEmptyResourceMap(resourceTypes = DEFAULT_RESOURCE_TYPES) {
    return resourceTypes.reduce((acc, resourceType) => {
      acc[resourceType] = {};
      return acc;
    }, {});
  }

  /**
   * Builds deduplicated multi-request queries from resource refs, skipping refs with a
   * missing id or an unknown resource type.
   *
   * @param {{ resourceId?: string, resourceType?: string }[]} [resources=[]]
   * @returns {MultiRequestResourceQuery[]}
   */
  static buildResourceQueries(resources = []) {
    const idsByType = new Map();

    (Array.isArray(resources) ? resources : []).forEach((resource) => {
      const { resourceId, resourceType } = resource;

      if (!resourceId || !UsageResourceMapHelper.getResourceTypeConfig(resourceType)) {
        return;
      }

      const ids = idsByType.get(resourceType) ?? new Set();

      ids.add(resourceId);
      idsByType.set(resourceType, ids);
    });

    return [...idsByType.entries()].flatMap(([type, ids]) => (
      [...ids].map(id => new MultiRequestResourceQuery({
        id,
        type,
      }))
    ));
  }

  /**
   * Shapes a multi-request response into a `{ [resourceType]: { [id]: { name } } }` map.
   *
   * @param {Object} options
   * @param {Object} [options.data={}] - Multi-request response data keyed by list key.
   * @param {string[]} [options.resourceTypes] - Resource types to include.
   * @returns {Object}
   */
  static buildResourceMap({
    data = {},
    resourceTypes = DEFAULT_RESOURCE_TYPES,
  } = {}) {
    const map = UsageResourceMapHelper.createEmptyResourceMap(resourceTypes);

    resourceTypes.forEach((resourceType) => {
      const typeConfig = UsageResourceMapHelper.getResourceTypeConfig(resourceType);

      if (!typeConfig?.listKey) {
        return;
      }

      const resources = Object.values(data?.[typeConfig.listKey] ?? {});

      map[resourceType] = resources.reduce((acc, item) => {
        acc[item.id] = {
          name: item.name || item.id,
        };
        return acc;
      }, {});
    });

    return map;
  }
}

export default UsageResourceMapHelper;
