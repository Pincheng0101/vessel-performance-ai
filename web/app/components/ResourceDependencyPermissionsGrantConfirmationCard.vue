<script setup>
import { AccountConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    required: true,
  },
});

const { isDefaultResource } = useResource();
const {
  dependencies,
  fetchDependencies,
} = useResourceDependency();

const state = reactive({
  isLoading: false,
});

const filteredDependencies = computed(() => {
  return dependencies.value.filter(dependency => !isDefaultResource(dependency));
});

const updateDependencies = async () => {
  state.isLoading = true;
  await fetchDependencies({
    resourceType: props.item.type,
    resourceId: props.item.id,
  });
  // For better visual experience
  await delay(1000);
  state.isLoading = false;
};

onMounted(() => {
  updateDependencies();
});
</script>

<template>
  <v-card v-if="props.item">
    <v-card-title>
      {{ $t('__actionGrantDependencyPermissions') }}
    </v-card-title>
    <v-divider />
    <v-card-text class="d-flex flex-column ga-4">
      <i18n-t
        keypath="__instructionGrantDependencyPermissions"
        tag="span"
      >
        <template #name>
          <span class="text-primary font-weight-bold">
            {{ props.item.resourceName || props.item.workflowName }}
          </span>
        </template>
        <template #permission>
          {{ findField(AccountConstant.AccessType, props.item.permission, 'title') }}
        </template>
      </i18n-t>
      <template v-if="state.isLoading">
        <AppProgressLinear
          :height="4"
          indeterminate
          :rounded="false"
          :message="$t('__messageSearchingDependencies')"
          class="mb-4"
        />
      </template>
      <template v-else>
        <template v-if="filteredDependencies.length > 0">
          <AppDisplayField
            :item="{
              value: filteredDependencies,
              table: {
                headers: [
                  { title: $t('__fieldName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(item.type, item.id), target: '_blank' }) },
                  { title: $t('__fieldId'), key: 'id' },
                  { title: $t('__fieldType'), key: 'type', value: item => $t(findField(ResourceConstant.Type, item.type, 'i18nTitle')), icon: item => findField(ResourceConstant.Type, item.type, 'icon'), iconPath: item => findField(ResourceConstant.Type, item.type, 'iconPath'), iconPathMaskColor: 'primary' },
                ],
              },
            }"
          />
        </template>
        <template v-else>
          <p>{{ $t('__instructionNoDependency', { item: $t(findField(ResourceConstant.Type, props.item.type, 'i18nTitle')) }) }}</p>
        </template>
      </template>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <AppButton
        :text="$t('__actionCancel')"
        :width="100"
        :disabled="props.loading"
        color="actionButton"
        @click="props.onCancel"
      />
      <AppButton
        :text="$t('__actionOk')"
        :width="100"
        :loading="props.loading"
        color="primary"
        @click="() => props.onSubmit(props.item)"
      />
    </v-card-actions>
  </v-card>
</template>
