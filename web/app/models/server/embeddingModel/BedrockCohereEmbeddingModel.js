import { AwsConstant, EmbeddingModelConstant } from '~/constants';
import EmbeddingModel from './EmbeddingModel';

class BedrockCohereEmbeddingModel extends EmbeddingModel {
  constructor({
    embeddingModelId,
    embeddingModelName,
    embeddingModelType,
    embeddingType,
    inputType,
    maxTokens,
    model,
    outputDimension,
    region,
    status,
    systemInfo,
    truncate,
    updatedTs,
  } = {}) {
    super({
      embeddingModelId,
      embeddingModelName,
      embeddingModelType,
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.embeddingType = embeddingType ?? EmbeddingModelConstant.EmbeddingType.DENSE.value;
    this.inputType = inputType ?? EmbeddingModelConstant.BedrockCohereInputType.SEARCH_QUERY.value;
    this.maxTokens = maxTokens ?? null;
    this.model = model ?? '';
    this.outputDimension = outputDimension ?? null;
    this.region = region ?? '';
    this.truncate = truncate ?? EmbeddingModelConstant.BedrockCohereTruncate.END.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(EmbeddingModelConstant.Type, this.type, 'title'), iconPath: findField(EmbeddingModelConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldRegion'), value: findField(AwsConstant.Region, this.region, 'title') },
      { title: $i18n.t('__fieldModel'), value: findField(EmbeddingModelConstant.Model, this.model, 'title') },
      { title: $i18n.t('__fieldEmbeddingModelBedrockCohereEmbeddingType'), value: $i18n.t(findField(EmbeddingModelConstant.EmbeddingType, this.embeddingType, 'title')) },
      { title: $i18n.t('__fieldInputType'), value: $i18n.t(findField(EmbeddingModelConstant.BedrockCohereInputType, this.inputType, 'i18nTitle')) },
      { title: $i18n.t('__fieldMaxTokens'), value: this.maxTokens },
      { title: $i18n.t('__fieldOutputDimension'), value: this.outputDimension },
      { title: $i18n.t('__fieldTruncate'), value: $i18n.t(findField(EmbeddingModelConstant.BedrockCohereTruncate, this.truncate, 'i18nTitle')) },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {BedrockCohereEmbeddingModel} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      embedding_type: resource.embeddingType,
      input_type: resource.inputType,
      max_tokens: resource.maxTokens,
      model: resource.model,
      output_dimension: resource.outputDimension,
      region: resource.region,
      truncate: resource.truncate,
    };
  }
}

export default BedrockCohereEmbeddingModel;
