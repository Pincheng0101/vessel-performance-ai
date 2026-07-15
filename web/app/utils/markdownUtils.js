import { Converter as MarkdownToHtmlConverter } from '@kklab/markdown2html';
import { markedHighlight } from 'marked-highlight';
import markedKatex from 'marked-katex-extension';
import hljs from './highlight';

const MARKDOWN_DOMPURIFY_CONFIG = {
  ADD_ATTR: [
    'target',
  ],
};

class markdownUtils {
  /**
   * Parses the leading frontmatter block (delimited by `---`) from a markdown string.
   * Each value is returned as a trimmed string with no type coercion.
   *
   * @param {string} markdown - The markdown string that may begin with a `---` frontmatter block.
   * @returns {Object<string, string>|null} A flat key→string mapping, or `null` if absent or empty.
   */
  static parseFrontmatter(markdown) {
    if (!markdown?.startsWith('---\n')) return null;
    const match = markdown.match(/^---\n([\s\S]*?)\n---\s*(?:\n|$)/);
    if (!match) return null;
    const result = {};
    for (const line of match[1].split('\n')) {
      const lineMatch = line.match(/^([\w-]+):\s*(.*)$/);
      if (!lineMatch) continue;
      result[lineMatch[1]] = lineMatch[2].trim();
    }
    return Object.keys(result).length ? result : null;
  }

  /**
   * Converts a parsed frontmatter object into a Markdown table string.
   * Empty values render as `-`; pipe and newline characters in values are escaped.
   *
   * @param {Object<string, string>} frontmatter - The parsed frontmatter object.
   * @returns {string} A Markdown table representation (with empty header row).
   */
  static frontmatterToMarkdownTable(frontmatter) {
    const escape = value => (value ? value.replaceAll('|', '\\|').replaceAll('\n', ' ') : '-');
    const rows = Object.entries(frontmatter)
      .map(([key, value]) => `| ${strUtils.toTitleCase(key)} | ${escape(value)} |`)
      .join('\n');
    return `|   |   |\n|---|---|\n${rows}`;
  }

