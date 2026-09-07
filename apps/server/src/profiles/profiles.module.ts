import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { ProfilePermissionGuard } from '../common/guards/profile-permission.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { ProfilesController } from './profiles.controller'
import { ProfilesService } from './profiles.service'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, ProfilePermissionGuard],
})
export class ProfilesModule {}
