<script setup>
const server = useServer();
const { data, pending, refresh } = await server.authentication.adminGetUserPoolMfaConfig();
</script>

<template>
  <template v-if="pending">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <ResourceInfoTitle :title="$t('__titleAuthentication')" />
    <AccountAuthenticationPoolMfaCard
      v-if="data"
      :resource="data"
      :on-submit="refresh"
    />
  </template>
</template>
