import CommonPrefix from './CommonPrefix';

class CommonPrefixResponse extends CommonPrefix {
  constructor({
    common_prefix,
  } = {}) {
    super({
      commonPrefix: common_prefix,
    });
  }
}

export default CommonPrefixResponse;
