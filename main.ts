/* Neon Vice entrypoint.
   Copies app/ and screenshots/ from this repository into the output
   directory and writes dossier.json there with buildDossier from the
   kit's vendor/makefun-app.ts. Standard library only; no network. */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
};

function copyTree(sourceDir: string, targetDir: string): void {
  if (!existsSync(sourceDir)) return;
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

function main(): void {
  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoRoot, "app"), join(outputDir, "app"));
  copyTree(join(repoRoot, "screenshots"), join(outputDir, "screenshots"));
  const shotDir = join(outputDir, "screenshots");
  const shots = existsSync(shotDir)
    ? readdirSync(shotDir).filter((name) => !name.startsWith("."))
    : [];
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, "dossier.json"), dossier);
  const appIndex = readFileSync(join(outputDir, "app", "index.html"), "utf8");
  if (!appIndex.includes("<canvas")) throw new Error("app/index.html has no canvas");
  console.log(`Neon Vice dossier written: ${dossier.length} bytes -> ${outputDir}`);
}

main();
