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
    base: './',
    resolve: {
      alias: [
        // Redirect local workspace packages to their TypeScript source so that
        // Vite can compile them on the fly without requiring a prior build step.
        {
          find: /^@mlightcad\/(cad-simple-viewer|cad-viewer|svg-renderer|three-renderer)$/,
          replacement: resolve(__dirname, 'packages/$1/src')
        }
      ]
    },
    build: {
      modulePreload: false,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
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
