import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';
import { LinterConstant, WorkflowAslConstant } from '~/codemirror/constants';
import { baseStateMachine, choice, common, fail, map, parallel, pass, state, succeed, task, wait } from '~/validator/aslSchemas';
import jsonPathBinding from '~/validator/plugin/rules/jsonPathBinding';

/**
 * Checks for duplicate keys in the JSON AST and returns a list of error issues.
 *
 * @param {Object} ast - The abstract syntax tree (AST) of the JSON.
 * @returns {Object[]} - A list of issues with location and message for each duplicated key.
 */
const duplicatedKeysValidation = (ast) => {
  const issues = [];
  const traverse = (node) => {
    if (!node) return;
    if (node.type === 'Object') {
      const keyMap = new Map();
      node.children.forEach((prop) => {
        const key = prop.key.value;
        const loc = prop.key.loc;
        keyMap.set(key, [...(keyMap.get(key) || []), loc]);
        traverse(prop.value);
      });
      keyMap.forEach((locations, key) => {
        if (locations.length > 1) {
          locations.forEach((loc) => {
            issues.push({
              from: loc.start,
              to: loc.end,
              message: `duplicate key: '${key}'`,
              severity: LinterConstant.SeverityType.ERROR,
            });
          });
        }
      });
    } else if (node.type === 'Array') {
      node.children.forEach(traverse);
    }
  };
  traverse(ast);
  return issues;
};

/**
 * Checks for unreachable states in a workflow by analyzing which states are defined but never referenced.
 *
 * @param {Object} parsed - The parsed JSON object representing the state machine.
 * @param {Object} ast - The JSON AST, used to locate character positions for diagnostics.
 * @returns {Object[]} - A list of issues (unreachable states or missing StartAt) with their location and messages.
 */
const unreachableStatesValidation = (parsed, ast) => {
  if (!parsed || typeof parsed !== 'object') return [];
  const issues = [];

  const checkStartAt = (ast, path, msg) => {
    const loc = jsonAstUtils.findLocationByPath(ast, path, { locateValue: true });
    issues.push({
      from: loc?.start ?? 0,
      to: loc?.end ?? 1,
      message: msg,
      severity: LinterConstant.SeverityType.ERROR,
    });
  };

  const checkCatchNext = (catchArray, referencedStates) => {
    catchArray.forEach((catchObj) => {
      if (catchObj.Next) {
        referencedStates.add(catchObj.Next);
      }
    });
  };

  const checkScope = (statesObj, startAt, pathToStates, isRootScope = false, referencedStates = new Set()) => {
    if (!statesObj || typeof statesObj !== 'object') return;
    const definedStates = Object.keys(statesObj);

    for (const [stateName, stateObj] of Object.entries(statesObj)) {
      if (!stateObj || typeof stateObj !== 'object') return;

      // Add Next and Default references
      [WorkflowAslConstant.Key.NEXT, WorkflowAslConstant.Key.DEFAULT].forEach((key) => {
        if (stateObj[key]) referencedStates.add(stateObj[key]);
      });

      // Add Choices[].Next references
      if (Array.isArray(stateObj.Choices)) {
        stateObj.Choices.forEach((choice) => {
          if (choice.Next) referencedStates.add(choice.Next);
        });
      }

      // Check Catch[].Next in Task, Catch[].Next in Parallel, Catch[].Next in Map
      if ([WorkflowAslConstant.StateType.TASK, WorkflowAslConstant.StateType.PARALLEL, WorkflowAslConstant.StateType.MAP].includes(stateObj.Type) && Array.isArray(stateObj.Catch)) {
        checkCatchNext(stateObj.Catch, referencedStates);
      }

      // Check branches in Parallel
      if (stateObj.Type === WorkflowAslConstant.StateType.PARALLEL && Array.isArray(stateObj.Branches)) {
        stateObj.Branches.forEach((branch, idx) => {
          const branchReferencedStates = new Set();
          if (branch.States) {
            if (branch.StartAt) {
              branchReferencedStates.add(branch.StartAt);
            }
            checkScope(
              branch.States,
              branch.StartAt || null,
              [...pathToStates, stateName, WorkflowAslConstant.Key.BRANCHES, String(idx), WorkflowAslConstant.Key.STATES],
              false,
              branchReferencedStates,
            );
          }
        });
      }

      // Check ItemProcessor in Map
      if (stateObj.Type === WorkflowAslConstant.StateType.MAP && stateObj.ItemProcessor?.States) {
        const itemProcessorReferencedStates = new Set();
        if (stateObj.ItemProcessor.StartAt) {
          itemProcessorReferencedStates.add(stateObj.ItemProcessor.StartAt);
        }
        checkScope(
          stateObj.ItemProcessor.States,
          stateObj.ItemProcessor.StartAt || null,
          [...pathToStates, stateName, WorkflowAslConstant.Key.ITEM_PROCESSOR, WorkflowAslConstant.Key.STATES],
          false,
          itemProcessorReferencedStates,
        );
      }
    }

    // Add StartAt reference for root scope
    if (isRootScope && startAt) {
      referencedStates.add(startAt);
    } else if (isRootScope && !startAt) {
      checkStartAt(
        ast,
        [...pathToStates.slice(0, -1), WorkflowAslConstant.Key.START_AT],
        'must reference an existing state',
      );
    }

    // Find unreachable states
    definedStates.filter(name => typeof name === 'string' && !referencedStates.has(name)).forEach((stateName) => {
      const keyLoc = jsonAstUtils.findLocationByPath(ast, [...pathToStates, stateName], { locateKey: true });
      issues.push({
        from: keyLoc?.loc.start ?? 0,
        to: keyLoc?.loc.end ?? 1,
        message: 'must reference an existing state',
        severity: LinterConstant.SeverityType.ERROR,
      });
    });
  };

  // Check the root scope
  checkScope(parsed.States, parsed.StartAt, [WorkflowAslConstant.Key.STATES], true);
  return issues;
};

