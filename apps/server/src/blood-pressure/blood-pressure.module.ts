import { Module } from '@nestjs/common'

import { AttentionModule } from '../attention/attention.module'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { BloodPressureController } from './blood-pressure.controller'
import { BloodPressureService } from './blood-pressure.service'

@Module({
  imports: [AuthModule, PrismaModule, AttentionModule.registerFromEnvironment()],
  controllers: [BloodPressureController],
  providers: [BloodPressureService],
})
export class BloodPressureModule {}
