<script setup>
/**
 * @import { Group } from '~/models/server/group'
 */

/**
 * @type {Ref<Group>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AccountGroupPaginatedSelect
    v-model="formData.groupName"
    :return-object="false"
    required
  />
</template>
