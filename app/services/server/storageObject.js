import { ListConstant, StorageConstant } from '~/constants';
import { StorageObject, StorageObjectDownloadResponse, StorageObjectListResponse, StorageObjectPreviewResponse, StorageObjectResponse, StorageObjectUploadResponse } from '~/models/server/storageObject';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function storageObject({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
  handleTextResponseError,
}) {
  /**
   * @returns {AsyncData<StorageObjectListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    storageId: storage_id,
    nextToken: next_token,
    limit = ListConstant.StorageObjectParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    query = ListConstant.DefaultParams.QUERY,
    delimiter = '/',
    prefix = '',
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-storage-objects', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
        storage_id,
        sort_field: sortField,
        sort_order: sortOrder,
        search_string: query,
        delimiter,
        prefix,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageObjectListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<StorageObjectResponse, H3Error<ErrorResponse>>>}
   */
  const get = ({
    storageId: storage_id,
    objectPath: object_path,
  }, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/get-storage-object', {
      watch: false,
      lazy,
      signal,
      body: {
        storage_id,
        object_path,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageObjectResponse(finalResponse._data.storage_object);
        }
      },
    });
  };

  /**
   * @param {StorageObject} object
   * @returns {AsyncData<StorageObjectUploadResponse, H3Error<ErrorResponse>>}
   */
  const upload = (object) => {
    return client.post('/resource/upload-storage-object', {
      watch: false,
      lazy: true,
      body: StorageObject.toUploadRequestPayload(object),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageObjectUploadResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<StorageObjectUploadResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    storageId: storage_id,
    objectPath: object_path,
    isPrefix = false,
  }) => {
    return client.post('/resource/delete-storage-object', {
      watch: false,
      lazy: true,
      body: {
        storage_id,
        object_path,
        is_prefix: isPrefix,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<StorageObjectUploadResponse, H3Error<ErrorResponse>>}
   */
  const copy = ({
    storageId: storage_id,
    objectPath: object_path,
    destObjectPath: dest_object_path,
  }) => {
    return client.post('/resource/copy-storage-object', {
      watch: false,
      lazy: true,
      body: {
        storage_id,
        object_path,
        dest_object_path,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {StorageObject} object
   * @returns {AsyncData<StorageObjectDownloadResponse, H3Error<ErrorResponse>>}
   */
  const download = (object) => {
    return client.post('/resource/download-storage-object', {
      watch: false,
      lazy: true,
      body: StorageObject.toDownloadRequestPayload(object),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageObjectDownloadResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {String} presignedUrl
   * @param {File} file
   * @param {function} onProgress
   * @returns {Promise<String>}
   */
  const uploadToS3 = ({
    presignedUrl: presigned_url,
    file,
    onProgress = () => {},
  }) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presigned_url, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
          return;
        }
        handleTextResponseError(xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(file);
    });
  };

  /**
   * @returns {AsyncData<StorageObjectUploadResponse, H3Error<ErrorResponse>>}
   */
  const createCommonPrefix = ({
    storageId: storage_id,
    objectPath,
  }) => {
    return client.post('/resource/upload-storage-object', {
      watch: false,
      lazy: true,
      body: {
        storage_id,
        object_path: `${objectPath}/${StorageConstant.PLACEHOLDER_OBJECT_NAME}`,
        content_type: 'text/plain',
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageObjectUploadResponse(finalResponse._data);
        }
      },
    });
  };

  const preview = ({
    storageId: storage_id,
    objectPath: object_path,
    limit = ListConstant.StorageObjectParams.PREVIEW_CONTENT_LIMIT,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/preview-storage-object', {
      watch: false,
      lazy,
      signal,
      body: {
        storage_id,
        object_path,
        limit,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageObjectPreviewResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    list,
    get,
    upload,
    copy,
    destroy,
    download,
    uploadToS3,
    preview,
    createCommonPrefix,
  };
};
