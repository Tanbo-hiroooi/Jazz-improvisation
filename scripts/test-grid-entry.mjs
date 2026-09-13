import { build } from 'esbuild';
// Bundle TypeScript in memory; no test dependencies or generated repository files.
for (const entry of ['tests/gridEntry.test.ts', 'tests/swing.test.ts']) {
  const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
