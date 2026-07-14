<script setup>
definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  data: null,
  intervalDuration: 500,
  mismatchCount: 0,
  compareCount: 0,
  compareHistory: [],
});

const compare = (isMatch) => {
  state.mismatchCount += isMatch ? 0 : 1;
  state.compareCount += 1;
  state.compareHistory.unshift({
    isMatch,
    mismatchCount: state.mismatchCount,
    compareCount: state.compareCount,
    timestamp: new Date(),
  });
  if (state.compareHistory.length > 10) {
    state.compareHistory.pop();
  }
};
</script>

<template>
  <ResourceInfoTitle
    title="Data Comparer"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldData')"
            required
          >
            <AppTextarea
              :id="id"
              v-model.string="state.data"
              fill-height
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .collect()
              )"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldIntervalDuration')"
          >
            <AppTextField
              :id="id"
              v-model.integer="state.intervalDuration"
              type="number"
              fill-height
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <AppDataComparer
            :key="state.intervalDuration"
            v-model="state.data"
            :interval-duration="state.intervalDuration"
            :on-compare="compare"
          />
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldHistory')"
          >
            <AppJsonEditor
              :id="id"
              v-model:object="state.compareHistory"
              fill-height
              readonly
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
