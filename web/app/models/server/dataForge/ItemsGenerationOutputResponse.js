/**
 * This class receives data from the API with parameters in snake_case.
 */
class ItemGenerationOutputResponse {
  constructor({
    generated_status,
    generated_items,
    generated_count,
    attempt_count,
    error_message,
  } = {}) {
    this.generatedStatus = generated_status;
    this.generatedItems = generated_items;
    this.generatedCount = generated_count;
    this.attemptCount = attempt_count;
    this.errorMessage = error_message;
  }
}

export default ItemGenerationOutputResponse;
