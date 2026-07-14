import { LambdaInvokeParameters } from '~/models/workflow/state/task/parameters/lambdaInvoke';
import DescribeWorkflowExecutionPayload from './DescribeWorkflowExecutionPayload';

class DescribeWorkflowExecutionParameters extends LambdaInvokeParameters {
  /**
   * @param {Object} params
   * @param {DescribeWorkflowExecutionPayload} params.payload
   */
  constructor({
    functionName,
    payload,
  } = {}) {
    super({
      functionName,
    });
    this.payload = new DescribeWorkflowExecutionPayload(payload);
  }
}

export default DescribeWorkflowExecutionParameters;
