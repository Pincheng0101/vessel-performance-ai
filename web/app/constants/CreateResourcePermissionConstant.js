import * as ChunkerConstant from './ChunkerConstant';
import * as ConnectorConstant from './ConnectorConstant';
import * as EmbeddingModelConstant from './EmbeddingModelConstant';
import * as KnowledgeBaseConstant from './KnowledgeBaseConstant';
import * as LlmConstant from './LlmConstant';
import * as LoaderConstant from './LoaderConstant';
import * as McpServerConstant from './McpServerConstant';
import * as RankerConstant from './RankerConstant';
import * as RetrieverConstant from './RetrieverConstant';
import * as SearchEngineConstant from './SearchEngineConstant';
import * as VariableConstant from './VariableConstant';

const DefaultSubType = 'default';

const SubTypeMap = Object.freeze({
  chunker: Object.values(ChunkerConstant.Type),
  connector: Object.values(ConnectorConstant.Type),
  embedding_model: Object.values(EmbeddingModelConstant.Type),
  knowledge_base: Object.values(KnowledgeBaseConstant.Type),
  llm: Object.values(LlmConstant.Type),
  loader: Object.values(LoaderConstant.Type),
  mcp_server: Object.values(McpServerConstant.Type),
  ranker: Object.values(RankerConstant.Type),
  retriever: Object.values(RetrieverConstant.Type),
  search_engine: Object.values(SearchEngineConstant.Type),
  variable: Object.values(VariableConstant.Type),
});

export {
  DefaultSubType,
  SubTypeMap,
};
