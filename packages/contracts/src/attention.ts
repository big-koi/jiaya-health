import type { AttentionLevel } from './blood-pressure'

export type AttentionStatus = 'pending' | 'acknowledged' | 'resolved'

export type AttentionEventDTO = {
  id: string
  profileId: string
  recordId: string
  type: string
  level: AttentionLevel
  status: AttentionStatus
  messageCode: string
  createdAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

export type AttentionRuleResultDTO = {
  level: AttentionLevel
  messageCode: string
  requireRecheck: boolean
  ruleVersion: string
}
