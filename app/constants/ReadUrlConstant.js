const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        read_url_output: {
          type: 'string',
        },
      },
      required: ['read_url_output'],
    },
  },
  URL: 'https://',
  HEADERS: {},
  FORMAT: 'markdown',
  LIMIT: {
    default: 4096,
    min: 1024,
  },
});

const Format = Object.freeze({
  MARKDOWN: {
    title: 'Markdown',
    value: 'markdown',
    icon: 'mdi-language-markdown',
    i18nSubtitle: '__subtitleActionFormatMarkdown',
  },
  HTML: {
    title: 'HTML',
    value: 'html',
    icon: 'mdi-language-html5',
    i18nSubtitle: '__subtitleActionFormatHtml',
  },
});

export {
  ActionExecutionParams,
  Format,
};
