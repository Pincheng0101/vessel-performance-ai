import Dataset from './Dataset';
import DatasetGenerationConfigResponse from './DatasetGenerationConfigResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetResponse extends Dataset {
  constructor({
    dataset_id,
    dataset_name,
    description,
    generation_config,
    input_fields,
    latest_version,
    output_fields,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      datasetId: dataset_id,
      datasetName: dataset_name,
      description,
      inputFields: input_fields,
      generationConfig: generation_config ? new DatasetGenerationConfigResponse(generation_config) : null,
      latestVersion: latest_version,
      outputFields: output_fields,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default DatasetResponse;
