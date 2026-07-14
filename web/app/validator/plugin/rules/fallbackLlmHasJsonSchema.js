import { isEmpty } from '@kklab/fortress-validator-utils';

const fallbackLlmHasJsonSchema = () => (v) => {
  if (isEmpty(v)) return false;
  if (Array.isArray(v)) {
    const hasItemWithoutJsonSchema = v.some(item => !item.jsonSchema || Object.keys(item.jsonSchema).length === 0);
    if (hasItemWithoutJsonSchema) return false;
  }
  return true;
};

export default fallbackLlmHasJsonSchema;
