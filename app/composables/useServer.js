import { createPinia, setActivePinia } from 'pinia';
import { ResourceConstant } from '~/constants';
import ErrorResponse from '~/models/server/ErrorResponse';

setActivePinia(createPinia());

export function useServer() {
  const auth = useAuth();
  const snackbarStore = useSnackbarStore();
  const authStore = useAuthStore();
  const nuxtApp = useNuxtApp();
  const { $i18n } = nuxtApp;
  const { serverApiUrl } = useRuntimeConfig().public;

  const client = createClient({
    baseURL: serverApiUrl,
  });

  const handleRequest = async ({ options }) => {
    await auth.refresh();
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  };

  // Token is not required for marketplace endpoints
  const handleMarketplaceRequest = ({ options }) => {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${authStore.accessToken}`,
    };
  };

  const handleRequestError = (request) => {
    if (request.error?.name === 'AbortError') {
      return;
    }
    snackbarStore.setFailure($i18n.t('__messageRequestError'));
  };

  const handleFinalResponse = async (response) => {
    if (response._data.response_url) {
      let finalResponse = null;
      const client = createClient();
      await client.get(response._data.response_url, {
        onResponse: ({ response }) => {
          if (response.ok) finalResponse = response;
        },
        onResponseError: handleResponseError,
      });
      return finalResponse;
    }
    return response;
  };

  const handleResponseError = ({ response }) => {
    const { status } = response;

    response._data = new ErrorResponse(response._data);
    response._data.setStatus(status);

    switch (true) {
      case status === 400: {
        if (response._data.hasDependents) {
          const isWorkflowDependent = String(response._data.getMessage()).includes(ResourceConstant.Type.WORKFLOW.value);
          const message = $i18n.t('__messageDependentResource', {
            // If the item to be deleted is a resource, other resources or workflows may depend on it
            // If the item to be deleted is a workflow, only other workflows may depend on it
            itemType: $i18n.t(isWorkflowDependent ? '__fieldWorkflow' : '__fieldResource').toLowerCase(),
            dependentType: $i18n.t(isWorkflowDependent ? '__fieldWorkflow' : '__fieldResource', 2).toLowerCase(),
            dependents: response._data.dependents.map(item => `- [${item.id}](${location.origin}${item.resourceType === ResourceConstant.Type.WORKFLOW.value ? '' : '/resources'}${item.path})`).join('\n'),
          });
          snackbarStore.setFailure(message, { timeout: 15 * 1000 });
          return;
        }
        if (response._data.isStatusNotFound) {
          const message = response._data.getMessage().replace(/^(\S+)/, match => strUtils.capitalize(strUtils.toTitleCase(match).toLowerCase()));
          snackbarStore.setFailure(response._data.notFoundResourceModule ? message : $i18n.t('__titleResourceNotFound', { resource: $i18n.t('__fieldItem') }));
          return;
        };
        snackbarStore.setFailure(response._data.getMessage());
        return;
      }
      case status === 401: {
        auth.abort();
        return;
      }
      case status === 403: {
        snackbarStore.setFailure(response._data.getMessage());
        return;
      }
      case status === 422: {
        const invalidFields = response._data.detail
          .map(({ loc, msg, type }) => {
            const fieldPath = loc.length > 1 ? loc.slice(1).join('.') : loc[0];
            return msg ? `- ${fieldPath}: ${msg}` : `- ${fieldPath} (${type})`;
          })
          .join('\n');
        snackbarStore.setFailure($i18n.t('__messageUnprocessableContent', { fields: invalidFields }));
        return;
      }
      case status >= 500: {
        const errorMessage = response._data.detail;
        snackbarStore.setFailure(errorMessage ? errorMessage : $i18n.t('__messageServerError'));
        return;
      }
      default: {
        snackbarStore.setFailure(response._data.getMessage() || $i18n.t('__messageServerError'));
        return;
      }
    }
  };

  const handleTextResponseError = (response) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(response, 'text/xml');
    const messageNode = xmlDoc.querySelector('Code');
    snackbarStore.setFailure(messageNode.textContent);
  };

  const sharedParams = {
    client,
    handleFinalResponse,
    handleRequest,
    handleRequestError,
    handleResponseError,
    handleTextResponseError,
  };

  const marketplaceParams = {
    ...sharedParams,
    handleRequest: handleMarketplaceRequest,
  };

  // Lazily import each service module on first use. This keeps the entire
  // server model/response-factory graph (ResourceResponseFactory → every
  // resource model → their constants, ~250KB) out of the entry chunk: the
  // graph only loads once a service is actually called, which always happens
  // behind a network round-trip, so the dynamic-import cost is hidden.
  //
  // Each proxied method returns `Promise<AsyncData>`. Because Nuxt's AsyncData
  // is a thenable that resolves to itself, `await server.x.y(...)` still yields
  // the `{ data, error, pending, ... }` object, so the existing call sites are
  // unchanged. `runWithContext` preserves the Nuxt instance across the
  // dynamic-import boundary so `useFetch` inside the service still works.
  const serviceLoaders = {
    // Account endpoints
    me: () => import('~/services/server/me'),
    authentication: () => import('~/services/server/authentication'),
    agentPermission: () => import('~/services/server/agentPermission'),
    agentCreditConfig: () => import('~/services/server/agentCreditConfig'),
    apiKey: () => import('~/services/server/apiKey'),
    applicationApiKey: () => import('~/services/server/applicationApiKey'),
    createResourcePermission: () => import('~/services/server/createResourcePermission'),
    group: () => import('~/services/server/group'),
    resourcePermission: () => import('~/services/server/resourcePermission'),
    user: () => import('~/services/server/user'),
    workflowPermission: () => import('~/services/server/workflowPermission'),

    // Feature endpoints
    feature: () => import('~/services/server/feature'),

    // Resource endpoints
    agent: () => import('~/services/server/agent'),
    workflowTemplate: () => import('~/services/server/workflowTemplate'),
    chunker: () => import('~/services/server/chunker'),
    connector: () => import('~/services/server/connector'),
    dataset: () => import('~/services/server/dataset'),
    datasetItem: () => import('~/services/server/datasetItem'),
    embeddingModel: () => import('~/services/server/embeddingModel'),
    knowledgeBase: () => import('~/services/server/knowledgeBase'),
    lambdaFunction: () => import('~/services/server/lambdaFunction'),
    llm: () => import('~/services/server/llm'),
    loader: () => import('~/services/server/loader'),
    mcpServer: () => import('~/services/server/mcpServer'),
    multiRequest: () => import('~/services/server/multiRequest'),
    ranker: () => import('~/services/server/ranker'),
    resourceDependency: () => import('~/services/server/resourceDependency'),
    retriever: () => import('~/services/server/retriever'),
    searchEngine: () => import('~/services/server/searchEngine'),
    skill: () => import('~/services/server/skill'),
    storage: () => import('~/services/server/storage'),
    storageObject: () => import('~/services/server/storageObject'),
    template: () => import('~/services/server/template'),
    variable: () => import('~/services/server/variable'),
    workflow: () => import('~/services/server/workflow'),
    workflowCron: () => import('~/services/server/workflowCron'),

    // Runtime endpoints
    actionExecution: () => import('~/services/server/actionExecution'),
    chatSession: () => import('~/services/server/chatSession'),
    externalMemory: () => import('~/services/server/externalMemory'),
    syncJob: () => import('~/services/server/syncJob'),
    tempFile: () => import('~/services/server/tempFile'),
    workflowCronExecution: () => import('~/services/server/workflowCronExecution'),
    workflowExecution: () => import('~/services/server/workflowExecution'),

    // UI data endpoints
    uiData: () => import('~/services/server/uiData'),

    // Marketplace endpoints
    marketplace: () => import('~/services/server/marketplace'),

    // Metering endpoints
    metering: () => import('~/services/server/metering'),

    // PromptForge endpoints
    promptRewriterExecution: () => import('~/services/server/promptRewriterExecution'),

    // DataForge endpoints
    dataForge: () => import('~/services/server/dataForge'),

    // Copilot endpoints
    copilot: () => import('~/services/server/copilot'),

    // Demo data-lake (offline fixtures from public/demo; see scripts/capture-fixtures.mjs)
    datalake: () => import('~/services/server/datalake'),
  };

  const lazyService = (name, params) => {
    let ready;
    const load = () => (ready ??= serviceLoaders[name]().then(module => module.default(params)));
    return new Proxy({}, {
      get: (_, method) => (...args) => load().then(service => nuxtApp.runWithContext(() => service[method](...args))),
    });
  };

  return Object.fromEntries(
    Object.keys(serviceLoaders).map(name => [
      name,
      lazyService(name, name === 'marketplace' ? marketplaceParams : sharedParams),
    ]),
  );
}
