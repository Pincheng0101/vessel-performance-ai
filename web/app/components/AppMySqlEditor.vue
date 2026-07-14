<script setup>
import { MySQL, sql } from '@codemirror/lang-sql';
import { format } from 'sql-formatter';
import { FileExtensionConstant } from '~/constants';

const props = defineProps({
  defaultValue: {
    type: [String, Object],
    default: '',
  },
  dialogTitle: {
    type: String,
    default: '',
  },
});

const injectedLabel = inject('inputGroupLabel', '');

const model = defineModel({
  type: String,
  default: '',
});

// Customize the format to align with PyMySQL's parameterized query syntax
const formatSqlWithPlaceholders = (text) => {
  try {
    return format(
      text
        .replace(/%\((\w+)\)s/g, '__PLACEHOLDER__$1__')
        .replace(/%s/g, '__PLACEHOLDER__'),
      { language: 'mysql' },
    )
      .replace(/__PLACEHOLDER__(\w+)__/g, '%($1)s')
      .replace(/__PLACEHOLDER__/g, '%s');
  } catch (error) {
    console.error('SQL formatting error:', error);
    return text;
  }
};

if (props.defaultValue) {
  model.value = props.defaultValue;
}
</script>

<template>
  <AppEditor
    v-model="model"
    :dialog-title="props.dialogTitle || injectedLabel || $t('__titleEditorMySql')"
    :download-file-extension="FileExtensionConstant.Base.SQL.value"
    :download-type="FileExtensionConstant.Base.SQL.mediaType"
    :extensions="[
      sql({ dialect: MySQL }),
    ]"
    :mutators="[
      formatSqlWithPlaceholders,
    ]"
  >
    <template
      v-if="$slots['append-inner']"
      #append-inner
    >
      <slot name="append-inner" />
    </template>
  </AppEditor>
</template>

<style lang="scss" scoped>
.cm-tooltip-autocomplete {
  background-color: rgba(var(--v-theme-background1)) !important;
}
</style>
