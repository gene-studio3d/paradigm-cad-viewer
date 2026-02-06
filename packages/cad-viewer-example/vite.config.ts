import { resolve, dirname } from 'path'
import { createRequire } from 'module'
import { Alias, defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgLoader from 'vite-svg-loader'
import { visualizer } from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'

const require = createRequire(import.meta.url)

/**
 * Resolve the dist directory of an npm package using Node module resolution.
 * This works correctly with pnpm's symlinked node_modules and workspace packages.
 */
function resolvePackageDist(packageName: string): string {
  const pkgJson = require.resolve(`${packageName}/package.json`)
  return resolve(dirname(pkgJson), 'dist')
}

export default defineConfig(({ command, mode }) => {
  const aliases: Alias[] = []
  if (command === 'serve') {
    aliases.push({
      find: /^@mlightcad\/(svg-renderer|three-renderer|cad-simple-viewer|cad-viewer)$/,
      replacement: resolve(__dirname, '../$1/src')
    })
  }

  // Resolve worker file paths from their origin packages instead of relying
  // on the intermediate cad-simple-viewer/dist (which may not be built yet
  // when running the example directly in a monorepo).
  const dataModelDist = resolvePackageDist('@mlightcad/data-model')
  const libredwgDist = resolvePackageDist('@mlightcad/libredwg-converter')
  const mtextDist = resolvePackageDist('@mlightcad/mtext-renderer')

  const plugins = [
    vue(),
    svgLoader(),
    viteStaticCopy({
      targets: [
        {
          src: resolve(dataModelDist, 'dxf-parser-worker.js'),
          dest: 'assets'
        },
        {
          src: resolve(libredwgDist, 'libredwg-parser-worker.js'),
          dest: 'assets'
        },
        {
          src: resolve(mtextDist, 'mtext-renderer-worker.js'),
          dest: 'assets'
        }
      ]
    })
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
