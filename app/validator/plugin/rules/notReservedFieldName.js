import { isEmpty } from '@kklab/fortress-validator-utils';

// Python keywords (keyword.kwlist) — using these as a field name would be
// rewritten by the backend's pydantic codegen, so the server rejects them.
const PYTHON_KEYWORDS = [
  'False', 'None', 'True',
  'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue',
  'def', 'del',
  'elif', 'else', 'except',
  'finally', 'for', 'from',
  'global',
  'if', 'import', 'in', 'is',
  'lambda',
  'nonlocal', 'not',
  'or',
  'pass',
  'raise', 'return',
  'try',
  'while', 'with',
  'yield',
  'match', 'case',
];

// Pydantic v2 BaseModel attributes (and v1-compat shims) that shadow a
// generated field; the backend rejects property names that collide with them.
const PYDANTIC_RESERVED_ATTRIBUTES = [
  'model_config', 'model_fields', 'model_extra', 'model_fields_set',
  'model_construct', 'model_copy', 'model_dump', 'model_dump_json',
  'model_json_schema', 'model_parametrized_name', 'model_post_init',
  'model_rebuild', 'model_validate', 'model_validate_json',
  'model_validate_strings',
  'schema', 'copy', 'dict', 'json', 'validate', 'construct', 'fields',
  'parse_obj', 'parse_raw', 'parse_file', 'update_forward_refs',
];

const RESERVED_SET = new Set([...PYTHON_KEYWORDS, ...PYDANTIC_RESERVED_ATTRIBUTES]);

const notReservedFieldName = () => (v) => {
  if (isEmpty(v)) return true;
  return !RESERVED_SET.has(String(v));
};

export default notReservedFieldName;
