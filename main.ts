// Samudra Sky Post — the entry program (Node 22, standard library only).
//
// What it does: it hands the game in. It copies this repository's game/ and
// screenshots/ into the output directory and writes output/dossier.json, the
// summary the judge reads, using the kit's vendored library. The grader runs
// this same program on the submitted repository and compares the dossier it
// writes with the one handed in, byte for byte, so the program must be
// deterministic: same input files, same dossier bytes, every time.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The caps below are the scorer's own (its gate.json): only text_max_bytes
// shapes the dossier's bytes. The rest refuse an entry the scorer would
// refuse — more than 4 screenshots or one over 256 KiB; more than 993 files
// in game/ or 48 MiB of game files in all, or a game/ path over 1000 bytes —
// so passing them here makes this program fail exactly where the scorer
// would, instead of handing in something it cannot accept.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
