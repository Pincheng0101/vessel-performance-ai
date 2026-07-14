import LambdaFunction from './LambdaFunction';

class LambdaFunctionResponse extends LambdaFunction {
  constructor({
    description,
    lambda_arn,
    lambda_function_id,
    lambda_function_name,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      description,
      lambdaArn: lambda_arn,
      lambdaFunctionId: lambda_function_id,
      lambdaFunctionName: lambda_function_name,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default LambdaFunctionResponse;
