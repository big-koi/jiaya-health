import type { AttentionLevel } from '@bp/contracts'

export type AttentionRuleInput = {
  systolic: number
  diastolic: number
  pulse?: number
  measuredAt: Date
}

export type AttentionRuleResult = {
  level: AttentionLevel
  messageCode: string
  requireRecheck: boolean
  ruleVersion: string
}

export type AttentionRuleConfig = {
  version: string
  attentionSystolicMin: number
  recheckSystolicMin: number
  attentionDiastolicMin: number
  recheckDiastolicMin: number
}

export interface AttentionRuleEngine {
  evaluate(input: AttentionRuleInput): AttentionRuleResult
}
