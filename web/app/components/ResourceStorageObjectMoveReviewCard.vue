<script setup>
/**
 * @import { Storage } from '~/models/server/storage'
 */

/**
 * @type {{ storage: Storage }}
 */
const props = defineProps({
  storage: {
    type: Object,
    required: true,
  },
  commonPrefix: {
    type: String,
    required: true,
  },
  storageObjects: {
    type: Array,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  isLoading: false,
});

const handleMove = async () => {
  state.isLoading = true;
  await props.onSubmit();
  state.isLoading = false;
};
</script>

<template>
  <AppDetailsCard
    :title="$t('__titleModifyItem', { action: $t('__actionMove'), item: $t('__fieldFile', 2) })"
    :enabled-collapse="false"
  >
    <template #body>
      <p class="mb-6">
        <i18n-t
          keypath="__subtitleMoveFilesConfirm"
          tag="span"
        >
          <template #folderName>
            <span class="text-referencePathSuffix font-weight-bold">
              {{ pathUtils.extractLast(props.commonPrefix) || props.storage.name }}
            </span>
          </template>
        </i18n-t>
      </p>
      <AppDisplayFieldGroup
        :items="[
          {
            title: $t('__titleFolderPath'),
            value: `${props.storage.storageName}/${props.commonPrefix}`,
          },
          {
            title: `${$t('__fieldFile', 2)} (${props.storageObjects?.length})`,
            value: props.storageObjects,
            table: {
              headers: [
                { title: $t('__titleModifyItem', { action: $t('__fieldFile'), item: $t('__fieldName') }), key: 'name' },
              ],
            },
          },
        ]"
      />
      <v-sheet
        class="d-flex justify-end ga-2 mt-10"
        color="transparent"
      >
        <AppButton
          :text="$t('__actionCancel')"
          :width="100"
          color="actionButton"
          :disabled="state.isLoading"
          @click="props.onCancel"
        />
        <AppButton
          :text="$t('__actionMove')"
          :width="100"
          color="primary"
          :loading="state.isLoading"
          @click="handleMove"
        />
      </v-sheet>
    </template>
  </AppDetailsCard>
</template>
