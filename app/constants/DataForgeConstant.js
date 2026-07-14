import * as LlmConstant from './LlmConstant';

const DefaultParams = Object.freeze({
  GENERATION_INSTRUCTION: {
    min: 1,
    max: 50000,
  },
  GENERATION_SIZE: {
    min: 1,
    max: 30,
    default: 10,
    step: 1,
  },
  EXECUTION_LLM: {
    llmId: LlmConstant.DefaultLlm.ID,
    llmName: LlmConstant.DefaultLlm.NAME,
    llmType: LlmConstant.DefaultLlm.TYPE,
  },
});

export {
  DefaultParams,
};
