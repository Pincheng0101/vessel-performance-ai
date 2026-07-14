<script setup>
const props = defineProps({
  for: {
    type: String,
    default: undefined, // To avoid browser warning
  },
  label: {
    type: String,
    default: null,
  },
  required: {
    type: Boolean,
    default: false,
  },
  tooltip: {
    type: String,
    default: null,
  },
  persistentRightSlot: {
    type: Boolean,
    default: false,
  },
  hint: {
    type: String,
    default: null,
  },
  bordered: {
    type: Boolean,
    default: false,
  },
  class: {
    type: String,
    default: '',
  },
});

// Provide label to child editor components so they can use it as the dialog title automatically
provide('inputGroupLabel', computed(() => props.label));

const id = computed(() => {
  if (!props.label) return undefined;
  return `${props.label.replaceAll(' ', '')}-${strUtils.generateRandom(6)}`;
});
</script>

<template>
  <div :aria-label="$t('__titleInputGroup', { prefix: label })">
    <v-hover v-slot="{ isHovering, props: p }">
      <div v-bind="p">
        <AppInputLabel
          v-if="props.label"
          :for="id"
          :label="props.label"
          :required="props.required"
          :tooltip="props.tooltip"
        >
          <template
            v-if="$slots.right"
            #right
          >
            <v-fade-transition mode="out-in">
              <div
                v-if="props.persistentRightSlot || isHovering"
                class="d-flex align-center ga-1"
              >
                <slot
                  :id="id"
                  name="right"
                />
              </div>
            </v-fade-transition>
          </template>
        </AppInputLabel>
        <template v-if="props.hint">
          <AppMarkdown
            :text="props.hint"
            inline
            class="mb-1"
          />
        </template>
        <div
          :class="{
            [props.class]: true,
            bordered: props.bordered,
          }"
        >
          <slot
            :id="id"
            :label="props.label"
          />
        </div>
      </div>
    </v-hover>
  </div>
</template>

<style lang="scss" scoped>
.bordered {
  padding: 12px;
  padding-bottom: 0;
  margin-bottom: 24px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
