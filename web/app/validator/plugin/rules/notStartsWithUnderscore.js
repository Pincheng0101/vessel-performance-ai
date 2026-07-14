import { isEmpty } from '@kklab/fortress-validator-utils';

const notStartsWithUnderscore = () => (v) => {
  if (isEmpty(v)) return true;
  return !String(v).startsWith('_');
};

export default notStartsWithUnderscore;
