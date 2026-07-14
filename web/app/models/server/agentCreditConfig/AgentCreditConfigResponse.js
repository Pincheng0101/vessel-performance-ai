import AgentCreditConfig from './AgentCreditConfig';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentCreditConfigResponse extends AgentCreditConfig {
  constructor({
    agent_id,
    tier_threshold,
    quota,
    updated_ts,
  } = {}) {
    super({
      agentId: agent_id,
      tierThreshold: tier_threshold,
      quota,
      updatedTs: updated_ts,
    });
  }
}

export default AgentCreditConfigResponse;
