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
    // Package not installed — skip
    return null
  }
}

export default defineConfig(() => {
  // Build the list of worker copy targets, skipping any that can't be found.
  // Workers live in their original npm packages; we resolve them directly so
  // the example doesn't depend on cad-simple-viewer being pre-built.
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
    build: {
      modulePreload: false,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [
      // Only add the static-copy plugin when there are worker files to copy
      ...(targets.length > 0
        ? [
            viteStaticCopy({
              // Copy JavaScript worker bundles so they can be configured via
              // AcApDocManager.createInstance worker file urls
              targets
            })
          ]
        : [])
    ]
  }
})
