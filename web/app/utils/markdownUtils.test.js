// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import markdownUtils from './markdownUtils';

describe('markdownUtils.parseFrontmatter', () => {
  test('parses key/value pairs from a leading frontmatter block', () => {
    const md = '---\ntitle: Hello\nauthor: A\n---\n\n# Body';
    expect(markdownUtils.parseFrontmatter(md)).toEqual({ title: 'Hello', author: 'A' });
  });

  test('returns null when the document has no frontmatter', () => {
    expect(markdownUtils.parseFrontmatter('# Just a heading')).toBeNull();
  });

  test('returns null when the frontmatter block contains only blank lines', () => {
    expect(markdownUtils.parseFrontmatter('---\n\n---\n\nbody')).toBeNull();
  });
});

describe('markdownUtils.frontmatterToMarkdownTable', () => {
  test('renders frontmatter entries as a markdown table with an empty header row', () => {
    const table = markdownUtils.frontmatterToMarkdownTable({ title: 'A', author: 'B' });
    expect(table).toContain('|   |   |');
    expect(table).toContain('|---|---|');
    expect(table).toContain('| Title | A |');
  });

  test('replaces empty values with a dash', () => {
    expect(markdownUtils.frontmatterToMarkdownTable({ key: '' })).toContain('| Key | - |');
  });
});

describe('markdownUtils.removeHeadings', () => {
  test('strips heading markers from every line', () => {
    expect(markdownUtils.removeHeadings('# A\n## B\nbody')).toBe('A\nB\nbody');
  });

  test('returns an empty string for falsy input', () => {
    expect(markdownUtils.removeHeadings('')).toBe('');
  });
});

describe('markdownUtils.toHtml', () => {
  test('renders markdown to HTML output', () => {
    const html = markdownUtils.toHtml('# Hello');
    expect(html).toContain('Hello');
    expect(html).toContain('<h1');
  });

  test('prepends a frontmatter table when frontmatter is present', () => {
    const html = markdownUtils.toHtml('---\ntitle: T\n---\n\nbody');
    expect(html).toContain('class="frontmatter"');
  });

  test('hides the frontmatter table when hideFrontmatter is true', () => {
    const html = markdownUtils.toHtml('---\ntitle: T\n---\n\nbody', { hideFrontmatter: true });
    expect(html).not.toContain('class="frontmatter"');
  });
});

describe('markdownUtils.linkifyPhones', () => {
  test('wraps detected phone numbers in tel: anchors', () => {
    const html = markdownUtils.linkifyPhones('<p>Call 0912-345-678 now</p>');
    expect(html).toContain('href="tel:+886912345678"');
  });

  test('does not modify text inside existing anchors', () => {
    const html = markdownUtils.linkifyPhones('<a href="https://x.com">0912-345-678</a>');
    expect(html).not.toContain('tel:');
  });

  test.each(['<code>0912-345-678</code>', '<pre>0912-345-678</pre>'])(
    'leaves phone-like text inside %s untouched',
    (input) => {
      expect(markdownUtils.linkifyPhones(input)).not.toContain('tel:');
    },
  );

  test('returns the input unchanged when it is empty', () => {
    expect(markdownUtils.linkifyPhones('')).toBe('');
  });
});
