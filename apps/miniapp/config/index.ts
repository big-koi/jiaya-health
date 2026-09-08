import { defineConfig } from '@tarojs/cli'

export default defineConfig({
  projectName: 'jiaya-health',
  date: '2026-09-07',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: 'webpack5',
  copy: {
    patterns: [
      {
        from: 'src/assets/',
        to: 'dist/assets/',
      },
    ],
    options: {},
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
    },
  },
  h5: {},
})
