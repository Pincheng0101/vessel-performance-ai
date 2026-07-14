import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class LlmDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    message,
    request,
    source_llm_id,
    thinking_summary,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.LLM.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.message = message ?? '';
    this.request = request ?? {};
    this.source_llm_id = source_llm_id ?? '';
    this.thinking_summary = thinking_summary ?? '';
  }
}

export default LlmDefaultOutput;
