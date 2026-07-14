import { LlmConstant } from '~/constants';
import BedrockAnthropicLlmActionExecutionPayload from './BedrockAnthropicLlmActionExecutionPayload';
import BedrockGptOssLlmActionExecutionPayload from './BedrockGptOssLlmActionExecutionPayload';
import BedrockLlamaLlmActionExecutionPayload from './BedrockLlamaLlmActionExecutionPayload';
import BedrockNovaLlmActionExecutionPayload from './BedrockNovaLlmActionExecutionPayload';
import GeminiLlmActionExecutionPayload from './GeminiLlmActionExecutionPayload';
import LlmActionExecutionPayload from './LlmActionExecutionPayload';
import OllamaLlmActionExecutionPayload from './OllamaLlmActionExecutionPayload';
import OpenAiLlmActionExecutionPayload from './OpenAiLlmActionExecutionPayload';

class LlmActionExecutionPayloadFactory {
  /**
   * @param {LlmActionExecutionPayload} payload
   */
  static create(payload) {
    // Use ?. to handle a potential null payload
    switch (payload?.llmType) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return new BedrockAnthropicLlmActionExecutionPayload(payload);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return new BedrockLlamaLlmActionExecutionPayload(payload);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return new BedrockGptOssLlmActionExecutionPayload(payload);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return new BedrockNovaLlmActionExecutionPayload(payload);
      case LlmConstant.Type.GEMINI.value:
        return new GeminiLlmActionExecutionPayload(payload);
      case LlmConstant.Type.OLLAMA.value:
        return new OllamaLlmActionExecutionPayload(payload);
      case LlmConstant.Type.OPENAI.value:
        return new OpenAiLlmActionExecutionPayload(payload);
      default:
        return new LlmActionExecutionPayload(payload);
    }
  }

  /**
   * @param {LlmActionExecutionPayload} llm
   */
  static toRequestPayload(llm) {
    switch (llm.llmType) {
      case LlmConstant.Type.BEDROCK_ANTHROPIC.value:
        return BedrockAnthropicLlmActionExecutionPayload.toRequestPayload(llm);
      case LlmConstant.Type.BEDROCK_LLAMA.value:
        return BedrockLlamaLlmActionExecutionPayload.toRequestPayload(llm);
      case LlmConstant.Type.BEDROCK_GPT_OSS.value:
        return BedrockGptOssLlmActionExecutionPayload.toRequestPayload(llm);
      case LlmConstant.Type.BEDROCK_NOVA.value:
        return BedrockNovaLlmActionExecutionPayload.toRequestPayload(llm);
      case LlmConstant.Type.GEMINI.value:
        return GeminiLlmActionExecutionPayload.toRequestPayload(llm);
      case LlmConstant.Type.OLLAMA.value:
        return OllamaLlmActionExecutionPayload.toRequestPayload(llm);
      case LlmConstant.Type.OPENAI.value:
        return OpenAiLlmActionExecutionPayload.toRequestPayload(llm);
      default:
        return LlmActionExecutionPayload.toRequestPayload(llm);
    }
  }
}

export default LlmActionExecutionPayloadFactory;
