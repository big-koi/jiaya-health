import type {
  AttentionRuleConfig,
  AttentionRuleEngine,
  AttentionRuleInput,
  AttentionRuleResult,
} from './attention-rule.types'

export function createAttentionRuleEngine(config: AttentionRuleConfig): AttentionRuleEngine {
  return {
    evaluate(input: AttentionRuleInput): AttentionRuleResult {
      if (
        input.systolic >= config.recheckSystolicMin ||
        input.diastolic >= config.recheckDiastolicMin
      ) {
        return result('recheck', 'BP_RECHECK', true, config.version)
      }
      if (
        input.systolic >= config.attentionSystolicMin ||
        input.diastolic >= config.attentionDiastolicMin
      ) {
        return result('attention', 'BP_ATTENTION', false, config.version)
      }
      return result('normal', 'BP_NORMAL', false, config.version)
    },
  }
}

function result(
  level: AttentionRuleResult['level'],
  messageCode: string,
  requireRecheck: boolean,
  ruleVersion: string,
): AttentionRuleResult {
  return { level, messageCode, requireRecheck, ruleVersion }
}
