/**
 * Returns the type of a value as a lowercase string.
 * Supports primitive types, Array, Date, RegExp, Function, and custom classes.
 *
 * @param {*} value - The value to check.
 * @returns {string} The type name of the value in lowercase (e.g., 'string', 'number', 'array', 'object', 'null', 'undefined', 'function', 'date', 'regexp', 'myclass').
 */
const getType = (value) => {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
};

export default getType;
