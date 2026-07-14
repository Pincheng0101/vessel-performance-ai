import { ContentBlockConstant, PromptRewriterExecutionConstant } from '~/constants';
import { AttachmentContentBlock } from '~/models/server/contentBlock';
import { LlmFactory } from '~/models/server/llm';
import PromptRewriterExecutionExtensions from './PromptRewriterExecutionExtensions';

class PromptRewriterExecution {
  constructor({
    attachments,
    constraints,
    executionLlm,
    extensions,
    originalPrompt,
    promptLanguage,
    rewriteInstruction,
    targetLlmId,
    targetLlmType,
    targetModel,
  } = {}) {
    this.constraints = constraints ?? null;
    this.executionLlm = executionLlm ?? LlmFactory.create(PromptRewriterExecutionConstant.DefaultParams.EXECUTION_LLM);
    this.extensions = new PromptRewriterExecutionExtensions(extensions ?? {
      contentSafety: PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.contentSafety,
      privacyProtection: PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.privacyProtection,
    });
    this.attachments = attachments?.length > 0
      ? attachments.map(attachment => new AttachmentContentBlock({
          ...attachment,
          contentBlockType: ContentBlockConstant.Type.ATTACHMENT.value,
        }))
      : null;
    this.originalPrompt = originalPrompt ?? '';
    this.promptLanguage = promptLanguage ?? (() => {
      try {
        return findField(PromptRewriterExecutionConstant.PromptLanguage, useCustomLocale().localLocale.value, 'value', 'i18nLocale');
      } catch {
        return PromptRewriterExecutionConstant.PromptLanguage.ENGLISH.value;
      }
    })() ?? PromptRewriterExecutionConstant.PromptLanguage.ENGLISH.value;
    this.rewriteInstruction = rewriteInstruction ?? null;
    this.targetLlmId = targetLlmId ?? null;
    this.targetLlmType = targetLlmType ?? null;
    this.targetModel = targetModel ?? null;
  }

  /**
   * @param {PromptRewriterExecution} payload
   */
  static toRequestPayload(payload) {
    return {
      attachments: payload.attachments?.length > 0
        ? payload.attachments.map(attachment => AttachmentContentBlock.toRequestPayload({
            ...attachment,
            content_block_type: ContentBlockConstant.Type.ATTACHMENT.value,
          }))
        : payload.attachments,
      constraints: payload.constraints,
      execution_llm: payload.executionLlm,
      extensions: PromptRewriterExecutionExtensions.toRequestPayload(payload.extensions),
      original_prompt: payload.originalPrompt,
      prompt_language: payload.promptLanguage,
      rewrite_instruction: payload.rewriteInstruction,
      target_llm_id: payload.targetLlmId,
      target_llm_type: payload.targetLlmType,
      target_model: payload.targetModel,
    };
  }
}

export default PromptRewriterExecution;
