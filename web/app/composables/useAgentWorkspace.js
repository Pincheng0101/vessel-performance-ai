import AgentWorkspaceFileDownloadButton from '~/components/AgentWorkspaceFileDownloadButton.vue';

const WORKSPACE_PATH_REGEX = /\/tmp\/workspace\/((?:[\w.\-/]|<span[^>]*>[\w.\-/]+<\/span>)+)/g;

export function useAgentWorkspace() {
  const agentChatStore = useAgentChatStore();

  const workspaceFileDownloadSlotInjector = (html) => {
    if (!agentChatStore.storageId) return { html, slots: [] };

    const slots = [];
    const unwrapped = html
      .replace(/<code>(\/tmp\/workspace\/[^<]+)<\/code>/g, '$1')
      .replace(/<(?:strong|em)>([^<]*\/tmp\/workspace\/[^<]*)<\/(?:strong|em)>/g, '$1');

    const processed = unwrapped.replace(WORKSPACE_PATH_REGEX, (_match, rawPath) => {
      const path = rawPath.replace(/<[^>]+>/g, '');
      const id = `workspace-link-${crypto.randomUUID()}`;
      slots.push({ id, component: AgentWorkspaceFileDownloadButton, props: { path } });
      return `<span id="${id}"></span>`;
    });

    return { html: processed, slots };
  };

  return {
    workspaceFileDownloadSlotInjector,
  };
}
