import { IsNotEmpty, IsString } from 'class-validator'

export class ReminderListQueryDto {
  @IsString() @IsNotEmpty() profileId!: string
}
