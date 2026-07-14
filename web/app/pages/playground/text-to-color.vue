<script setup>
definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  text: null,
  seed: 0,
});
</script>

<template>
  <ResourceInfoTitle
    title="Text to Color"
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
            :label="$t('__fieldText')"
            required
          >
            <AppTextField
              :id="id"
              v-model.string="state.text"
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
            :label="$t('__fieldSeed')"
          >
            <AppTextField
              :id="id"
              v-model.number="state.seed"
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
          <AppInputGroup :label="$t('__fieldColor')">
            <template v-if="state.text">
              <v-sheet
                :color="colorUtils.textToColorCode(state.text, state.seed)"
                :height="152"
                rounded="lg"
                class="w-100 d-flex align-center ga-1 justify-center text-subtitle-1"
                :class="`text-${colorUtils.computeTextColor(colorUtils.textToColorCode(state.text, state.seed))}`"
              >
                {{ colorUtils.textToColorCode(state.text, state.seed) }}
                <AppCopyable :text="colorUtils.textToColorCode(state.text, state.seed)">
                  <template #default="{ copy }">
                    <AppIconButton
                      icon="mdi-content-copy"
                      variant="text"
                      icon-size="default"
                      :icon-color="colorUtils.computeTextColor(colorUtils.textToColorCode(state.text, state.seed))"
                      :on-click="copy"
                    />
                  </template>
                </AppCopyable>
              </v-sheet>
            </template>
            <template v-else>
              <v-sheet
                :height="152"
                border
                color="transparent"
                rounded="lg"
              />
            </template>
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
