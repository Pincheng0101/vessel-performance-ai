import { isEmpty } from '@kklab/fortress-validator-utils';

const stringContainsAnyUppercase = () => (v) => {
  if (isEmpty(v)) return false;
  return /[A-Z]/.test(v);
};

export default stringContainsAnyUppercase;
