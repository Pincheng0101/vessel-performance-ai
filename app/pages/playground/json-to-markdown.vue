<script setup>
definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  input: {
    heading_1: 'Hello, World!',
    nested: {
      heading_2: 'Hello, World!',
      nested: {
        heading_3: 'Hello, World!',
        nested: {
          heading_4: 'Hello, World!',
          nested: {
            heading_5: 'Hello, World!',
            nested: {
              heading_6: 'Hello, World!',
              nested: {
                heading_7: 'Hello, World!',
              },
            },
          },
        },
      },
    },
    table: [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        friends: ['Bob', 'Charlie'],
        settings: {
          theme: 'dark',
        },
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        friends: ['Charlie'],
        settings: {
          theme: 'light',
        },
      },
      {
        id: 3,
        name: 'Charlie',
        email: 'charlie@example.com',
        friends: [],
      },
    ],
    array: [
      {
        foo: 'bar',
      },
      1,
      [
        2,
        [
          3,
        ],
      ],
      {
        foo: 'bar',
      },
    ],
    markdown_code: '```\nconsole.log(\'Hello, World!\');\n```',
    markdown_table: '| foo | bar | baz |\n| --- | --- | --- |\n| 1 | 2 | 3 |',
    markdown_math_inline: '$E = mc^2$ and $a^2 + b^2 = c^2$.',
    markdown_math_block: '$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
    base64_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  },
});
</script>

<template>
  <ResourceInfoTitle
    title="JSON to Markdown"
    class="mb-4"
  />
  <v-row>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldInput')"
            required
          >
            <AppJsonEditor
              :id="id"
              v-model:object="state.input"
              fill-height
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .json()
                  .collect()
              )"
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
    <v-col
      :cols="12"
      :sm="6"
    >
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <AppInputGroup :label="$t('__fieldOutput')">
            <AppJsonMarkdownViewer
              :default-value="state.input"
              download-file-name="json-to-markdown"
              enable-anchors
            />
          </AppInputGroup>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
