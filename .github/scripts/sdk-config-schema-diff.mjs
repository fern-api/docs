// Compares the SDK Config v1 schema between two published versions of
// @postman/sdk-config and writes a Markdown report for a docs issue.
//
// Usage: node sdk-config-schema-diff.mjs <from-version> <to-version> <output.md>
// Exits 0 and writes the report; prints "changed=true|false" to $GITHUB_OUTPUT.

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PACKAGE = '@postman/sdk-config';
const MAX_BODY = 60000;
const DOCS_FILES = ['README.md', 'docs/migration.md'];

const [fromVersion, toVersion, outputPath] = process.argv.slice(2);
if (!fromVersion || !toVersion || !outputPath) {
  console.error('Usage: node sdk-config-schema-diff.mjs <from-version> <to-version> <output.md>');
  process.exit(1);
}

function install(version) {
  const dir = mkdtempSync(join(tmpdir(), `sdk-config-${version}-`));
  writeFileSync(join(dir, 'package.json'), '{"private":true}');
  execFileSync(
    'npm',
    ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--engine-strict=false', `${PACKAGE}@${version}`],
    { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  return dir;
}

function loadFields(dir) {
  const require = createRequire(join(dir, 'package.json'));
  const { sdkConfigV1Schema } = require(`${PACKAGE}/sdk-config/v1`);
  const { z } = require('zod');
  const jsonSchema = z.toJSONSchema(sdkConfigV1Schema, { io: 'input', unrepresentable: 'any' });
  const fields = new Map();
  walk(jsonSchema, '', false, jsonSchema.$defs ?? {}, new Set(), fields);
  return fields;
}

function resolve(node, defs) {
  if (node && typeof node.$ref === 'string') {
    const name = node.$ref.replace(/^#\/\$defs\//, '');
    return { node: defs[name] ?? {}, ref: name };
  }
  return { node: node ?? {}, ref: undefined };
}

function discriminator(variant) {
  for (const [key, prop] of Object.entries(variant.properties ?? {})) {
    if (prop && prop.const !== undefined) return `[${key}=${prop.const}]`;
  }
  return undefined;
}

function record(fields, path, node, required) {
  if (!path) return;
  const entry = fields.get(path) ?? { types: new Set(), values: new Set(), required, description: '' };
  if (node.type) [].concat(node.type).forEach((t) => entry.types.add(t));
  if (node.const !== undefined) entry.values.add(JSON.stringify(node.const));
  for (const v of node.enum ?? []) entry.values.add(JSON.stringify(v));
  if (node.default !== undefined) entry.default = JSON.stringify(node.default);
  if (node.deprecated) entry.deprecated = true;
  if (!entry.description && node.description) entry.description = node.description;
  entry.required = entry.required || required;
  fields.set(path, entry);
}

function walk(rawNode, path, required, defs, seen, fields) {
  const { node, ref } = resolve(rawNode, defs);
  if (ref) {
    if (seen.has(ref)) return;
    seen = new Set(seen).add(ref);
  }
  if (rawNode?.description && !node.description) node.description = rawNode.description;
  record(fields, path, node, required);

  for (const part of node.allOf ?? []) walk(part, path, required, defs, seen, fields);
  for (const variant of [...(node.oneOf ?? []), ...(node.anyOf ?? [])]) {
    const resolved = resolve(variant, defs).node;
    const suffix = resolved.type === 'object' ? discriminator(resolved) : undefined;
    const variantPath = suffix ? `${path.endsWith('[]') ? path.slice(0, -2) : path}${suffix}` : path;
    walk(variant, variantPath, suffix ? false : required, defs, seen, fields);
  }

  const requiredKeys = new Set(node.required ?? []);
  for (const [key, child] of Object.entries(node.properties ?? {})) {
    walk(child, path ? `${path}.${key}` : key, requiredKeys.has(key), defs, seen, fields);
  }
  if (node.items) walk(node.items, `${path}[]`, false, defs, seen, fields);
  if (node.additionalProperties && typeof node.additionalProperties === 'object') {
    walk(node.additionalProperties, `${path}.<key>`, false, defs, seen, fields);
  }
}

function describe(entry) {
  return {
    type: [...entry.types].sort().join(' | ') || 'any',
    values: [...entry.values].sort().join(', '),
    required: entry.required ? 'yes' : 'no',
    default: entry.default ?? '',
    deprecated: entry.deprecated ? 'yes' : 'no',
    description: entry.description,
  };
}

const leaf = (path) => path.split('.').pop();
const parent = (path) => path.split('.').slice(0, -1).join('.');
const code = (value) => (value ? `\`${String(value).replace(/`/g, "'")}\`` : '—');
const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');

function diffFields(before, after) {
  let added = [...after.keys()].filter((p) => !before.has(p)).sort();
  let removed = [...before.keys()].filter((p) => !after.has(p)).sort();

  const renames = [];
  for (const from of [...removed]) {
    const old = describe(before.get(from));
    const to = added.find((p) => {
      const now = describe(after.get(p));
      if (!old.description || now.description !== old.description || now.type !== old.type) return false;
      return leaf(p) === leaf(from) || parent(p) === parent(from);
    });
    if (to) {
      renames.push({ from, to });
      removed = removed.filter((p) => p !== from);
      added = added.filter((p) => p !== to);
    }
  }

  const changed = [];
  for (const path of [...after.keys()].filter((p) => before.has(p)).sort()) {
    const old = describe(before.get(path));
    const now = describe(after.get(path));
    for (const key of ['type', 'values', 'required', 'default', 'deprecated', 'description']) {
      if (old[key] !== now[key]) changed.push({ path, key, from: old[key], to: now[key] });
    }
  }
  return { added, removed, renames, changed };
}

function topLevel(path) {
  return path.split(/[.[]/)[0];
}

function fieldTable(paths, fields) {
  const rows = paths.map((p) => {
    const d = describe(fields.get(p));
    return `| ${code(p)} | ${code(d.type)} | ${cell(d.values) || '—'} | ${d.required} | ${cell(d.description) || '—'} |`;
  });
  return ['| Field | Type | Allowed values | Required | Description |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function grouped(paths, render) {
  const groups = new Map();
  for (const p of paths) groups.set(topLevel(p), [...(groups.get(topLevel(p)) ?? []), p]);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, items]) => `#### \`${group}\`\n\n${render(items)}`)
    .join('\n\n');
}

