import { cp, mkdir, readdir } from 'node:fs/promises';
await mkdir('public', { recursive: true });
for (const item of await readdir('.')) {
  if (/\.html$/.test(item) || ['css', 'js', 'img', 'data', 'favicon.svg'].includes(item)) {
    await cp(item, `public/${item}`, { recursive: true });
  }
}
