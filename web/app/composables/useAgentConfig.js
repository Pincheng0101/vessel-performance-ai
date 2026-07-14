import { ActionExecutionConstant, ChatConstant, ContentBlockConstant, LlmConstant, StatusConstant } from '~/constants';
import { TextContentBlockActionExecutionPayload } from '~/models/server/contentBlock';
import { BedrockAnthropicLlmActionExecutionPayload } from '~/models/server/llm';
import { MessageActionExecutionPayload } from '~/models/server/message';
import { SyncJob } from '~/models/server/syncJob';
import { LlmPayload } from '~/models/workflow/state/task/llm';

export function useAgentConfig() {
  const server = useServer();
  const { t } = useI18n();
  const { createSignal } = useAbortController();

  const stopRunningSyncJobs = async (loaderId) => {
    let nextToken = null;
    const runningJobs = [];

    do {
      const { data, error } = await server.syncJob.list({
        loaderId,
        nextToken,
      }, {
        lazy: false,
      });
      if (error.value) {
        return false;
      }

      runningJobs.push(...data.value.data.filter(job => job.status === StatusConstant.Runtime.RUNNING.value));
      nextToken = data.value.nextToken;
    } while (nextToken);

    for (const job of runningJobs) {
      const { error } = await server.syncJob.stop({ syncJobId: job.syncJobId });
      if (error.value) {
        return false;
      }
    }

    return true;
  };

  const startSyncJob = async (loaderId) => {
    if (!loaderId) return;

    const isStopped = await stopRunningSyncJobs(loaderId);
    if (!isStopped) return;

    const syncJob = new SyncJob({ loaderId });
    const { data, error } = await server.syncJob.start(syncJob);
    if (error.value) {
      return;
    }
    return data.value;
  };

  const uploadFilesToStorage = async ({ files, storageId }) => {
    if (!files?.length) return false;

    const uploadedFiles = await Promise.all(files.map(async (entry) => {
      const file = entry?.file || entry;
      const objectPath = entry?.objectPath || file.webkitRelativePath || file.name;
      const { data, error } = await server.storageObject.upload({
        storageId,
        objectPath,
        contentType: entry?.contentType || file.type,
      });
      if (error.value) {
        throw new Error(error.value);
      }
      return {
        file,
        presignedUrl: data.value.presignedUrl,
      };
    }));

    await Promise.all(uploadedFiles.map(async ({ file, presignedUrl }) => {
      await server.storageObject.uploadToS3({
        presignedUrl,
        file,
      });
    }));

    return true;
  };

  const pollDomainExtraction = async (executionArn) => {
    if (!executionArn) return null;

    const { data, error } = await server.actionExecution.get({ executionArn });
    if (error.value) {
      throw new Error(error.value);
    }

    const result = data.value;
    if (result.status === StatusConstant.Runtime.RUNNING.value) {
      await delay(ActionExecutionConstant.Base.FETCH_INTERVAL);
      return await pollDomainExtraction(executionArn);
    }

    return result;
  };

  const extractDomainFromAgent = async ({ name, prompt }) => {
    const signal = createSignal();
    const payload = new LlmPayload({
      llm: new BedrockAnthropicLlmActionExecutionPayload({
        llmType: LlmConstant.Type.BEDROCK_ANTHROPIC.value,
        llmId: LlmConstant.DefaultLlm.ID,
        systemPrompt: t('__messageAgentBuilderGetDomainPrompt'),
        messages: [
          new MessageActionExecutionPayload({
            role: ChatConstant.MessageRole.USER,
            content: [
              new TextContentBlockActionExecutionPayload({
                contentBlockType: ContentBlockConstant.Type.TEXT.value,
                text: t('__messageAgentBuilderGetDomainUserMessage', { name, prompt }),
              }),
            ],
          }),
        ],
      }),
      streamingConfig: null,
    });

    const { data, error } = await server.actionExecution.start({ actionPayload: payload }, { signal });
    if (signal.aborted) return null;
    if (error.value) {
      throw new Error(error.value);
    }

    return await pollDomainExtraction(data.value.executionArn);
  };

  return {
    extractDomainFromAgent,
    startSyncJob,
    uploadFilesToStorage,
  };
}
