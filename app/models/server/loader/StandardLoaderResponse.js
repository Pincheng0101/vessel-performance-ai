import StandardLoader from './StandardLoader';
import { LoaderSourceResponseFactory } from './loaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StandardLoaderResponse extends StandardLoader {
  constructor({
    cron,
    knowledge_base_id,
    loader_id,
    loader_name,
    loader_type,
    retriever_ids,
    sources,
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
      sources: sources?.map(source => LoaderSourceResponseFactory.create(source, loader_type)),
    });
  }
}

export default StandardLoaderResponse;
