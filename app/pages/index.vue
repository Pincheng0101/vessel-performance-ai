<script setup>
definePageMeta({
  layout: 'centered',
  middleware: [
    'guest',
  ],
});
</script>

<template>
  <v-sheet
    color="transparent"
    :max-width="600"
    class="d-flex flex-column align-center ga-8 pa-4"
  >
    <p class="text-h4 font-weight-bold">
      {{ $t('__titleWelcome') }}
    </p>
    <p class="text-center text-body-1">
      {{ $t('__titleWelcomeDescription') }}
    </p>
    <v-sheet
      color="transparent"
      :max-width="300"
      class="w-100"
    >
      <LayoutSignInButton
        :text="$t('__actionContinue')"
        width="100%"
        class="primary-gradient"
      />
    </v-sheet>
  </v-sheet>
</template>
