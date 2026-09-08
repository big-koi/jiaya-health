import { Module } from '@nestjs/common'

import { AnalysisModule } from '../analysis/analysis.module'
import { AttentionModule } from '../attention/attention.module'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { BloodPressureController } from './blood-pressure.controller'
import { BloodPressureService } from './blood-pressure.service'

@Module({
  imports: [AuthModule, PrismaModule, AnalysisModule, AttentionModule.registerFromEnvironment()],
  controllers: [BloodPressureController],
  providers: [BloodPressureService],
  exports: [BloodPressureService],
})
export class BloodPressureModule {}
