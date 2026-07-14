<script setup>
const state = reactive({
  isVisible: false,
});

const handleScroll = () => {
  state.isVisible = window.scrollY > 100;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  handleScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <AppFab
    v-if="state.isVisible"
    icon="mdi-chevron-up"
    color="actionButton"
    :on-click="() => scrollUtils.scrollTo()"
  />
</template>