/**
 * Checks if all state references (StartAt, Next, Default, Choices[].Next)
 * point to existing states in the "States" object.
 *
 * @param {Object} parsed - Parsed JSON object.
 * @param {Object} ast - JSON AST for locating errors.
 * @returns {Object[]} - List of issues found.
 */
const targetExistsValidation = (parsed, ast) => {
  const issues = [];
  const pushIssue = (loc) => {
    issues.push({
      from: loc.loc?.start ?? 0,
      to: loc.loc?.end ?? 1,
      message: 'the value must be the name of an existing state',
      severity: LinterConstant.SeverityType.ERROR,
    });
  };
  const validateReferences = (node, path = []) => {
    if (!node || typeof node !== 'object') return;
    // Check StartAt
    if (node.States && typeof node.States === 'object' && node.StartAt) {
      const stateNames = Object.keys(node.States);
      if (!stateNames.includes(node.StartAt)) {
        const startAtPath = path.length === 0 ? [WorkflowAslConstant.Key.START_AT] : [...path, WorkflowAslConstant.Key.START_AT];
        const loc = jsonAstUtils.findLocationByPath(ast, startAtPath, { locateValue: true });
        pushIssue(loc);
      }
    }

    // Check each state's Next, Default, Choices[].Next
    if (node.States && typeof node.States === 'object') {
      const stateNames = Object.keys(node.States);
      Object.entries(node.States).forEach(([stateName, stateObj]) => {
        if (!stateObj || typeof stateObj !== 'object') return;

        [WorkflowAslConstant.Key.NEXT, WorkflowAslConstant.Key.DEFAULT].forEach((key) => {
          if (stateObj[key] && !stateNames.includes(stateObj[key])) {
            const propPath = path.length === 0
              ? [WorkflowAslConstant.Key.STATES, stateName, key]
              : [...path, WorkflowAslConstant.Key.STATES, stateName, key];
            const loc = jsonAstUtils.findLocationByPath(ast, propPath, { locateValue: true });
            pushIssue(loc);
          }
        });

        const validateNextReferences = (key) => {
          if (Array.isArray(stateObj[key])) {
            stateObj[key].forEach((item, idx) => {
              if (item.Next && !stateNames.includes(item.Next)) {
                const nextPath = path.length === 0
                  ? [WorkflowAslConstant.Key.STATES, stateName, WorkflowAslConstant.Key[key.toUpperCase()], String(idx), WorkflowAslConstant.Key.NEXT]
                  : [...path, WorkflowAslConstant.Key.STATES, stateName, WorkflowAslConstant.Key[key.toUpperCase()], String(idx), WorkflowAslConstant.Key.NEXT];
                const loc = jsonAstUtils.findLocationByPath(ast, nextPath, { locateValue: true });
                pushIssue(loc);
              }
            });
          }
        };

        // Catch[].Next in Task, Catch[].Next in Parallel, Catch[].Next in Map
        if (stateObj.Type === WorkflowAslConstant.StateType.TASK
          || stateObj.Type === WorkflowAslConstant.StateType.PARALLEL
          || stateObj.Type === WorkflowAslConstant.StateType.MAP) {
          validateNextReferences(WorkflowAslConstant.Key.CATCH);
        }
        // Choices[].Next
        if (Array.isArray(stateObj.Choices)) {
          validateNextReferences(WorkflowAslConstant.Key.CHOICES);
        }
      });
    }

    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            validateReferences(item, [...path, key, String(index)]);
          }
        });
      } else if (value && typeof value === 'object') {
        validateReferences(value, [...path, key]);
      }
    }
  };
  validateReferences(parsed);
  return issues;
};

