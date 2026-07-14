import { isEmpty } from '@kklab/fortress-validator-utils';

const getTimestamp = (v) => {
  if (v instanceof Date) return v.getTime();
  return new Date(v).getTime();
};

const endDateAfterStartDate = startDate => (v) => {
  if (isEmpty(v) || isEmpty(startDate)) return true;
  return getTimestamp(v) >= getTimestamp(startDate);
};

export default endDateAfterStartDate;
