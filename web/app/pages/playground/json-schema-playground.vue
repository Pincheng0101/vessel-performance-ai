<script setup>
definePageMeta({
  layout: 'fluid',
});

const properties = {
  string_input: {
    title: 'String Input',
    description: 'String input with constraints',
    type: 'string',
    default: 'Hello, World!',
    minLength: 10,
    maxLength: 100,
  },
  string_select: {
    title: 'String Select',
    description: 'String select with options',
    type: 'string',
    enum: ['Option 1', 'Option 2', 'Option 3'],
    default: 'Option 2',
  },
  string_combobox: {
    title: 'String Combobox',
    description: 'String combobox for a single selection or custom value',
    type: 'string',
    default: 'Option 2',
    anyOf: [
      {
        type: 'string',
      },
      {
        type: 'string',
        enum: ['Option 1', 'Option 2', 'Option 3'],
      },
    ],
  },
  number_input: {
    title: 'Number Input',
    description: 'Number input with constraints',
    type: 'number',
    default: 100.5,
    minimum: 10.5,
    maximum: 1000.5,
  },
  number_slider: {
    title: 'Number Slider',
    description: 'Number slider with constraints',
    type: 'number',
    default: 100.5,
    minimum: 10.5,
    maximum: 1000.5,
    _step: 0.5,
  },
  number_select: {
    title: 'Number Select',
    description: 'Number select with options',
    type: 'number',
    enum: [10.5, 100.5, 1000.5],
    default: 100.5,
  },
  number_combobox: {
    title: 'Number Combobox',
    description: 'Number combobox for a single selection or custom value',
    type: 'number',
    default: 100.5,
    anyOf: [
      {
        type: 'number',
      },
      {
        type: 'number',
        enum: [10.5, 100.5, 1000.5],
      },
    ],
  },
  integer_input: {
    title: 'Integer Input',
    description: 'Integer input with constraints',
    type: 'integer',
    default: 100,
    minimum: 10,
    maximum: 1000,
  },
  integer_slider: {
    title: 'Integer Slider',
    description: 'Integer slider with constraints',
    type: 'integer',
    default: 100,
    minimum: 10,
    maximum: 1000,
    _step: 5,
  },
  integer_select: {
    title: 'Integer Select',
    description: 'Integer select with options',
    type: 'integer',
    enum: [10, 100, 1000],
    default: 100,
  },
  integer_combobox: {
    title: 'Integer Combobox',
    description: 'Integer combobox for a single selection or custom value',
    type: 'integer',
    default: 100,
    anyOf: [
      {
        type: 'integer',
      },
      {
        type: 'integer',
        enum: [10, 100, 1000],
      },
    ],
  },
  toggle_switch: {
    title: 'Toggle Switch',
    description: 'Toggle switch with default value',
    type: 'boolean',
    default: true,
  },
  file_input: {
    title: 'File Input',
    description: 'File input with constraints',
    type: 'string',
    anyOf: [
      {
        contentMediaType: '*/*',
      },
    ],
    default: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  },
  multi_select_of_strings: {
    title: 'Multi-Select of String Items',
    description: 'String multi-select with default values',
    type: 'array',
    items: {
      type: 'string',
      enum: ['Option 1', 'Option 2', 'Option 3'],
    },
    default: ['Option 2'],
  },
  multi_select_of_numbers: {
    title: 'Multi-Select of Number Items',
    description: 'Number multi-select with default values',
    type: 'array',
    items: {
      type: 'number',
      enum: [10, 100, 1000],
    },
    default: [100],
  },
  combobox_of_strings: {
    title: 'Combobox of String Items',
    description: 'String combobox for multiple selections or custom values',
    type: 'array',
    items: {
      type: 'string',
    },
    default: ['Option 1', 'Option 2', 'Option 3'],
  },
  combobox_of_numbers: {
    title: 'Combobox of Number Items',
    description: 'Number combobox for multiple selections or custom values',
    type: 'array',
    items: {
      type: 'number',
    },
    default: [10, 100, 1000],
  },
  list_of_strings: {
    title: 'List of String Items',
    description: 'List of string items with constraints',
    type: 'array',
    items: {
      type: 'string',
      default: 'Hello, World!',
      minLength: 10,
      maxLength: 100,
    },
  },
  list_of_numbers: {
    title: 'List of Number Items',
    description: 'List of number items with constraints',
    type: 'array',
    items: {
      type: 'number',
      default: 100.5,
      minimum: 10.5,
      maximum: 1000.5,
    },
  },
  list_of_integers: {
    title: 'List of Integer Items',
    description: 'List of integer items with constraints',
    type: 'array',
    items: {
      type: 'integer',
      default: 100,
      minimum: 10,
      maximum: 1000,
    },
  },
  list_of_booleans: {
    title: 'List of Boolean Items',
    description: 'List of boolean items',
    type: 'array',
    items: {
      type: 'boolean',
      default: true,
    },
  },
  list_of_arrays: {
    title: 'List of Array Items',
    description: 'List of array items with constraints',
    type: 'array',
    items: {
      title: 'List of Array Items',
      description: 'List of array items with constraints',
      type: 'array',
      items: {
        title: 'String Input',
        description: 'String input with constraints',
        type: 'string',
        default: 'Hello, World!',
        minLength: 10,
        maxLength: 100,
      },
    },
  },
  list_of_objects: {
    title: 'List of Object Items',
    description: 'List of object items with constraints',
    type: 'array',
    items: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  list_of_files: {
    title: 'List of File Items',
    description: 'List of file items',
    type: 'array',
    items: {
      type: 'string',
      anyOf: [
        {
          contentMediaType: '*/*',
        },
      ],
      default: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
    },
  },
};

const templateOptions = Object.entries(properties)
  .map(([key, value]) => ({
    title: value.title,
    value: {
      [key]: value,
    },
  }));

const state = reactive({
  schema: {
    type: 'object',
  },
  formData: {},
  template: null,
  refreshBuilder: 0,
  refreshRenderer: 0,
});
</script>

<template>
  <ResourceInfoTitle
    title="JSON Schema Playground"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldJsonSchemaBuilder')">
        <template #body>
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldTemplate')"
          >
            <AppSelect
              :id="id"
              v-model="state.template"
              :items="templateOptions"
              @update:model-value="(v) => {
                state.schema.properties = v;
                state.formData = {};
                state.refreshBuilder += 1;
                state.refreshRenderer += 1;
              }"
            />
          </AppInputGroup>
          <AppJsonSchemaBuilderInputGroup
            :key="state.refreshBuilder"
            v-model:form-data="state.schema"
            @update:form-data="() => {
              state.formData = {}
            }"
          />
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldJsonSchemaRenderer')">
        <template #body>
          <AppJsonSchemaRendererInputGroup
            :key="state.refreshRenderer"
            v-model:form-data="state.formData"
            :schema="toRaw(state.schema)"
          />
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
