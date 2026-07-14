import { ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

export function useResource() {
  const { t } = useI18n();
  const server = useServer();
  const snackbarStore = useSnackbarStore();

  const isValidating = ref(false);

  const DEFAULT_RESOURCE_ID_EXCEPTIONS = [
    'agent-lfe_copilot_code_action',
  ];

  /**
   * @param {Resource} item
   * @returns {boolean}
   */
  const isDefaultResource = (item) => {
    if (!item?.id) return false;
    const id = String(item.id);
    return id.endsWith('default') || DEFAULT_RESOURCE_ID_EXCEPTIONS.includes(id);
  };

  /**
   * @param {string} module
   * @param {object} resource
   */
  const validate = async (module, resource) => {
    isValidating.value = true;
    const { data, error } = await server[module].validate(resource);
    if (error.value) {
      isValidating.value = false;
      return;
    }
    const typeField = findField(ResourceConstant.Type, module, 'typeField', 'module');
    const typeConstant = findField(ResourceConstant.Type, module, 'type', 'module');
    const resourceType = resource[typeField];
    const i18nValidateMessage = findField(typeConstant, resourceType, 'i18nValidateMessage');

    if (data.value.valid) {
      snackbarStore.setSuccess(t('__messageResourceValidateSuccessfully', { action: t(i18nValidateMessage, 2) }));
    } else {
      snackbarStore.setFailure(t('__messageResourceValidateFailed', { action: t(i18nValidateMessage, 2) }));
    }
    isValidating.value = false;
  };

  const hasAwsCredential = (resource) => {
    return resource.roleName || resource.awsAccessKeyId;
  };

  return {
    hasAwsCredential,
    isDefaultResource,
    isValidating,
    validate,
  };
}
