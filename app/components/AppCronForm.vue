<script setup>
const props = defineProps({
  expression: {
    type: String,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  minutes: ['0'],
  hours: ['0'],
  dayOfMonth: ['*'],
  month: ['*'],
  dayOfWeek: ['?'],
  year: ['*'],
});

if (props.expression) {
  const start = props.expression.indexOf('(');
  const end = props.expression.lastIndexOf(')');
  const expression = props.expression.substring(start + 1, end);
  const [minutes, hours, dayOfMonth, month, dayOfWeek, year] = expression.split(' ');
  Object.assign(state, {
    minutes: minutes.split(','),
    hours: hours.split(','),
    dayOfMonth: dayOfMonth.split(','),
    month: month.split(','),
    dayOfWeek: dayOfWeek.split(','),
    year: year.split(','),
  });
}

const submit = async () => {
  const expression = [state.minutes, state.hours, state.dayOfMonth, state.month, state.dayOfWeek, state.year].join(' ');
  await props.onSubmit(strUtils.isEmpty(expression) ? null : `cron(${expression})`);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.expression ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldSyncJob') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldMinute', 2)"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.minutes"
          :items="['*', ...Array.from({ length: 60 }, (_, i) => i.toString())]"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldHour', 2)"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.hours"
          :items="['*', ...Array.from({ length: 24 }, (_, i) => i.toString())]"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldDayOfMonth')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.dayOfMonth"
          :items="['*', ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()), '?', 'L', 'W']"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldMonth')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.month"
          :items="['*', ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())]"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldDayOfWeek')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.dayOfWeek"
          :items="['*', ...Array.from({ length: 7 }, (_, i) => (i + 1).toString()), '?', 'L', '#']"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldYear')"
        required
      >
        <AppCombobox
          :id="id"
          v-model="state.year"
          :items="['*']"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
