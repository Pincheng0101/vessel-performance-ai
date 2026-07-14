<script setup>
import { ResourceConstant } from '~/constants';

const props = defineProps({
  actionLabel: {
    type: String,
    default: null,
  },
  instruction: {
    type: String,
    default: null,
  },
  instructionKeypath: {
    type: String,
    default: null,
  },
  item: {
    type: Object,
    default: null,
  },
  items: {
    type: Array,
    default: () => [],
  },
  itemLabel: {
    type: String,
    required: true,
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
  allowDeleteRecursively: {
    type: Boolean,
    default: false,
  },
  onFetchDependencies: {
    type: Function,
    default: () => {},
  },
});

const { isDefaultResource } = useResource();
const {
  dependencies,
  fetchDependencies,
} = useResourceDependency();

const deleteRecursively = defineModel('deleteRecursively', {
  type: Boolean,
  default: false,
});

const state = reactive({
  isLoading: false,
});

const filteredDependencies = computed(() => {
  return dependencies.value.filter(dependency => !isDefaultResource(dependency));
});

const updateDependencies = async () => {
  state.isLoading = true;
  await fetchDependencies({
    resourceType: props.item.resourceType,
    resourceId: props.item.id,
  });
  // For better visual experience
  await delay(1000);
  state.isLoading = false;
};

const handleDeleteRecursivelyChange = (v) => {
  if (!v) return;
  updateDependencies();
};

onBeforeUnmount(() => {
  deleteRecursively.value = false;
});
</script>

<template>
  <v-card v-if="props.item || props.items?.length > 0">
    <v-card-title>
      {{ strUtils.addSpacesAroundAscii($t('__titleModifyItem', { action: props.actionLabel || $t('__actionDelete'), item: props.itemLabel })) }}
    </v-card-title>
    <v-divider />
    <v-card-text class="d-flex flex-column ga-4">
      <template v-if="props.item">
        <template v-if="props.instruction">
          {{ props.instruction }}
        </template>
        <template v-else>
          <i18n-t
            :keypath="props.instructionKeypath || '__instructionDelete'"
            tag="span"
          >
            <template #name>
              <span class="text-primary font-weight-bold">
                {{ props.item.name }}
              </span>
            </template>
            <template #item>
              {{ props.itemLabel }}
            </template>
          </i18n-t>
        </template>
        <template v-if="props.allowDeleteRecursively">
          <AppInputGroup
            bordered
            class="d-flex flex-column ga-3 pb-3"
          >
            <AppInputGroup
              v-slot="{ id }"
              :label="$t('__fieldDeleteDependencies')"
              :tooltip="$t('__tooltipDeleteDependencies')"
            >
              <AppSwitch
                :id="id"
                v-model="deleteRecursively"
                hide-details
                @update:model-value="(v) => handleDeleteRecursivelyChange(v)"
              />
            </AppInputGroup>
            <template v-if="deleteRecursively">
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
                  {{ $t('__instructionDeleteDependencies', { item: props.itemLabel.toLowerCase() }) }}
                  <AppDisplayField
                    :item="{
                      value: filteredDependencies,
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
                <template v-else>
                  <p>{{ $t('__instructionNoDependency', { item: props.itemLabel }) }}</p>
                </template>
              </template>
            </template>
          </AppInputGroup>
        </template>
      </template>
      <template v-else>
        {{ props.instruction || strUtils.addSpacesAroundAscii($t('__instructionDeleteMultiple', { item: props.itemLabel.toLowerCase() })) }}
        <AppDisplayFieldGroup
          :items="[
            {
              title: `${props.itemLabel} (${props.items.length})`,
              value: props.items,
              table: {
                headers: [
                  { title: $t('__titleModifyItem', { action: props.itemLabel, item: $t('__fieldName') }), key: 'name' },
                ],
              },
            },
          ]"
          class="mt-3"
        />
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
        :text="props.actionLabel || $t('__actionDelete')"
        :width="100"
        :loading="props.loading"
        color="critical"
        @click="props.onSubmit"
      />
    </v-card-actions>
  </v-card>
</template>
