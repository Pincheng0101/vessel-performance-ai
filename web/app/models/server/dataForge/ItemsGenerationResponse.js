import DatasetGenerationConfigResponse from '../dataset/DatasetGenerationConfigResponse';
import ItemsGenerationOutputResponse from './ItemsGenerationOutputResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ItemsGenerationResponse {
  constructor({
    error,
    execution_arn,
    output,
    start_ts,
    status,
    stop_ts,
    generation_config,
  } = {}) {
    this.error = error ?? null;
    this.executionArn = execution_arn;
    this.output = output ? new ItemsGenerationOutputResponse(output) : null;
    this.startTs = start_ts ?? null;
    this.status = status;
    this.stopTs = stop_ts ?? null;
    this.generationConfig = generation_config ? new DatasetGenerationConfigResponse(generation_config) : null;
  }
}

export default ItemsGenerationResponse;
