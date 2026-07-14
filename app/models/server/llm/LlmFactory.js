import { LlmConstant } from '~/constants';
import BedrockAnthropicLlm from './BedrockAnthropicLlm';
import BedrockGptOssLlm from './BedrockGptOssLlm';
import BedrockLlamaLlm from './BedrockLlamaLlm';
import BedrockNovaLlm from './BedrockNovaLlm';
import GeminiLlm from './GeminiLlm';
import Llm from './Llm';
import OllamaLlm from './OllamaLlm';
import OpenAiLlm from './OpenAiLlm';

class LlmFactory {
  /**
   * @param {Llm} payload
   */
  static create(payload) {
    switch (payload.llmType) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return new BedrockAnthropicLlm(payload);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return new BedrockLlamaLlm(payload);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return new BedrockGptOssLlm(payload);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return new BedrockNovaLlm(payload);
      case LlmConstant.Type.GEMINI.value:
        return new GeminiLlm(payload);
      case LlmConstant.Type.OLLAMA.value:
        return new OllamaLlm(payload);
      case LlmConstant.Type.OPENAI.value:
        return new OpenAiLlm(payload);
      default:
        return new Llm(payload);
    }
  }

  /**
   * @param {Llm} resource
   */
  static toRequestPayload(resource) {
    switch (resource.llmType) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return BedrockAnthropicLlm.toRequestPayload(resource);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return BedrockLlamaLlm.toRequestPayload(resource);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return BedrockGptOssLlm.toRequestPayload(resource);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return BedrockNovaLlm.toRequestPayload(resource);
      case LlmConstant.Type.GEMINI.value:
        return GeminiLlm.toRequestPayload(resource);
      case LlmConstant.Type.OLLAMA.value:
        return OllamaLlm.toRequestPayload(resource);
      case LlmConstant.Type.OPENAI.value:
        return OpenAiLlm.toRequestPayload(resource);
      default:
        return Llm.toRequestPayload(resource);
    }
  }

  /**
   * @param {Llm} resource
   */
  static toValidateRequestPayload(resource) {
    switch (resource.llmType) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return BedrockAnthropicLlm.toValidateRequestPayload(resource);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return BedrockLlamaLlm.toValidateRequestPayload(resource);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return BedrockGptOssLlm.toValidateRequestPayload(resource);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return BedrockNovaLlm.toValidateRequestPayload(resource);
      case LlmConstant.Type.GEMINI.value:
        return GeminiLlm.toValidateRequestPayload(resource);
      case LlmConstant.Type.OLLAMA.value:
        return OllamaLlm.toValidateRequestPayload(resource);
      case LlmConstant.Type.OPENAI.value:
        return OpenAiLlm.toValidateRequestPayload(resource);
      default:
        return null;
    }
  }
}

export default LlmFactory;
