import Loader from './Loader';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LoaderResponse extends Loader {
  constructor({
    cron,
    knowledge_base_id,
    loader_id,
    loader_name,
    loader_type,
    retriever_ids,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      cron,
      knowledgeBaseId: knowledge_base_id,
      loaderId: loader_id,
      loaderName: loader_name,
      loaderType: loader_type,
      retrieverIds: retriever_ids,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default LoaderResponse;
