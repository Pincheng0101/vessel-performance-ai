const SCRIPT_PREVIEW_CODE_LANGUAGE = 'html-script-preview';
const SCRIPT_PREVIEW_IFRAME_CLASS = 'markdown-script-preview';
const D3_CDN_ORIGIN = 'https://cdn.jsdelivr.net';
// Pin the exact d3 version so the Subresource Integrity (SRI) hash stays valid — a floating `d3@7` range would let the CDN serve different bytes and break the integrity check.
const D3_SCRIPT_URL = `${D3_CDN_ORIGIN}/npm/d3@7.9.0/dist/d3.min.js`;
const D3_SCRIPT_INTEGRITY = 'sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i';
// Content Security Policy for the sandboxed preview document. The iframe must run inline scripts (that is the feature) and load d3 from the CDN, but it should not reach the network for exfiltration: connect-src 'none' blocks fetch/XHR/beacon/WebSocket, and img/font are limited to inline data so they can't be abused as a GET-based exfiltration channel.
const SCRIPT_PREVIEW_CSP = [
  'default-src \'none\'',
  `script-src 'unsafe-inline' ${D3_CDN_ORIGIN}`,
  'style-src \'unsafe-inline\'',
  'img-src data: blob:',
  'font-src data:',
  'connect-src \'none\'',
].join('; ');
const DEFAULT_IFRAME_HEIGHT = 320;
const RESIZE_MESSAGE_TYPE = 'markdown-script-preview:resize';
const PREVIEW_ROOT_ID = 'markdown-script-preview-root';
const PREVIEW_SOURCE_ID = 'markdown-script-preview-source';
const SCRIPT_PREVIEW_PLACEHOLDER_PREFIX = 'MARKDOWN_SCRIPT_PREVIEW';
const SCRIPT_PREVIEW_FENCE_REGEX = /(^|\n)```html-script-preview[^\n]*\n([\s\S]*?)\n```(?=\n|$)/g;
const SCRIPT_PREVIEW_FENCE_START_REGEX = /(^|\n)```html-script-preview[^\n]*(?:\n|$)/i;
const SCRIPT_PREVIEW_HTML_DOCUMENT_REGEX = /(?:<!doctype\s+html|<html[\s>])/i;
const SCRIPT_PREVIEW_CHART_SIGNAL_REGEX = /(?:\bd3\.|window\.d3|<svg[\s>]|<canvas[\s>]|<script[\s>])/i;

const createScriptPreviewId = () => {
  // Non-security DOM id. crypto.randomUUID() is preferred; getRandomValues() is the fallback for environments without randomUUID (it has broader support, incl. non-secure contexts)
  const randomId = globalThis.crypto?.randomUUID?.() ?? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, '0')).join('');
  return `markdown-script-preview-${randomId}`;
};

const isScriptPreviewCodeElement = (codeElement) => {
  return [...codeElement.classList]
    .some(className => className === `language-${SCRIPT_PREVIEW_CODE_LANGUAGE}` || className === `lang-${SCRIPT_PREVIEW_CODE_LANGUAGE}`);
};

const toBase64String = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getScriptPreviewPlaceholder = (id) => {
  return `${SCRIPT_PREVIEW_PLACEHOLDER_PREFIX}_${id}`;
};

const createScriptPreviewIframeElement = (body, id, chartErrorText) => {
  const iframe = document.createElement('iframe');
  iframe.id = id;
  iframe.className = SCRIPT_PREVIEW_IFRAME_CLASS;
  iframe.setAttribute('sandbox', 'allow-scripts');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  iframe.setAttribute('loading', 'lazy');
  iframe.style.width = '100%';
  iframe.style.height = `${DEFAULT_IFRAME_HEIGHT}px`;
  iframe.style.border = '0';
  iframe.srcdoc = toScriptPreviewDocument(body, iframe.id, chartErrorText);
  return iframe;
};

const toScriptPreviewDocument = (body, id, chartErrorText) => {
  const encodedBody = toBase64String(body);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${SCRIPT_PREVIEW_CSP}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    html, body {
      box-sizing: border-box;
      margin: 0;
      min-height: 0;
    }
    *, *::before, *::after {
      box-sizing: inherit;
    }
    body {
      overflow: auto;
    }
    #${PREVIEW_ROOT_ID} {
      display: flow-root;
      min-height: 0;
    }
    .markdown-script-preview-error-card {
      color: #2c293d;
      font: 16px/1.6 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 12px;
    }
    .markdown-script-preview-error-title {
      font-weight: 700;
      margin-bottom: 8px;
    }
    .markdown-script-preview-error-message {
      margin-bottom: 12px;
    }
    .markdown-script-preview-error-details summary {
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .markdown-script-preview-error-detail {
      background: #f1f3f8;
      border: 1px solid #a9abb2;
      border-radius: 4px;
      color: #2c293d;
      font: 14px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin: 8px 0 0;
      max-height: 180px;
      overflow: auto;
      padding: 12px 16px;
      white-space: pre-wrap;
    }
  </style>
  <script>
    (() => {
      const previewId = ${JSON.stringify(id)};
      const chartErrorText = ${JSON.stringify(chartErrorText)};
      let hasShownError = false;
      const createErrorElement = (message) => {
        const card = document.createElement('section');
        card.className = 'markdown-script-preview-error-card';

        const title = document.createElement('div');
        title.className = 'markdown-script-preview-error-title';
        title.textContent = chartErrorText.title;

        const body = document.createElement('div');
        body.className = 'markdown-script-preview-error-message';
        body.textContent = chartErrorText.message;

        const details = document.createElement('details');
        details.className = 'markdown-script-preview-error-details';

        const summary = document.createElement('summary');
        summary.textContent = chartErrorText.detailsLabel;

        const detail = document.createElement('pre');
        detail.className = 'markdown-script-preview-error-detail';
        detail.textContent = message;

        details.append(summary, detail);
        card.append(title, body, details);

        return card;
      };
      const getContentHeight = () => {
        const root = document.getElementById('${PREVIEW_ROOT_ID}');
        if (!root) {
          return 0;
        }

        const rootRect = root.getBoundingClientRect();
        const contentBottom = Math.max(0, ...[root, ...root.querySelectorAll('*')].map((element) => {
            const rect = element.getBoundingClientRect();
            const marginBottom = Number.parseFloat(getComputedStyle(element).marginBottom) || 0;
            return rect.bottom - rootRect.top + marginBottom;
          }));
        return Math.ceil(Math.max(
          contentBottom,
          root.scrollHeight || 0,
          root.offsetHeight || 0
        ) + 16);
      };
      const resize = () => {
        const height = getContentHeight();
        parent.postMessage({ type: '${RESIZE_MESSAGE_TYPE}', id: previewId, height }, '*');
      };
      const showError = (message) => {
        if (hasShownError) return;
        hasShownError = true;

        const card = createErrorElement(message || chartErrorText.message);
        const target = document.getElementById('${PREVIEW_ROOT_ID}') || document.body || document.documentElement;
        target.prepend(card);
        resize();
      };
      window.addEventListener('error', event => showError(event.message || String(event.error || event)));
      window.addEventListener('unhandledrejection', event => showError(String(event.reason || event)));
      window.addEventListener('load', resize);
      window.addEventListener('resize', resize);
      window.markdownScriptPreviewResize = resize;
      window.markdownScriptPreviewShowError = showError;
      setTimeout(resize, 0);
      setTimeout(resize, 100);
      setTimeout(resize, 500);
      const observeSize = () => {
        const observer = new ResizeObserver(resize);
        const root = document.getElementById('${PREVIEW_ROOT_ID}');
        if (root) observer.observe(root);
        if (document.body) observer.observe(document.body);
      };
      if (document.body) {
        observeSize();
      } else {
        window.addEventListener('DOMContentLoaded', observeSize, { once: true });
      }
    })();
  </script>
  <script
    src="${D3_SCRIPT_URL}"
    integrity="${D3_SCRIPT_INTEGRITY}"
    crossorigin="anonymous"
    onerror="window.markdownScriptPreviewShowError?.()"
  ></script>
  <script type="text/plain" id="${PREVIEW_SOURCE_ID}">${encodedBody}</script>
  <script>
    (() => {
      const parsePreviewBody = () => {
        const source = document.getElementById('${PREVIEW_SOURCE_ID}');
        const binary = atob(source?.textContent?.trim() || '');
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      };

      const toPreviewFragment = (html) => {
        const previewDocument = new DOMParser().parseFromString(html, 'text/html');
        const fragment = document.createDocumentFragment();
        previewDocument.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => fragment.append(node.cloneNode(true)));
        const template = document.createElement('template');
        template.innerHTML = previewDocument.body?.innerHTML || html;
        fragment.append(template.content.cloneNode(true));
        return fragment;
      };

      const renderPreviewBody = async () => {
        const root = document.getElementById('${PREVIEW_ROOT_ID}');
        const body = parsePreviewBody();
        root.replaceChildren(toPreviewFragment(body));

        for (const originalScript of [...root.querySelectorAll('script')]) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            for (const { name, value } of [...originalScript.attributes]) {
              script.setAttribute(name, value);
            }
            script.onload = resolve;
            script.onerror = () => reject(new Error(script.src || 'inline script'));
            if (!originalScript.src) {
              script.textContent = originalScript.textContent;
              originalScript.replaceWith(script);
              resolve();
              return;
            }
            originalScript.replaceWith(script);
          });
        }

        window.markdownScriptPreviewResize?.();
      };

      window.addEventListener('load', () => {
        renderPreviewBody().catch(error => window.markdownScriptPreviewShowError?.(error.message || String(error)));
      });
    })();
  </script>
</head>
<body>
<div id="${PREVIEW_ROOT_ID}"></div>
</body>
</html>`;
};

