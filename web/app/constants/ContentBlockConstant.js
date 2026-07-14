import * as FileExtensionConstant from './FileExtensionConstant';
import * as LlmConstant from './LlmConstant';
import * as ResourceConstant from './ResourceConstant';

const Type = Object.freeze({
  TEXT: {
    i18nTitle: '__fieldContentBlockTypeText',
    value: 'text',
    iconPath: '/images/icons/contentBlockText.svg',
    i18nSubtitle: '__subtitleContentBlockTypeText',
  },
  IMAGE: {
    i18nTitle: '__fieldContentBlockTypeImage',
    value: 'image',
    iconPath: '/images/icons/contentBlockImage.svg',
    i18nSubtitle: '__subtitleContentBlockTypeImage',
  },
  ATTACHMENT: {
    i18nTitle: '__fieldContentBlockTypeAttachment',
    value: 'attachment',
    iconPath: '/images/icons/contentBlockAttachment.svg',
    i18nSubtitle: '__subtitleContentBlockTypeAttachment',
  },
});

const ImageSource = Object.freeze({
  UPLOAD: {
    i18nTitle: '__fieldImageSourceUpload',
    value: 'upload',
    icon: 'mdi-image',
    i18nSubtitle: '__subtitleImageSourceUpload',
  },
  URL: {
    i18nTitle: '__fieldImageSourceUrl',
    value: 'url',
    icon: 'mdi-image',
    i18nSubtitle: '__subtitleImageSourceUrl',
  },
  STATE_INPUT_DATA: {
    i18nTitle: '__fieldImageSourceStateInputData',
    value: 'state_input_data',
    icon: 'mdi-image',
    i18nSubtitle: '__subtitleImageSourceStateInputData',
  },
  STATE_INPUT_URL: {
    i18nTitle: '__fieldImageSourceStateInputUrl',
    value: 'state_input_url',
    icon: 'mdi-image',
    i18nSubtitle: '__subtitleImageSourceStateInputUrl',
  },
  EXTERNAL_MEMORY_DATA: {
    i18nTitle: '__fieldImageSourceExternalMemory',
    value: 'external_memory_data',
    icon: 'mdi-image',
    i18nSubtitle: '__subtitleImageSourceExternalMemory',
  },
});

const ImageType = Object.freeze({
  GIF: FileExtensionConstant.Image.GIF,
  JPEG: FileExtensionConstant.Image.JPEG,
  PNG: FileExtensionConstant.Image.PNG,
  WEBP: FileExtensionConstant.Image.WEBP,
});

const AttachmentParserType = Object.freeze({
  DEFAULT: {
    i18nTitle: '__fieldAttachmentParserTypeDefault',
    value: 'hq',
    i18nSubtitle: '__subtitleAttachmentParserTypeDefault',
  },
  NATIVE: {
    i18nTitle: '__fieldAttachmentParserTypeNative',
    value: 'native',
    i18nSubtitle: '__subtitleAttachmentParserTypeNative',
  },
});

const AttachmentSupportedExtensions = Object.freeze({
  EXTENDED_DOCS: [
    FileExtensionConstant.Base.PNG,
    FileExtensionConstant.Base.JPEG,
    FileExtensionConstant.Base.JPG,
    FileExtensionConstant.Base.GIF,
    FileExtensionConstant.Base.WEBP,
    FileExtensionConstant.Base.PDF,
    FileExtensionConstant.Base.CSV,
    FileExtensionConstant.Base.DOC,
    FileExtensionConstant.Base.DOCX,
    FileExtensionConstant.Base.XLS,
    FileExtensionConstant.Base.XLSX,
    FileExtensionConstant.Base.HTML,
    FileExtensionConstant.Base.TXT,
    FileExtensionConstant.Base.MD,
  ],
  DEFAULT: [
    FileExtensionConstant.Base.PNG,
    FileExtensionConstant.Base.JPEG,
    FileExtensionConstant.Base.JPG,
    FileExtensionConstant.Base.GIF,
    FileExtensionConstant.Base.WEBP,
    FileExtensionConstant.Base.PDF,
    FileExtensionConstant.Base.CSV,
    FileExtensionConstant.Base.HTML,
    FileExtensionConstant.Base.TXT,
    FileExtensionConstant.Base.MD,
  ],
});

const AttachmentExtendedDocsSupportedLlmTypes = Object.freeze([
  LlmConstant.Type.BEDROCK_ANTHROPIC.value,
  LlmConstant.Type.BEDROCK_LLAMA.value,
  LlmConstant.Type.BEDROCK_NOVA.value,
]);

const ActionExecutionParams = Object.freeze({
  EXISTING_PROMPT_TEMPLATE_VARIABLES: {},
  CUSTOM_PROMPT_TEMPLATE_VARIABLES: {
    'content.$': '$.content',
  },
  CUSTOM_PROMPT: '',
  MAX_WIDTH_PX: {
    default: null,
    min: 1,
  },
  MAX_HEIGHT_PX: {
    default: null,
    min: 1,
  },
});

const PromptSource = Object.freeze({
  CUSTOM_PROMPT: {
    i18nTitle: '__fieldPromptSourceCustomPrompt',
    value: 'prompt',
    icon: ResourceConstant.Type.TEMPLATE.icon,
    i18nSubtitle: '__subtitlePromptSourceCustomPrompt',
  },
  CUSTOM_PROMPT_TEMPLATE: {
    i18nTitle: '__fieldPromptSourceCustomPromptTemplate',
    value: 'custom_prompt_template',
    icon: ResourceConstant.Type.TEMPLATE.icon,
    i18nSubtitle: '__subtitlePromptSourceCustomPromptTemplate',
  },
  EXISTING_PROMPT_TEMPLATE: {
    i18nTitle: '__fieldPromptSourceExistingPromptTemplate',
    value: 'existing_prompt_template',
    icon: ResourceConstant.Type.TEMPLATE.icon,
    i18nSubtitle: '__subtitlePromptSourceExistingPromptTemplate',
  },
});

export {
  ActionExecutionParams,
  AttachmentExtendedDocsSupportedLlmTypes,
  AttachmentParserType,
  AttachmentSupportedExtensions,
  ImageSource,
  ImageType,
  PromptSource,
  Type,
};
