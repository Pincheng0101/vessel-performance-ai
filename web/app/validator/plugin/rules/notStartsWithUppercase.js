import { isEmpty } from '@kklab/fortress-validator-utils';

const notStartsWithUppercase = () => (v) => {
  if (isEmpty(v)) return true;
  return !/^[A-Z]/.test(String(v));
};

export default notStartsWithUppercase;
