// Neon Vice — entrypoint.
// Hands the app in: copies app/ and screenshots/ into the output directory
// and writes output/dossier.json with buildDossier from the kit's library
// (vendor/makefun-app.ts, byte for byte the kit's copy). Deterministic: the
// copy walks entries in sorted order and the dossier carries no timestamps.
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const rootDir = new URL('.', import.meta.url).pathname;

function copyTree(name: string): void {
  const src = join(rootDir, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) {
    throw new Error('missing directory in repository: ' + name);
  }
  cpSync(src, dst, { recursive: true });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('wrote ' + join(outDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
