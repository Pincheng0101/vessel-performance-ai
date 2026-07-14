import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class StructuredLlmDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    request,
    response,
    source_llm_id,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.STRUCTURED_LLM.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.request = request ?? {};
    this.response = response ?? {};
    this.source_llm_id = source_llm_id ?? '';
  }
}

export default StructuredLlmDefaultOutput;
