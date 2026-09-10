import { build } from 'esbuild';
// Bundle TypeScript in memory; no test dependencies or generated repository files.
const result = await build({ entryPoints: ['tests/gridEntry.test.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
