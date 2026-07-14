import { isEmpty } from '@kklab/fortress-validator-utils';

const json = () => (v) => {
  if (isEmpty(v)) return false;
  // Numeric values are not allowed
  if (Number.isFinite(Number(v))) return false;
  try {
    JSON.parse(v);
    return true;
  } catch {
    return false;
  }
};

export default json;
