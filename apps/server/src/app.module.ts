import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { BloodPressureModule } from './blood-pressure/blood-pressure.module'
import { FamiliesModule } from './families/families.module'
import { PermissionsModule } from './permissions/permissions.module'
import { ProfilesModule } from './profiles/profiles.module'

@Module({
  imports: [AuthModule, FamiliesModule, ProfilesModule, PermissionsModule, BloodPressureModule],
  controllers: [AppController],
})
export class AppModule {}
