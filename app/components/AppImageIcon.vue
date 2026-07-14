<script setup>
const { resolvePath } = useImagePath();

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  width: {
    type: [Number, String],
    default: 20,
  },
  height: {
    type: [Number, String],
    default: 20,
  },
  class: {
    type: String,
    default: 'mr-2',
  },
  tooltip: {
    type: String,
    default: '',
  },
  tooltipLocation: {
    type: String,
    default: 'bottom start',
  },
  maskColor: {
    type: String,
    default: '',
  },
  showShadow: {
    type: Boolean,
    default: true,
  },
});

const maskStyle = url => ({
  WebkitMask: `url(${url}) no-repeat center / contain`,
  mask: `url(${url}) no-repeat center / contain`,
});
</script>

<template>
  <div class="d-flex align-center justify-center">
    <template v-if="props.maskColor">
      <div
        class="svg-mask"
        :class="[props.class, `text-${props.maskColor}`]"
        :style="maskStyle(props.src)"
      />
    </template>
    <template v-else>
      <v-img
        :src="resolvePath(props.src)"
        alt="icon"
        aspect-ratio="1"
        :width="props.width"
        :height="props.height"
        :max-width="props.width"
        :max-height="props.height"
        :class="[props.class, { 'no-shadow': !props.showShadow }]"
      />
    </template>
    <AppTooltip
      v-if="props.tooltip"
      :text="props.tooltip"
      activator="parent"
      :location="props.tooltipLocation"
    />
  </div>
</template>

<style lang="scss" scoped>
.v-img {
  box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.1);
}
.v-img.no-shadow {
  box-shadow: none;
}
.svg-mask {
  width: v-bind('`${props.width}px`');
  height: v-bind('`${props.height}px`');
  display: inline-block;
  background-color: currentColor;
  vertical-align: middle;
}
</style>
