import { TempFilePresignedUrlResponse, TempFileReadResponse } from '~/models/server/tempFile';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function tempFile({
  client,
  handleRequest,
  handleRequestError,
  handleResponseError,
  handleTextResponseError,
}) {
  /**
   * @returns {AsyncData<Object, H3Error<ErrorResponse>>}
   */
  const getPresignedUrl = ({
    filename,
  }) => {
    return client.post('/runtime/get-temp-file-presigned-url', {
      watch: false,
      lazy: true,
      body: {
        filename,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: ({ response }) => {
        if (response.ok) {
          response._data = new TempFilePresignedUrlResponse(response._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<Object, H3Error<ErrorResponse>>}
   */
  const read = ({
    tempFileId: temp_file_id,
  }) => {
    return client.post('/runtime/read-temp-file', {
      watch: false,
      lazy: true,
      body: {
        temp_file_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: ({ response }) => {
        if (response.ok) {
          response._data = new TempFileReadResponse(response._data);
        }
      },
    });
  };

  /**
   * @param {Object} presignedUrl
   * @param {String} presignedUrl.url
   * @param {Object} presignedUrl.fields
   * @param {File} file
   * @returns {Promise<String>}
   */
  const uploadToS3 = ({
    presignedUrl: presigned_url,
    file,
  }) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(presigned_url.fields || {})) {
        formData.append(key, value);
      }
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', presigned_url.url, true);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
          return;
        }
        handleTextResponseError(xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  };

  /**
   * @param {String} presignedUrl
   * @returns {Promise<String>}
   */
  const downloadParsedText = async ({
    presignedUrl: presigned_url,
  }) => {
    const response = await fetch(presigned_url);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    return response.text();
  };

  /**
   * @param {File} file
   * @returns {Promise<String>}
   */
  const readParsedText = async ({
    file,
  }) => {
    const { data: presignedData, error: presignedError } = await getPresignedUrl({
      filename: file.name,
    });
    if (presignedError.value) throw presignedError.value;

    await uploadToS3({
      presignedUrl: presignedData.value.presignedUrl,
      file,
    });

    const { data: readData, error: readError } = await read({
      tempFileId: presignedData.value.tempFileId,
    });
    if (readError.value) throw readError.value;

    if (readData.value.content != null) {
      return readData.value.content;
    }
    if (readData.value.presignedUrl?.url) {
      return downloadParsedText({
        presignedUrl: readData.value.presignedUrl.url,
      });
    }
    return '';
  };

  return {
    downloadParsedText,
    getPresignedUrl,
    read,
    readParsedText,
    uploadToS3,
  };
}
