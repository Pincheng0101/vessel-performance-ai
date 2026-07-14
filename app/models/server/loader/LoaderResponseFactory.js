import { LoaderConstant } from '~/constants';
import LoaderResponse from './LoaderResponse';
import StandardLoaderResponse from './StandardLoaderResponse';
import UnsupervisedLoaderResponse from './UnsupervisedLoaderResponse';

class LoaderResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.loader_type
   */
  static create(payload) {
    switch (payload.loader_type) {
      case LoaderConstant.Type.STANDARD.value:
        return new StandardLoaderResponse(payload);
      case LoaderConstant.Type.UNSUPERVISED.value:
        return new UnsupervisedLoaderResponse(payload);
      default:
        return new LoaderResponse(payload);
    }
  }
}

export default LoaderResponseFactory;
