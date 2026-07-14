import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolAthena extends AgentTool {
  constructor({
    catalog,
    connectorId,
    database,
    description,
    displayName,
    name,
    outputLocation,
    readOnly,
    tags,
    toolType = AgentConstant.ToolType.ATHENA_CLIENT.value,
    trackToolResults,
    workgroup,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.catalog = catalog;
    this.connectorId = connectorId;
    this.database = database;
    this.outputLocation = outputLocation;
    this.readOnly = readOnly;
    this.workgroup = workgroup;
  }

  /**
   * @param {AgentToolAthena} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      catalog: tool.catalog,
      connector_id: tool.connectorId,
      database: tool.database,
      output_location: tool.outputLocation,
      read_only: tool.readOnly,
      workgroup: tool.workgroup,
    };
  }
}

export default AgentToolAthena;
