import { ResourceConstant } from '~/constants';
import { ResourceResponseFactory } from '~/models/server';

class MultiRequestGetResponse {
  constructor(
    responses,
  ) {
    Object.values(ResourceConstant.Type).forEach((item) => {
      this[item.listKey] = {};
    });

    for (const response of Object.values(responses)) {
      const { code, body } = response;
      if (code !== 200) continue;

      const [entry] = Object.entries(body);
      const [type, value] = entry;
      const instance = ResourceResponseFactory.create(type, value);

      const listKey = findField(ResourceConstant.Type, type, 'listKey');
      if (listKey) {
        this[listKey][instance.id] = instance;
      }
    }
  }
}

export default MultiRequestGetResponse;
