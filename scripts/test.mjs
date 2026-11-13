import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('.test-build', { recursive: true });
await build({ entryPoints: ['tests/exports.ts'], outfile: '.test-build/core.mjs', bundle: true,
  platform: 'node', format: 'esm', target: 'node20' });
const result = spawnSync(process.execPath, ['--test', 'tests/foundation.test.mjs', 'tests/cooking.test.mjs', 'tests/experience.test.mjs', 'tests/drag.test.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
