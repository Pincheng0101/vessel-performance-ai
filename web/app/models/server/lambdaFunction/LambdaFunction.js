import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class LambdaFunction extends Resource {
  constructor({
    description,
    lambdaArn,
    lambdaFunctionId,
    lambdaFunctionName,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    this.description = description ?? '';
    this.lambdaArn = lambdaArn ?? '';
    this.lambdaFunctionId = lambdaFunctionId ?? '';
    this.lambdaFunctionName = lambdaFunctionName ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.LAMBDA_FUNCTION.value;
  }

  get id() {
    return this.lambdaFunctionId;
  }

  get name() {
    return this.lambdaFunctionName;
  }

  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldLambdaArn'), value: this.lambdaArn, isCopyable: true, link: { href: arnUtils.toUrl(this.lambdaArn), target: '_blank' } },
      { title: $i18n.t('__fieldDescription'), value: this.description },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {LambdaFunction} resource
   */
  static toRequestPayload(resource) {
    return {
      description: resource.description,
      lambda_arn: resource.lambdaArn,
      lambda_function_id: resource.lambdaFunctionId,
      lambda_function_name: resource.lambdaFunctionName,
    };
  }
}

export default LambdaFunction;
