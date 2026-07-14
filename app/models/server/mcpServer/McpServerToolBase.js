/**
 * Tool identity (name/description/id) shared by runtime tools and custom tools.
 */
class McpServerToolBase {
  constructor({
    description,
    name,
  } = {}) {
    // Set fields explicitly to prevent backend default values
    this.description = description ?? '';
    this.name = name ?? '';
  }

  get id() {
    return this.name;
  }
}

export default McpServerToolBase;
