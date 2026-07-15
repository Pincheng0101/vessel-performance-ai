import * as ContentBlockConstant from './ContentBlockConstant';

const ContentBlockType = Object.freeze({
  ...ContentBlockConstant.Type,
});

const ContentBlock = Object.freeze({
  THINKING: {
    i18nTitle: '__messageAgentThinking',
    name: 'thinking',
    value: 'Thinking...',
  },
});

export {
  ContentBlock,
  ContentBlockType,
};
