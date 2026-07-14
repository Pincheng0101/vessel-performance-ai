import DuckDuckGoSearchEngine from './DuckDuckGoSearchEngine';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DuckDuckGoSearchEngineResponse extends DuckDuckGoSearchEngine {
  constructor({
    region,
    safesearch,
    search_engine_id,
    search_engine_name,
    search_engine_type,
    status,
    system_info,
    timelimit,
    updated_ts,
  } = {}) {
    super({
      region,
      safesearch,
      searchEngineId: search_engine_id,
      searchEngineName: search_engine_name,
      searchEngineType: search_engine_type,
      status,
      systemInfo: system_info,
      timelimit,
      updatedTs: updated_ts,
    });
  }
}

export default DuckDuckGoSearchEngineResponse;
