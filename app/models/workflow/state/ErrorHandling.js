import ErrorHandlingCatch from './ErrorHandlingCatch';
import ErrorHandlingRetry from './ErrorHandlingRetry';

class ErrorHandling {
  constructor({
    catches = [],
    retries = [],
  } = {}) {
    this.catches = catches.map(catchItem => new ErrorHandlingCatch(catchItem));
    this.retries = retries.map(retryItem => new ErrorHandlingRetry(retryItem));
  }
}

export default ErrorHandling;
