import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';
import DatasetField from './DatasetField';
import DatasetGenerationConfig from './DatasetGenerationConfig';

class Dataset extends Resource {
  constructor({
    datasetId,
    datasetName,
    description,
    fieldNames,
    generationConfig,
    inputFields,
    latestVersion,
    outputFields,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.datasetId = datasetId ?? '';
    this.datasetName = datasetName ?? '';
    this.description = description ?? null;
    this.fieldNames = fieldNames ?? [];
    this.generationConfig = generationConfig ?? null;
    this.inputFields = inputFields ?? null;
    this.latestVersion = latestVersion ?? 0;
    this.outputFields = outputFields ?? null;
  }

  get resourceType() {
    return ResourceConstant.Type.DATASET.value;
  }

  get id() {
    return this.datasetId;
  }

  get name() {
    return this.datasetName;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldDescription'), value: this.description },
      { title: $i18n.t('__fieldLatestVersion'), value: this.latestVersion },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
      // TODO: display generation config
    ];
  }

  get fieldDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      {
        title: $i18n.t('__fieldInputField', 2),
        value: this.inputFields,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description' },
          ],
        },
      },
      {
        title: $i18n.t('__fieldOutputField', 2),
        value: this.outputFields,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description' },
          ],
        },
      },
    ];
  }

  /**
   * @param {Dataset} resource
   */
  static toRequestPayload(resource) {
    return {
      dataset_id: resource.datasetId,
      dataset_name: resource.datasetName,
      description: resource.description,
      generation_config: resource.generationConfig ? DatasetGenerationConfig.toRequestPayload(resource.generationConfig) : null,
      input_fields: resource.inputFields?.length > 0 ? resource.inputFields.map(field => DatasetField.toRequestPayload(field)) : null,
      output_fields: resource.outputFields?.length > 0 ? resource.outputFields.map(field => DatasetField.toRequestPayload(field)) : null,
    };
  }
}

export default Dataset;
