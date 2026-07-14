<script setup>
/**
 * @type {{ item: DisplayField[] }}
 */
const props = defineProps({
  displayFields: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: null,
  },
  cols: {
    type: Number,
    default: 6,
  },
  enableCollapse: {
    type: Boolean,
    default: true,
  },
  cardTextClass: {
    type: String,
    default: '',
  },
});

const isExpanded = ref(true);
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center ga-1">
      <v-icon
        v-if="props.icon"
        :icon="props.icon"
        color="primary"
        size="small"
        class="mr-1"
      />
      {{ props.title || $t('__titleDetails') }}
      <v-spacer />
      <slot
        v-if="$slots['prepend-actions']"
        name="prepend-actions"
      />
      <slot
        v-if="$slots.actions"
        name="actions"
      />
      <slot
        v-if="$slots['append-actions']"
        name="append-actions"
      />
      <template v-if="props.enableCollapse">
        <AppIconButton
          :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          variant="text"
          :ripple="false"
          @click="isExpanded = !isExpanded"
        />
      </template>
    </v-card-title>
    <v-divider v-if="isExpanded" />
    <v-expand-transition>
      <v-card-text
        v-show="isExpanded"
        class="opacity-1"
        :class="{
          'opacity-0 pa-0': !isExpanded,
          [props.cardTextClass]: true,
        }"
      >
        <slot
          v-if="$slots.body"
          name="body"
        />
        <template v-else>
          <AppDisplayFieldGroup
            :items="props.displayFields"
            :cols="props.cols"
          />
        </template>
        <slot
          v-if="$slots['append-display-fields']"
          name="append-display-fields"
        />
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>
