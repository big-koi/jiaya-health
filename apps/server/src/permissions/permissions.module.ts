import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { ProfilePermissionGuard } from '../common/guards/profile-permission.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { PermissionsController } from './permissions.controller'
import { PermissionsService } from './permissions.service'

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, ProfilePermissionGuard],
})
export class PermissionsModule {}
