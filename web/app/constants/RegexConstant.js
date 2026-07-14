const Jinja = Object.freeze({
  VARIABLE_REGEX: /\{\{\s*(\w+)\s*\}\}/g,
});

const Sql = Object.freeze({
  PARAMETER_REGEX: /%\(([^)]+)\)s/g,
});

export {
  Jinja,
  Sql,
};