function docsDiff(fromDir, toDir) {
  const sections = [];
  for (const file of DOCS_FILES) {
    const a = join(fromDir, 'node_modules', PACKAGE, file);
    const b = join(toDir, 'node_modules', PACKAGE, file);
    const aText = existsSync(a) ? readFileSync(a, 'utf8') : '';
    const bText = existsSync(b) ? readFileSync(b, 'utf8') : '';
    if (aText === bText) continue;
    let patch = '';
    try {
      execFileSync('git', ['diff', '--no-index', '--no-color', '-U2', a, b], { encoding: 'utf8' });
    } catch (error) {
      patch = String(error.stdout ?? '').split('\n').slice(4).join('\n');
    }
    sections.push({ file, patch });
  }
  return sections;
}

const fromDir = install(fromVersion);
const toDir = install(toVersion);
const before = loadFields(fromDir);
const after = loadFields(toDir);
const { added, removed, renames, changed } = diffFields(before, after);
const docs = docsDiff(fromDir, toDir);
const hasChanges = added.length + removed.length + renames.length + changed.length + docs.length > 0;

const npmLink = (v) => `[${v}](https://www.npmjs.com/package/${PACKAGE}/v/${v})`;
const lines = [
  `\`${PACKAGE}\` changed from ${npmLink(fromVersion)} to ${npmLink(toVersion)}. This report compares the SDK Config v1 schema (\`sdkConfigV1Schema\`) and the docs bundled in the npm package.`,
  '',
  'Check each change against the [SDK Config reference](https://buildwithfern.com/learn/sdks/reference/sdk-config) and the Current SDK pages under `fern/products/sdks/`. Field paths use `targets[language=<lang>]` for language-specific settings and `<key>` for map keys.',
  '',
  `| Change | Count |`,
  `| --- | --- |`,
  `| Added fields | ${added.length} |`,
  `| Removed fields | ${removed.length} |`,
  `| Possible renames or moves | ${renames.length} |`,
  `| Changed field properties | ${changed.length} |`,
  `| Changed package docs | ${docs.length} |`,
];

if (renames.length) {
  lines.push('', '### Possible renames or moves', '', 'Matched by identical description and type, with the same field name or the same parent. Confirm before updating the docs.', '');
  lines.push('| Before | After |', '| --- | --- |', ...renames.map((r) => `| ${code(r.from)} | ${code(r.to)} |`));
}
if (added.length) lines.push('', '### Added fields', '', grouped(added, (items) => fieldTable(items, after)));
if (removed.length) lines.push('', '### Removed fields', '', grouped(removed, (items) => fieldTable(items, before)));
if (changed.length) {
  lines.push('', '### Changed fields', '');
  lines.push(
    grouped(
      changed.map((c) => c.path),
      (items) =>
        [
          '| Field | Property | Before | After |',
          '| --- | --- | --- | --- |',
          ...changed
            .filter((c) => items.includes(c.path))
            .filter((c, i, all) => all.findIndex((o) => o.path === c.path && o.key === c.key) === i)
            .map((c) => `| ${code(c.path)} | ${c.key} | ${cell(c.from) || '—'} | ${cell(c.to) || '—'} |`),
        ].join('\n'),
    ),
  );
}
for (const { file, patch } of docs) {
  lines.push('', `### Changes to \`${file}\``, '', '```diff', patch.trim(), '```');
}
if (!hasChanges) lines.push('', 'No schema or package docs changes.');

let body = lines.join('\n') + '\n';
if (body.length > MAX_BODY) {
  body =
    body.slice(0, body.lastIndexOf('\n', MAX_BODY)) +
    `\n\n_Report truncated. Run \`node .github/scripts/sdk-config-schema-diff.mjs ${fromVersion} ${toVersion} report.md\` for the full report._\n`;
}
writeFileSync(outputPath, body);
console.log(
  `${fromVersion} -> ${toVersion}: ${added.length} added, ${removed.length} removed, ${renames.length} renamed, ${changed.length} changed, ${docs.length} docs files`,
);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${hasChanges}\n`);
