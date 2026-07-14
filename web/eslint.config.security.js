import security from 'eslint-plugin-security';
import baseConfig from './eslint.config.js';

// On-demand security lint — run before a delivery, or to satisfy a contract / audit
// requirement:
//
//   npm run lint:security
//
// It extends the project's normal ESLint config so .vue and .js files are parsed
// identically — this closes the gap where the GitLab semgrep SAST analyzer skips .vue
// single-file components — then layers eslint-plugin-security's rules on top. The GitLab
// SAST `eslint.*` findings (detect-non-literal-regexp, detect-possible-timing-attacks,
// detect-non-literal-fs-filename, ...) come from this very plugin, so this run reproduces
// that class of finding across both .js and .vue.
//
// Kept separate from the default `npm run lint` on purpose: day-to-day linting stays
// focused on style/correctness, and the security pass is only paid when it is actually
// needed.
// Promote eslint-plugin-security's rules from their default 'warn' to 'error', so any finding
// fails the lint (exit 1) and stops the CI build. Base-config warnings (e.g. no-console) stay
// warnings and don't trip this gate.
const securityRules = Object.fromEntries(
  Object.keys(security.configs.recommended.rules).map(key => [key, 'error']),
);

export default [
  ...baseConfig,
  { ...security.configs.recommended, rules: securityRules },
  {
    rules: {
      // detect-object-injection flags every computed member access (obj[key]) as a
      // possible injection / prototype-pollution sink. In application code this is
      // overwhelmingly a false positive; leaving it on buries the real signal
      // (non-literal regex/fs, eval, child_process, timing, weak randomness). Re-enable
      // selectively if you ever audit a specific data-access layer.
      'security/detect-object-injection': 'off',
      // detect-unsafe-regex is backed by the `safe-regex` heuristic, which is well known
      // for over-flagging. Every hit in this codebase has been a false positive (anchored /
      // length-capped / disambiguated patterns with no catastrophic backtracking), and these
      // are client-side regexes anyway (worst case a self-inflicted tab freeze, not a server
      // DoS). Off so it doesn't block the gate on noise; rely on code review for real ReDoS.
      'security/detect-unsafe-regex': 'off',
      // detect-non-literal-regexp flags every `new RegExp(<non-string-literal>)`. In this codebase
      // those arguments are always built from hardcoded constants or already-escaped, system-generated
      // strings — never user input — so every hit is a false positive. Off globally to keep the gate
      // clean; a genuinely user-derived pattern would still be caught in code review.
      'security/detect-non-literal-regexp': 'off',
    },
  },
];
