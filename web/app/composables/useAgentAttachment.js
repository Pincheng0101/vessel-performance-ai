import * as FileExtensionConstant from '~/constants/FileExtensionConstant';
import { ImageContentBlock, TextContentBlock } from '~/models/server/contentBlock';

const SUPPORTED_IMAGE_MIME_TYPES = [
  ...new Set(Object.values(FileExtensionConstant.Image)
    .filter(item => item.value)
    .map(item => item.mediaType)),
];

const SUPPORTED_IMAGE_MIME_TYPE_SET = new Set(SUPPORTED_IMAGE_MIME_TYPES);

const deduplicateExtensionOptions = (options) => {
  return [...new Map(options.map(item => [item.value, item])).values()];
};

const AgentAttachmentType = Object.freeze({
  FILE: 'file',
  IMAGE: 'image',
});

const DIRECTLY_READABLE_TEXT_EXTENSION_OPTIONS = [
  FileExtensionConstant.Base.CSV,
  FileExtensionConstant.Base.HTML,
  FileExtensionConstant.Base.JSON,
  FileExtensionConstant.Base.MD,
  FileExtensionConstant.Base.TSV,
  FileExtensionConstant.Base.TXT,
];

const SERVER_PARSABLE_DOCUMENT_EXTENSION_OPTIONS = [
  FileExtensionConstant.Base.PDF,
  FileExtensionConstant.Base.DOC,
  FileExtensionConstant.Base.DOCX,
  FileExtensionConstant.Base.DOCM,
  FileExtensionConstant.Base.ODT,
  FileExtensionConstant.Base.RTF,
  FileExtensionConstant.Base.PPT,
  FileExtensionConstant.Base.PPTX,
  FileExtensionConstant.Base.PPTM,
  FileExtensionConstant.Base.ODP,
  FileExtensionConstant.Base.XLS,
  FileExtensionConstant.Base.XLSX,
  FileExtensionConstant.Base.XLSM,
  FileExtensionConstant.Base.ODS,
  FileExtensionConstant.Base.CSV,
  FileExtensionConstant.Base.TSV,
];

const SUPPORTED_DOCUMENT_EXTENSION_OPTIONS = deduplicateExtensionOptions([
  ...DIRECTLY_READABLE_TEXT_EXTENSION_OPTIONS,
  ...SERVER_PARSABLE_DOCUMENT_EXTENSION_OPTIONS,
]);

const DIRECT_TEXT_DOCUMENT_EXTENSIONS = new Set(DIRECTLY_READABLE_TEXT_EXTENSION_OPTIONS.map(item => item.value));

const SUPPORTED_FILE_EXTENSIONS = SUPPORTED_DOCUMENT_EXTENSION_OPTIONS.map(item => item.value);

const SUPPORTED_FILE_MIME_TYPES = [
  ...new Set(SUPPORTED_DOCUMENT_EXTENSION_OPTIONS
    .filter(item => item.mediaType)
    .map(item => item.mediaType)),
];

const SUPPORTED_ATTACHMENT_TYPES = [
  ...new Set([
    ...SUPPORTED_IMAGE_MIME_TYPES,
    ...SUPPORTED_FILE_MIME_TYPES,
    ...SUPPORTED_FILE_EXTENSIONS,
  ]),
];

const CHAT_IMAGE_MAX_BYTES = 40 * 1024;
const CHAT_IMAGE_MAX_DIMENSION = 768;
// Try progressively lower JPEG qualities until the chat image payload fits the target byte limit
const CHAT_IMAGE_JPEG_QUALITY_STEPS = [0.92, 0.82, 0.72, 0.62, 0.52, 0.42];
const CHAT_TEXT_CONTENT_MAX_BYTES = 2.5 * 1024 * 1024;
const CHAT_FILE_CONTENT_BLOCK_NAME_PREFIX = 'chat-file:';
const textEncoder = new TextEncoder();

const resolveAttachmentType = (file) => {
  const fileType = fileUtils.getFileType(file);
  const fileExtension = pathUtils.getFileExtension(file?.name);

  if (SUPPORTED_IMAGE_MIME_TYPE_SET.has(fileType)) {
    return AgentAttachmentType.IMAGE;
  }
  if (SUPPORTED_FILE_MIME_TYPES.includes(fileType) || SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
    return AgentAttachmentType.FILE;
  }
  return null;
};

const getFileExtensionOption = (file) => {
  const extension = pathUtils.getFileExtension(file?.name);
  return SUPPORTED_DOCUMENT_EXTENSION_OPTIONS.find(item => item.value === extension)
    ?? Object.values(FileExtensionConstant.Base).find(item => item.value === extension);
};

const getFileIcon = file => getFileExtensionOption(file)?.icon ?? 'mdi-file-document-outline';

const getFileTypeLabel = (file) => {
  const extensionOption = getFileExtensionOption(file);
  return extensionOption?.title ?? fileUtils.getFileType(file) ?? '';
};

const formatReadableDocumentText = ({ name, text }) => [`File: ${name}`, '', text].join('\n').trim();

const isTextTooLargeForChat = text => textEncoder.encode(text).length > CHAT_TEXT_CONTENT_MAX_BYTES;

const isDirectlyReadableTextFile = file => DIRECT_TEXT_DOCUMENT_EXTENSIONS.has(pathUtils.getFileExtension(file?.name));

export const toChatFileContentBlockName = metadata => `${CHAT_FILE_CONTENT_BLOCK_NAME_PREFIX}${encodeURIComponent(JSON.stringify(metadata))}`;

