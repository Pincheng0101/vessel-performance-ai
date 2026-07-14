<script setup>
definePageMeta({
  layout: 'fluid',
});

import { SnackbarConstant } from '~/constants';
import { ProgressBoardItem } from '~/models/ui/progressBoard';
import { Step } from '~/models/ui/stepper';

const snackbarStore = useSnackbarStore();
const {
  enableConfirmation,
  disableConfirmation,
} = useLeaveConfirmation();

const form1 = ref(null);
const form2 = ref(null);
const form3 = ref(null);

const PROGRESS_BOARD_ITEM_KEY = Object.freeze({
  GREETING_SETUP: 'greeting_setup',
  STORAGE_SETUP: 'storage_setup',
  FILE_UPLOAD: 'file_upload',
  KNOWLEDGE_BASE_SETUP: 'knowledge_base_setup',
  LOADER_SETUP: 'loader_setup',
  AGENT_SETUP: 'agent_setup',
});

const state = reactive({
  refreshStepper: 0,
  step: 1,
  name: '',
  greeting: '',
  files: [],
  demonstrateErrorInStep1: false,
  demonstrateErrorInStep3: false,
});

const stepperConfig = computed(() => {
  return [
    new Step({
      value: 1,
      title: 'Step 1',
      subtitle: 'Skip error on next',
      progressBoardItems: [
        new ProgressBoardItem({
          key: PROGRESS_BOARD_ITEM_KEY.GREETING_SETUP,
          title: 'Greeting Setup',
          subtitle: 'Generating a greeting message based on the provided name.',
        }),
      ],
      onValidate: async () => {
        if (!(await form1.value.validate()).valid) {
          throw new Error('Complete the required fields to continue');
        }
      },
      onNext: async () => {
        await generateGreeting(state.name);
        if (state.greeting.trim() === '') {
          snackbarStore.setMessage({
            type: SnackbarConstant.Type.WARNING,
            text: 'We couldn’t generate the greeting message automatically. You can go back to the previous step and try again, or manually enter the greeting to continue.',
            persistent: true,
          });
        }
      },
    }),
    new Step({
      value: 2,
      title: 'Step 2',
      subtitle: 'Without api calls',
      onValidate: async () => {
        if (!(await form2.value.validate()).valid) {
          throw new Error('Complete the required fields to continue');
        }
      },
    }),
    new Step({
      value: 3,
      title: 'Step 3',
      subtitle: 'Multiple progress items with retry',
      progressBoardItems: [
        new ProgressBoardItem({
          key: PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP,
          title: 'Storage Setup',
          subtitle: 'Preparing storage to organize and manage your dataset.',
          errorMessage: 'Failed to create.',
          onRun: setupStorage,
        }),
        new ProgressBoardItem({
          key: PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD,
          title: 'File Upload',
          subtitle: 'Uploading your dataset files to the storage.',
          errorMessage: 'Failed to upload.',
          onRun: uploadFiles,
        }),
        new ProgressBoardItem({
          key: PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP,
          title: 'Knowledge Base Setup',
          subtitle: 'Creating a knowledge base to store and retrieve information from your dataset.',
          errorMessage: 'Failed to create.',
          onRun: setupKnowledgeBase,
        }),
        new ProgressBoardItem({
          key: PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP,
          title: 'Loader Setup',
          subtitle: 'Configuring data loaders to efficiently process and access your dataset.',
          errorMessage: 'Failed to create.',
          onRun: setupLoader,
        }),
        new ProgressBoardItem({
          key: PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP,
          title: 'Agent Setup',
          subtitle: 'Setting up an agent to interact with your dataset and perform tasks.',
          errorMessage: 'Failed to create.',
          onRun: setupAgent,
        }),
      ],
      onValidate: async () => {
        if (!(await form3.value.validate()).valid) {
          throw new Error('Upload dataset to continue');
        }
      },
      onNext: async () => {
        await setupStorage();
        await uploadFiles();
        await setupKnowledgeBase();
        await setupLoader();
        await setupAgent();
        disableConfirmation();
      },
    }),
    new Step({
      value: 4,
      title: 'Step 4',
      subtitle: 'Summary',
      hideButtons: true,
    }),
  ];
});

const {
  steps,
  setStatusProcessing,
  setStatusSucceeded,
  setStatusFailed,
} = useStepper(stepperConfig);

