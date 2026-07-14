import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';

const languages = {
  bash,
  css,
  go,
  javascript,
  json,
  php,
  python,
  typescript,
  yaml,
};

Object.entries(languages).forEach(([name, language]) => {
  hljs.registerLanguage(name, language);
});

export default hljs;
