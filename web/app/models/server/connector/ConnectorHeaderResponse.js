/**
 * This class receives data from the API with parameters in snake_case.
 */
class ConnectorHeaderResponse {
  constructor({
    value,
    is_secret,
  } = {}) {
    this.value = (is_secret && !value) ? null : value;
    this.isSecret = is_secret ?? false;
  }
}

export default ConnectorHeaderResponse;
