import { resolve, dirname } from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const require = createRequire(import.meta.url)

/**
 * Safely resolve a file from an npm package's dist directory.
 * Returns the resolved absolute path, or null if the package or file is not found.
 */
function resolveWorkerFile(packageName: string, fileName: string): string | null {
  try {
    const pkgJson = require.resolve(`${packageName}/package.json`)
    const filePath = resolve(dirname(pkgJson), 'dist', fileName)
    return existsSync(filePath) ? filePath : null
  } catch {
    // Package not installed — skip
    return null
  }
}

export default defineConfig(() => {
  const workerSources = [
    { pkg: '@mlightcad/libredwg-converter', file: 'libredwg-parser-worker.js' },
    { pkg: '@mlightcad/mtext-renderer', file: 'mtext-renderer-worker.js' }
  ]

  const targets = workerSources
    .map(({ pkg, file }) => {
      const src = resolveWorkerFile(pkg, file)
      return src ? { src, dest: '' } : null
    })
    .filter((t): t is { src: string; dest: string } => t !== null)

  return {
    build: {
      outDir: 'dist',
      lib: {
        entry: 'src/index.ts',
        name: 'cad-simple-viewer',
        fileName: 'index'
      },
      minify: true
    },
    plugins: [
      peerDepsExternal() as PluginOption,
      ...(targets.length > 0
        ? [
            viteStaticCopy({
              targets
            })
          ]
        : [])
    ]
  }
})
