import esbuild from 'esbuild';
import cssModulesPlugin from 'esbuild-plugin-css-modules';
import { copy } from 'esbuild-plugin-copy';
import fs from 'fs';
import path from 'path';

function htmlPlugin(distDir) {
  return {
    name: 'html-template',
    setup(build) {
      build.onEnd(() => {
        if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
        const htmlTemplate = fs.readFileSync('./public/index.html', 'utf8');
        fs.writeFileSync(
          path.join(distDir, 'index.html'),
          htmlTemplate.replace(
            '</body>',
            `<link rel="stylesheet" href="index.css">\n<script src="index.js"></script></body>`
          )
        );
      });
    }
  };
}

function getBuildOptions(distDir, { minify = false, sourcemap = true, mode = 'development' } = {}) {
  return {
    entryPoints: ['./src/index.js'],
    bundle: true,
    outdir: distDir, 
    loader: {
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file',
      '.gif': 'file',
      '.svg': 'file',
      '.css': 'css',
      '.js': 'jsx',
    },
    plugins: [
      cssModulesPlugin(),
      copy({
        assets: {
          from: ['./assets/resources/images/logos/*'],
          to: [path.join(distDir, 'assets/resources/images/logos')],
        }
      }),
      htmlPlugin(distDir)
    ],
    sourcemap,
    minify,
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    target: ['chrome112', 'esnext'],
    assetNames: 'images/[name][ext]'
  };
}

const DEV_DIST = './public/dist/dev';
const PROD_DIST = './public/dist/prod';

(async () => {
  const dev = process.argv.includes('--dev');
  if (dev) {
    const ctx = await esbuild.context(getBuildOptions(DEV_DIST, { sourcemap: true, minify: false, mode: 'development' }));
    await ctx.watch();
  } else {
    await esbuild.build(getBuildOptions(PROD_DIST, { sourcemap: false, minify: true, mode: 'production' }));
  }
})();