const generateGreeting = async (name) => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.GREETING_SETUP);
  await delay(2000);
  if (state.demonstrateErrorInStep1) {
    state.greeting = '';
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.GREETING_SETUP);
    return;
  }
  state.greeting = `Hello, ${name}! Welcome to the stepper playground.`;
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.GREETING_SETUP);
};

const setupStorage = async () => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP);
  await delay(2000);
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.STORAGE_SETUP);
};

const uploadFiles = async () => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD);
  await delay(3000);
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.FILE_UPLOAD);
  return;
};

const setupKnowledgeBase = async () => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP);
  await delay(2000);
  if (state.demonstrateErrorInStep3) {
    setStatusFailed(PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP);
    throw new Error('Something went wrong please rerun to continue');
  }
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.KNOWLEDGE_BASE_SETUP);
};

const setupLoader = async () => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP);
  await delay(2000);
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.LOADER_SETUP);
};

const setupAgent = async () => {
  setStatusProcessing(PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP);
  await delay(2000);
  setStatusSucceeded(PROGRESS_BOARD_ITEM_KEY.AGENT_SETUP);
};

enableConfirmation();
</script>

<template>
  <v-row>
    <v-col
      :cols="12"
      :sm="3"
    >
      <AppForm :form-title="$t('__actionConfigure')">
        <template #body>
          <div class="d-flex align-center justify-start ga-2">
            <AppInputLabel
              label="Demonstrate error in Step 1"
              class="mb-0"
            />
            <AppSwitch
              v-model="state.demonstrateErrorInStep1"
              hide-details
              size="xx-small"
            />
          </div>
          <div class="d-flex align-center justify-start ga-2">
            <AppInputLabel
              label="Demonstrate error in Step 3"
              class="mb-0"
            />
            <AppSwitch
              v-model="state.demonstrateErrorInStep3"
              hide-details
              size="xx-small"
            />
          </div>
          <AppButton
            text="Start Over"
            prepend-icon="mdi-refresh"
            class="mt-4"
            width="140"
            color="primary"
            @click="() => {
              state.refreshStepper += 1;
              state.step = 1;
              state.name = '';
              state.greeting = '';
              state.files = [];
              state.demonstrateErrorInStep1 = false;
              state.demonstrateErrorInStep3 = false;
              enableConfirmation();
            }"
          />
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="9"
    >
      <AppStepper
        :key="state.refreshStepper"
        v-model="state.step"
        :steps="steps"
        stepper-title="Stepper"
        icon="mdi-step-forward"
        is-previous-steps-disabled-on-final-step
      >
        <template #step-content-1>
          <v-form
            ref="form1"
            @submit.prevent=""
          >
            <AppInputGroup
              v-slot="{ id, label }"
              label="Name"
              required
            >
              <AppTextField
                :id="id"
                v-model="state.name"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              />
            </AppInputGroup>
          </v-form>
        </template>
        <template #step-content-2>
          <v-form
            ref="form2"
            @submit.prevent=""
          >
            <AppInputGroup
              v-slot="{ id, label }"
              label="Greeting Message"
              required
            >
              <AppTextarea
                :id="id"
                v-model="state.greeting"
                :rows="4"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              />
            </AppInputGroup>
          </v-form>
        </template>
        <template #step-content-3>
          <v-form
            ref="form3"
            @submit.prevent=""
          >
            <AppInputGroup
              v-slot="{ id, label }"
              label="Upload Dataset"
              required
            >
              <AppFileTable
                :id="id"
                v-model="state.files"
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              >
                <template #edit-form="{ item, onSubmit, onDiscard }">
                  <ResourceStorageObjectEditForm
                    :form-data="item"
                    :on-submit="(formData) => onSubmit(fileUtils.rename(item, formData.name))"
                    :on-discard="onDiscard"
                  />
                </template>
              </AppFileTable>
            </AppInputGroup>
          </v-form>
        </template>
        <template #step-content-4>
          <AppInfoCard
            title="All Done!"
            instruction="Congrats! All steps are completed."
            icon="mdi-check-circle"
          >
            <template #actions>
              <AppButton
                text="Take me to homepage"
                size="large"
                class="px-4"
                color="primary"
                prepend-icon="mdi-home-circle"
                @click="() => navigateTo('/')"
              />
            </template>
          </AppInfoCard>
        </template>
      </AppStepper>
    </v-col>
  </v-row>
</template>
