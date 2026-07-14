import { ChunkerConstant, ResourceConstant } from '~/constants';
import Chunker from './Chunker';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class ConsecutiveChunker extends Chunker {
  constructor({
    chunkerId,
    chunkerName,
    chunkerType,
    embeddingModelId,
    maxChunkSize,
    minChunkSize,
    separators,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      chunkerId,
      chunkerName,
      chunkerType,
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.embeddingModelId = embeddingModelId ?? '';
    this.maxChunkSize = maxChunkSize ?? ChunkerConstant.DefaultParams.MAX_CHUNK_SIZE.default;
    this.minChunkSize = minChunkSize ?? ChunkerConstant.DefaultParams.MIN_CHUNK_SIZE.default;
    this.separators = separators ?? ChunkerConstant.DefaultParams.CHUNK_SEPARATORS.default;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(ChunkerConstant.Type, this.type, 'title'), iconPath: findField(ChunkerConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldEmbeddingModel'), value: this.embeddingModelId, isCopyable: true, link: { href: resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value, this.embeddingModelId) } },
      { title: $i18n.t('__fieldMinChunkSize'), value: numUtils.format(this.minChunkSize) },
      { title: $i18n.t('__fieldMaxChunkSize'), value: numUtils.format(this.maxChunkSize) },
      { title: $i18n.t('__fieldSeparator', 2), value: this.separators.map(s => strUtils.escapeControlChars(s)), isChip: true },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {FixedSizeChunker} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      embedding_model_id: resource.embeddingModelId,
      max_chunk_size: resource.maxChunkSize,
      min_chunk_size: resource.minChunkSize,
      separators: resource.separators,
    };
  }
}

export default ConsecutiveChunker;
