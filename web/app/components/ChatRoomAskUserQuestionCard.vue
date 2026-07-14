<script setup>
const props = defineProps({
  payload: {
    type: Object,
    required: true,
  },
  submitted: {
    type: Boolean,
    default: false,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  selections: Object.fromEntries(
    props.payload.questions.map(q => [
      q.id,
      q.options ? (q.multiSelect ? [] : null) : null,
    ]),
  ),
  texts: Object.fromEntries(
    props.payload.questions.map(q => [q.id, '']),
  ),
});

const isOptionSelected = (questionId, label) => {
  const selection = state.selections[questionId];
  if (Array.isArray(selection)) return selection.includes(label);
  return selection === label;
};

const toggleOption = (question, label) => {
  if (props.submitted) return;
  if (question.multiSelect) {
    const arr = state.selections[question.id];
    if (arr.includes(label)) {
      state.selections[question.id] = arr.filter(l => l !== label);
      return;
    }
    state.selections[question.id] = [...arr, label];
    return;
  }
  state.selections[question.id] = state.selections[question.id] === label ? null : label;
};

const handleSubmit = () => {
  const items = props.payload.questions.map((q) => {
    const selection = state.selections[q.id];
    const selections = Array.isArray(selection)
      ? selection
      : (selection ? [selection] : []);
    const text = state.texts[q.id]?.trim() || null;
    const parts = [...selections, ...(text ? [text] : [])];
    return {
      header: q.header,
      question: q.question,
      selections,
      text,
      backendAnswer: parts.length > 0 ? parts.join(', ') : null,
    };
  });
  props.onSubmit(items);
};
</script>

<template>
  <v-card class="pa-5 mb-6">
    <div class="d-flex flex-column ga-6">
      <div
        v-for="question in props.payload.questions"
        :key="question.id"
        class="d-flex flex-column ga-6"
      >
        <div>
          <div class="d-flex flex-column ga-1 mb-4">
            <div class="text-h6 font-weight-bold">
              {{ question.header }}
            </div>
            <v-divider />
          </div>
          <p class="mb-3">
            {{ question.question }}
          </p>
          <template v-if="question.options">
            <div class="d-flex flex-column ga-2">
              <v-card
                v-for="option in question.options"
                :key="option.label"
                variant="flat"
                class="option-card px-4 py-2"
                :class="{
                  'option-card--selected': isOptionSelected(question.id, option.label),
                  'option-card--locked': props.submitted,
                }"
                @click="toggleOption(question, option.label)"
              >
                <div class="d-flex align-center ga-3">
                  <v-icon
                    :icon="question.multiSelect
                      ? (isOptionSelected(question.id, option.label) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline')
                      : (isOptionSelected(question.id, option.label) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank')"
                    :color="isOptionSelected(question.id, option.label) ? 'primary' : 'default'"
                    size="small"
                  />
                  <div>
                    <p class="font-weight-medium">
                      {{ option.label }}
                    </p>
                    <p class="text-medium-emphasis text-caption">
                      {{ option.description }}
                    </p>
                  </div>
                </div>
              </v-card>
            </div>
          </template>
        </div>
        <AppTextarea
          v-if="!(props.submitted && question.options && !state.texts[question.id])"
          v-model="state.texts[question.id]"
          :max-rows="10"
          :placeholder="question.options ? $t('__messageEnterAnotherAnswer') : ''"
          :readonly="props.submitted"
          :rows="5"
          auto-grow
          density="compact"
          hide-details
          no-resize
          variant="outlined"
        />
      </div>
      <template v-if="!props.submitted">
        <div class="d-flex justify-end">
          <AppButton
            :text="$t('__actionSubmit')"
            color="primary"
            variant="flat"
            @click="handleSubmit"
          />
        </div>
      </template>
    </div>
  </v-card>
</template>

<style lang="scss" scoped>
.option-card {
  border-radius: 16px;
  background-color: rgba(var(--v-theme-backgroundScale1), 0.5);
  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.25);
  }
}
.option-card--selected {
  &, &:hover {
    background-color: rgba(var(--v-theme-primary), 0.25);
  }
}
.option-card--locked {
  pointer-events: none;
}
</style>
