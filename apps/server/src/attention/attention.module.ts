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
}
