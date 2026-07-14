/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemFailureResponse {
  constructor({
    dataset_item_id,
    dataset_item_data,
    error_message,
    row_index,
  } = {}) {
    this.datasetItemId = dataset_item_id ?? null;
    this.datasetItemData = dataset_item_data ?? null;
    this.errorMessage = error_message ?? '';
    this.rowIndex = row_index ?? null;
  }
}

export default DatasetItemFailureResponse;
