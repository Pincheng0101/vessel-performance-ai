<script setup>
definePageMeta({
  layout: 'fluid',
});

const state = reactive({
  prompt: '',
  isLoading: false,
});
</script>

<template>
  <ResourceInfoTitle
    title="Prompt Rewriter"
    class="mb-4"
  />
  <AppForm :form-title="$t('__fieldInput')">
    <template #body>
      <AppInputGroup
        :label="$t('__fieldPrompt')"
        persistent-right-slot
        required
      >
        <template #default="{ label }">
          <AppJinjaEditor
            v-model="state.prompt"
            :loading="state.isLoading"
            :disabled="state.isLoading"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          >
            <template #prepend-tools>
              <PromptRewriteButton
                v-model:prompt="state.prompt"
                v-model:loading="state.isLoading"
              />
            </template>
          </AppJinjaEditor>
        </template>
      </AppInputGroup>
    </template>
  </AppForm>
</template>
