import { ExternalMemoryResponse } from '~/models/server/externalMemory';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ExternalMemory } from '~/models/server/externalMemory';
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function externalMemory({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ExternalMemoryResponse, H3Error<ErrorResponse>>}
   */
  const upload = () => {
    return client.post('/runtime/upload-external-memory', {
      watch: false,
      lazy: true,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ExternalMemoryResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {string} presignedUrl - from data.value.presignedUrl.url
   * @param {object} payload - json data
   * @returns {Promise<void>}
   */
  const uploadToS3 = async ({ presignedUrl, payload }) => {
    try {
      const res = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = new Error(`S3 upload failed: ${res.statusText}`);
        return { data: null, error };
      }
      return { data: res, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    upload,
    uploadToS3,
  };
};
