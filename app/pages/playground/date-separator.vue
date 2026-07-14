<script setup>
definePageMeta({
  layout: 'fluid',
});

const dayjs = useDayjs();

const state = reactive({
  dates: null,
});

const fakeDates = Array.from({ length: 365 }, (_, index) => {
  return dayjs().subtract(index, 'day').format('YYYY-MM-DD');
});

state.dates = fakeDates;
</script>

<template>
  <ResourceInfoTitle
    title="Date Separator"
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
            v-slot="{ id }"
            :label="$t('__fieldInput')"
          >
            <AppJsonEditor
              :id="id"
              v-model:object="state.dates"
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
          <AppInputGroup :label="$t('__fieldOutput')">
            <template v-if="state.dates">
              <v-card class="bg-background">
                <v-list
                  max-height="50vh"
                  class="pa-0"
                >
                  <template
                    v-for="(item, i) in state.dates"
                    :key="i"
                  >
                    <AppDateSeparator
                      :dates="state.dates"
                      :index="i"
                      class="pl-4"
                    />
                    <v-list-item>
                      {{ item }}
                    </v-list-item>
                  </template>
                </v-list>
              </v-card>
            </template>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
