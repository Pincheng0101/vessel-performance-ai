import * as ConnectorConstant from './ConnectorConstant';
import * as FileExtensionConstant from './FileExtensionConstant';
import * as KnowledgeBaseConstant from './KnowledgeBaseConstant';
import * as StorageConstant from './StorageConstant';

const SourceType = Object.freeze({
  S3: ConnectorConstant.Type.S3,
  OPENSEARCH: ConnectorConstant.Type.OPENSEARCH,
  MYSQL: ConnectorConstant.Type.MYSQL,
  // The API loader source loads data from an HTTP endpoint via an HTTP connector.
  API: {
    title: 'API Endpoint',
    value: 'api',
    iconPath: '/images/icons/api.svg',
    i18nSubtitle: '__subtitleConnectorTypeApi',
  },
  STORAGE: StorageConstant.Type.STORAGE,
});

const FirstPartyOnlySourceTypes = Object.freeze([
  SourceType.MYSQL.value,
  SourceType.OPENSEARCH.value,
  SourceType.API.value,
]);

const Type = Object.freeze({
  UNSUPERVISED: {
    i18nTitle: '__titleLoaderTypeUnsupervised',
    value: 'unsupervised',
    iconPath: '/images/icons/unsupervised.svg',
    i18nSubtitle: '__subtitleLoaderTypeUnsupervised',
    supportedKnowledgeBaseType: KnowledgeBaseConstant.Type.VECTOR_STORE.value,
    supportedSourceTypes: [
      SourceType.S3.value,
      SourceType.STORAGE.value,
    ],
    supportedFileExtensions: [
      FileExtensionConstant.Base.CSV.value,
      FileExtensionConstant.Base.DOCX.value,
      FileExtensionConstant.Base.JSON.value,
      FileExtensionConstant.Base.JSONL.value,
      FileExtensionConstant.Base.MD.value,
      FileExtensionConstant.Base.PDF.value,
      FileExtensionConstant.Base.PPTX.value,
      FileExtensionConstant.Base.TSV.value,
      FileExtensionConstant.Base.PPT.value,
      FileExtensionConstant.Base.TXT.value,
      FileExtensionConstant.Base.XLS.value,
      FileExtensionConstant.Base.XLSX.value,
      FileExtensionConstant.Base.JPG.value,
      FileExtensionConstant.Base.JPEG.value,
      FileExtensionConstant.Base.PNG.value,
      FileExtensionConstant.Base.GIF.value,
      FileExtensionConstant.Base.WEBP.value,
    ],
  },
  STANDARD: {
    i18nTitle: '__titleLoaderTypeStandard',
    value: 'standard',
    iconPath: '/images/icons/standard.svg',
    i18nSubtitle: '__subtitleLoaderTypeStandard',
    supportedKnowledgeBaseType: KnowledgeBaseConstant.Type.VECTOR_STORE.value,
    supportedSourceTypes: [
      SourceType.S3.value,
      SourceType.OPENSEARCH.value,
      SourceType.MYSQL.value,
      SourceType.API.value,
      SourceType.STORAGE.value,
    ],
    supportedFileExtensions: [
      FileExtensionConstant.Base.CSV.value,
      FileExtensionConstant.Base.DOCX.value,
      FileExtensionConstant.Base.GZ.value,
      FileExtensionConstant.Base.HTML.value,
      FileExtensionConstant.Base.JSON.value,
      FileExtensionConstant.Base.JSONL.value,
      FileExtensionConstant.Base.MD.value,
      FileExtensionConstant.Base.PDF.value,
      FileExtensionConstant.Base.PPT.value,
      FileExtensionConstant.Base.PPTX.value,
      FileExtensionConstant.Base.TSV.value,
      FileExtensionConstant.Base.TXT.value,
      FileExtensionConstant.Base.XLS.value,
      FileExtensionConstant.Base.XLSX.value,
    ],
  },
});

const ParserMode = Object.freeze({
  STANDARD: {
    value: 'standard',
    i18nTitle: '__fieldParserModeStandard',
    i18nSubtitle: '__subtitleParserModeStandard',
  },
  FAST: {
    value: 'fast',
    i18nTitle: '__fieldParserModeFast',
    i18nSubtitle: '__subtitleParserModeFast',
  },
  PRO: {
    value: 'pro',
    i18nTitle: '__fieldParserModePro',
    i18nSubtitle: '__subtitleParserModePro',
  },
});

export {
  FirstPartyOnlySourceTypes,
  ParserMode,
  SourceType,
  Type,
};
