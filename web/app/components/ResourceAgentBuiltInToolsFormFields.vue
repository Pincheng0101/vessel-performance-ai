<script setup>
import { AgentConstant } from '~/constants';

const builtInToolReadUrl = defineModel('builtInToolReadUrl', {
  type: Object,
  default: () => ({}),
});

const builtInToolAskUserQuestion = defineModel('builtInToolAskUserQuestion', {
  type: Object,
  default: () => ({}),
});

const builtInToolTask = defineModel('builtInToolTask', {
  type: Object,
  default: () => ({}),
});

const builtInToolRead = defineModel('builtInToolRead', {
  type: Object,
  default: () => ({}),
});

const builtInToolGlob = defineModel('builtInToolGlob', {
  type: Object,
  default: () => ({}),
});

const builtInToolGrep = defineModel('builtInToolGrep', {
  type: Object,
  default: () => ({}),
});

const builtInToolSkill = defineModel('builtInToolSkill', {
  type: Object,
  default: () => ({}),
});

const builtInToolBash = defineModel('builtInToolBash', {
  type: Object,
  default: () => ({}),
});

const builtInToolBrowser = defineModel('builtInToolBrowser', {
  type: Object,
  default: () => ({}),
});

const builtInToolCode = defineModel('builtInToolCode', {
  type: Object,
  default: () => ({}),
});

const builtInToolWrite = defineModel('builtInToolWrite', {
  type: Object,
  default: () => ({}),
});

const { t } = useI18n();
const authStore = useAuthStore();
const isAdmin = computed(() => !!authStore.parsedToken?.isAdmin);

const toolModelMap = {
  [AgentConstant.BuiltInToolType.ASK_USER_QUESTION.value]: builtInToolAskUserQuestion,
  [AgentConstant.BuiltInToolType.TASK.value]: builtInToolTask,
  [AgentConstant.BuiltInToolType.BASH.value]: builtInToolBash,
  [AgentConstant.BuiltInToolType.BROWSER.value]: builtInToolBrowser,
  [AgentConstant.BuiltInToolType.CODE.value]: builtInToolCode,
  [AgentConstant.BuiltInToolType.SKILL.value]: builtInToolSkill,
  [AgentConstant.BuiltInToolType.READ_URL.value]: builtInToolReadUrl,
  [AgentConstant.BuiltInToolType.READ.value]: builtInToolRead,
  [AgentConstant.BuiltInToolType.GLOB.value]: builtInToolGlob,
  [AgentConstant.BuiltInToolType.GREP.value]: builtInToolGrep,
  [AgentConstant.BuiltInToolType.WRITE.value]: builtInToolWrite,
};

const tableHeaders = computed(() => [
  { title: t('__fieldName'), key: 'name', icon: item => item.icon },
  { title: t('__fieldDescription'), key: 'description' },
]);

const getCodeRuntimeTypeTitle = (runtimeType) => {
  const option = Object.values(AgentConstant.BuiltInToolCodeRuntimeType).find(item => item.value === runtimeType);
  return option ? t(option.i18nTitle) : runtimeType;
};

const buildTableItem = (toolType) => {
  const tool = toolModelMap[toolType.value].value;
  return {
    id: toolType.value,
    name: t(toolType.i18nName),
    icon: toolType.icon,
    description: t(toolType.i18nDescription),
    enable: !!tool.enable,
    trackToolResults: !!tool.trackToolResults,
    ...Object.fromEntries(toolType.extraFields.map(key => [key, tool[key]])),
  };
};

const tableItems = computed(() => Object.values(AgentConstant.BuiltInToolType)
  .filter(toolType => !(toolType.adminOnly && !isAdmin.value))
  .map(buildTableItem),
);

const selectedIds = computed(() => tableItems.value.filter(item => item.enable).map(item => item.id));
const restoredObjects = computed(() => tableItems.value.filter(item => item.enable));

const updateTool = (toolType, updater) => {
  const model = toolModelMap[toolType];
  if (!model) return;
  model.value = updater(model.value);
};

const handleSelect = (selectedItems) => {
  const selectedIdSet = new Set(selectedItems.map(item => item.id));
  Object.values(AgentConstant.BuiltInToolType).forEach((toolType) => {
    // Skip tools the current user can't see — preserves admin-configured settings (e.g. bash) when a non-admin edits the agent.
    if (toolType.adminOnly && !isAdmin.value) return;
    updateTool(toolType.value, tool => ({
      ...tool,
      enable: selectedIdSet.has(toolType.value),
    }));
  });
};

const handleEdit = (currentItem, updatedItem) => {
  updateTool(currentItem.id, tool => ({
    ...tool,
    ...updatedItem,
    enable: tool.enable,
  }));
};

