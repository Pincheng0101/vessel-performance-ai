/**
 * Finds and returns a field value from a collection of objects based on a specified search key and value.
 *
 * @param {{[key: string]: { [key: string]: string }}} items
 * @param {string} searchValue
 * @param {string} returnKey
 * @param {string} searchKey
 * @returns {string|null}
 */
const findField = (items, searchValue, returnKey, searchKey = 'value') => {
  if (!items) return searchValue;
  const item = Object.values(items).find(item => item[searchKey] === searchValue);
  return item ? item[returnKey] : null;
};

export default findField;
