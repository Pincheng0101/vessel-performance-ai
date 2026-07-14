import { ResourceConstant } from '~/constants';

/**
 * import { MultiRequestResourceQuery } from '~/models/server/multiRequest';
 */

class MultiRequestGetRequest {
  /**
   * @param {MultiRequestResourceQuery[]} resourceQueries
   * @returns {Object}
   */
  static toRequestPayload(resourceQueries) {
    const requests = resourceQueries.reduce((acc, query) => {
      const { id, type } = query;
      const path = findField(ResourceConstant.Type, type, 'getEndpoint');
      const body = {
        [findField(ResourceConstant.Type, type, 'getEndpointId')]: id,
      };

      acc[id] = { path, body };
      return acc;
    }, {});

    return {
      requests,
    };
  }
}

export default MultiRequestGetRequest;
