import LoaderSourceDataField from './LoaderSourceDataField';

class LoaderSourceDataFieldResponse extends LoaderSourceDataField {
  constructor({
    dest_field,
    src_field,
  } = {}) {
    super({
      destField: dest_field,
      srcField: src_field,
    });
  }
}

export default LoaderSourceDataFieldResponse;
