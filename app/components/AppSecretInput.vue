<script setup>
import { FormConstant } from '~/constants';

const props = defineProps({
  isResetButtonVisible: {
    type: Boolean,
    default: true,
  },
});

const state = reactive({
  isResetButtonVisible: props.isResetButtonVisible,
  isValueVisible: false,
});

// Use attrs to pass down all other props to AppTextField
const attrs = useAttrs();
</script>

<template>
  <template v-if="state.isResetButtonVisible">
    <div class="mb-5 d-flex align-center ga-2">
      <AppTextField
        :id="`${FormConstant.SECRET_INPUT_PLACEHOLDER_ID_PREFIX}-${strUtils.generateRandom(6)}`"
        value="secret_input_placeholder"
        type="password"
        readonly
        hide-details
      />
      <AppButton
        :text="$t('__actionReset')"
        color="primary"
        variant="outlined"
        @click="state.isResetButtonVisible = false"
      />
    </div>
  </template>
  <template v-else>
    <AppTextField
      v-bind="attrs"
      :type="state.isValueVisible ? 'text' : 'password'"
      :append-inner-icon="state.isValueVisible ? 'mdi-eye-off' : 'mdi-eye'"
      @click:append-inner="state.isValueVisible = !state.isValueVisible"
    />
  </template>
</template>
