import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    pool: 'forks',
    fileParallelism: false,
    env: {
      ATTENTION_RULE_VERSION: 'test-v1',
      ATTENTION_SYSTOLIC_MIN: '140',
      RECHECK_SYSTOLIC_MIN: '180',
      ATTENTION_DIASTOLIC_MIN: '90',
      RECHECK_DIASTOLIC_MIN: '120',
      REMINDER_COMPLETION_WINDOW_MINUTES: '30',
      APP_TIMEZONE_OFFSET_MINUTES: '480',
    },
  },
})
