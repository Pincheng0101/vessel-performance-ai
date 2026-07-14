import * as ResourceConstant from './ResourceConstant';
import * as StateConstant from './StateConstant';

const ToolType = Object.freeze({
  RETRIEVAL: {
    value: 'retrieval',
    i18nTitle: '__fieldRetrieval',
    i18nDescription: '__tooltipAgentRetrieval',
    defaultTrackToolResults: false,
    icon: StateConstant.ActionType.RETRIEVAL.icon,
  },
  SEARCH_ENGINE: {
    value: 'search_engine',
    i18nTitle: '__fieldSearchEngine',
    i18nDescription: '__tooltipAgentSearchEngine',
    defaultTrackToolResults: false,
    icon: StateConstant.ActionType.SEARCH_ENGINE.icon,
  },
  MCP_SERVER: {
    value: 'mcp_server',
    i18nTitle: '__fieldMcpServer',
    i18nDescription: '__tooltipAgentMcpServer',
    defaultTrackToolResults: false,
    icon: ResourceConstant.Type.MCP_SERVER.iconPath,
  },
  WORKFLOW: {
    value: 'workflow',
    i18nTitle: '__fieldWorkflow',
    i18nDescription: '__tooltipAgentWorkflow',
    defaultTrackToolResults: false,
    icon: ResourceConstant.Type.WORKFLOW.icon,
  },
  SKILL: {
    value: 'skill',
    i18nTitle: '__fieldSkill',
    i18nDescription: '__tooltipAgentSkill',
    defaultTrackToolResults: false,
    icon: ResourceConstant.Type.SKILL.icon,
  },
  LAMBDA: {
    value: 'lambda',
    i18nTitle: '__fieldLambda',
    i18nDescription: '__tooltipAgentLambda',
    defaultTrackToolResults: false,
    icon: StateConstant.ActionType.LAMBDA.icon,
  },
  API: {
    value: 'api',
    i18nTitle: '__fieldApi',
    i18nDescription: '__tooltipAgentApi',
    defaultTrackToolResults: false,
    icon: StateConstant.ActionType.HTTPS_API.icon,
  },
  HTTP_CLIENT: {
    value: 'http_client',
    i18nTitle: '__fieldHttp',
    i18nDescription: '__tooltipAgentHttp',
    defaultTrackToolResults: false,
    icon: 'mdi-web',
  },
  AGENT: {
    value: 'agent',
    i18nTitle: '__fieldAgent',
    i18nDescription: '__tooltipAgentTool',
    defaultTrackToolResults: false,
    icon: ResourceConstant.Type.AGENT.icon,
  },
  ATHENA_CLIENT: {
    value: 'athena_client',
    i18nTitle: '__fieldAthena',
    i18nDescription: '__tooltipAgentAthena',
    defaultTrackToolResults: false,
    icon: '/images/icons/athena.svg',
  },
  OPENSEARCH_CLIENT: {
    value: 'opensearch_client',
    i18nTitle: '__fieldOpenSearch',
    i18nDescription: '__tooltipAgentOpenSearch',
    defaultTrackToolResults: false,
    icon: '/images/icons/opensearchTransparent.svg',
  },
  MYSQL_CLIENT: {
    value: 'mysql_client',
    i18nTitle: '__fieldMySql',
    i18nDescription: '__tooltipAgentMySql',
    defaultTrackToolResults: false,
    icon: '/images/icons/mysqlTransparent.svg',
  },
});

