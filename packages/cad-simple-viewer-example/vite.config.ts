import { resolve, dirname } from 'path'
import { createRequire } from 'module'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const require = createRequire(import.meta.url)

/**
 * Resolve the dist directory of an npm package using Node module resolution.
 * This works correctly with pnpm's symlinked node_modules and workspace packages.
 */
function resolvePackageDist(packageName: string): string {
  const pkgJson = require.resolve(`${packageName}/package.json`)
  return resolve(dirname(pkgJson), 'dist')
}

export default defineConfig(() => {
  // Resolve worker file paths from their origin packages instead of relying
  // on the intermediate cad-simple-viewer/dist (which may not be built yet
  // when running the example directly in a monorepo).
  const dataModelDist = resolvePackageDist('@mlightcad/data-model')
  const libredwgDist = resolvePackageDist('@mlightcad/libredwg-converter')
  const mtextDist = resolvePackageDist('@mlightcad/mtext-renderer')

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
      viteStaticCopy({
        // Copy JavaScript worker bundle on purpose in order to demostrate how to config
        // worker file urls in AcApDocManager.createInstance
        targets: [
          {
            src: resolve(dataModelDist, 'dxf-parser-worker.js'),
            dest: 'workers'
          },
          {
            src: resolve(libredwgDist, 'libredwg-parser-worker.js'),
            dest: 'workers'
          },
          {
            src: resolve(mtextDist, 'mtext-renderer-worker.js'),
            dest: 'workers'
          }
        ]
      })
    ]
  }
})
