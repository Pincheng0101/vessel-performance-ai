import { ChunkerConstant } from '~/constants';
import Chunker from './Chunker';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class FixedSizeChunker extends Chunker {
  constructor({
    chunkerId,
    chunkerName,
    chunkerType,
    chunkOverlap,
    chunkSize,
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
    this.chunkOverlap = chunkOverlap ?? ChunkerConstant.DefaultParams.CHUNK_OVERLAP.default;
    this.chunkSize = chunkSize ?? ChunkerConstant.DefaultParams.CHUNK_SIZE.default;
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
      { title: $i18n.t('__fieldChunkSize'), value: numUtils.format(this.chunkSize) },
      { title: $i18n.t('__fieldChunkOverlap'), value: numUtils.format(this.chunkOverlap) },
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
      chunk_overlap: resource.chunkOverlap,
      chunk_size: resource.chunkSize,
      separators: resource.separators,
    };
  }
}

export default FixedSizeChunker;
