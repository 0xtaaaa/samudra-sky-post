import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

function copyPlan(root: string, target: string) {
  return [
    { src: join(root, 'game'), dst: join(target, 'game') },
    { src: join(root, 'screenshots'), dst: join(target, 'screenshots') },
  ];
}

function copyTree(plan: Array<{ src: string; dst: string }>) {
  for (const { src, dst } of plan) {
    mkdirSync(dst, { recursive: true });
    if (existsSync(src)) {
      cpSync(src, dst, { recursive: true });
    }
  }
}

function main(): number {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const shotDir = join(root, 'screenshots');

  if (!existsSync(shotDir) || readdirSync(shotDir).length === 0) {
    console.error('screenshots directory is missing or empty');
    return 1;
  }

  mkdirSync(out, { recursive: true });
  copyTree(copyPlan(root, out));
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`Prepared dossier at ${out} (${dossier.byteLength ?? dossier.length} bytes)`);
  return 0;
}

process.exitCode = main();
