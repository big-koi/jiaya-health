import { Test } from '@nestjs/testing'
import { describe, expect, it } from 'vitest'

import {
  ATTENTION_RULE_ENGINE,
  AttentionModule,
} from './attention.module'
import { createAttentionRuleEngine } from './attention-rule.engine'
import type { AttentionRuleConfig, AttentionRuleEngine } from './attention-rule.types'

const testConfig: AttentionRuleConfig = {
  version: 'test-v1',
  attentionSystolicMin: 140,
  recheckSystolicMin: 180,
  attentionDiastolicMin: 90,
  recheckDiastolicMin: 120,
}

const measuredAt = new Date('2026-09-07T08:00:00+08:00')

describe('AttentionRuleEngine', () => {
  const engine = createAttentionRuleEngine(testConfig)

  it.each([
    {
      name: '两个指标都低于关注边界时为 normal',
      input: { systolic: 139, diastolic: 89, measuredAt },
      expected: { level: 'normal', messageCode: 'BP_NORMAL', requireRecheck: false },
    },
    {
      name: '收缩压达到关注边界时为 attention',
      input: { systolic: 140, diastolic: 89, measuredAt },
      expected: { level: 'attention', messageCode: 'BP_ATTENTION', requireRecheck: false },
    },
    {
      name: '舒张压达到关注边界时为 attention',
      input: { systolic: 139, diastolic: 90, measuredAt },
      expected: { level: 'attention', messageCode: 'BP_ATTENTION', requireRecheck: false },
    },
    {
      name: '收缩压达到复测边界时为 recheck',
      input: { systolic: 180, diastolic: 89, measuredAt },
      expected: { level: 'recheck', messageCode: 'BP_RECHECK', requireRecheck: true },
    },
    {
      name: '舒张压达到复测边界时为 recheck',
      input: { systolic: 139, diastolic: 120, measuredAt },
      expected: { level: 'recheck', messageCode: 'BP_RECHECK', requireRecheck: true },
    },
    {
      name: '两个指标等级不同时采用更高等级',
      input: { systolic: 140, diastolic: 120, pulse: 72, measuredAt },
      expected: { level: 'recheck', messageCode: 'BP_RECHECK', requireRecheck: true },
    },
  ])('$name', ({ input, expected }) => {
    expect(engine.evaluate(input)).toEqual({ ...expected, ruleVersion: 'test-v1' })
  })

  it('通过 AttentionModule 向业务模块提供配置后的引擎', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AttentionModule.register(testConfig)],
    }).compile()
    const registeredEngine = moduleRef.get<AttentionRuleEngine>(ATTENTION_RULE_ENGINE)

    expect(registeredEngine.evaluate({ systolic: 140, diastolic: 89, measuredAt })).toEqual({
      level: 'attention',
      messageCode: 'BP_ATTENTION',
      requireRecheck: false,
      ruleVersion: 'test-v1',
    })
  })
})
