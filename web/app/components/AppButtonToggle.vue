<script setup>
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  elevation: {
    type: Number,
    default: 2,
  },
  buttonWidth: {
    // null renders auto-width buttons that collapse to their content.
    type: Number,
    default: 108,
  },
  dense: {
    // Beyond shrinking the buttons, also drops the filled active pill in
    // favour of a text-only active colour.
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: [String, Number],
  default: 0,
});
</script>

<template>
  <div class="d-flex align-center justify-center">
    <v-btn-toggle
      v-model="model"
      :elevation="props.elevation"
      mandatory
      rounded="xl"
    >
      <template
        v-for="item in props.items"
        :key="item.title"
      >
        <v-btn
          :aria-label="item.title"
          :disabled="item.disabled"
          :ripple="false"
          :value="item.value"
          :width="props.buttonWidth"
          :active-color="props.dense ? undefined : 'primary'"
          :class="['text-none', { 'app-button-toggle__btn--dense': props.dense }]"
        >
          <template v-if="item.icon">
            <v-icon
              :icon="item.icon"
              :size="16"
              :class="item.title ? 'mr-2' : ''"
            />
          </template>
          {{ item.title }}
          <AppTooltip
            v-if="item.tooltip"
            :text="item.tooltip"
            location="bottom"
            activator="parent"
          />
        </v-btn>
      </template>
    </v-btn-toggle>
  </div>
</template>

<style lang="scss" scoped>
.v-btn-group {
  height: 24px;
  // The theme palette defines no `surface`, so the group and its buttons fall
  // back to Vuetify's default dark surface (#212121), which clashes with the
  // dark theme. Paint the group with backgroundScale2 (white in light mode,
  // card background in dark mode) and make the buttons transparent so it shows
  // through. The non-dense active button keeps its primary fill: Vuetify's
  // `bg-primary` uses `!important`, which beats the transparent rule.
  background-color: rgb(var(--v-theme-backgroundScale2));
  :deep(.v-btn) {
    background-color: transparent;
  }
}
.app-button-toggle__btn--dense {
  min-width: 0;
  font-size: 12px;

  &.v-btn--active :deep(.v-btn__content) {
    color: rgb(var(--v-theme-primary));
  }
}
</style>
