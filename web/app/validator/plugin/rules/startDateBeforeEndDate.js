import { isEmpty } from '@kklab/fortress-validator-utils';

const getTimestamp = (v) => {
  if (v instanceof Date) return v.getTime();
  return new Date(v).getTime();
};

const startDateBeforeEndDate = endDate => (v) => {
  if (isEmpty(v) || isEmpty(endDate)) return true;
  return getTimestamp(v) <= getTimestamp(endDate);
};

export default startDateBeforeEndDate;
