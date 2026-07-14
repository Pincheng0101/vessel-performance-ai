export function useMarkdownScriptPreview() {
  const { t } = useI18n();
  const previewBlocks = new Map();

  const toMarkdownWithScriptPreviewPlaceholders = (markdown) => {
    const result = markdownScriptPreviewUtils.extractScriptPreviewBlocksFromMarkdown(markdown);
    result.previews.forEach(preview => previewBlocks.set(preview.id, preview));
    return result.markdown;
  };

  const markdownScriptPreviewInjector = (html) => {
    const chartErrorText = {
      title: t('__titleChartRenderFailed'),
      message: t('__messageChartRenderFailed'),
      detailsLabel: t('__titleDetails'),
    };
    const placeholderResult = markdownScriptPreviewUtils.replaceScriptPreviewPlaceholders(html, [...previewBlocks.values()], chartErrorText);
    const scriptPreviewResult = markdownScriptPreviewUtils.extractScriptPreviewBlocks(placeholderResult.html, { chartErrorText });
    return {
      ...scriptPreviewResult,
      slots: [],
    };
  };

  return {
    toMarkdownWithScriptPreviewPlaceholders,
    markdownScriptPreviewInjector,
  };
}
