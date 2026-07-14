class DatasetItem {
  constructor({
    datasetId,
    datasetItemData,
    datasetItemId,
    latestVersion,
    updatedTs,
  } = {}) {
    // Set fields explicitly to prevent backend default values
    this.datasetId = datasetId ?? '';
    this.datasetItemData = datasetItemData ?? {};
    this.datasetItemId = datasetItemId ?? '';
    this.latestVersion = latestVersion;
    this.updatedTs = updatedTs;
  }

  get id() {
    return this.datasetItemId;
  }

  get name() {
    return this.datasetItemId;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldDatasetId'), value: this.datasetId, isCopyable: true },
      { title: $i18n.t('__fieldDatasetItemId'), value: this.datasetItemId, isCopyable: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
      { title: $i18n.t('__fieldLatestVersion'), value: this.latestVersion },
    ].filter(item => item.value !== null && item.value !== undefined);
  }

  get datasetItemDataDisplayFields() {
    const { $i18n } = useNuxtApp();
    const data = this.datasetItemData || {};
    return [
      {
        title: $i18n.t('__fieldDatasetItemData'),
        value: Object.keys(data).map(key => ({ name: key, value: data[key] })),
        table: {
          headers: [
            { title: $i18n.t('__fieldKey'), key: 'name' },
            { title: $i18n.t('__fieldValue'), key: 'value' },
          ],
        },
      },
    ];
  }

  static toRequestPayload(item) {
    return {
      dataset_id: item.datasetId,
      dataset_items_data: item.datasetItemsData,
      dataset_items: item.datasetItems?.map((item) => {
        return {
          dataset_item_id: item.datasetItemId,
          dataset_item_data: item.datasetItemData,
        };
      }),
    };
  }

  static toSyncRequestPayload(item) {
    return {
      dataset_id: item.datasetId,
      input_fields: item.inputFields?.map((field) => {
        return {
          name: field.name,
          description: field.description,
        };
      }),
      output_fields: item.outputFields?.map((field) => {
        return {
          name: field.name,
          description: field.description,
        };
      }),
      filter_undefined_fields: item.filterUndefinedFields,
      object_path: item.objectPath,
      storage_id: item.storageId,
    };
  }
}

export default DatasetItem;
