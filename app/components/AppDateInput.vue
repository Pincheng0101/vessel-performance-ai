<script setup>
import { DateConstant } from '~/constants';

const props = defineProps({
  rules: {
    type: Array,
    default: () => [],
  },
});

const PICKER_WIDTH = 328;

const model = defineModel({
  type: Date,
  default: null,
});

const state = reactive({
  isEnabled: false,
});

const dayjs = useDayjs();

const formattedDate = computed(() => model.value ? dayjs(model.value).format(DateConstant.Format.FULL_DATE) : '');

const handleInput = (event) => {
  if (dayjs(event.target.value, DateConstant.Format.FULL_DATE, true).isValid()) {
    model.value = dayjs(event.target.value, DateConstant.Format.FULL_DATE).toDate();
  }
};
</script>

<template>
  <v-menu
    v-model="state.isEnabled"
    transition="scale-transition"
    :close-on-content-click="false"
    :min-width="PICKER_WIDTH"
  >
    <template #activator="{ props: p }">
      <AppTextField
        v-bind="p"
        :model-value="formattedDate"
        :rules="props.rules"
        :placeholder="DateConstant.Format.FULL_DATE"
        @input="handleInput"
      />
    </template>
    <v-date-picker
      v-model="model"
      color="primary"
      no-title
      hide-header
      @update:model-value="state.isEnabled = false"
    />
  </v-menu>
</template>