export const parseChatFileContentBlockName = (contentBlockName) => {
  if (!String(contentBlockName || '').startsWith(CHAT_FILE_CONTENT_BLOCK_NAME_PREFIX)) return null;
  try {
    return JSON.parse(decodeURIComponent(contentBlockName.slice(CHAT_FILE_CONTENT_BLOCK_NAME_PREFIX.length)));
  } catch {
    return null;
  }
};

const loadImageFromDataUrl = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
};

const getScaledDimensions = (image, maxDimension) => {
  const longestSide = Math.max(image.width, image.height);
  if (longestSide <= maxDimension) {
    return { width: image.width, height: image.height };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
};

const toChatImageDataUrl = async (
  file,
  {
    maxBytes = CHAT_IMAGE_MAX_BYTES,
    maxDimension = CHAT_IMAGE_MAX_DIMENSION,
  } = {},
) => {
  const originalDataUrl = await fileUtils.toBase64(file);
  const originalSize = fileUtils.getDataUrlByteLength(originalDataUrl);
  if (originalSize <= maxBytes) return originalDataUrl;
  if (file.type === 'image/gif') return originalDataUrl;

  const image = await loadImageFromDataUrl(originalDataUrl);
  const { width, height } = getScaledDimensions(image, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return originalDataUrl;
  context.drawImage(image, 0, 0, width, height);

  const exportType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const qualitySteps = exportType === 'image/png'
    ? [undefined]
    : CHAT_IMAGE_JPEG_QUALITY_STEPS;

  let bestDataUrl = originalDataUrl;
  for (const quality of qualitySteps) {
    const nextDataUrl = canvas.toDataURL(exportType, quality);
    if (fileUtils.getDataUrlByteLength(nextDataUrl) < fileUtils.getDataUrlByteLength(bestDataUrl)) {
      bestDataUrl = nextDataUrl;
    }
    if (fileUtils.getDataUrlByteLength(nextDataUrl) <= maxBytes) {
      return nextDataUrl;
    }
  }

  return bestDataUrl;
};

export function useAgentAttachment({
  enableServerFileParsing = true,
} = {}) {
  const server = useServer();

  const state = reactive({
    attachments: [],
  });

  const getAttachmentKey = file => `${file.name}-${file.size}-${file.lastModified}`;

  const revokePreviewUrls = (items) => {
    for (const item of items) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  };

  const appendFiles = (files) => {
    const nextItems = files
      .map((file) => {
        if (!(file instanceof File)) return null;

        const type = resolveAttachmentType(file);
        if (!type) return null;
        if (!enableServerFileParsing && type === AgentAttachmentType.FILE && !isDirectlyReadableTextFile(file)) return null;

        return {
          file,
          icon: getFileIcon(file),
          key: getAttachmentKey(file),
          name: file.name,
          previewUrl: type === AgentAttachmentType.IMAGE ? URL.createObjectURL(file) : null,
          size: file.size,
          type,
          typeLabel: getFileTypeLabel(file),
        };
      })
      .filter(Boolean);
    const unsupportedCount = files.length - nextItems.length;

    for (const item of nextItems) {
      if (state.attachments.some(attachment => attachment.key === item.key)) {
        revokePreviewUrls([item]);
        continue;
      }
      state.attachments.push(item);
    }

    return { unsupportedCount };
  };

  const removeAttachment = (key) => {
    const index = state.attachments.findIndex(item => item.key === key);
    if (index < 0) return;
    const [removed] = state.attachments.splice(index, 1);
    revokePreviewUrls([removed]);
  };

  const removeAttachmentsFromInput = () => {
    const attachments = [...state.attachments];
    state.attachments = [];
    return attachments;
  };

  const restoreAttachments = (attachments) => {
    state.attachments = attachments;
  };

  const toContentBlocks = async (attachments) => {
    const contentBlocks = await Promise.all(attachments.map(async ({ file, icon, name, size, type, typeLabel }) => {
      const fileMetadata = { icon, name, size, typeLabel };
      if (type === AgentAttachmentType.IMAGE) {
        const data = await toChatImageDataUrl(file);
        return new ImageContentBlock({ data });
      }
      if (type !== AgentAttachmentType.FILE) return null;

      const isDirectTextDocument = isDirectlyReadableTextFile(file);
      if (!isDirectTextDocument && !enableServerFileParsing) return null;

      const text = isDirectTextDocument
        ? await file.text()
        : await server.tempFile.readParsedText({ file });
      const formattedText = formatReadableDocumentText({ name, text });
      if (isTextTooLargeForChat(formattedText)) return null;

      const textBlock = new TextContentBlock({
        contentBlockName: toChatFileContentBlockName(fileMetadata),
        text: formattedText,
      });
      textBlock.attachments = [fileMetadata];
      textBlock.hiddenInChat = true;
      return textBlock;
    }));

    return contentBlocks.flat().filter(Boolean);
  };

  onBeforeUnmount(() => {
    revokePreviewUrls(state.attachments);
  });

  return {
    appendFiles,
    attachments: computed(() => state.attachments),
    attachmentType: AgentAttachmentType,
    parseChatFileContentBlockName,
    removeAttachment,
    removeAttachmentsFromInput,
    restoreAttachments,
    revokePreviewUrls,
    supportedMimeTypes: enableServerFileParsing
      ? SUPPORTED_ATTACHMENT_TYPES
      : [
          ...SUPPORTED_IMAGE_MIME_TYPES,
          ...DIRECTLY_READABLE_TEXT_EXTENSION_OPTIONS
            .filter(item => item.mediaType)
            .map(item => item.mediaType),
          ...DIRECTLY_READABLE_TEXT_EXTENSION_OPTIONS.map(item => item.value),
        ],
    toContentBlocks,
  };
}
