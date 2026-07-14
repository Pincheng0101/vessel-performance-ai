class AgentConfigStorageItem {
  constructor({
    children = [],
    commonPrefix = null,
    contentType = null,
    file = null,
    id,
    isFolder = false,
    name,
    objectPath = null,
    size = null,
    status,
  }) {
    this.children = children;
    this.commonPrefix = commonPrefix;
    this.contentType = contentType;
    this.file = file;
    this.id = id || objectPath || commonPrefix;
    this.isFolder = isFolder;
    this.name = name;
    this.objectPath = objectPath;
    this.size = size;
    this.status = status;
  }

  static createFile({
    contentType,
    file = null,
    name,
    objectPath,
    size,
    status,
  }) {
    return new AgentConfigStorageItem({
      commonPrefix: null,
      contentType,
      file,
      isFolder: false,
      name,
      objectPath,
      size,
      status,
    });
  }

  static createFolder({
    children = [],
    commonPrefix,
    contentType = null,
    name,
    status,
  }) {
    return new AgentConfigStorageItem({
      children,
      commonPrefix,
      contentType,
      file: null,
      isFolder: true,
      name,
      objectPath: null,
      size: null,
      status,
    });
  }
}

export default AgentConfigStorageItem;
