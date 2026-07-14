import KnowledgeBaseDocumentContent from './KnowledgeBaseDocumentContent';

class KnowledgeBaseDocument {
  constructor({
    docId,
    content,
    presignedUrl,
  } = {}) {
    this.docId = docId ?? '';
    this.content = content instanceof KnowledgeBaseDocumentContent ? content : new KnowledgeBaseDocumentContent(content);
    this.presignedUrl = presignedUrl ?? null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldContent'), value: this.content.retrieverChunk, isMarkdown: true, editorOptions: { maxLines: 10, showFoldGutter: false, showLineNumbers: false } },
      { title: $i18n.t('__fieldFilename'), value: this.content.lfeFilename, link: { href: this.presignedUrl, target: '_blank' } },
    ];
  }
}

export default KnowledgeBaseDocument;