  /**
   * Converts the given markdown string to HTML with optional features such as anchors and table of contents (TOC).
   * A leading frontmatter block (delimited by `---`) is rendered as a Markdown table at the top
   * of the document, unless `hideFrontmatter` is true. Use `parseFrontmatter` for raw access.
   *
   * @param {string} markdown - The markdown string to convert.
   * @param {Object} options - Optional settings for the conversion.
   * @param {boolean} options.enableAnchors - Whether to enable anchor links for headings.
   * @param {string} options.anchorPrefix - Prefix to add to anchor IDs.
   * @param {boolean} options.generateToc - Whether to generate a table of contents.
   * @param {boolean} options.hideFrontmatter - Whether to strip frontmatter without rendering it.
   * @returns {string} The converted HTML string.
   */
  static toHtml(markdown, { enableAnchors = false, anchorPrefix = '', generateToc = false, hideFrontmatter = false } = {}) {
    const idMap = {};
    const headings = [];
    const frontmatter = hideFrontmatter ? null : this.parseFrontmatter(markdown);
    const stripped = markdown?.startsWith('---\n')
      ? markdown.replace(/^---\n[\s\S]*?\n---\s*\n?/, '')
      : markdown;
    const body = frontmatter
      ? `${this.frontmatterToMarkdownTable(frontmatter)}\n\n${stripped}`
      : stripped;
    return new MarkdownToHtmlConverter(body)
      .setDOMPurifyConfig(MARKDOWN_DOMPURIFY_CONFIG)
      .setMarkedExtensions([
        {
          hooks: {
            preprocess(html) {
              // Ensure code blocks are preceded by at least one blank line to prevent them from being treated as part of the previous paragraph
              let processed = html.replaceAll('```', (match, offset, source) => {
                const before = source.slice(0, offset);
                // Skip adding newlines inside table rows
                const lastNewlineIndex = before.lastIndexOf('\n');
                const currentLine = before.slice(lastNewlineIndex + 1);
                if (currentLine.trimStart().startsWith('|')) return match;
                if (before.endsWith('\n\n')) return match;
                if (before.endsWith('\n')) return `\n${match}`;
                return `\n\n${match}`;
              });
              // Pre-process bold to avoid marked rendering issues with non-ASCII text
              processed = processed.replaceAll(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
              // Escape Markdown reference links to display literally
              processed = processed.replaceAll(/\[(.+?)\]:/g, '\\[$1\\]\\:');
              // Convert :mdi-icon-name: to Material Design Icons
              processed = processed.replaceAll(/:mdi-([\w-]+):/g, (_, iconName) => {
                return `<i class="mdi-${iconName} mdi v-theme--light v-icon--size-default"></i>`;
              });
              return processed;
            },
            postprocess(html) {
              const tagged = frontmatter
                ? html.replace('<table>', '<table class="frontmatter">')
                : html;
              const linkified = markdownUtils.linkifyPhones(tagged);
              if (!generateToc) return linkified;
              const buildToc = (headings, maxDepth = 6) => {
                const rootUl = document.createElement('ul');
                const levelUls = { 1: rootUl };
                let currentLevel = 1;
                headings.forEach(({ depth, id, text }) => {
                  if (depth > maxDepth) return;
                  const effectiveDepth = Math.min(depth, maxDepth);
                  const li = document.createElement('li');
                  const anchor = document.createElement('a');
                  anchor.href = `#${id}`;
                  anchor.textContent = text;
                  li.appendChild(anchor);
                  if (effectiveDepth > currentLevel) {
                    const ul = document.createElement('ul');
                    levelUls[currentLevel].lastElementChild?.appendChild(ul);
                    levelUls[effectiveDepth] = ul;
                  }
                  currentLevel = effectiveDepth;
                  levelUls[effectiveDepth]?.appendChild(li);
                });
                return rootUl.outerHTML;
              };
              return `
                <div hidden>
                  ${buildToc(headings)}
                </div>
                ${linkified}
              `;
            },
          },
        },
        {
          renderer: {
            heading(tokens) {
              const { depth, text } = tokens;
              const html = this.parser.parseInline(tokens.tokens);
              if (!enableAnchors) return `<h${depth}>${html}</h${depth}>`;
              const id = `${anchorPrefix ? `${anchorPrefix}-` : ''}${strUtils.toKebabCase(text)}`;
              const count = idMap[id] || 0;
              const uniqueId = `${id}${count > 0 ? `-${count}` : ''}`;
              idMap[id] = count + 1;
              headings.push({ depth, text, id: uniqueId });
              return `
                <h${depth}>
                  <a id="${uniqueId}" href="#${uniqueId}" class="anchor">
                    <i class="mdi-link-variant mdi v-icon notranslate v-theme--light v-icon--size-x-small" aria-hidden="true" variant="flat"></i>
                    <span>${html}</span>
                  </a>
                </h${depth}>
              `;
            },
            link(tokens) {
              const { href, title, text } = tokens;
              const imageMatch = /^!\[(.*?)\]\((.*?)\)$/.exec(text);
              if (imageMatch) {
                const [, alt, src] = imageMatch;
                const isImageSrc = /^(https?:\/\/|data:image\/)/.test(src);
                if (isImageSrc) {
                  return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="${alt || ''}" /></a>`;
                }
              }
              if (href.startsWith('mailto:') || href.startsWith('tel:')) {
                return `<a href="${href}" title="${title || ''}">${text || href}</a>`;
              }
              if (!strUtils.isValidUrl(href)) {
                return text;
              }
              return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text || href} <i class="mdi-open-in-new mdi v-icon notranslate v-theme--light v-icon--size-x-small" aria-hidden="true" variant="flat"></i></a>`;
            },
            image(tokens) {
              const { href, text } = tokens;
              return `<div class="overflow-auto"><img src="${href}" alt="${text || ''}" /></div>`;
            },
            table(tokens) {
              const { header, rows } = tokens;
              const renderHeader = (header) => {
                const cells = header.map(cell => `<th>${this.parser.parseInline(cell.tokens)}</th>`);
                return `<thead><tr>${cells.join('')}</tr></thead>`;
              };
              const renderBody = (rows) => {
                const tableRows = rows.map((row) => {
                  const cells = row.map(cell => `<td><div class="content d-flex justify-center"><span>${this.parser.parseInline(cell.tokens).replaceAll('<br>', '\n')}</span></div></td>`);
                  return `<tr>${cells.join('')}</tr>`;
                });
                return `<tbody>${tableRows.join('')}</tbody>`;
              };
              const tableHtml = `<table>${renderHeader(header)}${renderBody(rows)}</table>`;
              return `<div class="overflow-auto">${tableHtml}</div>`;
            },
            del(tokens) {
              const { text } = tokens;
              return `~${text}~`;
            },
          },
        },
        markedHighlight({
          langPrefix: 'lang-',
          highlight(code, lang) {
            const options = {
              language: hljs.getLanguage(lang) ? lang : 'javascript',
            };
            return hljs.highlight(code, options).value;
          },
        }),
        markedKatex({
          throwOnError: false,
        }),
      ])
      .toHTML();
  }

  /**
   * Wraps detected phone numbers in the given HTML with `<a href="tel:...">` anchors.
   * Skips text inside existing anchors and code blocks. Uses `phoneUtils.findPhoneNumbers`,
   * which defaults to the TW region for numbers without a country code.
   *
   * @param {string} html - The HTML string to process.
   * @returns {string} The processed HTML string.
   */
  static linkifyPhones(html) {
    if (!html) return html;
    const container = document.createElement('div');
    container.innerHTML = html;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest('a, code, pre')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const targets = [];
    while (walker.nextNode()) targets.push(walker.currentNode);
    for (const node of targets) {
      const text = node.nodeValue;
      const matches = phoneUtils.findPhoneNumbers(text);
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const { start, end, original, e164 } of matches) {
        if (start > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, start)));
        const anchor = document.createElement('a');
        anchor.href = phoneUtils.toTelHref(e164);
        anchor.textContent = original;
        fragment.appendChild(anchor);
        cursor = end;
      }
      if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(fragment, node);
    }
    return container.innerHTML;
  }

  static removeHeadings(markdown) {
    if (!markdown) return '';
    return markdown
      .split('\n')
      .map(line => line.replace(/^#{1,6}\s*/, ''))
      .join('\n');
  }
}

export default markdownUtils;
