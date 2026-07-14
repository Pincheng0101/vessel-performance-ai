import { ResourceConstant } from '~/constants';
import { AgentResponse } from '~/models/server/agent';
import { ChunkerResponseFactory } from '~/models/server/chunker';
import { ConnectorResponseFactory } from '~/models/server/connector';
import { DatasetResponse } from '~/models/server/dataset';
import { EmbeddingModelResponseFactory } from '~/models/server/embeddingModel';
import { KnowledgeBaseResponseFactory } from '~/models/server/knowledgeBase';
import { LambdaFunctionResponse } from '~/models/server/lambdaFunction';
import { LlmResponseFactory } from '~/models/server/llm';
import { LoaderResponseFactory } from '~/models/server/loader';
import { McpServerResponse } from '~/models/server/mcpServer';
import { RankerResponseFactory } from '~/models/server/ranker';
import { RetrieverResponseFactory } from '~/models/server/retriever';
import { SearchEngineResponseFactory } from '~/models/server/searchEngine';
import { SkillResponse } from '~/models/server/skill';
import { StorageResponse } from '~/models/server/storage';
import { TemplateResponse } from '~/models/server/template';
import { VariableResponseFactory } from '~/models/server/variable';
import { WorkflowResponse } from '~/models/server/workflow';

class ResourceResponseFactory {
  static create(type, resource) {
    switch (type) {
      case ResourceConstant.Type.AGENT.value:
        return new AgentResponse(resource);
      case ResourceConstant.Type.CHUNKER.value:
        return ChunkerResponseFactory.create(resource);
      case ResourceConstant.Type.CONNECTOR.value:
        return ConnectorResponseFactory.create(resource);
      case ResourceConstant.Type.DATASET.value:
        return new DatasetResponse(resource);
      case ResourceConstant.Type.EMBEDDING_MODEL.value:
        return EmbeddingModelResponseFactory.create(resource);
      case ResourceConstant.Type.KNOWLEDGE_BASE.value:
        return KnowledgeBaseResponseFactory.create(resource);
      case ResourceConstant.Type.LAMBDA_FUNCTION.value:
        return new LambdaFunctionResponse(resource);
      case ResourceConstant.Type.LLM.value:
        return LlmResponseFactory.create(resource);
      case ResourceConstant.Type.LOADER.value:
        return LoaderResponseFactory.create(resource);
      case ResourceConstant.Type.MCP_SERVER.value:
        return new McpServerResponse(resource);
      case ResourceConstant.Type.RANKER.value:
        return RankerResponseFactory.create(resource);
      case ResourceConstant.Type.RETRIEVER.value:
        return RetrieverResponseFactory.create(resource);
      case ResourceConstant.Type.SEARCH_ENGINE.value:
        return SearchEngineResponseFactory.create(resource);
      case ResourceConstant.Type.SKILL.value:
        return new SkillResponse(resource);
      case ResourceConstant.Type.STORAGE.value:
        return new StorageResponse(resource);
      case ResourceConstant.Type.TEMPLATE.value:
        return new TemplateResponse(resource);
      case ResourceConstant.Type.VARIABLE.value:
        return VariableResponseFactory.create(resource);
      case ResourceConstant.Type.WORKFLOW.value:
        return new WorkflowResponse(resource);
      default:
        return null;
    }
  }
}

export default ResourceResponseFactory;
