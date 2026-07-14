import Agent from './Agent';
import AgentBuiltInToolsResponse from './AgentBuiltInToolsResponse';
import AgentToolResponseFactory from './AgentToolResponseFactory';
import AgentUiConfigResponse from './AgentUiConfigResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentResponse extends Agent {
  constructor({
    agent_id,
    agent_name,
    agent_prompt,
    builtin_tools,
    description,
    enable_credit,
    enable_prompt_caching,
    is_steps_saved,
    llm_id,
    llm_ids,
    max_iterations,
    max_turns,
    output_format,
    status,
    system_info,
    tools,
    ui_config,
    updated_ts,
  } = {}) {
    super({
      agentId: agent_id,
      agentName: agent_name,
      agentPrompt: agent_prompt,
      builtInTools: builtin_tools ? new AgentBuiltInToolsResponse(builtin_tools) : undefined,
      description,
      enableCredit: enable_credit,
      enablePromptCaching: enable_prompt_caching,
      isStepsSaved: is_steps_saved,
      llmId: llm_id,
      llmIds: llm_ids,
      maxIterations: max_iterations,
      maxTurns: max_turns,
      outputFormat: output_format,
      status,
      systemInfo: system_info,
      tools: tools?.map(tool => AgentToolResponseFactory.create(tool)) || [],
      uiConfig: ui_config ? new AgentUiConfigResponse(ui_config) : {},
      updatedTs: updated_ts,
    });
  }
}

export default AgentResponse;
