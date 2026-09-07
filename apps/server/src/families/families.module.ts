import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { FamiliesController } from './families.controller'
import { FamiliesService } from './families.service'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FamiliesController],
  providers: [FamiliesService],
})
export class FamiliesModule {}
