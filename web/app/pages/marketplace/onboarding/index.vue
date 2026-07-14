<script setup>
import { StatusConstant } from '~/constants';

definePageMeta({
  layout: 'expanded',
  middleware: [
    'public',
  ],
});

const server = useServer();
const route = useRoute();
const snackbarStore = useSnackbarStore();
const { t } = useI18n();

const formRef = ref(null);

const X_AMZN_MARKETPLACE_TOKEN = 'x-amzn-marketplace-token';

const state = reactive({
  username: '',
  email: '',
  decodedToken: decodeURIComponent(route.query[X_AMZN_MARKETPLACE_TOKEN] || ''),
  isLoading: false,
});

const handleSignUp = async () => {
  state.isLoading = true;
  const isFormValid = (await (formRef.value.validate())).valid;
  if (!isFormValid) {
    state.isLoading = false;
    return;
  }
  if (!state.decodedToken) {
    snackbarStore.setActionFailure('__actionSignUp');
    state.isLoading = false;
    return;
  }
  const { data, error } = await server.marketplace.onboarding({
    username: state.username,
    email: state.email,
    xAmznMarketplaceToken: state.decodedToken,
  });
  if (error.value) {
    state.isLoading = false;
    return;
  }
  state.isLoading = false;
  const { status, message } = data.value;
  if (status === StatusConstant.MarketplaceOnboarding.ACTIVE.value) {
    snackbarStore.setSuccess(t('__messageSignUpSuccessfully'), { timeout: 15 * 1000 });
    navigateTo('/');
    return;
  }
  snackbarStore.setFailure(message, { timeout: 15 * 1000 });
};

onMounted(() => {
  if (state.decodedToken) {
    const query = { ...route.query };
    delete query[X_AMZN_MARKETPLACE_TOKEN];

    navigateTo({
      path: route.path,
      query,
    }, { replace: true });
  }
});
</script>

<template>
  <div class="d-flex justify-center">
    <v-card
      :height="520"
      :width="500"
    >
      <v-card-title class="text-center">
        {{ $t('__titleWelcome') }}
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-form
          ref="formRef"
          @submit.prevent=""
        >
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldName')"
            required
          >
            <AppTextField
              :id="id"
              v-model="state.username"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .alphaDash()
                  .stringLengthLte(128)
                  .collect()
              )"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldEmail')"
            required
          >
            <AppTextField
              :id="id"
              v-model="state.email"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .email()
                  .collect()
              )"
            />
          </AppInputGroup>
        </v-form>
        <div class="d-flex justify-center align-center flex-column mt-8">
          <AppButton
            class="mb-8"
            width="100%"
            variant="flat"
            color="primary"
            :text="$t('__actionSignUp')"
            :loading="state.isLoading"
            :on-click="handleSignUp"
          />
          <v-divider
            class="mb-8"
            width="100%"
          />
          <p class="mb-2">
            {{ $t('__instructionSignIn') }}
          </p>
          <LayoutSignInButton width="100%" />
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>
