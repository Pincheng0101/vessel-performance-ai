import { McpServerConstant, McpServerPresetConstant } from '~/constants';
import McpServer from './McpServer';
import McpServerAuth from './McpServerAuth';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class StreamableHttpMcpServer extends McpServer {
  constructor({
    auth,
    endpointUrl,
    mcpServerId,
    mcpServerName,
    mcpServerType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      endpointUrl,
      mcpServerId,
      mcpServerName,
      mcpServerType,
      status,
      systemInfo,
      updatedTs,
    });
    this.auth = auth ?? null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(McpServerConstant.Type, this.type, 'title'), iconPath: findField(McpServerConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldEndpointUrl'), value: this.endpointUrl, isCopyable: true, iconPath: McpServerPresetConstant.Preset.find(p => p.endpointUrl === this.endpointUrl)?.iconPath },
      { title: $i18n.t('__fieldMcpServerAuthType'), value: this.auth?.authType ? $i18n.t(findField(McpServerConstant.StreamableHttpAuthType, this.auth.authType, 'i18nTitle', 'value')) : null, isHidden: !this.auth },
      { title: $i18n.t('__fieldConnector'), value: this.auth?.authPayload?.connectorId, isCopyable: true, isHidden: this.auth?.authType !== McpServerConstant.StreamableHttpAuthType.HEADER.value },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {StreamableHttpMcpServer} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      auth: resource.auth ? McpServerAuth.toRequestPayload(resource.auth) : null,
      endpoint_url: resource.endpointUrl,
    };
  }
}

export default StreamableHttpMcpServer;
