<script setup>
definePageMeta({
  layout: 'fluid',
});

const dayjs = useDayjs();

const state = reactive({
  hours: 0,
  minutes: 0,
  seconds: 0,
  remainingMilliseconds: 0,
  refresh: 0,
});

const start = () => {
  if (state.hours === 0 && state.minutes === 0 && state.seconds === 0) return;
  state.refresh += 1;
  state.remainingMilliseconds = dayjs.duration({
    hours: state.hours,
    minutes: state.minutes,
    seconds: state.seconds,
  }).asMilliseconds();
};
</script>

<template>
  <ResourceInfoTitle
    title="Countdown Timer"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm
        ref="form"
        :form-title="$t('__fieldInput')"
      >
        <template #body>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldHour', 2)"
          >
            <AppTextField
              :id="id"
              v-model.integer="state.hours"
              type="number"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldMinute', 2)"
          >
            <AppTextField
              :id="id"
              v-model.integer="state.minutes"
              type="number"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldSecond', 2)"
          >
            <AppTextField
              :id="id"
              v-model.integer="state.seconds"
              type="number"
            />
          </AppInputGroup>
          <AppButton
            :text="$t('__actionStart')"
            color="primary"
            @click="start"
          />
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <AppInputGroup :label="$t('__fieldRemainingTime')">
            <AppCountdownTimer
              :key="state.refresh"
              :milliseconds="state.remainingMilliseconds"
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
