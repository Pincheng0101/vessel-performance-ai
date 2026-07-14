const fetch = (method, baseOptions) => (url, options) => {
  // Generate a unique key for useFetch to prevent sharing data between requests
  const key = `${url}-${Date.now()}-${strUtils.generateRandom()}`;
  return useFetch(url, {
    ...baseOptions,
    method,
    ...options,
    key,
  });
};

/**
 * Creates a client with predefined HTTP methods.
 *
 * @param {Object} baseOptions - The base options to be used for each request.
 * @returns {Object} An object containing methods for HTTP requests: get, post, patch, put, and delete.
 */
const createClient = baseOptions => ({
  get: fetch('GET', baseOptions),
  post: fetch('POST', baseOptions),
  patch: fetch('PATCH', baseOptions),
  put: fetch('PUT', baseOptions),
  delete: fetch('DELETE', baseOptions),
});

export default createClient;
