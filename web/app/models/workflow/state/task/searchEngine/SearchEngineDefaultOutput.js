import { StateConstant } from '~/constants';
import { DefaultOutput } from '~/models/workflow/state';

/**
 * This class receives data from the user input with parameters in snake_case.
 */
class SearchEngineDefaultOutput extends DefaultOutput {
  constructor({
    errors,
    output,
    search_results,
  } = {}) {
    super({
      action_type: StateConstant.ActionType.SEARCH_ENGINE.value,
      errors,
    });
    // Provide default values to ensure the expected structure
    this.output = output ?? '';
    this.search_results = search_results ?? [];
  }
}

export default SearchEngineDefaultOutput;
