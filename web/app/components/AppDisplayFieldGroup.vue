<script setup>
/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

/**
 * @type {{ items: DisplayField[] }}
 */
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  cols: {
    type: Number,
    default: 12,
  },
  hideLabel: {
    type: Boolean,
    default: false,
  },
  direction: {
    type: String,
    default: 'vertical',
  },
});

const { $vuetify } = useNuxtApp();

const cols = computed(() => ($vuetify.display.xs.value || props.items.length === 1) ? 12 : props.cols);

const chunkedItems = computed(() => {
  const items = props.items.filter(item => !item.isHidden);
  const chunkSize = Math.ceil(items.length / (12 / cols.value));
  return Array.from({ length: (12 / cols.value) }, (_, i) =>
    items.slice(i * chunkSize, i * chunkSize + chunkSize),
  );
});
</script>

<template>
  <template v-if="props.direction === 'vertical'">
    <v-row>
      <v-col
        v-for="(chunk, i) in chunkedItems"
        :key="i"
        :cols="cols"
      >
        <v-row>
          <template
            v-for="item in chunk"
            :key="item.title"
          >
            <template v-if="!item.isHidden">
              <v-col :cols="12">
                <template v-if="!props.hideLabel">
                  <AppDisplayLabel :label="item.title" />
                </template>
                <div class="d-flex align-center">
                  <AppDisplayField :item="item" />
                  <slot
                    v-if="$slots.append"
                    name="append"
                    :item="item"
                  />
                </div>
              </v-col>
            </template>
          </template>
        </v-row>
      </v-col>
    </v-row>
  </template>
  <template v-else>
    <v-row>
      <template
        v-for="(item, i) in props.items"
        :key="i"
      >
        <v-col
          v-if="!item.isHidden"
          :cols="4"
        >
          <template v-if="!props.hideLabel">
            <AppDisplayLabel :label="item.title" />
          </template>
          <div class="d-flex align-center">
            <AppDisplayField :item="item" />
            <slot
              v-if="$slots.append"
              name="append"
              :item="item"
            />
          </div>
        </v-col>
      </template>
    </v-row>
  </template>
</template>
