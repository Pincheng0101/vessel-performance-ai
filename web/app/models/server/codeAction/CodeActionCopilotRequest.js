class CodeActionCopilotRequest {
  static toRequestPayload(request) {
    return {
      description: request.description,
      input_examples: request.inputExamples,
      input_schema: request.inputSchema,
      runtime_type: request.runtimeType,
      session_id: request.sessionId,
    };
  }
}

export default CodeActionCopilotRequest;
