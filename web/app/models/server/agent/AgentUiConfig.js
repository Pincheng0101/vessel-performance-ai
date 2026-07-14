class AgentUiConfig {
  constructor({
    avatarImage,
    inputPlaceholder,
    title,
    description,
    starterPrompts,
    showStorageButton,
  } = {}) {
    this.avatarImage = avatarImage ?? null;
    this.inputPlaceholder = inputPlaceholder;
    this.title = title;
    this.description = description;
    // Legacy: earlier UI versions stored starter_prompts as an array; normalize
    // any array form into a newline-joined string for the current text editor.
    this.starterPrompts = (() => {
      if (Array.isArray(starterPrompts)) return starterPrompts.join('\n');
      if (typeof starterPrompts === 'string') return starterPrompts;
      return null;
    })();
    this.showStorageButton = showStorageButton ?? false;
  }

  /**
   * @param {AgentUiConfig} config
   */
  static toRequestPayload(config) {
    return {
      avatar_image: config.avatarImage,
      input_placeholder: config.inputPlaceholder,
      title: config.title,
      description: config.description,
      starter_prompts: config.starterPrompts,
      show_storage_button: config.showStorageButton,
      welcome_message: null, // Set to null to clear deprecated field in backend
    };
  }
}

export default AgentUiConfig;
