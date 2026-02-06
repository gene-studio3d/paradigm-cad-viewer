import { resolve, dirname } from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

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

export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(svg-renderer|three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
  }

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
      return src ? { src, dest: 'assets' } : null
    })
    .filter((t): t is { src: string; dest: string } => t !== null)

  const plugins = [
    vue(),
    svgLoader(),
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

  // Add conditional plugins
  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    base: './',
    resolve: {
      alias: aliases
    },
    optimizeDeps: {
      force: command === 'serve' // Force re-optimization in dev mode to fix stale cache issues
    },
    build: {
      outDir: 'dist',
      modulePreload: false,
      rollupOptions: {
        // Main entry point for the app
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: plugins
  }
})
