import { LlmConstant } from '~/constants';
import BedrockAnthropicLlmResponse from './BedrockAnthropicLlmResponse';
import BedrockGptOssLlmResponse from './BedrockGptOssLlmResponse';
import BedrockLlamaLlmResponse from './BedrockLlamaLlmResponse';
import BedrockNovaLlmResponse from './BedrockNovaLlmResponse';
import GeminiLlmResponse from './GeminiLlmResponse';
import LlmResponse from './LlmResponse';
import OllamaLlmResponse from './OllamaLlmResponse';
import OpenAiLlmResponse from './OpenAiLlmResponse';

class LlmResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.llm_type
   */
  static create(payload) {
    switch (payload.llm_type) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return new BedrockAnthropicLlmResponse(payload);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return new BedrockLlamaLlmResponse(payload);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return new BedrockGptOssLlmResponse(payload);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return new BedrockNovaLlmResponse(payload);
      case LlmConstant.Type.GEMINI.value:
        return new GeminiLlmResponse(payload);
      case LlmConstant.Type.OLLAMA.value:
        return new OllamaLlmResponse(payload);
      case LlmConstant.Type.OPENAI.value:
        return new OpenAiLlmResponse(payload);
      default:
        return new LlmResponse(payload);
    }
  }
}

export default LlmResponseFactory;
