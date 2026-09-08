import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator'

export class UpdateReminderDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) timeOfDay?: string
  @IsOptional() @IsIn(['daily', 'weekdays']) repeatType?: 'daily' | 'weekdays'
  @ValidateIf(
    (input: UpdateReminderDto) => input.repeatType === 'weekdays' || (input.weekdays !== undefined && input.weekdays !== null),
  )
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
