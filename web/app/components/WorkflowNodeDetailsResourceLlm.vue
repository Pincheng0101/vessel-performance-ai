<script setup>
import { ContentBlockConstant, LlmConstant, ResourceConstant } from '~/constants';
import { Llm } from '~/models/server/llm';

const props = defineProps({
  title: {
    type: String,
    default: null,
  },
  llmResource: {
    type: Llm,
    default: null,
  },
  llmContent: {
    type: [String, Array],
    default: null,
  },
  llmMessages: {
    type: [String, Array, Object],
    default: null,
  },
});
</script>

<template>
  <template v-if="props.llmResource">
    <template v-if="props.llmMessages">
      <WorkflowNodeDetailsGroup>
        <WorkflowNodeDetails
          :icon-path="findField(LlmConstant.Type, props.llmResource.type, 'iconPath')"
          :text="props.llmResource.name"
        />
      </WorkflowNodeDetailsGroup>
      <template v-if="Array.isArray(props.llmMessages)">
        <template
          v-for="(message, i) in props.llmMessages"
          :key="i"
        >
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="findField(LlmConstant.MessageRole, message.role, 'icon') || LlmConstant.MessageRole.USER.icon"
              :text="findField(LlmConstant.MessageRole, message.role, 'i18nTitle') ? $t(findField(LlmConstant.MessageRole, message.role, 'i18nTitle')) : message.role"
            />
            <template v-if="Array.isArray(message.content)">
              <div
                v-for="(content, j) in message.content"
                :key="j"
              >
                <WorkflowNodeDetails
                  :icon-path="findField(ContentBlockConstant.Type, content.contentBlockType, 'iconPath')"
                  :text="content.contentBlockName || `${$t('__fieldContent')} ${j + 1}`"
                />
              </div>
            </template>
            <template v-else>
              <WorkflowNodeDetails
                :icon="ResourceConstant.Type.TEMPLATE.icon"
                :text="message.content"
              />
            </template>
          </WorkflowNodeDetailsGroup>
        </template>
      </template>
      <template v-else>
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon="ResourceConstant.Type.TEMPLATE.icon"
            :text="props.llmMessages"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </template>
</template>
