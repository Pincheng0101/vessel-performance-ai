import { ResourceConstant } from '~/constants';

class resourceUtils {
  /**
   * Generates a URL path for a given resource type and optional ID.
   *
   * @static
   * @param {string} type - The resource type (e.g., WORKFLOW, AGENT, or other resource types from ResourceConstant.Type)
   * @param {string} [id] - Optional resource ID. If provided, appends the ID to the URL path
   * @returns {string} The generated URL path. Returns either:
   *   - For WORKFLOW or AGENT types: `/{path}` or `/{path}/{id}`
   *   - For other types: `/resources/{path}` or `/resources/{path}/{id}`
   */
  static getUrl(type, id) {
    const path = findField(ResourceConstant.Type, type, 'path');
    const listUrl = type === ResourceConstant.Type.WORKFLOW.value || type === ResourceConstant.Type.AGENT.value
      ? `/${path}`
      : `/resources/${path}`;
    return id ? `${listUrl}/${id}` : listUrl;
  }
}

export default resourceUtils;
