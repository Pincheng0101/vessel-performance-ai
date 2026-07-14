import { McpServerConstant } from '~/constants';
import McpServer from './McpServer';
import McpServerCustomToolFactory from './McpServerCustomToolFactory';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class CustomMcpServer extends McpServer {
  constructor({
    customTools,
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
    this.customTools = Array.isArray(customTools)
      ? customTools.map(tool => McpServerCustomToolFactory.create(tool))
      : [];
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
      { title: $i18n.t('__fieldEndpointUrl'), value: this.endpointUrl, isCopyable: true, isHidden: !this.endpointUrl },
      {
        title: $i18n.t('__fieldCustomTool', 2),
        value: this.customTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldType'), key: 'type', value: item => $i18n.t(findField(McpServerConstant.CustomToolType, item.type, 'i18nTitle')), icon: item => findField(McpServerConstant.CustomToolType, item.type, 'icon'), iconPath: item => findField(McpServerConstant.CustomToolType, item.type, 'iconPath') },
          ],
        },
      },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {CustomMcpServer} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      custom_tools: resource.customTools?.map(tool => McpServerCustomToolFactory.toRequestPayload(tool)),
    };
  }
}

export default CustomMcpServer;
