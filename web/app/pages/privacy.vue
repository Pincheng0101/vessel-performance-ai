<script setup>
import dayjs from 'dayjs';
import privacyBodyMarkdownEn from '~~/i18n/content/privacy.en.md?raw';
import privacyBodyMarkdownZhTw from '~~/i18n/content/privacy.zh-TW.md?raw';

definePageMeta({
  layout: 'centered',
  middleware: [
    'public',
  ],
});

const UPDATED_AT = '2026-05-01';

const { locale, t } = useI18n();
const updatedAt = dayjs(UPDATED_AT);

const privacyBodyMarkdownMap = {
  'en': privacyBodyMarkdownEn,
  'zh-TW': privacyBodyMarkdownZhTw,
};

const privacyBodyMarkdown = computed(() => privacyBodyMarkdownMap[locale.value] || privacyBodyMarkdownMap.en);

useHead({
  title: t('__titlePrivacyPolicy'),
});
</script>

<template>
  <v-sheet
    color="transparent"
    :max-width="820"
    class="align-self-start w-100 pa-4 py-8"
  >
    <div class="mb-10">
      <h1 class="font-weight-black mb-6">
        {{ $t('__titlePrivacyPolicy') }}
      </h1>
      <p class="font-weight-bold">
        {{ t('__privacyPolicyUpdatedAt', {
          year: updatedAt.year(),
          month: updatedAt.month() + 1,
          day: updatedAt.date(),
        }) }}
      </p>
    </div>
    <v-divider class="mb-8" />
    <AppMarkdown
      :text="privacyBodyMarkdown"
      :enable-anchors="false"
    />
  </v-sheet>
</template>

<style scoped>
:deep(.markdown a) {
  text-decoration: underline;
}
</style>
