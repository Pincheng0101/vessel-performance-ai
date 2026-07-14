import { isEmpty } from '@kklab/fortress-validator-utils';

const stringContainsAnySymbol = () => (v) => {
  if (isEmpty(v)) return false;
  return /[\^$*.[\]{}()?"!@#%&/\\,><':;|_~`=+-]/.test(v);
};

export default stringContainsAnySymbol;
