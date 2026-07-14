const ActionExecutionParams = Object.freeze({
  DEFAULT_OUTPUT: {
    jsonSchema: {
      type: 'object',
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        response: {
          type: 'object',
        },
      },
      required: ['response'],
    },
  },
  URL_PATH: '/my_index/_search',
  BODY: {
    query: {
      match_all: {},
    },
    size: 10,
  },
  HEADERS: {},
  PARAMS: {},
});

const SearchQueryParameters = Object.freeze({
  ALLOW_NO_INDICES: {
    title: 'allow_no_indices',
    value: 'allow_no_indices',
  },
  ALLOW_PARTIAL_SEARCH_RESULTS: {
    title: 'allow_partial_search_results',
    value: 'allow_partial_search_results',
  },
  ANALYZE_WILDCARD: {
    title: 'analyze_wildcard',
    value: 'analyze_wildcard',
  },
  ANALYZER: {
    title: 'analyzer',
    value: 'analyzer',
  },
  BATCHED_REDUCE_SIZE: {
    title: 'batched_reduce_size',
    value: 'batched_reduce_size',
  },
  CANCEL_AFTER_TIME_INTERVAL: {
    title: 'cancel_after_time_interval',
    value: 'cancel_after_time_interval',
  },
  CCS_MINIMIZE_ROUNDTRIPS: {
    title: 'ccs_minimize_roundtrips',
    value: 'ccs_minimize_roundtrips',
  },
  DEFAULT_OPERATOR: {
    title: 'default_operator',
    value: 'default_operator',
  },
  DF: {
    title: 'df',
    value: 'df',
  },
  DOCVALUE_FIELDS: {
    title: 'docvalue_fields',
    value: 'docvalue_fields',
  },
  EXPAND_WILDCARDS: {
    title: 'expand_wildcards',
    value: 'expand_wildcards',
  },
  EXPLAIN: {
    title: 'explain',
    value: 'explain',
  },
  FROM: {
    title: 'from',
    value: 'from',
  },
  IGNORE_THROTTLED: {
    title: 'ignore_throttled',
    value: 'ignore_throttled',
  },
  IGNORE_UNAVAILABLE: {
    title: 'ignore_unavailable',
    value: 'ignore_unavailable',
  },
  INCLUDE_NAMED_QUERIES_SCORE: {
    title: 'include_named_queries_score',
    value: 'include_named_queries_score',
  },
  LENIENT: {
    title: 'lenient',
    value: 'lenient',
  },
  MAX_CONCURRENT_SHARD_REQUESTS: {
    title: 'max_concurrent_shard_requests',
    value: 'max_concurrent_shard_requests',
  },
  PHASE_TOOK: {
    title: 'phase_took',
    value: 'phase_took',
  },
  PRE_FILTER_SHARD_SIZE: {
    title: 'pre_filter_shard_size',
    value: 'pre_filter_shard_size',
  },
  PREFERENCE: {
    title: 'preference',
    value: 'preference',
  },
  Q: {
    title: 'q',
    value: 'q',
  },
  REQUEST_CACHE: {
    title: 'request_cache',
    value: 'request_cache',
  },
  REST_TOTAL_HITS_AS_INT: {
    title: 'rest_total_hits_as_int',
    value: 'rest_total_hits_as_int',
  },
  ROUTING: {
    title: 'routing',
    value: 'routing',
  },
  SCROLL: {
    title: 'scroll',
    value: 'scroll',
  },
  SEARCH_TYPE: {
    title: 'search_type',
    value: 'search_type',
  },
  SEQ_NO_PRIMARY_TERM: {
    title: 'seq_no_primary_term',
    value: 'seq_no_primary_term',
  },
  SIZE: {
    title: 'size',
    value: 'size',
  },
  SORT: {
    title: 'sort',
    value: 'sort',
  },
  SOURCE_EXCLUDES: {
    title: '_source_excludes',
    value: '_source_excludes',
  },
  SOURCE_INCLUDES: {
    title: '_source_includes',
    value: '_source_includes',
  },
  SOURCE: {
    title: '_source',
    value: '_source',
  },
  STATS: {
    title: 'stats',
    value: 'stats',
  },
  STORED_FIELDS: {
    title: 'stored_fields',
    value: 'stored_fields',
  },
  SUGGEST_FIELD: {
    title: 'suggest_field',
    value: 'suggest_field',
  },
  SUGGEST_MODE: {
    title: 'suggest_mode',
    value: 'suggest_mode',
  },
  SUGGEST_SIZE: {
    title: 'suggest_size',
    value: 'suggest_size',
  },
  SUGGEST_TEXT: {
    title: 'suggest_text',
    value: 'suggest_text',
  },
  TERMINATE_AFTER: {
    title: 'terminate_after',
    value: 'terminate_after',
  },
  TIMEOUT: {
    title: 'timeout',
    value: 'timeout',
  },
  TRACK_SCORES: {
    title: 'track_scores',
    value: 'track_scores',
  },
  TRACK_TOTAL_HITS: {
    title: 'track_total_hits',
    value: 'track_total_hits',
  },
  TYPED_KEYS: {
    title: 'typed_keys',
    value: 'typed_keys',
  },
  VERSION: {
    title: 'version',
    value: 'version',
  },
});

const GetDocQueryParameters = Object.freeze({
  PREFERENCE: {
    title: 'preference',
    value: 'preference',
  },
  REALTIME: {
    title: 'realtime',
    value: 'realtime',
  },
  REFRESH: {
    title: 'refresh',
    value: 'refresh',
  },
  ROUTING: {
    title: 'routing',
    value: 'routing',
  },
  SOURCE_EXCLUDES: {
    title: '_source_excludes',
    value: '_source_excludes',
  },
  SOURCE_INCLUDES: {
    title: '_source_includes',
    value: '_source_includes',
  },
  SOURCE: {
    title: '_source',
    value: '_source',
  },
  STORED_FIELDS: {
    title: 'stored_fields',
    value: 'stored_fields',
  },
  VERSION_TYPE: {
    title: 'version_type',
    value: 'version_type',
  },
  VERSION: {
    title: 'version',
    value: 'version',
  },
});

const DefaultParams = Object.freeze({
  TIMEOUT: {
    min: 1,
    max: 120,
    step: 1,
    default: 30,
  },
  IS_CACHE_CONNECTION: true,
});

export {
  ActionExecutionParams,
  DefaultParams,
  GetDocQueryParameters,
  SearchQueryParameters,
};
