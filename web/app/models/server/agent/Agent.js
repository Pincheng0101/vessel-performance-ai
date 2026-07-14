import { AgentConstant, ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';
import AgentBuiltInTools from './AgentBuiltInTools';
import AgentToolFactory from './AgentToolFactory';
import AgentUiConfig from './AgentUiConfig';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class Agent extends Resource {
  constructor({
    agentId,
    agentName,
    agentPrompt,
    builtInTools,
    description,
    enableCredit,
    enablePromptCaching,
    isStepsSaved,
    llmId,
    llmIds,
    maxIterations,
    maxTurns,
    outputFormat,
    status,
    systemInfo,
    tools,
    uiConfig,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    this.agentId = agentId;
    this.agentName = agentName;
    this.agentPrompt = agentPrompt;
    this.builtInTools = builtInTools
      ? new AgentBuiltInTools(builtInTools)
      : new AgentBuiltInTools({
          askUserQuestion: {
            enable: AgentConstant.BuiltInToolType.ASK_USER_QUESTION.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.ASK_USER_QUESTION.defaultTrackToolResults,
          },
          task: {
            enable: AgentConstant.BuiltInToolType.TASK.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.TASK.defaultTrackToolResults,
          },
          bash: {
            enable: AgentConstant.BuiltInToolType.BASH.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.BASH.defaultTrackToolResults,
            maxTimeout: AgentConstant.DefaultParams.BASH_MAX_TIMEOUT.default,
            maxOutputChars: AgentConstant.DefaultParams.BASH_MAX_OUTPUT_CHARS.default,
            blockedCommands: AgentConstant.DefaultParams.BASH_BLOCKED_COMMANDS.default,
          },
          browser: {
            enable: AgentConstant.BuiltInToolType.BROWSER.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.BROWSER.defaultTrackToolResults,
            maxTimeout: AgentConstant.DefaultParams.BROWSER_MAX_TIMEOUT.default,
            maxOutputChars: AgentConstant.DefaultParams.BROWSER_MAX_OUTPUT_CHARS.default,
          },
          code: {
            enable: AgentConstant.BuiltInToolType.CODE.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.CODE.defaultTrackToolResults,
            runtimeType: AgentConstant.DefaultParams.CODE_RUNTIME_TYPE.default,
          },
          read: {
            enable: AgentConstant.BuiltInToolType.READ.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.READ.defaultTrackToolResults,
          },
          glob: {
            enable: AgentConstant.BuiltInToolType.GLOB.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.GLOB.defaultTrackToolResults,
          },
          grep: {
            enable: AgentConstant.BuiltInToolType.GREP.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.GREP.defaultTrackToolResults,
          },
          readUrl: {
            enable: AgentConstant.BuiltInToolType.READ_URL.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.READ_URL.defaultTrackToolResults,
          },
          skill: {
            enable: AgentConstant.BuiltInToolType.SKILL.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.SKILL.defaultTrackToolResults,
          },
          write: {
            enable: AgentConstant.BuiltInToolType.WRITE.defaultEnable,
            trackToolResults: AgentConstant.BuiltInToolType.WRITE.defaultTrackToolResults,
          },
        });
    this.description = description ?? null;
    this.enableCredit = enableCredit ?? false;
    this.enablePromptCaching = enablePromptCaching ?? true;
    this.isStepsSaved = isStepsSaved ?? false;
    this.llmId = llmId;
    this.llmIds = llmIds ?? null;
    this.maxIterations = maxIterations ?? AgentConstant.DefaultParams.MAX_ITERATIONS.default;
    this.maxTurns = maxTurns ?? AgentConstant.DefaultParams.MAX_TURNS.default;
    this.outputFormat = outputFormat ?? null;
    this.tools = tools || [];
    this.uiConfig = uiConfig ? new AgentUiConfig(uiConfig) : {};
  }

  get resourceType() {
    return ResourceConstant.Type.AGENT.value;
  }

  get id() {
    return this.agentId;
  }

  get name() {
    return this.agentName;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldDescription'), value: this.description, isBlockText: true, editorOptions: { maxLines: 10 } },
      { title: $i18n.t('__fieldAgentPrompt'), value: this.agentPrompt, isBlockText: true, editorOptions: { maxLines: 10 } },
      { title: $i18n.t('__fieldLlm'), value: this.llmId, isCopyable: true, link: { href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, this.llmId) } },
      { title: $i18n.t('__fieldSwitchableLlms'), value: this.llmIds, isChip: false, isCopyable: true, link: llmId => ({ href: resourceUtils.getUrl(ResourceConstant.Type.LLM.value, llmId) }) },
      { title: $i18n.t('__fieldAgentOutputFormat'), value: AgentConstant.OutputFormat[this.outputFormat] ? $i18n.t(AgentConstant.OutputFormat[this.outputFormat].i18nTitle) : this.outputFormat },
      { title: $i18n.t('__fieldMaxTurns'), value: this.maxTurns },
      { title: $i18n.t('__fieldMaxIterations'), value: this.maxIterations },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @returns {DisplayField[]}
   */
  get toolsDisplayFields() {
    const { $i18n } = useNuxtApp();
    const retrievalTools = this.retrievalTools;
    const searchEngineTools = this.searchEngineTools;
    const mcpServerTools = this.mcpServerTools;
    const workflowTools = this.workflowTools;
    const skillTools = this.skillTools;
    const lambdaTools = this.lambdaTools;
    const apiTools = this.apiTools;
    const httpClientTools = this.httpClientTools;
    const agentTools = this.agentTools;
    const athenaClientTools = this.athenaClientTools;
    const openSearchClientTools = this.openSearchClientTools;
    const mysqlClientTools = this.mysqlClientTools;

    return [
      {
        title: $i18n.t('__fieldRetrieval', 2),
        value: retrievalTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldTrackToolResults'), key: 'trackToolResults', value: item => item.trackToolResults ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.trackToolResults ? 'success' : null }) },
            { title: $i18n.t('__fieldKnowledgeBaseId'), key: 'knowledgeBaseId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, item.knowledgeBaseId), target: '_blank' }), isCopyable: true },
            { title: $i18n.t('__fieldRetrieverId', 2), key: 'retrieverIds', isChip: false, isCopyable: true, link: () => retrieverId => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, retrieverId), target: '_blank' }) },
            { title: $i18n.t('__fieldDataField', 2), key: 'dataFields', isChip: true },
            { title: $i18n.t('__fieldRankerId'), key: 'rankerId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, item.rankerId), target: '_blank' }), isCopyable: true },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldSearchEngine', 2),
        value: searchEngineTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldSearchEngineId'), key: 'searchEngineId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, item.searchEngineId), target: '_blank' }), isCopyable: true },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldMcpServer', 2),
        value: mcpServerTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldMcpServerId'), key: 'mcpServerId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, item.mcpServerId), target: '_blank' }), isCopyable: true },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldWorkflow', 2),
        value: workflowTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldWorkflowId'), key: 'workflowId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.workflowId), target: '_blank' }), isCopyable: true },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldSkill', 2),
        value: skillTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldSkillId'), key: 'skillId', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, item.skillId), target: '_blank' }), isCopyable: true },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldLambda', 2),
        value: lambdaTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldLambdaFunctionName'), key: 'functionName' },
            { title: $i18n.t('__fieldLambdaFunctionId'), key: 'lambdaFunctionId', link: item => item.lambdaFunctionId ? { href: resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, item.lambdaFunctionId), target: '_blank' } : null, isCopyable: true },
            { title: $i18n.t('__fieldInputSchema'), key: 'inputSchema', isJsonCode: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldApi', 2),
        value: apiTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldConnector'), key: 'connectorId', link: item => item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null, isCopyable: true },
            { title: $i18n.t('__fieldUrl'), key: 'url', isCopyable: true, isSingleLine: true, link: item => item.url ? ({ href: item.url, target: '_blank' }) : null },
            { title: $i18n.t('__fieldMethod'), key: 'method', isChip: true, chipOptions: { color: 'primary' } },
            { title: $i18n.t('__fieldInputSchema'), key: 'inputSchema', isJsonCode: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldHttpHeader', 2), key: 'headers', isJsonCode: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldParameter', 2), key: 'params', isJsonCode: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldBody'), key: 'body', editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTimeout'), key: 'timeout' },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldHttp', 2),
        value: httpClientTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldConnector'), key: 'connectorId', link: item => item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null, isCopyable: true },
            { title: $i18n.t('__fieldHttpHeader', 2), key: 'headers', isJsonCode: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldTimeout'), key: 'timeout' },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldAgent', 2),
        value: agentTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldAgent'), key: 'agentId', link: item => item.agentId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, item.agentId), target: '_blank' }) : null, isCopyable: true },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldAthena', 2),
        value: athenaClientTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldConnector'), key: 'connectorId', link: item => item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null, isCopyable: true },
            { title: $i18n.t('__fieldDatabase'), key: 'database', isCopyable: true },
            { title: $i18n.t('__fieldWorkgroup'), key: 'workgroup', isCopyable: true },
            { title: $i18n.t('__fieldOutputLocation'), key: 'outputLocation', isCopyable: true },
            { title: $i18n.t('__fieldCatalog'), key: 'catalog', isCopyable: true },
            { title: $i18n.t('__fieldReadOnly'), key: 'readOnly', value: item => item.readOnly ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.readOnly ? 'success' : null }) },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldOpenSearch', 2),
        value: openSearchClientTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldConnector'), key: 'connectorId', link: item => item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null, isCopyable: true },
            { title: $i18n.t('__fieldIsCacheConnection'), key: 'isCacheConnection', value: item => item.isCacheConnection ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.isCacheConnection ? 'success' : null }) },
            { title: $i18n.t('__fieldTimeout'), key: 'timeout' },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
      {
        title: $i18n.t('__fieldMySql', 2),
        value: mysqlClientTools,
        table: {
          headers: [
            { title: $i18n.t('__fieldName'), key: 'name' },
            { title: $i18n.t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
            { title: $i18n.t('__fieldConnector'), key: 'connectorId', link: item => item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null, isCopyable: true },
            { title: $i18n.t('__fieldDatabase'), key: 'database', isCopyable: true },
            { title: $i18n.t('__fieldReadOnly'), key: 'readOnly', value: item => item.readOnly ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.readOnly ? 'success' : null }) },
            { title: $i18n.t('__fieldTag', 2), key: 'tags', isJsonCode: true, editorOptions: { maxLines: 10 } },
          ],
        },
      },
    ].filter(item => item.value?.length > 0);
  }

  /**
   * @returns {DisplayField[]}
   */
  get builtInToolsDisplayFields() {
    const { $i18n } = useNuxtApp();
    const isAdmin = !!useAuthStore().parsedToken?.isAdmin;
    const getCodeRuntimeTypeTitle = (runtimeType) => {
      const option = Object.values(AgentConstant.BuiltInToolCodeRuntimeType).find(item => item.value === runtimeType);
      return option ? $i18n.t(option.i18nTitle) : runtimeType;
    };
    const items = Object.values(AgentConstant.BuiltInToolType)
      .filter(toolType => !(toolType.adminOnly && !isAdmin))
      .map((toolType) => {
        const tool = this.builtInTools?.[toolType.value];
        return {
          id: toolType.value,
          name: $i18n.t(toolType.i18nName),
          icon: toolType.icon,
          description: $i18n.t(toolType.i18nDescription),
          enabled: !!tool?.enable,
          trackToolResults: !!tool?.trackToolResults,
          maxTimeout: tool?.maxTimeout,
          maxOutputChars: tool?.maxOutputChars,
          blockedCommands: tool?.blockedCommands,
          runtimeType: tool?.runtimeType,
        };
      });

    const getExpandedRowItems = (item) => {
      if (item.id === AgentConstant.BuiltInToolType.BASH.value) {
        return [
          {
            title: $i18n.t('__fieldBashMaxTimeout'),
            value: item.maxTimeout,
          },
          {
            title: $i18n.t('__fieldBashMaxOutputChars'),
            value: item.maxOutputChars,
          },
          {
            title: $i18n.t('__fieldBashBlockedCommands'),
            value: item.blockedCommands,
            isChip: true,
          },
        ];
      }

      if (item.id === AgentConstant.BuiltInToolType.BROWSER.value) {
        return [
          {
            title: $i18n.t('__fieldBrowserMaxTimeout'),
            value: item.maxTimeout,
          },
          {
            title: $i18n.t('__fieldBrowserMaxOutputChars'),
            value: item.maxOutputChars,
          },
        ];
      }

      if (item.id === AgentConstant.BuiltInToolType.CODE.value) {
        return [
          {
            title: $i18n.t('__fieldCodeRuntimeType'),
            value: getCodeRuntimeTypeTitle(item.runtimeType),
          },
        ];
      }

      return [];
    };

    return [{
      value: items,
      table: {
        headers: [
          { title: $i18n.t('__fieldName'), key: 'name', icon: item => item.icon },
          { title: $i18n.t('__fieldDescription'), key: 'description' },
          { title: $i18n.t('__fieldEnabled'), key: 'enabled', value: item => item.enabled ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.enabled ? 'success' : null }) },
        ],
        expandedRow: getExpandedRowItems,
        isExpandedRowVisible: item => item.enabled && getExpandedRowItems(item).length > 0,
      },
    }];
  }

  get retrievalTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.RETRIEVAL.value) || [];
  }

  get searchEngineTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.SEARCH_ENGINE.value) || [];
  }

  get mcpServerTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.MCP_SERVER.value) || [];
  }

  get toolsDisplayFieldsExcludingMcp() {
    return this.toolsDisplayFields.filter(field =>
      !Array.isArray(field.value)
      || field.value.length === 0
      || field.value[0]?.toolType !== AgentConstant.ToolType.MCP_SERVER.value,
    );
  }

  get workflowTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.WORKFLOW.value) || [];
  }

  get skillTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.SKILL.value) || [];
  }

  get lambdaTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.LAMBDA.value) || [];
  }

  get apiTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.API.value) || [];
  }

  get httpClientTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.HTTP_CLIENT.value) || [];
  }

  get openSearchClientTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.OPENSEARCH_CLIENT.value) || [];
  }

  get mysqlClientTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.MYSQL_CLIENT.value) || [];
  }

  get agentTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.AGENT.value) || [];
  }

  get athenaClientTools() {
    return this.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.ATHENA_CLIENT.value) || [];
  }

  /**
   * @param {Agent} resource
   */
  static toRequestPayload(resource) {
    return {
      agent_id: resource.agentId,
      agent_name: resource.agentName,
      agent_prompt: resource.agentPrompt,
      description: resource.description,
      enable_credit: resource.enableCredit,
      enable_prompt_caching: true,
      is_steps_saved: false,
      llm_id: resource.llmId,
      llm_ids: resource.llmIds,
      max_iterations: resource.maxIterations,
      max_turns: resource.maxTurns,
      output_format: resource.outputFormat,
      tools: (resource.tools || []).map(tool => AgentToolFactory.toRequestPayload(tool)),
      builtin_tools: resource.builtInTools ? AgentBuiltInTools.toRequestPayload(resource.builtInTools) : undefined,
      ui_config: resource.uiConfig ? AgentUiConfig.toRequestPayload(resource.uiConfig) : undefined,
    };
  }
}

export default Agent;
