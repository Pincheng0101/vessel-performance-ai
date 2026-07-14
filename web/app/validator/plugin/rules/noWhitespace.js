import { isEmpty } from '@kklab/fortress-validator-utils';

const noWhitespace = () => (v) => {
  if (isEmpty(v)) return false;
  return !/\s/.test(v);
};

export default noWhitespace;
