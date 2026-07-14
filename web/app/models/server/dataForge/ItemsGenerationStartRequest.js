import { DataForgeConstant } from '~/constants';
import AttachmentContentBlock from '../contentBlock/AttachmentContentBlock';
import DatasetField from '../dataset/DatasetField';

class ItemsGenerationStartRequest {
  static toRequestPayload(request) {
    return {
      generation_instruction: request.generationInstruction,
      generation_attachments: request.generationAttachments?.length > 0 ? request.generationAttachments.map(attachment => AttachmentContentBlock.toRequestPayload(attachment)) : null,
      generation_examples: request.generationExamples ?? null,
      dataset_id: request.datasetId,
      input_fields: request.inputFields?.length > 0 ? request.inputFields.map(field => DatasetField.toRequestPayload(field)) : null,
      output_fields: request.outputFields?.length > 0 ? request.outputFields.map(field => DatasetField.toRequestPayload(field)) : null,
      execution_llm: request.executionLlm,
      generation_size: request.generationSize ?? DataForgeConstant.DefaultParams.GENERATION_SIZE.default,
    };
  }
}

export default ItemsGenerationStartRequest;
