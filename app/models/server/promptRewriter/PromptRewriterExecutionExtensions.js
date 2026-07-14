import { PromptRewriterExecutionConstant } from '~/constants';

class PromptRewriterExecutionExtensions {
  constructor({
    contentSafety,
    privacyProtection,
  } = {}) {
    this.contentSafety = contentSafety ?? PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.contentSafety;
    this.privacyProtection = privacyProtection ?? PromptRewriterExecutionConstant.DefaultParams.EXTENSIONS.privacyProtection;
  }

  /**
   * @param {PromptRewriterExecutionExtensions} extensions
   */
  static toRequestPayload(extensions) {
    return {
      content_safety: extensions.contentSafety,
      privacy_protection: extensions.privacyProtection,
    };
  }
}

export default PromptRewriterExecutionExtensions;
