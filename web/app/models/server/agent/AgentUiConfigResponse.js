import AgentUiConfig from './AgentUiConfig';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentUiConfigResponse extends AgentUiConfig {
  constructor({
    avatar_image,
    input_placeholder,
    welcome_message, // Deprecated
    title,
    description,
    starter_prompts,
    show_storage_button,
  } = {}) {
    super({
      avatarImage: avatar_image,
      inputPlaceholder: input_placeholder,
      title,
      description: welcome_message ?? description,
      starterPrompts: starter_prompts,
      showStorageButton: show_storage_button,
    });
  }
}

export default AgentUiConfigResponse;
