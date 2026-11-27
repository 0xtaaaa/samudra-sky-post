import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootPath = fileURLToPath(new URL('.', import.meta.url));
const outputTarget = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameSource = join(rootPath, 'game');
const screenshotsSource = join(rootPath, 'screenshots');

mkdirSync(outputTarget, { recursive: true });
cpSync(gameSource, join(outputTarget, 'game'), { recursive: true });

mkdirSync(join(outputTarget, 'screenshots'), { recursive: true });
if (existsSync(screenshotsSource)) {
  cpSync(screenshotsSource, join(outputTarget, 'screenshots'), { recursive: true });
}

const dossierBytes = buildDossier(outputTarget, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputTarget, 'dossier.json'), dossierBytes);
