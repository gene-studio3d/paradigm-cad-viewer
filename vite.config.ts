import { resolve, dirname } from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { defineConfig } from 'vite'
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
    return null
  }
}

export default defineConfig(() => {
  const workerSources = [
    { pkg: '@mlightcad/data-model', file: 'dxf-parser-worker.js' },
    { pkg: '@mlightcad/libredwg-converter', file: 'libredwg-parser-worker.js' },
    { pkg: '@mlightcad/mtext-renderer', file: 'mtext-renderer-worker.js' }
  ]

  const targets = workerSources
    .map(({ pkg, file }) => {
      const src = resolveWorkerFile(pkg, file)
      return src ? { src, dest: 'workers' } : null
    })
    .filter((t): t is { src: string; dest: string } => t !== null)

  return {
    root: resolve(__dirname, 'packages/cad-simple-viewer-example'),
    base: './',
    build: {
      modulePreload: false,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'packages/cad-simple-viewer-example/index.html')
        }
      }
    },
    plugins: [
      ...(targets.length > 0
        ? [viteStaticCopy({ targets })]
        : [])
    ]
  }
})
