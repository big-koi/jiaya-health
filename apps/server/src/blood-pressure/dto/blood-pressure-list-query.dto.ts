import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class BloodPressureListQueryDto {
  @IsString() profileId!: string
  @IsOptional() @IsDateString() from?: string
  @IsOptional() @IsDateString() to?: string
  @IsOptional() @IsString() cursor?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20
}
