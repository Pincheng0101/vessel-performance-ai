import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const EXAMPLES_DIR = path.resolve(__dirname);

const LANGUAGES = ['python', 'node', 'shell'];

const REQUIRED_HEADERS = [
  'hq-user-api-key',
  'x-api-key',
  'content-type',
];

const OPERATIONS = [
  { name: 'start-execution', isHttp: true, hasPayload: true, requiredHeaders: REQUIRED_HEADERS },
  { name: 'get-execution', isHttp: true, hasPayload: false, requiredHeaders: REQUIRED_HEADERS },
  { name: 'start-agent', isHttp: true, hasPayload: true, requiredHeaders: REQUIRED_HEADERS },
  { name: 'connect-agent', isHttp: false, hasPayload: false, requiredHeaders: [] },
];

const FILE_EXT = {
  python: '.py',
  node: '.js',
  shell: '.bash',
};

const readExample = (lang, operation) => {
  const filePath = path.join(EXAMPLES_DIR, lang, `${operation}${FILE_EXT[lang]}`);
  // filePath is built from hardcoded LANGUAGES/OPERATIONS constants in this test, not user
  // input. False positive — test-only file, no external path traversal vector.
  // nosemgrep: eslint.detect-non-literal-fs-filename
  return fs.readFileSync(filePath, 'utf-8');
};

describe('code-examples', () => {
  for (const lang of LANGUAGES) {
    for (const operation of OPERATIONS) {
      const fileName = `${lang}/${operation.name}${FILE_EXT[lang]}`;

      describe(fileName, () => {
        const content = readExample(lang, operation.name);

        test('should not be empty', () => {
          expect(content.trim().length).toBeGreaterThan(0);
        });

        if (operation.isHttp) {
          test('should contain base URL placeholder', () => {
            expect(content).toContain('___PLACEHOLDER_BASE_URL___');
          });

          test('should contain correct API endpoint', () => {
            expect(content).toContain(`/runtime/${operation.name}`);
          });

          test('should reference all required headers', () => {
            for (const header of operation.requiredHeaders) {
              expect(content.toLowerCase()).toContain(header);
            }
          });
        } else {
          test('should contain agent ID placeholder', () => {
            expect(content).toContain('___PLACEHOLDER_AGENT_ID___');
          });
        }

        if (operation.hasPayload) {
          test('should contain payload placeholder', () => {
            expect(content).toContain('___PLACEHOLDER_PAYLOAD___');
          });
        }
      });
    }
  }

  test('all languages should have the same set of example files', () => {
    for (const lang of LANGUAGES) {
      const langDir = path.join(EXAMPLES_DIR, lang);
      // langDir is built from the hardcoded LANGUAGES constant, not user input. False
      // positive — test-only file, no external path traversal vector.
      // nosemgrep: eslint.detect-non-literal-fs-filename
      const files = fs.readdirSync(langDir).sort();
      const expected = OPERATIONS.map((op) => `${op.name}${FILE_EXT[lang]}`).sort();
      expect(files).toEqual(expected);
    }
  });
});
