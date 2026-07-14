---
paths:
  - "app/utils/*.test.js"
---

# Utils Test Conventions

Applies to unit tests for files in `app/utils/`. Run with
`npm run test:unit -- --run`.

## File & imports

- Co-locate: `app/utils/strUtils.js` ↔ `app/utils/strUtils.test.js`.
- Always use `test`, never `it`.
- Standard import order:

  ```js
  import { describe, expect, test } from 'vitest';
  import strUtils from './strUtils';
  ```

## describe structure

One `describe` per public method. Format the label as `<utilName>.<methodName>`:

```js
describe('strUtils.toTitleCase', () => { ... });
describe('strUtils.toCamelCase', () => { ... });
```

Only nest a second `describe` when a single method has distinct modes that
need shared setup (e.g. `markdownUtils.toHtml` with vs. without `generateToc`).

## Test name style

Third-person present indicative. No `should`.

- `'returns null when input is empty'`
- `'preserves uppercase acronyms'`
- ✗ `'should return null...'`
- ✗ `'test empty input'`

For `test.each`, embed inputs/outputs with `%j`/`%s`:

```js
test.each([
  ['api', 'API'],
  ['id', 'ID'],
])('preserves acronym %j as %j', (input, expected) => { ... });
```

## Four-quadrant coverage

Every public method covers all four quadrants (unless N/A — note the omission
in the MR description):

| Quadrant | What it tests |
|---|---|
| **Happy path** | Primary use case with typical input |
| **Empty / nullish** | `''`, `null`, `undefined`, `[]`, `{}` |
| **Boundary** | Single element, very long, unicode, special chars |
| **Option / branch** | Each option flag or conditional branch |

Add an **Error** quadrant when the method has a `throw` path.

## Test count guidelines

| Method shape | Tests |
|---|---|
| Trivial wrapper (< 5 lines, no branches) | 1–2 |
| Pure function, single branch | 3–4 |
| With options / multiple branches | 4–6 |
| Complex / multi-mode | 6–10 (collapse with `test.each`) |
| File soft cap | ~25 tests; if exceeded, simplify or split |

Three or more tests of the same shape → collapse to `test.each`.

## Assertions

- Primitives → `.toBe()`
- Deep equality → `.toEqual()`
- Errors → `.toThrow(/regex/)` or `.toThrow(SpecificError)`
- Absence → `.toBeNull()` / `.toBeUndefined()` (don't mix with `.toBe(null)`)
- Max 3 `expect`s per test; otherwise split or use `test.each`.

## Mocks & setup

- Never mock the SUT's own internal methods.
- Mock third-party modules only when unavoidable (`vi.mock('libphonenumber-js')`).
- Avoid `beforeEach`/`beforeAll` unless there's genuine shared state
  (e.g. fake timers, which must be paired with `useRealTimers()`).

## Async

- Use `async`/`await`, never `.then`.
- `delay` / `waitFor` style tests use `vi.useFakeTimers()` +
  `vi.advanceTimersByTimeAsync()` — don't actually wait.

## Comments & fixtures

- No comments in tests; the name carries the intent.
- Inline fixtures by default. Reused values go at the top of the file as
  `const FIXTURE_X = ...`.
- No `__fixtures__/` directory unless data is shared across files.

## MR description

Add a `## Coverage` block listing tested methods and any deliberately skipped
branches with rationale, so reviewers can verify scope.

## Skeleton

```js
import { describe, expect, test } from 'vitest';
import strUtils from './strUtils';

describe('strUtils.toTitleCase', () => {
  test('converts space-separated words', () => {
    expect(strUtils.toTitleCase('hello world')).toBe('Hello World');
  });

  test('returns empty string for empty input', () => {
    expect(strUtils.toTitleCase('')).toBe('');
  });

  test.each([
    ['api', 'API'],
    ['id', 'ID'],
    ['url', 'URL'],
  ])('preserves acronym %j as %j', (input, expected) => {
    expect(strUtils.toTitleCase(input)).toBe(expected);
  });

  test('treats dashes and underscores as word separators', () => {
    expect(strUtils.toTitleCase('foo-bar_baz')).toBe('Foo Bar Baz');
  });
});
```
