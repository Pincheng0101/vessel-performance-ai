const Base = Object.freeze({
  CSV: {
    title: 'CSV',
    value: '.csv',
    icon: 'mdi-file-delimited',
    mediaType: 'text/csv',
  },
  DOC: {
    title: 'DOC',
    value: '.doc',
    icon: 'mdi-file-word',
    mediaType: 'application/msword',
  },
  DOCX: {
    title: 'DOCX',
    value: '.docx',
    icon: 'mdi-file-word',
    mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  DOCM: {
    title: 'DOCM',
    value: '.docm',
    icon: 'mdi-file-word',
    mediaType: 'application/vnd.ms-word.document.macroEnabled.12',
  },
  GZ: {
    title: 'GZ',
    value: '.gz',
    icon: 'mdi-zip-box',
    mediaType: 'application/gzip',
  },
  HTML: {
    title: 'HTML',
    value: '.html',
    icon: 'mdi-language-html5',
    mediaType: 'text/html',
  },
  JSON: {
    title: 'JSON',
    value: '.json',
    icon: 'mdi-file-code',
    mediaType: 'application/json',
  },
  JSONL: {
    title: 'JSONL',
    value: '.jsonl',
    icon: 'mdi-file-code',
    mediaType: 'application/x-ndjson',
  },
  JS: {
    title: 'JS',
    value: '.js',
    icon: 'mdi-language-javascript',
    mediaType: 'text/javascript',
  },
  JINJA: {
    title: 'Jinja',
    value: '.jinja',
    icon: 'mdi-file-code',
    mediaType: 'text/plain',
  },
  MD: {
    title: 'MD',
    value: '.md',
    icon: 'mdi-language-markdown',
    mediaType: 'text/markdown',
  },
  ODP: {
    title: 'ODP',
    value: '.odp',
    icon: 'mdi-file-powerpoint',
    mediaType: 'application/vnd.oasis.opendocument.presentation',
  },
  ODS: {
    title: 'ODS',
    value: '.ods',
    icon: 'mdi-file-excel',
    mediaType: 'application/vnd.oasis.opendocument.spreadsheet',
  },
  ODT: {
    title: 'ODT',
    value: '.odt',
    icon: 'mdi-file-word',
    mediaType: 'application/vnd.oasis.opendocument.text',
  },
  PDF: {
    title: 'PDF',
    value: '.pdf',
    icon: 'mdi-file-pdf-box',
    mediaType: 'application/pdf',
  },
  PPT: {
    title: 'PPT',
    value: '.ppt',
    icon: 'mdi-file-powerpoint',
    mediaType: 'application/vnd.ms-powerpoint',
  },
  PPTX: {
    title: 'PPTX',
    value: '.pptx',
    icon: 'mdi-file-powerpoint',
    mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  PPTM: {
    title: 'PPTM',
    value: '.pptm',
    icon: 'mdi-file-powerpoint',
    mediaType: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  },
  RTF: {
    title: 'RTF',
    value: '.rtf',
    icon: 'mdi-file-document-outline',
    mediaType: 'application/rtf',
  },
  PY: {
    title: 'PY',
    value: '.py',
    icon: 'mdi-language-python',
    mediaType: 'text/x-python',
  },
  SH: {
    title: 'SH',
    value: '.sh',
    icon: 'mdi-console',
    mediaType: 'text/x-shellscript',
  },
  SQL: {
    title: 'SQL',
    value: '.sql',
    icon: 'mdi-database',
    mediaType: 'application/sql',
  },
  TSV: {
    title: 'TSV',
    value: '.tsv',
    icon: 'mdi-keyboard-tab',
    mediaType: 'text/tab-separated-values',
  },
  TXT: {
    title: 'TXT',
    value: '.txt',
    icon: 'mdi-file-document',
    mediaType: 'text/plain',
  },
  XLS: {
    title: 'XLS',
    value: '.xls',
    icon: 'mdi-file-excel',
    mediaType: 'application/vnd.ms-excel',
  },
  XLSX: {
    title: 'XLSX',
    value: '.xlsx',
    icon: 'mdi-file-excel',
    mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  XLSM: {
    title: 'XLSM',
    value: '.xlsm',
    icon: 'mdi-file-excel',
    mediaType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  },
  JPG: {
    title: 'JPG',
    value: '.jpg',
    icon: 'mdi-file-image',
    mediaType: 'image/jpeg',
  },
  JPEG: {
    title: 'JPEG',
    value: '.jpeg',
    icon: 'mdi-file-image',
    mediaType: 'image/jpeg',
  },
  PNG: {
    title: 'PNG',
    value: '.png',
    icon: 'mdi-file-image',
    mediaType: 'image/png',
  },
  GIF: {
    title: 'GIF',
    value: '.gif',
    icon: 'mdi-file-image',
    mediaType: 'image/gif',
  },
  WEBP: {
    title: 'WEBP',
    value: '.webp',
    icon: 'mdi-file-image',
    mediaType: 'image/webp',
  },
});

const Image = Object.freeze({
  ALL: {
    title: 'All',
    value: null,
    mediaType: 'image/*',
  },
  GIF: {
    title: 'GIF',
    value: '.gif',
    mediaType: 'image/gif',
  },
  JPEG: {
    title: 'JPEG',
    value: '.jpeg',
    mediaType: 'image/jpeg',
  },
  JPG: {
    title: 'JPG',
    value: '.jpg',
    mediaType: 'image/jpeg',
  },
  PNG: {
    title: 'PNG',
    value: '.png',
    mediaType: 'image/png',
  },
  WEBP: {
    title: 'WEBP',
    value: '.webp',
    mediaType: 'image/webp',
  },
});

export {
  Base,
  Image,
};
