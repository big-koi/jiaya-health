import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator'

export class CreateReminderDto {
  @IsString() @IsNotEmpty() profileId!: string
  @IsString() @IsNotEmpty() title!: string
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) timeOfDay!: string
  @IsIn(['daily', 'weekdays']) repeatType!: 'daily' | 'weekdays'
  @ValidateIf((input: CreateReminderDto) => input.repeatType === 'weekdays')
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[] | null
  @IsOptional() @IsBoolean() enabled?: boolean
  @IsOptional() @IsInt() @Min(0) @Max(1440) lateRemindMinutes?: number | null
}
