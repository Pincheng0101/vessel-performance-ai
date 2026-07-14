<script setup>
const props = defineProps({
  prependIcon: {
    type: String,
    default: 'mdi-information-outline',
  },
  title: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    default: 200,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
});

const { openInNewTab } = useNavigation();

const state = reactive({
  isOpen: false,
});
</script>

<template>
  <v-menu
    v-model="state.isOpen"
    :close-on-content-click="false"
    @update:model-value="(v) => state.isOpen = v"
  >
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        variant="text"
        :icon="state.isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        :ripple="false"
      />
    </template>
    <v-card
      :elevation="1"
      :width="props.width"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <div>
          <v-list-item
            class="text-body-2"
            :prepend-icon="props.prependIcon"
            :disabled="props.disabled"
            @click="() => {
              openInNewTab(props.path);
              state.isOpen = false;
            }"
          >
            {{ props.title }}
          </v-list-item>
          <AppTooltip
            v-if="props.disabled && props.disabledTooltip"
            :text="props.disabledTooltip"
            activator="parent"
            location="end"
          />
        </div>
      </v-list>
    </v-card>
  </v-menu>
</template>
