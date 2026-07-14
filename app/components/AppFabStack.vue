<template>
  <div class="fab-stack position-fixed d-flex flex-column align-items-end ga-3">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.fab-stack {
  right: 20px;
  bottom: 20px;
  z-index: 1005; // Footer index + 1
}
</style>
