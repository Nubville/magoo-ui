#!/usr/bin/env node
/**
 * Structural checks for every SDC in components/. Fails the process on any problem.
 *
 *  1. Directory has <name>.component.yml and <name>.twig.
 *  2. The YAML validates against Drupal's SDC metadata schema (vendored in schemas/).
 *  3. Every prop the Twig reads is declared, and every declared prop is used.
 *  4. Component CSS starts by declaring the layer order (aggregation can reorder files).
 *  5. Shipped files (css, twig, js, yml) don't reference build output.
 *  6. Events a component's JS dispatches are named mg-<component>-<event> (kebab-case), as a string literal so this can be checked.
 *  7. A story file has no `parameters` key beside `...sdcMeta()` in its default export: the spread's own `parameters`
 *     overwrites it, which silently shrink-wrapped the layout stories. Pass `layout` to sdcMeta() instead.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import Ajv from 'ajv-draft-04';

const root = join(import.meta.dirname, '..');
const componentsDir = join(root, 'components');
const errors = [];
const fail = (component, message) => errors.push(`${component}: ${message}`);

const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
const schemaOf = (file) => JSON.parse(readFileSync(join(root, 'schemas', file), 'utf8'));
ajv.addSchema(schemaOf('metadata-full.schema.json'));
const validate = ajv.compile(schemaOf('metadata.schema.json'));

// Variables Drupal or Twig provide that are not props.
const provided = new Set([
  'attributes',
  'variant_id',
  'componentMetadata',
  'loop',
  '_self',
  '_context',
  'true',
  'false',
  'null',
]);

const twigVariables = (source) => {
  const stripped = source.replace(/\{#[\s\S]*?#\}/g, '');
  const names = new Set();
  const locals = new Set();
  for (const match of stripped.matchAll(/\{%\s*set\s+(\w+)/g)) locals.add(match[1]);
  for (const match of stripped.matchAll(/\{%\s*for\s+(\w+)(?:\s*,\s*(\w+))?\s+in/g)) {
    locals.add(match[1]);
    if (match[2]) locals.add(match[2]);
  }
  // Only inspect inside {{ }} and {% %}, then take identifiers that aren't attribute/property accesses or strings.
  for (const [, body] of stripped.matchAll(/\{[{%]-?([\s\S]*?)-?[}%]\}/g)) {
    const code = body.replace(/(['"])(?:\\.|(?!\1).)*\1/g, '""');
    for (const match of code.matchAll(/(?<![.\w|])([a-zA-Z_]\w*)\b(?!\s*\()/g)) names.add(match[1]);
  }
  const keywords = new Set([
    'set',
    'if',
    'else',
    'elseif',
    'endif',
    'for',
    'endfor',
    'in',
    'is',
    'not',
    'and',
    'or',
    'block',
    'endblock',
    'include',
    'embed',
    'endembed',
    'with',
    'only',
    'default',
    'ternary',
    'empty',
    'defined',
    'null',
    'true',
    'false',
    'trans',
    'endtrans',
    'extends',
    'as',
  ]);
  const read = [...names].filter((n) => !keywords.has(n) && !provided.has(n));
  // `set x = x|default(...)` shadows a prop, so locals count as usage but never as undeclared reads.
  return { read, undeclared: read.filter((n) => !locals.has(n)) };
};

const dirs = readdirSync(componentsDir).filter((entry) => statSync(join(componentsDir, entry)).isDirectory());
if (dirs.length === 0) fail('components/', 'no components found');

for (const name of dirs) {
  const dir = join(componentsDir, name);
  const ymlPath = join(dir, `${name}.component.yml`);
  const twigPath = join(dir, `${name}.twig`);

  for (const path of [ymlPath, twigPath]) {
    if (!existsSync(path)) fail(name, `missing ${path.replace(`${dir}/`, '')}`);
  }
  if (!existsSync(ymlPath) || !existsSync(twigPath)) continue;

  const metadata = load(readFileSync(ymlPath, 'utf8'));
  if (!validate(metadata)) {
    for (const error of validate.errors) fail(name, `component.yml ${error.instancePath || '/'} ${error.message}`);
  }

  // `variant` is not a prop: Drupal injects it from `variants:` (and always as '' when none is chosen, which
  // would fail an enum prop). Declaring it as a prop is an error.
  if (metadata?.props?.properties?.variant) fail(name, 'declare variants under `variants:`, not as a `variant` prop');
  const declared = new Set([
    ...Object.keys(metadata?.props?.properties ?? {}),
    ...Object.keys(metadata?.slots ?? {}),
    ...(metadata?.variants ? ['variant'] : []),
  ]);
  const { read, undeclared } = twigVariables(readFileSync(twigPath, 'utf8'));
  const used = new Set(read);
  for (const variable of undeclared)
    if (!declared.has(variable)) fail(name, `Twig reads "${variable}" but it is not a declared prop or slot`);
  for (const variable of declared)
    if (!used.has(variable)) fail(name, `"${variable}" is declared but never used in the Twig`);

  const cssPath = join(dir, `${name}.css`);
  if (
    existsSync(cssPath) &&
    !/^\s*(\/\*[\s\S]*?\*\/\s*)*@layer mg\.tokens, mg\.base, mg\.components, mg\.enhanced;/.test(
      readFileSync(cssPath, 'utf8'),
    )
  )
    fail(
      name,
      `${name}.css must declare "@layer mg.tokens, mg.base, mg.components, mg.enhanced;" before its own layers`,
    );

  const stories = join(dir, `${name}.stories.js`);
  if (existsSync(stories)) {
    const source = readFileSync(stories, 'utf8');
    const meta = source.slice(source.indexOf('export default {'), source.search(/\nexport const /));
    if (/^ {2}parameters\s*:/m.test(meta))
      fail(
        name,
        `${name}.stories.js sets \`parameters\` beside ...sdcMeta(), which overwrites it. Pass e.g. layout: 'fullscreen' to sdcMeta().`,
      );
  }

  for (const file of readdirSync(dir)) {
    if (/\.(css|twig|js|yml)$/.test(file) && !/\.(stories|test)\.js$/.test(file)) {
      const source = readFileSync(join(dir, file), 'utf8');
      if (/\b(dist|build)\//.test(source)) fail(name, `${file} references build output`);
      if (file.endsWith('.js')) {
        const eventName = new RegExp(`^mg-${name}-[a-z][a-z0-9]*(-[a-z0-9]+)*$`);
        for (const [, first] of source.matchAll(/new\s+(?:Custom)?Event\(\s*(.?)/g)) {
          if (!/['"`]/.test(first))
            fail(name, `${file} dispatches an event whose name is not a string literal, so it cannot be checked`);
        }
        for (const [, , type] of source.matchAll(/new\s+(?:Custom)?Event\(\s*(['"`])([^'"`]*)\1/g)) {
          if (!eventName.test(type))
            fail(name, `${file} dispatches "${type}", events must be named mg-${name}-<event>`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `✖ ${error}`).join('\n'));
  process.exit(1);
}
console.log(`✔ ${dirs.length} component(s) valid: ${dirs.join(', ')}`);
