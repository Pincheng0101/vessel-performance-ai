<script setup>
import { SnackbarConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
</script>

<template>
  <v-snackbar
    v-if="snackbarStore.message"
    :color="snackbarStore.message.type"
    :timeout="snackbarStore.message.persistent ? -1 : (snackbarStore.message.timeout || 5 * 1000)"
    rounded="xs"
    model-value
    @update:model-value="snackbarStore.setMessage(null)"
  >
    <template v-if="snackbarStore.message.action">
      <template v-if="snackbarStore.message.type === SnackbarConstant.Type.SUCCESS">
        {{ strUtils.capitalize($t('__titleModifySuccessfully', { action: $t(snackbarStore.message.action, 2) }).toLowerCase()) }}
      </template>
      <template v-else>
        {{ strUtils.capitalize($t('__titleModifyFailed', { action: $t(snackbarStore.message.action) }).toLowerCase()) }}
      </template>
    </template>
    <template v-else>
      <AppMarkdown
        :text="snackbarStore.message.text"
        inline
      />
    </template>
    <template #actions>
      <AppIconButton
        icon="mdi-close"
        icon-color="white"
        size="small"
        @click="() => snackbarStore.setMessage(null)"
      />
    </template>
  </v-snackbar>
</template>

<style lang="scss" scoped>
:deep() {
  .markdown {
    a {
      color: inherit;
    }
    ul {
      padding-inline-start: 2rem;
      margin: 0;
    }
  }
}
</style>
