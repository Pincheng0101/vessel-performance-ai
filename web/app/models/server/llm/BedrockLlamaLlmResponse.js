import BedrockLlamaLlm from './BedrockLlamaLlm';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class BedrockLlamaLlmResponse extends BedrockLlamaLlm {
  constructor({
    account_id,
    aws_access_key_id,
    aws_secret_access_key,
    llm_id,
    llm_name,
    llm_type,
    max_tokens,
    model,
    performance_config_latency,
    region,
    role_name,
    status,
    system_info,
    system_prompt,
    temperature,
    top_p,
    updated_ts,
  } = {}) {
    super({
      accountId: account_id,
      awsAccessKeyId: aws_access_key_id,
      awsSecretAccessKey: aws_secret_access_key,
      llmId: llm_id,
      llmName: llm_name,
      llmType: llm_type,
      maxTokens: max_tokens,
      model,
      performanceConfigLatency: performance_config_latency,
      region,
      roleName: role_name,
      status,
      systemInfo: system_info,
      systemPrompt: system_prompt,
      temperature,
      topP: top_p,
      updatedTs: updated_ts,
    });
  }
}

export default BedrockLlamaLlmResponse;
