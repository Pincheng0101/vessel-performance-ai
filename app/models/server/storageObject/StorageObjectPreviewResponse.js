/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageObjectPreviewResponse {
  constructor({
    field_names,
    preview_rows,
  } = {}) {
    this.fieldNames = field_names;
    this.previewRows = preview_rows;
  }
}

export default StorageObjectPreviewResponse;
