import { rmdir } from 'node:fs/promises';

await rmdir('./dist', { recursive: true });

const r = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'bun',
  minify: true,
  sourcemap: 'linked',
});

console.log(r);

if (!r.success) {
  process.exit(1);
}