const BuiltInToolType = Object.freeze({
  BASH: {
    value: 'bash',
    i18nName: '__fieldBash',
    i18nDescription: '__descriptionAgentBuiltInToolBash',
    icon: 'mdi-console',
    adminOnly: true,
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [
      'maxTimeout',
      'maxOutputChars',
      'blockedCommands',
    ],
  },
  BROWSER: {
    value: 'browser',
    i18nName: '__fieldBrowser',
    i18nDescription: '__descriptionAgentBuiltInToolBrowser',
    icon: 'mdi-web-box',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [
      'maxTimeout',
      'maxOutputChars',
    ],
  },
  CODE: {
    value: 'code',
    i18nName: '__fieldCode',
    i18nDescription: '__descriptionAgentBuiltInToolCode',
    icon: 'mdi-code-braces',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [
      'runtimeType',
    ],
  },
  ASK_USER_QUESTION: {
    value: 'askUserQuestion',
    i18nName: '__fieldAskUserQuestion',
    i18nDescription: '__descriptionAgentBuiltInToolAskUserQuestion',
    icon: 'mdi-account-question-outline',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  TASK: {
    value: 'task',
    i18nName: '__fieldTask',
    i18nDescription: '__descriptionAgentBuiltInToolTask',
    icon: 'mdi-format-list-checks',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  SKILL: {
    value: 'skill',
    i18nName: '__fieldSkill',
    i18nDescription: '__descriptionAgentBuiltInToolSkill',
    icon: 'mdi-shape-plus',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  READ_URL: {
    value: 'readUrl',
    i18nName: '__fieldReadUrl',
    i18nDescription: '__descriptionAgentBuiltInToolReadUrl',
    icon: 'mdi-web',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  READ: {
    value: 'read',
    i18nName: '__fieldReadFile',
    i18nDescription: '__descriptionAgentBuiltInToolRead',
    icon: 'mdi-file-document-outline',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  GLOB: {
    value: 'glob',
    i18nName: '__fieldGlob',
    i18nDescription: '__descriptionAgentBuiltInToolGlob',
    icon: 'mdi-file-star-outline',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  GREP: {
    value: 'grep',
    i18nName: '__fieldGrep',
    i18nDescription: '__descriptionAgentBuiltInToolGrep',
    icon: 'mdi-magnify',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
  WRITE: {
    value: 'write',
    i18nName: '__fieldWriteFile',
    i18nDescription: '__descriptionAgentBuiltInToolWrite',
    icon: 'mdi-file-edit-outline',
    defaultEnable: false,
    defaultTrackToolResults: false,
    extraFields: [],
  },
});

const BuiltInToolCodeRuntimeType = Object.freeze({
  PYDANTIC_MONTY: {
    value: 'pydantic_monty',
    i18nTitle: '__fieldCodeRuntimeSafeMode',
    i18nSubtitle: '__subtitleCodeRuntimeSafeMode',
    icon: 'mdi-shield-check-outline',
  },
  AGENTCORE_CODE_INTERPRETER: {
    value: 'agentcore_code_interpreter',
    i18nTitle: '__fieldCodeRuntimeAgentCoreCodeInterpreter',
    i18nSubtitle: '__subtitleCodeRuntimeAgentCoreCodeInterpreter',
    icon: 'mdi-console-network-outline',
  },
});

const CreateMode = Object.freeze({
  FROM_BLANK: {
    value: 'from_blank',
  },
  FROM_AGENT_BUILDER: {
    value: 'from_agent_builder',
  },
});

const AgentBuilderType = Object.freeze({
  DEFAULT: {
    value: 'default',
  },
});

const OutputFormat = Object.freeze({
  markdown: {
    value: 'markdown',
    i18nTitle: '__fieldAgentOutputFormatMarkdown',
  },
  html: {
    value: 'html',
    i18nTitle: '__fieldAgentOutputFormatHtml',
  },
  text: {
    value: 'text',
    i18nTitle: '__fieldAgentOutputFormatText',
  },
  markdown_with_html: {
    value: 'markdown_with_html',
    i18nTitle: '__fieldAgentOutputFormatMarkdownWithHtml',
  },
});

const OutputFormatOptions = Object.freeze([
  {
    value: null,
    title: '__fieldAgentOutputFormatUnspecified',
  },
  ...Object.values(OutputFormat).map(item => ({
    value: item.value,
    title: item.i18nTitle,
  })),
]);

const DefaultParams = Object.freeze({
  DESCRIPTION: {
    maxLength: 4096,
  },
  MAX_TURNS: {
    default: 10,
    min: 1,
    max: 100,
  },
  MAX_ITERATIONS: {
    default: 30,
    min: 1,
    max: 200,
  },
  BASH_MAX_TIMEOUT: {
    default: 120,
    min: 1,
    max: 3600,
  },
  BASH_MAX_OUTPUT_CHARS: {
    default: 30000,
    min: 1,
  },
  BASH_BLOCKED_COMMANDS: {
    default: [],
  },
  BROWSER_MAX_TIMEOUT: {
    default: 120,
    min: 1,
    max: 3600,
  },
  BROWSER_MAX_OUTPUT_CHARS: {
    default: 30000,
    min: 1,
    max: 1000000,
  },
  CODE_RUNTIME_TYPE: {
    default: BuiltInToolCodeRuntimeType.AGENTCORE_CODE_INTERPRETER.value,
  },
  CREDIT_CONFIG_TIER_THRESHOLD: {
    min: 1,
  },
  CREDIT_CONFIG_QUOTA: {
    min: 1,
  },
  REQUEST_TIMEOUT: {
    default: 30,
    min: 1,
    max: 120,
  },
  PROMPT_VARIABLES: {
    default: '$',
  },
  RETRIEVAL: {
    descriptionTemplate: `Search \`{{ domain_name }}\` for relevant information.

This tool searches through the \`{{ domain_name }}\` knowledge base to find documents relevant to your query.

Args:
  query: The search query describing what information you need
  top_k: Number of top documents to return (default: 1, max: 50)

Returns:
  A JSON string containing a list of relevant documents.`,
  },
});

const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        message: {
          type: 'string',
        },
        response: {
          type: 'object',
        },
      },
      required: ['message'],
    },
  },
  MAX_ITERATIONS: {
    default: 25,
    max: 100,
    min: 1,
  },
  WS_IDLE_TIMEOUT: {
    default: 30,
    max: 300,
    min: 1,
  },
});

const UiConfigContentGenerate = Object.freeze({
  DESCRIPTION: {
    systemPrompt: `You write the introduction panel shown when a user first enters an AI agent's chat room. Think "About this assistant" — make the agent's purpose and capabilities clear at a glance.

You are describing the agent from outside. You are NOT the agent. Do not adopt the agent's role.

Required output structure:
1. ONE short intro sentence stating WHAT this specific agent is (its domain/role), grounded in the agent's own system prompt.
2. A Markdown bullet list of 2–5 SPECIFIC concrete things this agent can help with. Each bullet is a distinct capability, not a vague generality.

Hard rules:
- Bullets must be concrete and distinct. "Answer questions" / "Provide professional support" / "Help with anything" are BANNED — they are too generic and the same description could apply to any assistant.
- The intro and bullets must reflect THIS agent's domain (math? legal? environmental? cooking?). Do NOT default to a "smart assistant who answers questions" pattern.
- Markdown is allowed: **bold** for emphasis, bullet list. No headings (#), no code blocks.
- Match the input language (Traditional Chinese in → Traditional Chinese out; Simplified Chinese in → Simplified Chinese out).
- OUTPUT ONLY the introduction text. No preamble like "Here is...". No meta-commentary about your reasoning or limitations. No \`---\` separators. No notes addressed to the user. No quotes, no XML tags. The very first character of your response must be the first character of the introduction.

Example:

Input:
Agent name: math-tutor
Agent's own system prompt: You are a patient math teacher helping students understand concepts and develop problem-solving confidence...

Output:
Hi! I'm your **math tutor** — here to make math click.

I can help you:
- Break down tricky problems step by step
- Review concepts from algebra through calculus
- Suggest practice problems matched to your level
- Spot where you got stuck and explain why`,
    refineInstruction: 'Existing draft introduction (refine it: replace any generic phrases with concrete capabilities drawn from the agent\'s system prompt above; keep the existing structure and language)',
    maxTokens: 800,
    temperature: 0.4,
    tooltipKey: '__tooltipAgentUiConfigDescriptionGenerate',
  },
  STARTER_PROMPTS: {
    systemPrompt: `You write starter prompt suggestions shown when a user enters an AI agent's chat room. These are clickable example questions that help the user begin a conversation.

You are describing the agent from outside. You are NOT the agent. Do not adopt the agent's role.

Default output (the user can override any of these via "Additional instruction from user"):
- 5 starter prompts by default. If the user asks for a different count (e.g., "20 個", "give me 10"), use that count instead.
- Each prompt is one complete short question or task — keep it concise, under 30 characters when possible so it fits on a clickable chip.
- Each prompt is distinct from the others in topic or angle.
- Each prompt is concrete and specific to THIS agent's domain (drawn from the agent's own system prompt). Generic prompts like "How can you help me?" / "What can you do?" are BANNED.
- Each prompt must be answerable as-is, with no extra context required. BANNED: prompts that assume the user has already attached or pasted content (e.g., "Grade my essay", "Review my code", "Summarize this article", "Why is my answer wrong?"). Prefer conceptual / how-to / exploratory questions the agent can answer immediately.
- Match the input language (Traditional Chinese in → Traditional Chinese out; Simplified Chinese in → Simplified Chinese out).

Output format: plain text, one prompt per line. No numbering, no bullets, no quotes, no Markdown formatting, no XML tags, no preamble, no meta-commentary, no trailing text. The very first character of your response must be the first character of the first prompt.

Example:

Input:
Agent name: math-tutor
Agent's own system prompt: You are a patient math teacher helping students understand concepts and develop problem-solving confidence...

Output:
Explain the Pythagorean theorem
How do I solve quadratic equations?
When do I use the chain rule?
Tips for studying calculus
What's the difference between mean and median?`,
    refineInstruction: 'Existing draft prompts (refine them: replace any generic phrases with concrete capabilities drawn from the agent\'s system prompt above)',
    maxTokens: 600,
    temperature: 0.4,
    tooltipKey: '__tooltipAgentUiConfigStarterPromptsGenerate',
  },
});

const StorageItemStatus = Object.freeze({
  EXISTING: {
    value: 'existing',
    i18nKey: '__fieldStatusExisting',
    color: 'backgroundScale3',
  },
  PENDING_UPLOAD: {
    value: 'pendingUpload',
    i18nKey: '__fieldStatusPendingUpload',
    color: 'primary',
  },
  PENDING_DELETE: {
    value: 'pendingDelete',
    i18nKey: '__fieldStatusPendingDelete',
    color: 'error',
  },
});

const CopilotAgentId = 'agent-hq-copilot';

const McpServerToolAuthType = Object.freeze({
  OAUTH: {
    value: 'oauth',
  },
});

const McpOauthStatus = Object.freeze({
  CONNECTED: {
    i18nTitle: '__titleMcpOauthConnected',
    value: 'connected',
    color: 'success',
    icon: 'mdi-check-circle-outline',
  },
  EXPIRED: {
    i18nTitle: '__titleMcpOauthExpired',
    value: 'expired',
    color: 'warning',
    icon: 'mdi-clock-alert-outline',
  },
  UNCONNECTED: {
    i18nTitle: '__titleMcpOauthNotConnected',
    value: 'unconnected',
    color: 'inactive',
    icon: 'mdi-alert-circle-outline',
  },
});

export {
  ActionExecutionParams,
  AgentBuilderType,
  BuiltInToolCodeRuntimeType,
  BuiltInToolType,
  CopilotAgentId,
  CreateMode,
  DefaultParams,
  McpOauthStatus,
  McpServerToolAuthType,
  OutputFormat,
  OutputFormatOptions,
  StorageItemStatus,
  ToolType,
  UiConfigContentGenerate,
};
