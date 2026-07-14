import { LlmConstant } from '~/constants';
import BedrockAnthropicLlmActionExecutionPayloadResponse from './BedrockAnthropicLlmActionExecutionPayloadResponse';
import BedrockGptOssLlmActionExecutionPayloadResponse from './BedrockGptOssLlmActionExecutionPayloadResponse';
import BedrockLlamaLlmActionExecutionPayloadResponse from './BedrockLlamaLlmActionExecutionPayloadResponse';
import BedrockNovaLlmActionExecutionPayloadResponse from './BedrockNovaLlmActionExecutionPayloadResponse';
import GeminiLlmActionExecutionPayloadResponse from './GeminiLlmActionExecutionPayloadResponse';
import LlmActionExecutionPayloadResponse from './LlmActionExecutionPayloadResponse';
import OllamaLlmActionExecutionPayloadResponse from './OllamaLlmActionExecutionPayloadResponse';
import OpenAiLlmActionExecutionPayloadResponse from './OpenAiLlmActionExecutionPayloadResponse';

class LlmActionExecutionPayloadResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.llm_type
   */
  static create(payload) {
    const normalized = referencePathUtils.removeSuffixes(payload);
    // Use ?. to handle a potential null payload
    switch (normalized?.llm_type) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return new BedrockAnthropicLlmActionExecutionPayloadResponse(normalized);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return new BedrockLlamaLlmActionExecutionPayloadResponse(normalized);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return new BedrockGptOssLlmActionExecutionPayloadResponse(normalized);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return new BedrockNovaLlmActionExecutionPayloadResponse(normalized);
      case LlmConstant.Type.GEMINI.value:
        return new GeminiLlmActionExecutionPayloadResponse(normalized);
      case LlmConstant.Type.OLLAMA.value:
        return new OllamaLlmActionExecutionPayloadResponse(normalized);
      case LlmConstant.Type.OPENAI.value:
        return new OpenAiLlmActionExecutionPayloadResponse(normalized);
      default:
        return new LlmActionExecutionPayloadResponse(normalized);
    }
  }
}

export default LlmActionExecutionPayloadResponseFactory;
