import SearchEngine from './SearchEngine';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class SearchEngineResponse extends SearchEngine {
  constructor({
    search_engine_id,
    search_engine_name,
    search_engine_type,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
      searchEngineId: search_engine_id,
      searchEngineName: search_engine_name,
      searchEngineType: search_engine_type,
    });
  }
}

export default SearchEngineResponse;
