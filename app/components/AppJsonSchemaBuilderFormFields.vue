<script setup>
import { FileExtensionConstant, JsonSchemaConstant } from '~/constants';
import { JsonSchemaTableItem } from '~/models/ui/jsonSchema';

/**
 * @type {{ items: JsonSchemaTableItem[], item: JsonSchemaTableItem }}
 */
const props = defineProps({
  nestedLevel: {
    type: Number,
    default: 0,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
});

/**
 * @type {Ref<JsonSchemaTableItem>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  enableEnum: false,
});

const arrayItemSourceSchema = computed(() => props.item?.items ?? {});

const isObjectLikeProperty = computed(() => (
  formData.value.mainType === JsonSchemaConstant.DataType.OBJECT.value
  || (
    formData.value.mainType === JsonSchemaConstant.DataType.ARRAY.value
    && formData.value.items?.mainType === JsonSchemaConstant.DataType.OBJECT.value
  )
));

// Restore the form data
{
  const types = arrUtils.cast(formData.value.type);
  const isTypeNull = types.every(t => t === JsonSchemaConstant.DataType.NULL.value);
  const isTypeValid = types.every(t => Object.values(JsonSchemaConstant.DataType).map(({ value }) => value).includes(t));
  if (isTypeNull || !isTypeValid) {
    formData.value.type = JsonSchemaConstant.DataType.STRING.value;
  }
  formData.value.mainType = jsonSchemaUtils.getMainType(formData.value);
  formData.value.nullable = jsonSchemaUtils.hasNullType(formData.value);
  if (jsonSchemaUtils.getMainType(formData.value) === JsonSchemaConstant.DataType.ARRAY.value) {
    formData.value.items = formData.value.items || {};
    formData.value.items.interimSchema = arrayItemSourceSchema.value;
  }
  if (formData.value.enum !== undefined || formData.value.items?.enum !== undefined) {
    state.enableEnum = true;
  }
  if (formData.value.contentMediaType) {
    formData.value.contentMediaTypes = [formData.value.contentMediaType];
  }
  if (formData.value.anyOf) {
    formData.value.contentMediaTypes = formData.value.anyOf.map(item => item.contentMediaType);
    const _enum = formData.value.anyOf.find(item => item.enum)?.enum;
    if (_enum) {
      formData.value.enum = _enum;
      state.enableEnum = true;
    }
    formData.value.allowCustomValue = formData.value.anyOf.length > 1;
  }
}

const handleTypeChange = (v) => {
  const payload = new JsonSchemaTableItem({
    mainType: v,
    type: formData.value.nullable ? [v, JsonSchemaConstant.DataType.NULL.value] : v,
    name: formData.value.name,
    title: formData.value.title,
    description: formData.value.description,
    required: formData.value.required,
    nullable: formData.value.nullable,
  });
  if (payload.required) {
    if (v === JsonSchemaConstant.DataType.STRING.value) {
      payload.minLength = 1;
    }
    if (v === JsonSchemaConstant.DataType.ARRAY.value) {
      payload.minItems = 1;
    }
  }
  if (v === JsonSchemaConstant.DataType.ARRAY.value) {
    payload.items = {
      mainType: JsonSchemaConstant.DataType.STRING.value,
      type: JsonSchemaConstant.DataType.STRING.value,
    };
  }
  if (v === JsonSchemaConstant.DataType.OBJECT.value) {
    payload.properties = {};
    payload.interimSchema = {}; // For data binding
  }
  if (v === JsonSchemaConstant.DataType.FILE.value) {
    payload.contentMediaTypes = [FileExtensionConstant.All.ALL.mediaType];
    payload.anyOf = [{
      contentMediaType: FileExtensionConstant.All.ALL.mediaType,
    }];
  }
  formData.value = payload;
};

const handleItemsTypeChange = (v) => {
  const payload = new JsonSchemaTableItem({
    mainType: formData.value.mainType,
    type: formData.value.type,
    name: formData.value.name,
    title: formData.value.title,
    description: formData.value.description,
    required: formData.value.required,
    nullable: formData.value.nullable,
    items: {
      mainType: v,
      type: formData.value.items.nullable ? [v, JsonSchemaConstant.DataType.NULL.value] : v,
      nullable: formData.value.items.nullable,
      interimSchema: {}, // For data binding
    },
  });
  if (v === JsonSchemaConstant.DataType.ARRAY.value) {
    payload.items.items = {};
  }
  if (v === JsonSchemaConstant.DataType.FILE.value) {
    payload.items.contentMediaTypes = [FileExtensionConstant.All.ALL.mediaType];
    payload.items.anyOf = [{
      contentMediaType: FileExtensionConstant.All.ALL.mediaType,
    }];
  }
  formData.value = payload;
};

const handleRequiredChange = (v) => {
  switch (formData.value.mainType) {
    case JsonSchemaConstant.DataType.STRING.value:
      if (v && !formData.value.minLength) {
        formData.value.minLength = 1;
      }
      if (!v && formData.value.minLength === 1) {
        delete formData.value.minLength;
      }
      break;
    case JsonSchemaConstant.DataType.ARRAY.value:
      if (v && !formData.value.minItems) {
        formData.value.minItems = 1;
      }
      if (!v && formData.value.minItems === 1) {
        delete formData.value.minItems;
      }
      break;
  }
};

const handleNullableChange = (v) => {
  if (v) {
    formData.value.type = [jsonSchemaUtils.getMainType(formData.value), JsonSchemaConstant.DataType.NULL.value];
    return;
  }
  formData.value.type = jsonSchemaUtils.getMainType(formData.value);
};
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('type')"
    v-slot="{ id, label }"
    :label="$t('__fieldType')"
    required
  >
    <AppSelect
      :id="id"
      v-model="formData.mainType"
      :items="(
        Object.values(JsonSchemaConstant.DataType)
          .filter(item => item.value !== JsonSchemaConstant.DataType.NULL.value)
          .map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))
      )"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
      @update:model-value="handleTypeChange"
    />
  </AppInputGroup>
  <template v-if="formData.mainType">
    <AppInputGroup
      v-if="!props.hiddenFields.includes('name')"
      v-slot="{ id, label }"
      :label="$t('__fieldName')"
      required
    >
      <AppTextField
        :id="id"
        v-model="formData.name"
        :rules="(
          // notStartsWithUppercase only fires on object property names (where
          // pydantic treats PascalCase as a nested class); the other two
          // reserved-name checks apply to every field name.
          $validator
            .defineField(label)
            .when({
              notStartsWithUppercase: isObjectLikeProperty,
            })
            .required()
            .alphaDash()
            .stringNotContainsAny(['-']) // Follow api rules to disallow dash
            .notStartsWithNumber()
            .apply('notStartsWithUnderscore')
            .apply('notReservedFieldName')
            .apply('notStartsWithUppercase')
            .unique(props.items.map(item => item.name), props.item ? props.item.name : null)
            .collect()
        )"
      />
    </AppInputGroup>
    <AppInputGroup
      v-if="!props.hiddenFields.includes('required')"
      v-slot="{ id }"
      :label="$t('__fieldRequired')"
    >
      <AppSwitch
        :id="id"
        v-model="formData.required"
        @update:model-value="handleRequiredChange"
      />
    </AppInputGroup>
    <AppInputGroup
      v-if="!props.hiddenFields.includes('nullable')"
      v-slot="{ id }"
      :label="$t('__fieldNullable')"
    >
      <AppSwitch
        :id="id"
        v-model="formData.nullable"
        @update:model-value="handleNullableChange"
      />
    </AppInputGroup>
    <template v-if="formData.mainType === JsonSchemaConstant.DataType.ARRAY.value">
      <AppInputGroup
        :label="$t('__fieldItem', 2)"
        bordered
      >
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldType', 2)"
          required
        >
          <AppSelect
            :id="id"
            v-model="formData.items.mainType"
            :items="(
              Object.values(JsonSchemaConstant.DataType)
                .filter(item => item.value !== JsonSchemaConstant.DataType.NULL.value)
                .map(item => ({ ...item, title: $t(item.i18nTitle), subtitle: $t(item.i18nSubtitle) }))
            )"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
            @update:model-value="handleItemsTypeChange"
          />
        </AppInputGroup>
        <AppJsonSchemaBuilderFormFields
          v-model:form-data="formData.items"
          :nested-level="props.nestedLevel + 1"
          :item="arrayItemSourceSchema"
          :hidden-fields="['type', 'name', 'required', 'allowCustomValue', jsonSchemaUtils.getMainType(arrayItemSourceSchema) === 'object' ? 'nullable' : '']"
        />
      </AppInputGroup>
    </template>
    <template v-else-if="formData.mainType === JsonSchemaConstant.DataType.OBJECT.value">
      <AppInputGroup :label="$t('__fieldSchema')">
        <AppJsonSchemaBuilderInput v-model:form-data="formData.interimSchema" />
      </AppInputGroup>
    </template>
    <template v-else-if="formData.mainType === JsonSchemaConstant.DataType.FILE.value">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('mediaType')"
        v-slot="{ id, label }"
        :label="$t('__fieldMediaType', 2)"
        required
      >
        <AppCombobox
          :id="id"
          v-model="formData.contentMediaTypes"
          clearable
          :items="[
            { title: FileExtensionConstant.All.ALL.mediaType, value: FileExtensionConstant.All.ALL.mediaType },
            { title: FileExtensionConstant.Text.ALL.mediaType, value: FileExtensionConstant.Text.ALL.mediaType },
            { title: FileExtensionConstant.Application.ALL.mediaType, value: FileExtensionConstant.Application.ALL.mediaType },
            { title: FileExtensionConstant.Image.ALL.mediaType, value: FileExtensionConstant.Image.ALL.mediaType },
            { title: FileExtensionConstant.Audio.ALL.mediaType, value: FileExtensionConstant.Audio.ALL.mediaType },
            { title: FileExtensionConstant.Video.ALL.mediaType, value: FileExtensionConstant.Video.ALL.mediaType },
          ]"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          @update:model-value="(v) => {
            formData.anyOf = v.map(item => ({
              contentMediaType: item,
            }))
            delete formData.contentMediaType;
          }"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldDefault')"
      >
        <AppFileInput
          :id="id"
          v-model:encoded="formData.default"
          :supported-extensions="formData.contentMediaTypes"
          @update:encoded="(v) => {
            if (strUtils.isEmpty(v)) {
              delete formData.default;
            }
          }"
        />
      </AppInputGroup>
    </template>
    <AppFormFieldExpansionPanels>
      <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldTitle')"
        >
          <AppTextField
            :id="id"
            v-model="formData.title"
            :rules="(
              $validator
                .defineField(label)
                .stringLengthLte(64)
                .collect()
            )"
          />
        </AppInputGroup>
        <AppInputGroup
          v-slot="{ id }"
          :label="$t('__fieldDescription')"
        >
          <AppTextarea
            :id="id"
            v-model="formData.description"
          />
        </AppInputGroup>
        <template v-if="formData.mainType === JsonSchemaConstant.DataType.STRING.value">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldEnum')"
          >
            <div class="d-flex align-center">
              <AppCheckbox
                :id="id"
                v-model="state.enableEnum"
                class="mr-2"
                @update:model-value="(v) => {
                  if (v) {
                    formData.enum = [];
                    delete formData.default;
                    delete formData.minLength;
                    delete formData.maxLength;
                    return;
                  }
                  delete formData.enum;
                  delete formData.anyOf;
                  formData.allowCustomValue = false;
                }"
              />
              <AppCombobox
                v-model="formData.enum"
                :disabled="!state.enableEnum"
                clearable
              />
            </div>
          </AppInputGroup>
          <AppInputGroup
            v-if="!props.hiddenFields.includes('allowCustomValue') && state.enableEnum"
            v-slot="{ id }"
            :label="$t('__fieldAllowCustomValue')"
          >
            <AppSwitch
              :id="id"
              v-model="formData.allowCustomValue"
              @update:model-value="(v) => {
                if (!v) {
                  formData.enum = formData.anyOf?.find(item => item.enum)?.enum;
                  delete formData.anyOf;
                }
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldDefault')"
          >
            <template v-if="formData.enum">
              <AppSelect
                :id="id"
                v-model="formData.default"
                clearable
                :items="formData.enum"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      oneOf: formData.enum,
                    })
                    .oneOf(formData.enum)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (strUtils.isEmpty(v)) {
                    delete formData.default;
                  }
                }"
              />
            </template>
            <template v-else>
              <AppTextarea
                :id="id"
                v-model="formData.default"
                clearable
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      stringLengthGte: formData.minLength,
                      stringLengthLte: formData.maxLength,
                      oneOf: formData.enum,
                    })
                    .stringLengthGte(formData.minLength)
                    .stringLengthLte(formData.maxLength)
                    .oneOf(formData.enum)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (strUtils.isEmpty(v)) {
                    delete formData.default;
                  }
                }"
              />
            </template>
          </AppInputGroup>
          <AppInputGroup
            v-if="!state.enableEnum"
            v-slot="{ id, label }"
            :label="$t('__fieldMinLength')"
          >
            <AppTextField
              :id="id"
              v-model.integer="formData.minLength"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    lte: formData.maxLength,
                  })
                  .lte(formData.maxLength)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.minLength;
                }
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-if="!state.enableEnum"
            v-slot="{ id, label }"
            :label="$t('__fieldMaxLength')"
          >
            <AppTextField
              :id="id"
              v-model.integer="formData.maxLength"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    gte: formData.minLength,
                  })
                  .gte(formData.minLength)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.maxLength;
                }
              }"
            />
          </AppInputGroup>
        </template>
        <template v-else-if="formData.mainType === JsonSchemaConstant.DataType.NUMBER.value || formData.mainType === JsonSchemaConstant.DataType.INTEGER.value">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldEnum')"
          >
            <div class="d-flex align-center">
              <AppCheckbox
                :id="id"
                v-model="state.enableEnum"
                class="mr-2"
                @update:model-value="(v) => {
                  if (v) {
                    formData.enum = [];
                    delete formData.default;
                    delete formData.minimum;
                    delete formData.maximum;
                    return;
                  }
                  delete formData.enum;
                  delete formData.anyOf;
                  formData.allowCustomValue = false;
                }"
              />
              <AppCombobox
                v-model="formData.enum"
                :disabled="!state.enableEnum"
                :model-modifiers="{
                  integer: formData.mainType === JsonSchemaConstant.DataType.INTEGER.value,
                }"
                clearable
                type="number"
              />
            </div>
          </AppInputGroup>
          <AppInputGroup
            v-if="!props.hiddenFields.includes('allowCustomValue') && state.enableEnum"
            v-slot="{ id }"
            :label="$t('__fieldAllowCustomValue')"
          >
            <AppSwitch
              :id="id"
              v-model="formData.allowCustomValue"
              @update:model-value="(v) => {
                if (!v) {
                  formData.enum = formData.anyOf?.find(item => item.enum)?.enum;
                  delete formData.anyOf;
                }
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldDefault')"
          >
            <template v-if="formData.enum">
              <AppSelect
                :id="id"
                v-model="formData.default"
                clearable
                :items="formData.enum"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      oneOf: formData.enum,
                    })
                    .oneOf(formData.enum)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (strUtils.isEmpty(v)) {
                    delete formData.default;
                  }
                }"
              />
            </template>
            <template v-else>
              <AppTextField
                :id="id"
                v-model.number="formData.default"
                :model-modifiers="{
                  integer: formData.mainType === JsonSchemaConstant.DataType.INTEGER.value,
                }"
                clearable
                type="number"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      gte: formData.minimum,
                      lte: formData.maximum,
                      oneOf: formData.enum,
                    })
                    .gte(formData.minimum)
                    .lte(formData.maximum)
                    .oneOf(formData.enum)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (strUtils.isEmpty(v)) {
                    delete formData.default;
                  }
                }"
              />
            </template>
          </AppInputGroup>
          <AppInputGroup
            v-if="!state.enableEnum"
            v-slot="{ id, label }"
            :label="$t('__fieldMin')"
          >
            <AppTextField
              :id="id"
              v-model.number="formData.minimum"
              :model-modifiers="{
                integer: formData.mainType === JsonSchemaConstant.DataType.INTEGER.value,
              }"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    lte: formData.maximum,
                  })
                  .lte(formData.maximum)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.minimum;
                  delete formData._step;
                }
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-if="!state.enableEnum"
            v-slot="{ id, label }"
            :label="$t('__fieldMax')"
          >
            <AppTextField
              :id="id"
              v-model.number="formData.maximum"
              :model-modifiers="{
                integer: formData.mainType === JsonSchemaConstant.DataType.INTEGER.value,
              }"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    gte: formData.minimum,
                  })
                  .gte(formData.minimum)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.maximum;
                  delete formData._step;
                }
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-if="!state.enableEnum"
            v-slot="{ id, label }"
            :label="$t('__fieldInputStep')"
            :tooltip="$t('__tooltipInputStep')"
          >
            <AppTextField
              :id="id"
              v-model.number="formData._step"
              :disabled="!formData.minimum || !formData.maximum"
              :min="0"
              :model-modifiers="{
                integer: formData.mainType === JsonSchemaConstant.DataType.INTEGER.value,
              }"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .gt(0)
                  .lte(formData.maximum)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData._step;
                }
              }"
            />
            <AppTooltip
              v-if="!formData.minimum || !formData.maximum"
              :offset="[-20, 0]"
              :text="$t('__tooltipSpecifyMinAndMaxFirst')"
              activator="parent"
              location="bottom start"
            />
          </AppInputGroup>
        </template>
        <template v-else-if="formData.mainType === JsonSchemaConstant.DataType.BOOLEAN.value">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldDefault')"
          >
            <AppSelect
              :id="id"
              v-model="formData.default"
              clearable
              :items="[
                { title: $t('__fieldYes'), value: true },
                { title: $t('__fieldNo'), value: false },
              ]"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.default;
                }
              }"
            />
          </AppInputGroup>
        </template>
        <template v-else-if="formData.mainType === JsonSchemaConstant.DataType.ARRAY.value">
          <template v-if="formData.items.mainType === JsonSchemaConstant.DataType.STRING.value">
            <AppInputGroup
              v-slot="{ id, label }"
              :label="$t('__fieldDefault')"
            >
              <AppCombobox
                :id="id"
                v-model="formData.default"
                clearable
                :items="formData.items.enum"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      subsetOf: formData.items.enum,
                    })
                    .subsetOf(formData.items.enum)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (v.length < 1) {
                    delete formData.default;
                  }
                }"
              />
            </AppInputGroup>
          </template>
          <template v-else-if="formData.items.mainType === JsonSchemaConstant.DataType.NUMBER.value">
            <AppInputGroup
              v-slot="{ id, label }"
              :label="$t('__fieldDefault')"
            >
              <AppCombobox
                :id="id"
                v-model="formData.default"
                :items="formData.items.enum"
                clearable
                type="number"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      subsetOf: formData.items.enum,
                    })
                    .subsetOf(formData.items.enum)
                    .collect()
                )"
                @update:model-value="(v) => {
                  if (v.length < 1) {
                    delete formData.default;
                  }
                }"
              />
            </AppInputGroup>
          </template>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldMinItems')"
          >
            <AppTextField
              :id="id"
              v-model.integer="formData.minItems"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    lte: formData.maxItems,
                  })
                  .lte(formData.maxItems)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.minItems;
                }
              }"
            />
          </AppInputGroup>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldMaxItems')"
          >
            <AppTextField
              :id="id"
              v-model.integer="formData.maxItems"
              clearable
              type="number"
              :rules="(
                $validator
                  .defineField(label)
                  .when({
                    gte: formData.minItems,
                  })
                  .gte(formData.minItems)
                  .collect()
              )"
              @update:model-value="(v) => {
                if (strUtils.isEmpty(v)) {
                  delete formData.maxLength;
                }
              }"
            />
          </AppInputGroup>
        </template>
      </AppFormFieldExpansionPanel>
    </AppFormFieldExpansionPanels>
  </template>
</template>
