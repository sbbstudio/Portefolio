import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'
const outdir = 'studio/runtime'
await rm(outdir, { recursive: true, force: true })
await mkdir(outdir, { recursive: true })
await build({ entryPoints: ['studio-src/integration/rune-system/index.ts'], outdir, bundle: true, splitting: true, format: 'esm', target: 'es2020', minify: true, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info' })
