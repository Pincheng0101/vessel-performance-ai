import { isEmpty } from '@kklab/fortress-validator-utils';

const jsonPath = () => (v) => {
  if (isEmpty(v)) return false;
  return jsonPathUtils.isJsonPath(v);
};

export default jsonPath;
