import { Module, type DynamicModule } from '@nestjs/common'

import { createAttentionRuleEngine } from './attention-rule.engine'
import type { AttentionRuleConfig } from './attention-rule.types'

export const ATTENTION_RULE_ENGINE = Symbol('ATTENTION_RULE_ENGINE')

@Module({})
export class AttentionModule {
  static register(config: AttentionRuleConfig): DynamicModule {
    return {
      module: AttentionModule,
      providers: [
        {
          provide: ATTENTION_RULE_ENGINE,
          useFactory: () => createAttentionRuleEngine(config),
        },
      ],
      exports: [ATTENTION_RULE_ENGINE],
    }
  }

  static registerFromEnvironment(): DynamicModule {
    return {
      module: AttentionModule,
      providers: [
        {
          provide: ATTENTION_RULE_ENGINE,
          useFactory: () => createAttentionRuleEngine(readEnvironmentConfig()),
        },
      ],
      exports: [ATTENTION_RULE_ENGINE],
    }
  }
}

function readEnvironmentConfig(): AttentionRuleConfig {
  const version = process.env.ATTENTION_RULE_VERSION
  if (!version) throw new Error('ATTENTION_RULE_VERSION is required')
  return {
    version,
    attentionSystolicMin: readNumber('ATTENTION_SYSTOLIC_MIN'),
    recheckSystolicMin: readNumber('RECHECK_SYSTOLIC_MIN'),
    attentionDiastolicMin: readNumber('ATTENTION_DIASTOLIC_MIN'),
    recheckDiastolicMin: readNumber('RECHECK_DIASTOLIC_MIN'),
  }
}

function readNumber(name: string): number {
  const value = Number(process.env[name])
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`)
  return value
}
