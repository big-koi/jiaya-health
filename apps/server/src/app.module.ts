import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { FamiliesModule } from './families/families.module'
import { PermissionsModule } from './permissions/permissions.module'
import { ProfilesModule } from './profiles/profiles.module'

@Module({
  imports: [AuthModule, FamiliesModule, ProfilesModule, PermissionsModule],
  controllers: [AppController],
})
export class AppModule {}
