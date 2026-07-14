export default function useWorkflowStateForm() {
  const form = ref(null);

  const isFormGroupValid = ref(true);

  const validateFormGroup = async () => {
    await nextTick();

    const mainForm = form.value.getMainForm();
    const configForm = form.value.getConfigForm();
    const errorHandlingForm = form.value.getErrorHandlingForm();

    const isMainFormValid = mainForm ? (await mainForm.validate()).valid : true;
    const isConfigFormValid = configForm ? (await configForm.validate()).valid : true;
    const isErrorHandlingFormValid = errorHandlingForm ? (await errorHandlingForm.validate()).valid : true;

    isFormGroupValid.value = isMainFormValid && isConfigFormValid && isErrorHandlingFormValid;

    return isFormGroupValid.value;
  };

  return {
    form,
    isFormGroupValid,
    validateFormGroup,
  };
}
