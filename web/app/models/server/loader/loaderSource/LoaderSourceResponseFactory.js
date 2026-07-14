import { LoaderConstant } from '~/constants';
import ApiLoaderSourceResponse from './ApiLoaderSourceResponse';
import LoaderSourceResponse from './LoaderSourceResponse';
import MySqlLoaderSourceResponse from './MySqlLoaderSourceResponse';
import OpenSearchLoaderSourceResponse from './OpenSearchLoaderSourceResponse';
import S3LoaderSourceResponse from './S3LoaderSourceResponse';
import S3UnsupervisedLoaderSourceResponse from './S3UnsupervisedLoaderSourceResponse';
import StorageLoaderSourceResponse from './StorageLoaderSourceResponse';
import StorageUnsupervisedLoaderSourceResponse from './StorageUnsupervisedLoaderSourceResponse';

class LoaderSourceResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.source_type
   */
  static create(payload, loaderType) {
    switch (payload.source_type) {
      case LoaderConstant.SourceType.API.value:
        return new ApiLoaderSourceResponse(payload);
      case LoaderConstant.SourceType.MYSQL.value:
        return new MySqlLoaderSourceResponse(payload);
      case LoaderConstant.SourceType.OPENSEARCH.value:
        return new OpenSearchLoaderSourceResponse(payload);
      case LoaderConstant.SourceType.S3.value:
        if (loaderType === LoaderConstant.Type.UNSUPERVISED.value) {
          return new S3UnsupervisedLoaderSourceResponse(payload);
        }
        return new S3LoaderSourceResponse(payload);
      case LoaderConstant.SourceType.STORAGE.value:
        if (loaderType === LoaderConstant.Type.UNSUPERVISED.value) {
          return new StorageUnsupervisedLoaderSourceResponse(payload);
        }
        return new StorageLoaderSourceResponse(payload);
      default:
        return new LoaderSourceResponse(payload);
    }
  }
}

export default LoaderSourceResponseFactory;
