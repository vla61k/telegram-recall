import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const source = new URL('node_modules/emoji-datasource-apple/', root);
const target = new URL('public/emoji/apple/', root);
await mkdir(target, { recursive: true });
const data = JSON.parse(await readFile(new URL('emoji.json', source), 'utf8'));
const manifest = {};
const fromCodepoints = (value) =>
  String.fromCodePoint(...value.split('-').map((n) => parseInt(n, 16)));
for (const entry of data) {
  for (const item of [entry, ...Object.values(entry.skin_variations || {})]) {
    if (!item.has_img_apple) continue;
    const filename = item.image || item.unified.toLowerCase() + '.png';
    await copyFile(new URL('img/apple/64/' + filename, source), new URL(filename, target));
    for (const key of [item.unified, item.non_qualified].filter(Boolean)) {
      manifest[fromCodepoints(key).replace(/\uFE0F/g, '')] = filename;
    }
  }
}
await writeFile(new URL('src/apple-emoji.json', root), JSON.stringify(manifest));
console.log(`Prepared ${Object.keys(manifest).length} Apple emoji in ${fileURLToPath(target)}`);
