import UnsupervisedLoader from './UnsupervisedLoader';
import { LoaderSourceResponseFactory } from './loaderSource';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class UnsupervisedLoaderResponse extends UnsupervisedLoader {
  constructor({
    cron,
    knowledge_base_id,
    loader_id,
    loader_name,
    loader_type,
    parser_mode,
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
      parserMode: parser_mode,
      retrieverIds: retriever_ids,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
      sources: sources?.map(source => LoaderSourceResponseFactory.create(source, loader_type)),
    });
  }
}

export default UnsupervisedLoaderResponse;
