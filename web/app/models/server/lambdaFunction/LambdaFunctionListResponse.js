import LambdaFunctionResponse from './LambdaFunctionResponse';

class LambdaFunctionListResponse {
  data = [];

  constructor(response) {
    this.data = response.lambda_functions.map(item => new LambdaFunctionResponse(item));
    this.nextToken = response.next_token;
  }
}

export default LambdaFunctionListResponse;
