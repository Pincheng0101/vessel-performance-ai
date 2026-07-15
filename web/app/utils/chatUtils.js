class chatUtils {
  static CITATION_REGEX = /\[((?:Ref\s+)?(\d+))\]/gi;

  /**
   * Extracts all reference indices found in citation patterns (e.g. [Ref 1], [2]) from a string.
   *
   * Only strict citation forms are recognised: bare numeric brackets like `[1]` or `Ref`-labelled
   * brackets like `[Ref 1]`. Brackets that contain other content (e.g. `[1, 2]`, `[hello 1]`) are
   * intentionally ignored to avoid misinterpreting plain text as citations.
   *
   * @param {string} text - The text to extract indices from.
   * @returns {Set<number>} A set of referenced numeric indices.
   */
  static extractReferencedIndices(text) {
    const indices = new Set();
    const value = text ?? '';
    chatUtils.CITATION_REGEX.lastIndex = 0;
    let match;
    while ((match = chatUtils.CITATION_REGEX.exec(value)) !== null) {
      indices.add(Number(match[2]));
    }
    return indices;
  }

  /**
   * Converts citation patterns in text (e.g. [Ref 1], [2]) into clickable anchor links.
   *
   * Uses the same strict matching as {@link chatUtils.extractReferencedIndices}, so plain bracketed
   * content such as `[1, 2]` is left untouched.
   *
   * @param {string} text - The text to process.
   * @returns {string} HTML string with citation patterns replaced by anchor elements.
   */
  static toReferenceLinks(text) {
    const value = text ?? '';
    return value.replace(chatUtils.CITATION_REGEX, (match, label, number) => {
      return `<a href="#" class="font-weight-medium" data-index="${number}"> [${label}]</a>`;
    });
  }
}

export default chatUtils;
