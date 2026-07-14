import { isEmpty } from '@kklab/fortress-validator-utils';

const stringContainsAnyNumber = () => (v) => {
  if (isEmpty(v)) return false;
  return /[0-9]/.test(v);
};

export default stringContainsAnyNumber;
