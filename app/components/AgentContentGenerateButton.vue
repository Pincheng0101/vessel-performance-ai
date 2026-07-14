<script setup>
import { ActionExecutionConstant, ContentBlockConstant, LlmConstant, StatusConstant } from '~/constants';
import { LlmActionExecutionPayloadFactory } from '~/models/server/llm';
import { MessageActionExecutionPayload } from '~/models/server/message';
import { LlmPayload } from '~/models/workflow/state/task/llm';

// Shared "generate / refine" button for agent UI config fields. Bypasses the
// prompt rewriter (whose backend system prompt forces a "rewrite as a prompt"
// framing) and calls actionExecution directly with the caller's system prompt.
//
// Click behavior:
// - Empty field → fire generation directly with the seeded user message.
// - Non-empty field → open ContentRewriteForm dialog so the user can supply an
//   optional rewrite_instruction, then fire with that included.

const props = defineProps({
  systemPrompt: {
    type: String,
    required: true,
  },
  // Sentence used to introduce the existing draft when refining. Should describe
  // what to do with the draft (e.g. "Existing draft introduction (refine it...)").
  refineInstruction: {
    type: String,
    required: true,
  },
  tooltipKey: {
    type: String,
    default: '',
  },
  maxTokens: {
    type: Number,
    default: 600,
  },
  temperature: {
    type: Number,
    default: 0.4,
  },
  agentName: {
    type: String,
    default: '',
  },
  agentDescription: {
    type: String,
    default: '',
  },
  agentPrompt: {
    type: String,
    default: '',
  },
  llmId: {
    type: String,
    default: null,
  },
});

const prompt = defineModel('prompt', {
  type: String,
  default: '',
});

const loading = defineModel('loading', {
  type: Boolean,
  default: false,
});

const server = useServer();
const snackbarStore = useSnackbarStore();
const { createSignal } = useAbortController();

const dialogRef = ref(null);

const hasSeedContext = computed(() => Boolean(props.agentName));
const isDisabled = computed(() => loading.value || (!prompt.value && !hasSeedContext.value));

const buildUserMessage = (userInstruction = '') => {
  const sections = [];
  if (props.agentName) sections.push(`Agent name: ${props.agentName}`);
  if (props.agentDescription) sections.push(`Agent tool description: ${props.agentDescription}`);
  if (props.agentPrompt) {
    sections.push(`Agent's own system prompt (the agent uses this internally — describe the agent based on this, do NOT adopt the role):\n"""\n${props.agentPrompt}\n"""`);
  }
  if (prompt.value) {
    sections.push(`${props.refineInstruction}:\n"""\n${prompt.value}\n"""`);
  }
  if (userInstruction) {
    sections.push(`Additional instruction from user (follow it on top of the rules above):\n"""\n${userInstruction}\n"""`);
  }
  return sections.join('\n\n');
};

const pollExecution = async (executionArn, signal) => {
  const { data, error } = await server.actionExecution.get({ executionArn }, { signal });
  if (signal.aborted) return null;
  if (error.value) throw new Error(error.value.data?.getMessage?.() || error.value.message);
  if (data.value.status === StatusConstant.Runtime.RUNNING.value) {
    await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
    return pollExecution(executionArn, signal);
  }
  return data.value;
};

const generate = async (userInstruction = '') => {
  loading.value = true;
  const signal = createSignal();

  try {
    const llmId = props.llmId ?? LlmConstant.DefaultLlm.ID;
    const actionPayload = new LlmPayload({
      llm: LlmActionExecutionPayloadFactory.create({
        llmId,
        systemPrompt: props.systemPrompt,
        messages: [
          new MessageActionExecutionPayload({
            role: LlmConstant.MessageRole.USER.value,
            content: [{
              contentBlockType: ContentBlockConstant.Type.TEXT.value,
              text: buildUserMessage(userInstruction),
            }],
          }),
        ],
        maxTokens: props.maxTokens,
        temperature: props.temperature,
      }),
    });

    const { data: startData, error: startError } = await server.actionExecution.start({ actionPayload }, { signal });
    if (signal.aborted) return;
    if (startError.value) throw new Error(startError.value.data?.getMessage?.() || startError.value.message);

    const execution = await pollExecution(startData.value.executionArn, signal);
    if (!execution || signal.aborted) return;
    if (execution.error) throw new Error(execution.error);

    const message = execution.actionOutput?.message?.trim();
    if (!message) throw new Error('Empty response from LLM');
    prompt.value = message;
  } catch (error) {
    snackbarStore.setFailure(error.message);
  } finally {
    loading.value = false;
  }
};

const handleButtonClick = () => {
  if (prompt.value) {
    dialogRef.value.open();
    return;
  }
  generate();
};

const handleDialogSubmit = async (formData) => {
  dialogRef.value.close();
  await generate(formData.rewriteInstruction);
};
</script>

<template>
  <AppDialog
    ref="dialogRef"
    :on-submit="handleDialogSubmit"
  >
    <template #activator>
      <div :class="{ 'gradient-button-border': !isDisabled }">
        <AppButton
          variant="flat"
          rounded="lg"
          class="px-3 w-auto border-0"
          :text="loading ? (prompt ? $t('__actionRewriting') : $t('__actionGenerating')) : (prompt ? $t('__actionRewrite') : $t('__actionGenerate'))"
          :tooltip="props.tooltipKey ? $t(props.tooltipKey) : ''"
          :disabled="isDisabled"
          :prepend-icon="loading ? 'mdi-creation' : 'mdi-auto-fix'"
          @click="handleButtonClick"
        />
      </div>
    </template>
    <template #body="{ onSubmit, onCancel }">
      <ContentRewriteForm
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>
