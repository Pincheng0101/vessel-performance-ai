<script setup>
definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  formData: Array
    .from({ length: 10 })
    .flatMap((_, s) => Array.from({ length: 6 }).map((_, l) => {
      const n = Array(l).fill('1').join('.');
      return `${'#'.repeat(l + 1)} Section ${s + 1}${n && `.${n}`}\n\n`;
    }))
    .join(''),
});
</script>

<template>
  <ResourceInfoTitle
    title="Markdown Viewer"
    class="mb-4"
  />
  <v-row>
    <v-col :cols="6">
      <AppForm :form-title="$t('__fieldInput')">
        <template #body>
          <AppMarkdownEditor v-model="state.formData" />
        </template>
      </AppForm>
    </v-col>
    <v-col :cols="6">
      <AppForm :form-title="$t('__fieldOutput')">
        <template #body>
          <div class="d-flex flex-column ga-6">
            <template
              v-for="n in 3"
              :key="`output-${n}`"
            >
              <AppMarkdownViewer
                :default-value="state.formData"
                :anchor-prefix="`output-${n}`"
                download-file-name="json-to-markdown"
                enable-anchors
                enable-toc
                class="mb-4"
              />
            </template>
          </div>
        </template>
      </AppForm>
    </v-col>
  </v-row>
</template>
