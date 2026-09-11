export type BloodPressureSource = 'self' | 'family' | 'device'
export type AttentionLevel = 'normal' | 'attention' | 'recheck'

export type MeasurementContext = {
  medication?: 'before' | 'after'
  posture?: 'sitting' | 'standing' | 'lying'
  arm?: 'left' | 'right'
}

export type BloodPressureRecordDTO = {
  id: string
  profileId: string
  systolic: number
  diastolic: number
  pulse: number | null
  measuredAt: string
  source: BloodPressureSource
  recordedByUserId: string
  measurementContext: MeasurementContext | null
  note: string | null
  attentionLevel: AttentionLevel
  ruleVersion: string
  createdAt: string
  updatedAt: string
}

export type CreateBloodPressureRecordRequest = {
  profileId: string
  systolic: number
  diastolic: number
  pulse?: number
  measuredAt: string
  source: Exclude<BloodPressureSource, 'device'>
  measurementContext?: MeasurementContext | null
  note?: string | null
}

export type CreateBloodPressureRecordResponse = {
  record: BloodPressureRecordDTO
  attention: {
    level: AttentionLevel
    messageCode: string
    requireRecheck: boolean
    ruleVersion: string
  }
}

export type UpdateBloodPressureRecordRequest = Partial<
  Pick<
    CreateBloodPressureRecordRequest,
    | 'systolic'
    | 'diastolic'
    | 'pulse'
    | 'measuredAt'
    | 'measurementContext'
    | 'note'
  >
>

export type BloodPressureListQuery = {
  profileId: string
  from?: string
  to?: string
  cursor?: string
  limit?: number
}

export type BloodPressureListResponse = {
  items: BloodPressureRecordDTO[]
  nextCursor: string | null
}

export type BloodPressureSummaryDTO = {
  recordCount: number
  avgSystolic: number | null
  avgDiastolic: number | null
  attentionCount: number
}
