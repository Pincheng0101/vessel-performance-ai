import { LoaderConstant } from '~/constants';
import Loader from './Loader';
import StandardLoader from './StandardLoader';
import UnsupervisedLoader from './UnsupervisedLoader';

class LoaderFactory {
  /**
   * @param {Loader} payload
   */
  static create(payload) {
    switch (payload.loaderType) {
      case LoaderConstant.Type.STANDARD.value:
        return new StandardLoader(payload);
      case LoaderConstant.Type.UNSUPERVISED.value:
        return new UnsupervisedLoader(payload);
      default:
        return new Loader(payload);
    }
  }

  /**
   * @param {Loader} resource
   */
  static toRequestPayload(resource) {
    switch (resource.loaderType) {
      case LoaderConstant.Type.STANDARD.value:
        return StandardLoader.toRequestPayload(resource);
      case LoaderConstant.Type.UNSUPERVISED.value:
        return UnsupervisedLoader.toRequestPayload(resource);
      default:
        return Loader.toRequestPayload(resource);
    }
  }
}

export default LoaderFactory;
