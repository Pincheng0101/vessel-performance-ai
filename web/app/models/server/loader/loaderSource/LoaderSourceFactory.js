import { LoaderConstant } from '~/constants';
import ApiLoaderSource from './ApiLoaderSource';
import LoaderSource from './LoaderSource';
import MySqlLoaderSource from './MySqlLoaderSource';
import OpenSearchLoaderSource from './OpenSearchLoaderSource';
import S3LoaderSource from './S3LoaderSource';
import S3UnsupervisedLoaderSource from './S3UnsupervisedLoaderSource';
import StorageLoaderSource from './StorageLoaderSource';
import StorageUnsupervisedLoaderSource from './StorageUnsupervisedLoaderSource';

class LoaderSourceFactory {
  /**
   * @param {LoaderSource} payload
   */
  static create(payload, loaderType) {
    switch (payload.sourceType) {
      case LoaderConstant.SourceType.API.value:
        return new ApiLoaderSource(payload);
      case LoaderConstant.SourceType.MYSQL.value:
        return new MySqlLoaderSource(payload);
      case LoaderConstant.SourceType.OPENSEARCH.value:
        return new OpenSearchLoaderSource(payload);
      case LoaderConstant.SourceType.S3.value:
        if (loaderType === LoaderConstant.Type.UNSUPERVISED.value) {
          return new S3UnsupervisedLoaderSource(payload);
        }
        return new S3LoaderSource(payload);
      case LoaderConstant.SourceType.STORAGE.value:
        if (loaderType === LoaderConstant.Type.UNSUPERVISED.value) {
          return new StorageUnsupervisedLoaderSource(payload);
        }
        return new StorageLoaderSource(payload);
      default:
        return new LoaderSource(payload);
    }
  }

  /**
   * @param {LoaderSource} resource
   */
  static toRequestPayload(resource, loaderType) {
    switch (resource.sourceType) {
      case LoaderConstant.SourceType.API.value:
        return ApiLoaderSource.toRequestPayload(resource);
      case LoaderConstant.SourceType.MYSQL.value:
        return MySqlLoaderSource.toRequestPayload(resource);
      case LoaderConstant.SourceType.OPENSEARCH.value:
        return OpenSearchLoaderSource.toRequestPayload(resource);
      case LoaderConstant.SourceType.S3.value:
        if (loaderType === LoaderConstant.Type.UNSUPERVISED.value) {
          return S3UnsupervisedLoaderSource.toRequestPayload(resource);
        }
        return S3LoaderSource.toRequestPayload(resource);
      case LoaderConstant.SourceType.STORAGE.value:
        if (loaderType === LoaderConstant.Type.UNSUPERVISED.value) {
          return StorageUnsupervisedLoaderSource.toRequestPayload(resource);
        }
        return StorageLoaderSource.toRequestPayload(resource);
      default:
        return LoaderSource.toRequestPayload(resource);
    }
  }
}

export default LoaderSourceFactory;
