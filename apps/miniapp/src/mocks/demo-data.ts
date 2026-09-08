import type { AttentionLevel, BloodPressureRecordDTO } from '@bp/contracts'

export type DemoMember = {
  id: string
  name: string
  relationship: string
  ageLabel: string
  role?: 'creator' | 'member'
  elderMode?: boolean
  initial: string
  tone: string
}

export const demoMembers: DemoMember[] = [
  {
    id: 'p-dad',
    name: '爸爸',
    relationship: '父亲',
    ageLabel: '58 岁',
    role: 'member',
    elderMode: true,
    initial: '爸',
    tone: '#1fa97a',
  },
  {
    id: 'p-mom',
    name: '妈妈',
    relationship: '母亲',
    ageLabel: '55 岁',
    role: 'member',
    initial: '妈',
    tone: '#4db6ac',
  },
  {
    id: 'p-self',
    name: '我',
    relationship: '本人',
    ageLabel: '28 岁',
    role: 'creator',
    initial: '我',
    tone: '#3d8bfd',
  },
]

export const attentionLabelMap: Record<AttentionLevel, string> = {
  normal: '正常',
  attention: '建议关注',
  recheck: '建议复测',
}

export const attentionMessageMap: Record<AttentionLevel, string> = {
  normal: '本次读数暂无特殊提示，可继续按日常节奏记录。',
  attention: '本次读数建议多留意后续变化，必要时咨询医生。',
  recheck: '建议休息后复测一次，并关注后续记录变化。',
}

export const demoRecords: BloodPressureRecordDTO[] = [
  {
    id: 'r1',
    profileId: 'p-dad',
    systolic: 128,
    diastolic: 82,
    pulse: 72,
    measuredAt: '2026-09-08T08:12:00.000Z',
    source: 'family',
    recordedByUserId: 'u-self',
    measurementContext: null,
    note: '早餐前',
    attentionLevel: 'normal',
    ruleVersion: 'demo-1',
    createdAt: '2026-09-08T08:12:00.000Z',
    updatedAt: '2026-09-08T08:12:00.000Z',
  },
  {
    id: 'r2',
    profileId: 'p-dad',
    systolic: 136,
    diastolic: 88,
    pulse: 78,
    measuredAt: '2026-09-07T20:05:00.000Z',
    source: 'self',
    recordedByUserId: 'u-self',
    measurementContext: null,
    note: null,
    attentionLevel: 'attention',
    ruleVersion: 'demo-1',
    createdAt: '2026-09-07T20:05:00.000Z',
    updatedAt: '2026-09-07T20:05:00.000Z',
  },
  {
    id: 'r3',
    profileId: 'p-dad',
    systolic: 124,
    diastolic: 80,
    pulse: 70,
    measuredAt: '2026-09-06T08:20:00.000Z',
    source: 'family',
    recordedByUserId: 'u-self',
    measurementContext: null,
    note: null,
    attentionLevel: 'normal',
    ruleVersion: 'demo-1',
    createdAt: '2026-09-06T08:20:00.000Z',
    updatedAt: '2026-09-06T08:20:00.000Z',
  },
]

export function formatMeasuredAt(iso: string): string {
  const date = new Date(iso)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}
