import type { AttentionEventDTO } from './attention'
import type {
  BloodPressureRecordDTO,
  BloodPressureSummaryDTO,
} from './blood-pressure'
import type { HealthProfileSummary } from './profile'
import type { MeasurementTaskDTO } from './reminder'

export type DashboardResponse = {
  profile: HealthProfileSummary
  measuredToday: boolean
  latestRecord: BloodPressureRecordDTO | null
  todayTasks: MeasurementTaskDTO[]
  sevenDaySummary: BloodPressureSummaryDTO
  attention: AttentionEventDTO | null
}