const getExpandedRowItems = (item) => {
  if (item.id === AgentConstant.BuiltInToolType.BASH.value) {
    return [
      {
        title: t('__fieldBashMaxTimeout'),
        value: item.maxTimeout,
      },
      {
        title: t('__fieldBashMaxOutputChars'),
        value: item.maxOutputChars,
      },
      {
        title: t('__fieldBashBlockedCommands'),
        value: item.blockedCommands,
        isChip: true,
      },
    ];
  }

  if (item.id === AgentConstant.BuiltInToolType.BROWSER.value) {
    return [
      {
        title: t('__fieldBrowserMaxTimeout'),
        value: item.maxTimeout,
      },
      {
        title: t('__fieldBrowserMaxOutputChars'),
        value: item.maxOutputChars,
      },
    ];
  }

  if (item.id === AgentConstant.BuiltInToolType.CODE.value) {
    return [
      {
        title: t('__fieldCodeRuntimeType'),
        value: getCodeRuntimeTypeTitle(item.runtimeType),
      },
    ];
  }

  return [];
};

const ensureToolDefaults = (tool, defaults) => {
  Object.entries(defaults).forEach(([key, value]) => {
    if (tool[key] === undefined) {
      tool[key] = Array.isArray(value) ? [...value] : value;
    }
  });
};

ensureToolDefaults(builtInToolAskUserQuestion.value, {
  enable: AgentConstant.BuiltInToolType.ASK_USER_QUESTION.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.ASK_USER_QUESTION.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolTask.value, {
  enable: AgentConstant.BuiltInToolType.TASK.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.TASK.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolRead.value, {
  enable: AgentConstant.BuiltInToolType.READ.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.READ.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolGlob.value, {
  enable: AgentConstant.BuiltInToolType.GLOB.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.GLOB.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolGrep.value, {
  enable: AgentConstant.BuiltInToolType.GREP.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.GREP.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolReadUrl.value, {
  enable: AgentConstant.BuiltInToolType.READ_URL.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.READ_URL.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolSkill.value, {
  enable: AgentConstant.BuiltInToolType.SKILL.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.SKILL.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolWrite.value, {
  enable: AgentConstant.BuiltInToolType.WRITE.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.WRITE.defaultTrackToolResults,
});

ensureToolDefaults(builtInToolBash.value, {
  enable: AgentConstant.BuiltInToolType.BASH.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.BASH.defaultTrackToolResults,
  maxTimeout: AgentConstant.DefaultParams.BASH_MAX_TIMEOUT.default,
  maxOutputChars: AgentConstant.DefaultParams.BASH_MAX_OUTPUT_CHARS.default,
  blockedCommands: AgentConstant.DefaultParams.BASH_BLOCKED_COMMANDS.default,
});

ensureToolDefaults(builtInToolBrowser.value, {
  enable: AgentConstant.BuiltInToolType.BROWSER.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.BROWSER.defaultTrackToolResults,
  maxTimeout: AgentConstant.DefaultParams.BROWSER_MAX_TIMEOUT.default,
  maxOutputChars: AgentConstant.DefaultParams.BROWSER_MAX_OUTPUT_CHARS.default,
});

ensureToolDefaults(builtInToolCode.value, {
  enable: AgentConstant.BuiltInToolType.CODE.defaultEnable,
  trackToolResults: AgentConstant.BuiltInToolType.CODE.defaultTrackToolResults,
  runtimeType: AgentConstant.DefaultParams.CODE_RUNTIME_TYPE.default,
});
</script>

<template>
  <AppTable
    :server-side="false"
    :headers="tableHeaders"
    :items="tableItems"
    :selected-ids="selectedIds"
    :restored-objects="restoredObjects"
    :on-select="handleSelect"
    :on-all-select="handleSelect"
    :enable-search="false"
    :show-pagination="false"
    :multiple-select="true"
    :enable-expand="true"
    :is-expanded-row-visible="item => item.enable && getExpandedRowItems(item).length > 0"
    bordered
  >
    <template #expanded-row="{ item }">
      <div
        v-if="item.enable && getExpandedRowItems(item).length > 0"
        class="py-3"
      >
        <AppDisplayFieldGroup :items="getExpandedRowItems(item)" />
      </div>
    </template>
    <template #row-menu="{ item, isHovering }">
      <!-- Temporarily only apply row menu for tools with editable extra settings because tool result tracking is not supported for built-in tools yet -->
      <ResourceAgentBuiltInToolActionMenu
        v-if="item.enable && [AgentConstant.BuiltInToolType.BASH.value, AgentConstant.BuiltInToolType.BROWSER.value, AgentConstant.BuiltInToolType.CODE.value].includes(item.id)"
        :item="item"
        :persistent="isHovering"
        :on-edit="handleEdit"
      />
    </template>
  </AppTable>
</template>
