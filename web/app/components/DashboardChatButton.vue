<script setup>
// Header chat launcher, visible on every dashboard tab (mounted in the layout, not a tab
// component). Gradient is the familiar blue -> purple -> pink "Copilot" treatment (an
// intentional exception to the rest of the dashboard's restrained palette).
const model = defineModel({
  type: Boolean,
  default: false,
});
</script>

<template>
  <v-btn
    class="chat-button text-none"
    prepend-icon="mdi-creation-outline"
    rounded="pill"
    height="32"
    variant="text"
    @click="model = true"
  >
    YM Copilot
  </v-btn>
</template>

<style lang="scss" scoped>
.chat-button {
  --chat-gradient: linear-gradient(135deg, #5b8def 0%, rgb(var(--v-theme-primary)) 50%, #f0a0b8 100%);

  border: 2px solid transparent;
  border-radius: 9999px;
  // Two background layers: an inner solid fill matching the app bar (clipped to padding-box,
  // i.e. inside the border) sits over the gradient (clipped to border-box, i.e. including the
  // border) — the visible sliver of the outer layer is what reads as a gradient ring.
  background:
    linear-gradient(rgb(var(--v-theme-background)), rgb(var(--v-theme-background))) padding-box,
    var(--chat-gradient) border-box;
  box-shadow: 0 0 6px 2px rgba(var(--v-theme-primary), 0.4);

  // The icon and label text don't just inherit color from .chat-button — Vuetify sets its own
  // color (from the surrounding theme, e.g. near-black in light mode) directly on
  // .v-btn__content and .v-icon, which wins over an inherited value regardless of !important
  // on this ancestor. Painting the same gradient through the glyphs/text (clipped to their own
  // shape, color made transparent so the gradient shows through) needs the same override.
  :deep(.v-icon),
  :deep(.v-btn__content) {
    background: var(--chat-gradient);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent !important;
  }
}
</style>
