import DatasetItem from './DatasetItem';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetItemResponse extends DatasetItem {
  constructor({
    dataset_id,
    dataset_item_data,
    dataset_item_id,
    latest_version,
    updated_ts,
  } = {}) {
    super({
      datasetId: dataset_id,
      datasetItemData: dataset_item_data,
      datasetItemId: dataset_item_id,
      latestVersion: latest_version,
      updatedTs: updated_ts,
    });
  }
}

export default DatasetItemResponse;
