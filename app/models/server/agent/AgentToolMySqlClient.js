import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolMySqlClient extends AgentTool {
  constructor({
    connectorId,
    database,
    description,
    displayName,
    name,
    readOnly,
    tags,
    toolType = AgentConstant.ToolType.MYSQL_CLIENT.value,
    trackToolResults,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.connectorId = connectorId;
    this.database = database;
    this.readOnly = readOnly ?? true;
  }

  /**
   * @param {AgentToolMySqlClient} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      connector_id: tool.connectorId,
      database: tool.database,
      read_only: tool.readOnly,
    };
  }
}

export default AgentToolMySqlClient;