class markdownScriptPreviewUtils {
  static isLikelyStreamingScriptPreview(markdown) {
    if (!markdown) return false;
    return SCRIPT_PREVIEW_FENCE_START_REGEX.test(markdown) || (SCRIPT_PREVIEW_HTML_DOCUMENT_REGEX.test(markdown) && SCRIPT_PREVIEW_CHART_SIGNAL_REGEX.test(markdown));
  }

  static extractScriptPreviewBlocksFromMarkdown(markdown, { idFactory = createScriptPreviewId } = {}) {
    const previews = [];
    if (!markdown) {
      return {
        markdown,
        previews,
      };
    }

    const processed = markdown.replace(SCRIPT_PREVIEW_FENCE_REGEX, (match, leadingNewline, body) => {
      const id = idFactory();
      previews.push({ id, body });
      return `${leadingNewline}${getScriptPreviewPlaceholder(id)}`;
    });

    return {
      markdown: processed,
      previews,
    };
  }

  static replaceScriptPreviewPlaceholders(html, previews, chartErrorText) {
    if (!html || typeof document === 'undefined' || !previews?.length) return { html };

    let processed = html;
    previews.forEach(({ id, body }) => {
      const iframe = createScriptPreviewIframeElement(body, id, chartErrorText);
      const rawPlaceholder = getScriptPreviewPlaceholder(id);
      const placeholder = escapeRegExp(rawPlaceholder);
      // placeholder is escaped via escapeRegExp() and system-generated, not user input
      // The paragraph variant needs a regex for the surrounding `\s*` whitespace tolerance
      // nosemgrep: eslint.detect-non-literal-regexp
      const paragraphRegex = new RegExp(`<p>\\s*${placeholder}\\s*</p>`, 'g');
      // Use a function replacer so any `$`-patterns ($&, $1, $$) in the iframe HTML are inserted literally rather than interpreted as replacement tokens
      const replaceWithIframe = () => iframe.outerHTML;
      processed = processed
        .replace(paragraphRegex, replaceWithIframe)
        .replaceAll(rawPlaceholder, replaceWithIframe);
    });

    return { html: processed };
  }

  static extractScriptPreviewBlocks(html, { idFactory = createScriptPreviewId, chartErrorText } = {}) {
    if (!html || typeof document === 'undefined') return { html };

    const container = document.createElement('div');
    container.innerHTML = html;

    container.querySelectorAll('pre > code').forEach((codeElement) => {
      if (!isScriptPreviewCodeElement(codeElement)) return;

      const iframe = createScriptPreviewIframeElement(codeElement.textContent, idFactory(), chartErrorText);
      codeElement.closest('pre')?.replaceWith(iframe);
    });

    return {
      html: container.innerHTML,
    };
  }
}

export { D3_SCRIPT_URL, RESIZE_MESSAGE_TYPE, SCRIPT_PREVIEW_IFRAME_CLASS };
export default markdownScriptPreviewUtils;