const validateWithSchemas = ({ obj, schemas, mainSchemaId, formats = [], keywords = [] }) => {
  const ajv = new Ajv({ schemas, allErrors: true, verbose: true, strict: false });
  formats.forEach(format => ajv.addFormat(format.name, format.definition));
  keywords.forEach(keyword => ajv.addKeyword(keyword));
  ajvErrors(ajv);
  const validate = ajv.getSchema(mainSchemaId ? mainSchemaId : schemas[0].$id);
  validate(obj);
  return validate.errors || [];
};

/**
 * * Validates a JSON string against a list of schemas and returns a list of errors.
 *
 * @param {string} json - The JSON string to validate.
 * @param {Object[]} schemas - Array of JSON Schemas (each must have a unique $id).
 * @param {string} mainSchemaId - The $id of the main schema to use as the entry point.
 * @param {Object[]} [formats] - Optional custom formats for validation.
 * @param {Object[]} [keywords] - Optional custom keywords for validation.
 * @returns {Object[]} List of validation errors, or an empty array if valid.
 * @see https://github.com/ChristopheBougere/asl-validator/tree/main/src/schemas
 */
const schemaValidation = (json, schemas, mainSchemaId, formats = [], keywords = []) => {
  if (!jsonUtils.safeParse(json)) return [{ from: 0, to: 1, message: 'invalid JSON format', severity: 'error' }];

  const issues = validateWithSchemas({
    obj: jsonUtils.safeParse(json),
    schemas,
    mainSchemaId,
    formats,
    keywords,
  });

  const filteredErrors = issues?.filter(err => !LinterConstant.IgnoredValidationKeywords.includes(err.keyword));
  if (filteredErrors.length > 0) {
    return filteredErrors.flatMap((err) => {
      const ranges = jsonAstUtils.getOffsetRange(json, err);
      if (Array.isArray(ranges)) {
        return ranges.map(({ from, to }) => ({
          from,
          to,
          message: err.message,
          severity: LinterConstant.SeverityType.ERROR,
        }));
      }
      const { from, to } = ranges || {};
      return [{
        from,
        to,
        message: err.message,
        severity: LinterConstant.SeverityType.ERROR,
      }];
    });
  }
  return [];
};

/**
 * Returns validation config for workflow ASL (schemas, main schema ID, formats, keywords).
 *
 * @param {string} type - The type of workflow.
 * @returns {Object} The validation configuration object.
 */
const getWorkflowAslValidationConfig = (type) => {
  let schemas = [];
  let mainSchemaId = null;
  let formats = [];
  let keywords = [];
  // Select schemas based on workflow type: use all for "workflow", or specific schemas for "action"
  switch (type) {
    default:
      schemas = [baseStateMachine, choice, common, fail, map, parallel, pass, state, succeed, task, wait];
      mainSchemaId = baseStateMachine.$id;
      formats = [
        { name: 'jsonpath', definition: { validate: x => jsonPathUtils.isJsonPath(x) } },
        { name: 'arn', definition: { validate: x => arnUtils.isArn(x) } },
      ];
      keywords = [
        { keyword: 'jsonPathBinding', type: 'object', errors: true, validate: (_, data) => jsonPathBinding()(JSON.stringify(data)) },
      ];
      break;
  }
  return {
    schemas,
    mainSchemaId,
    formats,
    keywords,
  };
};

export const workflowAslValidations = (asl, type) => {
  if (strUtils.isEmpty(asl)) return [];
  const { schemas, mainSchemaId, formats, keywords } = getWorkflowAslValidationConfig(type);
  const parsed = jsonUtils.safeParse(asl);
  const ast = jsonAstUtils.buildAst(asl);
  const issues = [
    ...schemaValidation(asl, schemas, mainSchemaId, formats, keywords),
    ...duplicatedKeysValidation(ast),
    ...unreachableStatesValidation(parsed, ast),
    ...targetExistsValidation(parsed, ast),
  ];
  return issues;
};

export default (type) => {
  return (view) => {
    const asl = view.state.doc.toString();
    return workflowAslValidations(asl, type);
  };
};
