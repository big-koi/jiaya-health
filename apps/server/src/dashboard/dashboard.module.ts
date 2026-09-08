import { Module } from '@nestjs/common'

import { AnalysisModule } from '../analysis/analysis.module'
import { AuthModule } from '../auth/auth.module'
import { BloodPressureModule } from '../blood-pressure/blood-pressure.module'
import { ProfilesModule } from '../profiles/profiles.module'
import { RemindersModule } from '../reminders/reminders.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [AuthModule, ProfilesModule, BloodPressureModule, AnalysisModule, RemindersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
