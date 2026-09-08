import type { DashboardResponse } from '@bp/contracts'
import { Inject, Injectable } from '@nestjs/common'

import { AnalysisService } from '../analysis/analysis.service'
import { BloodPressureService } from '../blood-pressure/blood-pressure.service'
import { ProfilesService } from '../profiles/profiles.service'

@Injectable()
export class DashboardService {
  constructor(
    @Inject(ProfilesService) private readonly profilesService: ProfilesService,
    @Inject(BloodPressureService) private readonly bloodPressureService: BloodPressureService,
    @Inject(AnalysisService) private readonly analysisService: AnalysisService,
  ) {}

  async get(userId: string, profileId: string): Promise<DashboardResponse> {
    const [profile, latestRecord, sevenDaySummary, attention] = await Promise.all([
      this.profilesService.getSummary(userId, profileId),
      this.bloodPressureService.getLatest(userId, profileId),
      this.analysisService.getBloodPressureSummary(userId, profileId, '7d'),
      this.analysisService.getLatestPendingAttention(userId, profileId),
    ])

    return { profile, latestRecord, todayTasks: [], sevenDaySummary, attention }
  }
}
