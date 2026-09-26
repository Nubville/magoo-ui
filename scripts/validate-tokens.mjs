#!/usr/bin/env node
/**
 * Enforces the three-tier token rules. Fails the process on any violation.
 *
 *  1. primitives.css: values are literals, nothing references another token.
 *  2. semantic.css: values only reference primitives (no color literals), and never redefine a primitive.
 *  3. base.css and every component CSS: only reference semantic tokens, plus a component's own --mg-<name>-* API.
 *     Never a primitive, never an unknown token.
 *  4. Every CSS file under tokens/ and components/ keeps all rules inside an @layer mg.* block, so layer order
 *     (not selector specificity) decides which tier wins. Only @layer, @property, @keyframes and @font-face may sit outside.
 *  5. Every CSS file under tokens/ and themes/ repeats the layer-order statement first (aggregation can reorder files).
 *  6. themes/<name>.css (a brand): a literal value must redeclare an existing primitive, and a var()/light-dark() value
 *     must remap an existing semantic token to primitives only. A brand never invents tokens, add a step to
 *     primitives.css first. Its selector must be [data-mg-theme='<name>'], matching the file name.
 *  7. Every brand is linked in .storybook/preview-head.html. Storybook loads brand CSS from there, and the contrast page
 *     would otherwise show the default colors under a brand's name, which reads as a false pass.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const errors = [];
const fail = (file, message) => errors.push(`${file}: ${message}`);

const read = (path) => readFileSync(join(root, path), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const definitions = (css) =>
  [...strip(css).matchAll(/(--mg-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
const references = (css) => [...strip(css).matchAll(/var\(\s*(--mg-[a-z0-9-]+)/g)].map((m) => m[1]);

// Semantic values that are allowed to be a literal because no primitive could sensibly hold them.
const literalAllowed = new Set(['--mg-motion-duration']);

const primitives = new Map(definitions(read('tokens/primitives.css')));
const semantic = new Map(definitions(read('tokens/semantic.css')));

for (const [name, value] of primitives) {
  if (value.includes('var('))
    fail('tokens/primitives.css', `${name} references another token, primitives must be literals`);
}

for (const [name, value] of definitions(read('tokens/semantic.css'))) {
  if (primitives.has(name)) fail('tokens/semantic.css', `${name} redefines a primitive`);
  for (const ref of references(`${name}: ${value};`)) {
    if (!primitives.has(ref)) fail('tokens/semantic.css', `${name} references ${ref}, which is not a primitive`);
  }
  const leftover = value.replace(/var\(--[a-z0-9-]+\)|light-dark\(|[,\s)]/g, '');
  if (leftover && !literalAllowed.has(name))
    fail('tokens/semantic.css', `${name} contains a literal (${leftover}), use a primitive`);
}

const themeFiles = readdirSync(join(root, 'themes')).filter((f) => f.endsWith('.css'));
for (const file of themeFiles) {
  const path = `themes/${file}`;
  const css = read(path);
  const name = file.replace(/\.css$/, '');
  if (!strip(css).includes(`[data-mg-theme='${name}']`))
    fail(path, `must select [data-mg-theme='${name}'] (the selector matches the file name)`);
  for (const [token, value] of definitions(css)) {
    if (!value.includes('var(') && !value.includes('light-dark(')) {
      if (!primitives.has(token))
        fail(path, `${token} is a literal but not an existing primitive, add it to primitives.css`);
      continue;
    }
    if (!semantic.has(token)) fail(path, `${token} remaps a token that is not a semantic token`);
    for (const ref of references(`${token}: ${value};`)) {
      if (!primitives.has(ref)) fail(path, `${token} references ${ref}, which is not a primitive`);
    }
    const leftover = value.replace(/var\(--[a-z0-9-]+\)|light-dark\(|[,\s)]/g, '');
    if (leftover && !literalAllowed.has(token))
      fail(path, `${token} contains a literal (${leftover}), use a primitive`);
  }
}

const previewHead = read('.storybook/preview-head.html');
for (const file of themeFiles) {
  if (!previewHead.includes(`/magoo/themes/${file}`))
    fail(
      '.storybook/preview-head.html',
      `does not link /magoo/themes/${file}, add it (Storybook and the contrast page need it)`,
    );
}

const consumers = [{ file: 'tokens/base.css', own: null }];
for (const name of readdirSync(join(root, 'components'))) {
  for (const file of readdirSync(join(root, 'components', name))) {
    if (file.endsWith('.css')) consumers.push({ file: `components/${name}/${file}`, own: `--mg-${name}-` });
  }
}

for (const { file, own } of consumers) {
  for (const ref of new Set(references(read(file)))) {
    if (own && ref.startsWith(own)) continue;
    if (primitives.has(ref)) fail(file, `references primitive ${ref}, use a semantic token`);
    else if (!semantic.has(ref)) fail(file, `references unknown token ${ref}`);
  }
}

const layerStatement = /^\s*(\/\*[\s\S]*?\*\/\s*)*@layer mg\.tokens, mg\.base, mg\.components, mg\.enhanced;/;
for (const path of [
  ...readdirSync(join(root, 'tokens'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => `tokens/${f}`),
  ...themeFiles.map((f) => `themes/${f}`),
]) {
  if (!layerStatement.test(read(path))) fail(path, 'must declare the @layer order before its own layers');
}

// Walk the top level of each file: anything that is not an allowed at-rule is an unlayered rule.
const topLevelPreludes = (css) => {
  const preludes = [];
  let depth = 0;
  let current = '';
  for (const char of strip(css)) {
    if (char === '{') {
      if (depth === 0) preludes.push(current.trim());
      depth++;
      current = '';
    } else if (char === '}') {
      depth--;
      current = '';
    } else if (char === ';' && depth === 0) {
      preludes.push(current.trim());
      current = '';
    } else if (depth === 0) {
      current += char;
    }
  }
  return preludes;
};

const allowedAtRules = /^@(layer mg\.|property |keyframes |font-face)/;
const shipped = [
  ...readdirSync(join(root, 'tokens'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => `tokens/${f}`),
  ...themeFiles.map((f) => `themes/${f}`),
  ...consumers.map((c) => c.file),
];
for (const file of new Set(shipped)) {
  for (const prelude of topLevelPreludes(read(file))) {
    if (prelude && !allowedAtRules.test(prelude)) fail(file, `"${prelude}" is outside an @layer mg.* block`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `✖ ${error}`).join('\n'));
  process.exit(1);
}
console.log(
  `✔ tokens valid: ${primitives.size} primitive, ${semantic.size} semantic, ${themeFiles.length} brand(s), ${consumers.length} consumer file(s) reference semantic only`,
);
