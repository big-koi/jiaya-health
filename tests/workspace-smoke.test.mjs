import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const consumers = [
  ['server', new URL('../apps/server/package.json', import.meta.url)],
  ['miniapp', new URL('../apps/miniapp/package.json', import.meta.url)],
]

test('@bp/contracts resolves from every application workspace', () => {
  for (const [name, packageUrl] of consumers) {
    const requireFromApp = createRequire(packageUrl)

    assert.match(
      requireFromApp.resolve('@bp/contracts'),
      /packages[\\/]contracts[\\/]src[\\/]index\.ts$/,
      `${name} should resolve the shared contracts package`,
    )
  }
})
