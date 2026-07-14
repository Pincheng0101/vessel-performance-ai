<script setup>
import { ActionExecutionConstant, ContentBlockConstant } from '~/constants';

const mediaType = defineModel('mediaType', {
  type: String,
  default: null,
});

const url = defineModel('url', {
  type: String,
  default: null,
});

const data = defineModel('data', {
  type: [String, Object],
  default: null,
});

const maxWidthPx = defineModel('maxWidthPx', {
  type: [String, Number],
  default: null,
});

const maxHeightPx = defineModel('maxHeightPx', {
  type: [String, Number],
  default: null,
});

const detail = defineModel('detail', {
  type: String,
  default: null,
});

const state = reactive({
  imageSource: ContentBlockConstant.ImageSource.UPLOAD.value,
  uploadedData: null,
});

const initializeState = () => {
  if (data.value) {
    if (typeof data.value === 'object') {
      state.imageSource = ContentBlockConstant.ImageSource.EXTERNAL_MEMORY_DATA.value;
      return;
    }
    if (jsonPathUtils.isJsonPath(data.value)) {
      state.imageSource = ContentBlockConstant.ImageSource.STATE_INPUT_DATA.value;
      return;
    }
    state.uploadedData = fileUtils.createFromBase64(data.value);
    state.imageSource = ContentBlockConstant.ImageSource.UPLOAD.value;
    return;
  }
  if (url.value) {
    if (jsonPathUtils.isJsonPath(url.value)) {
      state.imageSource = ContentBlockConstant.ImageSource.STATE_INPUT_URL.value;
      return;
    }
    state.imageSource = ContentBlockConstant.ImageSource.URL.value;
    return;
  }
};

initializeState();

const handelImageSourceChange = (v) => {
  switch (v) {
    case ContentBlockConstant.ImageSource.UPLOAD.value:
      data.value = null;
      url.value = null;
      break;
    case ContentBlockConstant.ImageSource.URL.value:
      data.value = null;
      url.value = ActionExecutionConstant.ExternalMemoryParams.URL;
      break;
    case ContentBlockConstant.ImageSource.STATE_INPUT_DATA.value:
      data.value = ActionExecutionConstant.ExternalMemoryParams.STATE_INPUT_DATA;
      url.value = null;
      break;
    case ContentBlockConstant.ImageSource.STATE_INPUT_URL.value:
      data.value = null;
      url.value = ActionExecutionConstant.ExternalMemoryParams.STATE_INPUT_URL;
      break;
    case ContentBlockConstant.ImageSource.EXTERNAL_MEMORY_DATA.value:
      data.value = ActionExecutionConstant.ExternalMemoryParams.EXTERNAL_MEMORY_DATA.default;
      url.value = null;
      break;
  }
};

const handleImageChange = async (v) => {
  if (v && v instanceof File) {
    data.value = await fileUtils.toBase64(v);
    mediaType.value = v.type;
    return;
  }
  data.value = null;
  mediaType.value = null;
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldImageSource')"
  >
    <AppSelect
      :id="id"
      v-model="state.imageSource"
      :aria-label="$t('__titleSelect', { prefix: label })"
      :items="Object.values(ContentBlockConstant.ImageSource).map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))"
      @update:model-value="handelImageSourceChange"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldSource')"
    required
  >
    <template v-if="state.imageSource === ContentBlockConstant.ImageSource.UPLOAD.value">
      <AppImageInput
        :id="id"
        v-model="state.uploadedData"
        :supported-extensions="Object.values(ContentBlockConstant.ImageType).map(v => v.value)"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
        @update:model-value="handleImageChange"
      />
    </template>
    <template v-else-if="state.imageSource === ContentBlockConstant.ImageSource.URL.value">
      <AppTextField
        :id="id"
        v-model="url"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .httpOrHttps()
            .url()
            .collect()
        )"
      />
    </template>
    <template v-else-if="state.imageSource === ContentBlockConstant.ImageSource.STATE_INPUT_DATA.value">
      <StateInputCombobox
        :id="id"
        v-model="data"
        required
        :label="label"
      />
    </template>
    <template v-else-if="state.imageSource === ContentBlockConstant.ImageSource.STATE_INPUT_URL.value">
      <StateInputCombobox
        :id="id"
        v-model="url"
        required
        :label="label"
      />
    </template>
    <template v-else-if="state.imageSource === ContentBlockConstant.ImageSource.EXTERNAL_MEMORY_DATA.value">
      <AppJsonEditor
        :id="id"
        v-model:object="data"
        enable-json-path-binding-linter
        :rules="(
          $validator
            .defineField(label)
            .required()
            .json()
            .jsonSchema(ActionExecutionConstant.ExternalMemoryParams.EXTERNAL_MEMORY_DATA.jsonSchema)
            .apply('jsonPathBinding')
            .collect()
        )"
      />
    </template>
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <StateInputGroup
        v-model="maxWidthPx"
        :label="$t('__fieldMaxWidthPx')"
        :tooltip="$t('__tooltipMaxWidthPx')"
      >
        <template #default="{ id, label }">
          <AppTextField
            :id="id"
            v-model.integer="maxWidthPx"
            type="number"
            :min="ContentBlockConstant.ActionExecutionParams.MAX_WIDTH_PX.min"
            clearable
            :rules="(
              $validator
                .defineField(label)
                .when({
                  gte: maxWidthPx !== null && !jsonPathUtils.isJsonPath(maxWidthPx),
                })
                .gte(ContentBlockConstant.ActionExecutionParams.MAX_WIDTH_PX.min)
                .collect()
            )"
            @update:model-value="(v) => {
              if (strUtils.isEmpty(v)) {
                maxWidthPx = ContentBlockConstant.ActionExecutionParams.MAX_WIDTH_PX.default;
              }
            }"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-model="maxHeightPx"
        :label="$t('__fieldMaxHeightPx')"
        :tooltip="$t('__tooltipMaxHeightPx')"
      >
        <template #default="{ id, label }">
          <AppTextField
            :id="id"
            v-model.integer="maxHeightPx"
            type="number"
            :min="ContentBlockConstant.ActionExecutionParams.MAX_HEIGHT_PX.min"
            clearable
            :rules="(
              $validator
                .defineField(label)
                .when({
                  gte: maxHeightPx !== null && !jsonPathUtils.isJsonPath(maxHeightPx),
                })
                .gte(ContentBlockConstant.ActionExecutionParams.MAX_HEIGHT_PX.min)
                .collect()
            )"
            @update:model-value="(v) => {
              if (strUtils.isEmpty(v)) {
                maxHeightPx = ContentBlockConstant.ActionExecutionParams.MAX_HEIGHT_PX.default;
              }
            }"
          />
        </template>
      </StateInputGroup>
      <StateInputGroup
        v-model="detail"
        :label="$t('__fieldImageDetail')"
      >
        <template #default="{ id }">
          <AppTextarea
            :id="id"
            v-model="detail"
          />
        </template>
      </StateInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
