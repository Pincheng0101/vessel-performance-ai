<script setup>
import { StorageConstant } from '~/constants';

const props = defineProps({
  storageId: {
    type: String,
    default: null,
  },
  onMutate: {
    type: Function,
    default: null,
  },
});

const server = useServer();

const state = reactive({
  storage: null,
});

const fetchStorage = async () => {
  if (!props.storageId) return;
  const { data } = await server.storage.get({ storageId: props.storageId }, { lazy: false });
  state.storage = data.value || null;
};

fetchStorage();
</script>

<template>
  <AppDialog
    :width="1000"
    :persistent="false"
  >
    <template #activator="{ onOpen }">
      <v-fade-transition mode="out-in">
        <v-chip
          v-if="state.storage"
          class="bg-background"
          color="primaryLight"
          variant="text"
          @click="onOpen"
        >
          <div class="d-flex ga-1 align-center">
            <AppImageIcon
              :src="StorageConstant.Type.STORAGE.iconPath"
              width="16"
              height="16"
            />
            {{ state.storage.name }}
          </div>
        </v-chip>
      </v-fade-transition>
    </template>
    <template #body="{ onCancel }">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center ga-2 pa-4">
          <AppImageIcon
            :src="StorageConstant.Type.STORAGE.iconPath"
            width="20"
            height="20"
          />
          {{ state.storage.name }}
          <v-spacer />
          <AppIconButton
            icon="mdi-close"
            variant="text"
            @click="onCancel"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <ResourceStorageObjectList
            v-if="state.storage"
            :storage="state.storage"
            :initial-common-prefix="''"
            :on-mutate="props.onMutate"
            link-target="_blank"
            hide-details
            clearable
          />
        </v-card-text>
      </v-card>
    </template>
  </AppDialog>
</template>
