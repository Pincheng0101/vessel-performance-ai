import * as fflate from 'fflate/browser';
import * as FileExtensionConstant from '~/constants/FileExtensionConstant';

class fileUtils {
  /**
   * Converts a file to a base64 encoded string.
   *
   * @param {File} file - The file to be converted.
   * @returns {Promise<string>} A promise that resolves to the base64 encoded string of the file.
   */
  static toBase64(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converts a given URL to a Base64-encoded string.
   * Fetches the resource at the specified URL, converts it to a Blob, and then encodes it as Base64.
   * If the conversion fails, returns the original URL.
   *
   * @param {string} url - The URL of the resource to convert.
   * @returns {Promise<string>} A promise that resolves to the Base64-encoded string or the original URL if conversion fails.
   */
  static async urlToBase64(url) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return await this.toBase64(blob);
    } catch (error) {
      console.warn('Failed to convert to base64:', url, error);
      return url;
    }
  }

  /**
   * Parses a base64 encoded string and extracts the media type and data.
   *
   * @param {string} base64 - The base64 encoded string to parse.
   * @returns {Object|null} An object containing the media type and data if the input is a valid data URL, otherwise null.
   */
  static parseFromBase64(base64) {
    if (typeof base64 !== 'string') return null;
    const dataUrlRegex = /^data:(?<mediaType>.*?);base64,(?<data>.*)/;
    const match = base64.match(dataUrlRegex);
    if (!match) {
      return null;
    }
    return match.groups;
  }

  /**
   * Gets the decoded byte length of a base64 data URL.
   *
   * @param {string} dataUrl - The base64 data URL to measure.
   * @returns {number} The decoded byte length, or 0 if the data URL could not be parsed.
   */
  static getDataUrlByteLength(dataUrl) {
    const parsed = this.parseFromBase64(dataUrl);
    if (!parsed?.data) return 0;
    const padding = (parsed.data.match(/=*$/)?.[0].length) ?? 0;
    return Math.floor(parsed.data.length * 3 / 4) - padding;
  }

  /**
   * Creates a File object from a base64 string.
   *
   * @param {string} base64 - The base64 encoded string representing the file data.
   * @param {string} fileName - The name of the file to be created (without extension).
   * @returns {File|null} The created File object, or null if the base64 string could not be parsed.
   */
  static createFromBase64(base64, fileName = 'file') {
    const parsedFile = fileUtils.parseFromBase64(base64);
    if (!parsedFile) return null;
    const { mediaType, data } = parsedFile;
    try {
      // Convert base64 to binary data
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Create a Blob from the binary data
      const blob = new Blob([bytes], { type: mediaType });
      // Get file extension from mediaType
      const fileExtension = mediaType.split('/')[1];
      // Create a File from the Blob with type-inclusive fileName
      return new File([blob], `${fileName}.${fileExtension}`, { type: mediaType });
    } catch {
      return null;
    }
  }

  /**
   * Formats a given number of bytes into a human-readable string with appropriate units.
   *
   * @param {number} bytes - The number of bytes to format.
   * @returns {string} A string representing the formatted bytes with the appropriate unit.
   */
  static formatBytes(bytes) {
    if (bytes < 2) return `${bytes} Byte`;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(bytes / Math.pow(k, i));
    return `${num} ${sizes[i]}`;
  };

  /**
   * Renames a given file with a new name while preserving its webkitRelativePath.
   *
   * @param {File} file - The original file to be renamed.
   * @param {string} newName - The new name for the file.
   * @returns {File} A new File object with the specified new name, original file type, and last modified date.
   */
  static rename(file, newName) {
    const renamed = new File([file], newName, {
      type: file.type,
      lastModified: file.lastModified,
    });
    if (file.webkitRelativePath) {
      Object.defineProperty(renamed, 'webkitRelativePath', {
        value: file.webkitRelativePath,
        writable: false,
        enumerable: true,
        configurable: true,
      });
    }
    return renamed;
  };

  /**
   * Sets the webkitRelativePath property on a File object.
   *
   * @param {File} file - The file to set the path on.
   * @param {string} relativePath - The relative path to set.
   * @returns {File} A new File object with the webkitRelativePath property set.
   */
  static setRelativePath(file, relativePath) {
    const fileWithPath = new File([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
    Object.defineProperty(fileWithPath, 'webkitRelativePath', {
      value: relativePath,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    return fileWithPath;
  };

  /**
   * Creates and triggers a file download, using either a provided URL
   * or data (e.g., JSON object, string, Blob, ArrayBuffer) as the source.
   *
   * - If `url` is provided, the file will be downloaded from that location.
   * - If `data` is provided instead, it will be converted into a Blob
   *   (with optional MIME type) and then downloaded.
   *
   * @param {Object} options - The download options.
   * @param {string} options.url - The URL of the file to be downloaded.
   * @param {Object} options.data - The data to be downloaded as a file.
   * @param {string} options.fileName - The suggested file name for the downloaded file.
   * @param {string} options.type - The MIME type to use when creating the file.
   */
  static download({
    url,
    data,
    fileName = '',
    type,
  }) {
    const resolvedType = type ?? 'application/octet-stream';
    const a = document.createElement('a');
    let downloadUrl = url;

    if (!url && data !== undefined && data !== null) {
      let blob;
      if (typeof data === 'object' && resolvedType === 'application/json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: resolvedType });
      } else if (data instanceof Blob) {
        blob = data;
      } else {
        blob = new Blob([data], { type: resolvedType });
      }
      downloadUrl = URL.createObjectURL(blob);
    }

    a.href = new URL(downloadUrl, window.location.origin).href;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (downloadUrl.startsWith('blob:')) {
      URL.revokeObjectURL(downloadUrl);
    }
  };

  /**
   * Downloads multiple files as a ZIP archive.
   * Fetches files from their URLs, compresses them into a ZIP, and triggers a download.
   *
   * @param {{url: string, fileName: string}[]} items - Array of items with fileName and url properties
   * @param {AbortSignal} signal - AbortSignal to cancel the download process
   * @returns {Promise<void>}
   * @throws {Error} Throws error if download or compression fails
   * @throws {DOMException} Throws AbortError if the download is aborted via signal
   */
  static async downloadAsZip(items, signal) {
    const filesToZip = {};

    await Promise.all(items.map(async (item) => {
      const response = await fetch(item.url, {
        method: 'GET',
        signal,
      });
      if (!response.ok) {
        throw new Error(`Download failed: ${item.fileName}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      filesToZip[item.fileName] = new Uint8Array(arrayBuffer);
    }));

    if (signal.aborted) return;

    const zipped = fflate.zipSync(filesToZip, {
      level: 6, // Level 6 provides a good balance between speed and compression ratio
    });
    const zipFileBlob = new Blob([zipped], { type: 'application/zip' });
    this.download({
      data: zipFileBlob,
      fileName: 'files.zip',
      type: 'application/zip',
    });
  };

  /**
   * Extracts all files from DataTransferItemList, recursively reading nested
   * directories and preserving folder structure via webkitRelativePath.
   * Works with drag-drop, paste, and other DataTransfer events.
   *
   * @param {DataTransferItemList} items - The DataTransferItemList from a DataTransfer event
   * @returns {Promise<File[]>} A promise that resolves to an array of File objects with webkitRelativePath set
   */
  static async extractFilesFromDataTransferItems(items) {
    const readAllDirectoryItems = async (directoryReader) => {
      const items = [];
      let chunk;
      do {
        chunk = await new Promise((resolve, reject) => directoryReader.readEntries(resolve, reject));
        items.push(...chunk);
      } while (chunk.length > 0);
      return items;
    };

    const readItem = async (item, basePath = '') => {
      const path = `${basePath}${item.name}`;
      if (item.isFile) {
        const file = await new Promise((resolve, reject) => item.file(resolve, reject));
        return [fileUtils.setRelativePath(file, path)];
      }
      if (item.isDirectory) {
        const items = await readAllDirectoryItems(item.createReader());
        const nestedFiles = await Promise.all(items.map(i => readItem(i, pathUtils.appendTrailingSlash(path))));
        return nestedFiles.flat();
      }
      return [];
    };

    const extractFilesFromItem = async (item) => {
      if (item.kind !== 'file') return [];
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (entry) return await readItem(entry);
      const file = item.getAsFile();
      if (!file) return [];
      const fileWithPath = file.webkitRelativePath ? file : fileUtils.setRelativePath(file, file.name);
      return [fileWithPath];
    };

    const allResults = await Promise.all(Array.from(items).map(extractFilesFromItem));
    return allResults.flat().filter(Boolean);
  };

  /**
   * Gets the file type/MIME type for a file object.
   * Falls back to extension-based detection when browser doesn't recognize the type.
   *
   * @param {Object} file - The file object with name and type/contentType properties.
   * @param {string} file.name - The filename.
   * @returns {string} The MIME type of the file, or empty string if unknown.
   */
  static getFileType(file) {
    const type = file?.type || file?.contentType;
    if (type) return type;

    const extension = pathUtils.getFileExtension(file?.name);
    if (!extension) return '';

    const matchedType = Object.values(FileExtensionConstant.Base)
      .find(item => item.value === extension && item.mediaType);
    return matchedType?.mediaType || '';
  };
}

export default fileUtils;
