/**
 * Build the civic workspace editor bundle (Phase 4).
 *
 * BlockSuite 0.22 publishes raw TypeScript: exports point at src/*.ts, the
 * code requires useDefineForClassFields=false (BlockSuite's own tsconfig),
 * and view packages execute vanilla-extract .css.ts at import. Compiling
 * the editor here, with esbuild + the vanilla-extract plugin + the civic
 * tsconfig, keeps all of that out of the Next build: the route loads the
 * emitted module + stylesheet as static assets.
 *
 * Output: public/civic-editor/civic-editor.mjs + civic-editor.css
 * Run: npm run build:civic-editor
 */

import { build } from 'esbuild';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

const result = await build({
  entryPoints: ['src/civic-editor/entry.ts'],
  outfile: 'public/civic-editor/civic-editor.mjs',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  tsconfig: 'scripts/tsconfig.civic-validate.json',
  plugins: [vanillaExtractPlugin()],
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true,
  sourcemap: 'external',
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.svg': 'dataurl',
    '.png': 'dataurl',
  },
  logLevel: 'info',
  metafile: true,
});

const outputs = Object.entries(result.metafile.outputs).map(
  ([file, meta]) => `${file} (${(meta.bytes / 1024 / 1024).toFixed(1)}MB)`,
);
console.log('civic-editor bundle written:\n  ' + outputs.join('\n  '));
