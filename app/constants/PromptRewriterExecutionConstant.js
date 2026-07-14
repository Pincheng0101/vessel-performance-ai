import * as LlmConstant from './LlmConstant';
import * as ResourceConstant from './ResourceConstant';

const PromptLanguage = Object.freeze({
  ENGLISH: {
    value: 'English',
    i18nLocale: 'en',
    i18nTitle: '__titleLanguageEnglish',
  },
  TRADITIONAL_CHINESE: {
    value: 'Traditional Chinese',
    i18nLocale: 'zh-TW',
    i18nTitle: '__titleLanguageTraditionalChinese',
  },
});

const DefaultParams = Object.freeze({
  ORIGINAL_PROMPT: {
    max: 50000,
    min: 1,
  },
  TARGET_LLM_TYPE: LlmConstant.Type.BEDROCK_ANTHROPIC.value,
  TARGET_MODEL: LlmConstant.BedrockAnthropicModel.GLOBAL_CLAUDE_SONNET_4_6.value,
  EXECUTION_LLM: {
    llmId: LlmConstant.DefaultLlm.ID,
    llmName: LlmConstant.DefaultLlm.NAME,
    llmType: LlmConstant.DefaultLlm.TYPE,
  },
  PROMPT_LANGUAGE: PromptLanguage.ENGLISH.value,
  EXTENSIONS: {
    contentSafety: true,
    privacyProtection: true,
  },
});

const TargetLlmSource = Object.freeze({
  CUSTOM_LLM: {
    i18nTitle: '__fieldPromptRewriterCustomLlm',
    value: 'custom_llm',
    icon: ResourceConstant.Type.LLM.icon,
    i18nSubtitle: '__subtitleTargetLlmSourceCustomLlm',
  },
  EXISTING_LLM: {
    i18nTitle: '__fieldPromptRewriterExistingLlm',
    value: 'existing_llm',
    icon: ResourceConstant.Type.LLM.icon,
    i18nSubtitle: '__subtitleTargetLlmSourceExistingLlm',
  },
});

export {
  DefaultParams,
  PromptLanguage,
  TargetLlmSource,
};
