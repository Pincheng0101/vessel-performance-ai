const Method = Object.freeze({
  GET: {
    title: 'GET',
    value: 'GET',
  },
  POST: {
    title: 'POST',
    value: 'POST',
  },
  PUT: {
    title: 'PUT',
    value: 'PUT',
  },
  PATCH: {
    title: 'PATCH',
    value: 'PATCH',
  },
  DELETE: {
    title: 'DELETE',
    value: 'DELETE',
  },
  HEAD: {
    title: 'HEAD',
    value: 'HEAD',
  },
  OPTIONS: {
    title: 'OPTIONS',
    value: 'OPTIONS',
  },
});

const HeaderName = Object.freeze({
  ACCEPT: 'Accept',
  ACCEPT_ENCODING: 'Accept-Encoding',
  ACCEPT_LANGUAGE: 'Accept-Language',
  ACCESS_CONTROL_REQUEST_HEADERS: 'Access-Control-Request-Headers',
  ACCESS_CONTROL_REQUEST_METHOD: 'Access-Control-Request-Method',
  AUTHORIZATION: 'Authorization',
  CACHE_CONTROL: 'Cache-Control',
  CONNECTION: 'Connection',
  CONTENT_LENGTH: 'Content-Length',
  CONTENT_TYPE: 'Content-Type',
  COOKIE: 'Cookie',
  DATE: 'Date',
  DNT: 'DNT',
  EXPECT: 'Expect',
  FROM: 'From',
  HOST: 'Host',
  IF_MATCH: 'If-Match',
  IF_MODIFIED_SINCE: 'If-Modified-Since',
  IF_NONE_MATCH: 'If-None-Match',
  IF_RANGE: 'If-Range',
  IF_UNMODIFIED_SINCE: 'If-Unmodified-Since',
  KEEP_ALIVE: 'Keep-Alive',
  MAX_FORWARDS: 'Max-Forwards',
  ORIGIN: 'Origin',
  PRAGMA: 'Pragma',
  PROXY_AUTHORIZATION: 'Proxy-Authorization',
  RANGE: 'Range',
  REFERER: 'Referer',
  TE: 'TE',
  TRAILER: 'Trailer',
  TRANSFER_ENCODING: 'Transfer-Encoding',
  UPGRADE: 'Upgrade',
  USER_AGENT: 'User-Agent',
  VIA: 'Via',
  WARNING: 'Warning',
  X_API_KEY: 'x-api-key',
  X_REQUESTED_WITH: 'X-Requested-With',
});

const ContentTypeOptions = Object.freeze([
  'application/json',
  'application/x-www-form-urlencoded',
  'application/xml',
  'multipart/form-data',
  'text/plain',
]);

const AcceptOptions = Object.freeze([
  'application/json',
  'application/xml',
  'text/html',
  'text/plain',
  '*/*',
]);

export {
  AcceptOptions,
  ContentTypeOptions,
  HeaderName,
  Method,
};
