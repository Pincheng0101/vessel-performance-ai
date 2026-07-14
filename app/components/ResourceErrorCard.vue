<script setup>
import { StatusConstant } from '~/constants';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  statusCode: {
    type: Number,
    required: true,
  },
});

const router = useRouter();
const { t } = useI18n();

const items = computed(() => ({
  [StatusConstant.StatusCode.NOT_FOUND]: {
    title: t('__titleResourceNotFound', { resource: props.label }),
    value: 'notFound',
    icon: 'mdi-database-search',
    instruction: t('__instructionResourceNotFound'),
  },
  [StatusConstant.StatusCode.FORBIDDEN]: {
    title: t('__titleForbidden'),
    value: 'forbidden',
    icon: 'mdi-lock-outline',
    instruction: t('__instructionForbidden'),
  },
  [StatusConstant.StatusCode.INTERNAL_SERVER_ERROR]: {
    title: t('__titleInternalServerError'),
    value: 'default',
    icon: 'mdi-alert-circle-outline',
    instruction: t('__instructionInternalServerError'),
  },
}));

const hasPreviousPage = computed(() => window.history.length > 1);

const item = computed(() => items.value[props.statusCode] || items.value[500]);
</script>

<template>
  <AppInfoCard
    :icon="item.icon"
    :title="item.title"
    :instruction="item.instruction"
    :min-height="600"
  >
    <template #actions>
      <AppButton
        :width="160"
        :text="hasPreviousPage ? $t('__actionTakeMeBack') : $t('__actionBackToHome')"
        size="large"
        color="primary"
        @click="hasPreviousPage ? router.go(-1) : router.push('/')"
      />
    </template>
  </AppInfoCard>
</template>
