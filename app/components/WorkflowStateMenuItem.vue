<script setup>
const { disabledNodeTypes } = useFeature();
const { t } = useI18n();

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  onDragStart: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  isDragging: false,
});

const disabled = computed(() => disabledNodeTypes.value.map(type => type.value).includes(props.item.type));
const displayLabel = computed(() => props.item.deprecated ? `${props.item.label} (${t('__labelDeprecated')})` : props.item.label);
</script>

<template>
  <v-card
    :draggable="!disabled"
    height="44"
    variant="flat"
    class="d-flex align-center justify-start bg-backgroundScale1"
    :class="[disabled ? 'cursor-not-allowed' : (state.isDragging ? 'cursor-grabbing' : 'cursor-grab')]"
    @dragstart="(e) => {
      state.isDragging = true;
      props.onDragStart(e);
    }"
    @dragend="() => {
      state.isDragging = false;
    }"
  >
    <v-card-text class="pl-0 pr-2 py-2 d-flex align-center justify-space-between w-100">
      <AppTitle
        :font-size="14"
        :icon-background="item.iconColor"
        :icon="item.icon"
        :icon-path="item.iconPath"
        :icon-path-mask-color="item.iconPathMaskColor"
        :text="displayLabel"
      >
        <template #prepend>
          <AppDragIcon :dragging="state.isDragging" />
        </template>
      </AppTitle>
      <v-icon
        v-if="disabled"
        icon="mdi-cancel"
        size="x-small"
        color="error"
        class="ml-2"
      />
    </v-card-text>
    <AppTooltip
      v-if="!state.isDragging"
      :text="disabled ? $t('__instructionNotEnabled', { item: item.label }) : item.tooltip"
      activator="parent"
      location="end"
      :width="200"
    />
  </v-card>
</template>
