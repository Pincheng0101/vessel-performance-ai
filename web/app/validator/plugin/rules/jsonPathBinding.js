import { isEmpty } from '@kklab/fortress-validator-utils';

const jsonPathBinding = () => (v) => {
  if (isEmpty(v)) return false;
  try {
    const object = JSON.parse(v);
    const invalidJsonPathBindings = referencePathUtils.findInvalidJsonPathBindings(object);
    return invalidJsonPathBindings.length === 0;
  } catch {
    return false;
  }
};

export default jsonPathBinding;
