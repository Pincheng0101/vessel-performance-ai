<script setup>
import { ResourceConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  itemLabel: {
    type: String,
    required: true,
  },
  successDependencies: {
    type: Array,
    default: () => [],
  },
  failedDependencies: {
    type: Array,
    default: () => [],
  },
  onClose: {
    type: Function,
    default: () => {},
  },
});

const { isDefaultResource } = useResource();

const filteredSuccessDependencies = computed(() => {
  return props.successDependencies.filter(dependency => dependency.id !== props.item.id);
});

const filteredFailedDependencies = computed(() => {
  return props.failedDependencies.filter(dependency => !isDefaultResource(dependency));
});
</script>

<template>
  <v-card>
    <v-card-title>
      {{ $t('__titleDeleteDependencies', { name: props.item.name, item: props.itemLabel.toLowerCase() }) }}
    </v-card-title>
    <v-divider />
    <v-card-text>
      <div class="d-flex flex-column ga-3">
        <p>
          {{ $t(filteredSuccessDependencies.length > 0 ? '__titleDeleteDependenciesSuccessfully' : '__titleNoDependenciesDeleteSuccessfully') }}
        </p>
        <template v-if="filteredSuccessDependencies.length > 0">
          <AppDisplayField
            :item="{
              value: filteredSuccessDependencies,
              table: {
                headers: [
                  { title: $t('__fieldName'), key: 'name' },
                  { title: $t('__fieldId'), key: 'id' },
                  { title: $t('__fieldType'), key: 'type', value: item => $t(findField(ResourceConstant.Type, item.type, 'i18nTitle')), icon: item => findField(ResourceConstant.Type, item.type, 'icon'), iconPath: item => findField(ResourceConstant.Type, item.resourceType, 'iconPath'), iconPathMaskColor: 'primary' },
                ],
              },
            }"
          />
        </template>
        <p>
          {{ $t(filteredFailedDependencies.length > 0 ? '__titleDeleteDependenciesFailed' : '__titleNoDependenciesDeleteFailed') }}
        </p>
        <template v-if="filteredFailedDependencies.length > 0">
          <AppDisplayField
            :item="{
              value: filteredFailedDependencies,
              table: {
                headers: [
                  { title: $t('__fieldName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(item.type, item.id), target: '_blank' }) },
                  { title: $t('__fieldId'), key: 'id' },
                  { title: $t('__fieldType'), key: 'type', value: item => $t(findField(ResourceConstant.Type, item.type, 'i18nTitle')), icon: item => findField(ResourceConstant.Type, item.type, 'icon'), iconPath: item => findField(ResourceConstant.Type, item.resourceType, 'iconPath'), iconPathMaskColor: 'primary' },
                ],
              },
            }"
          />
        </template>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <AppButton
        :text="$t('__actionOk')"
        color="primary"
        :width="100"
        @click="props.onClose"
      />
    </v-card-actions>
  </v-card>
</template>
